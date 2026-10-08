"""Tests for POST /api/models/retrain.

The real training code is replaced by a fake, so these tests are fast and never touch the
real model files. Tests that register a model write to ai_model, training_dataset,
model_training and model_performance, and put everything back afterwards.
Login needs the admin1 password in $env:TEST_PASSWORD (see backend/API.md).
"""
import os
import sys
import types

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import get_db
from app.main import app

client = TestClient(app)


def run_sql(sql, **params):
    gen = get_db()
    db = next(gen)
    try:
        res = db.execute(text(sql), params)
        rows = res.fetchall() if res.returns_rows else None
        db.commit()
        return rows
    finally:
        gen.close()


@pytest.fixture(scope="module")
def admin_headers():
    pw = os.environ.get("TEST_PASSWORD")
    if not pw:
        pytest.skip("set $env:TEST_PASSWORD to run the retrain tests")
    r = client.post("/api/auth/login", json={"username": "admin1", "password": pw})
    assert r.status_code == 200, "login as admin1 failed: " + r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def fake_metrics(risk_type):
    return {
        "artifact_path": f"ml/artifacts/TEST_{risk_type.lower()}_model.joblib",
        "algorithm": "RandomForestClassifier",
        "dataset_name": "TEST_dataset (SYNTHETIC)",
        "sample_count": 1000,
        "test_sample_count": 200,
        "accuracy": 0.9,
        "macro_f1": 0.85,
        "recall_high_critical": 0.95,
        "baseline_threshold_rule": {"accuracy": 0.99, "macro_f1": 0.98, "recall_high_critical": 1.0},
        "note": "TEST note",
    }


def install_fake_train(monkeypatch, fn):
    module = types.ModuleType("ml.train")
    module.train_model = fn
    monkeypatch.setitem(sys.modules, "ml.train", module)


def count(table):
    return run_sql(f"SELECT count(*) FROM {table}")[0][0]


@pytest.fixture
def restore_db():
    """Put ai_model and its child tables back exactly as they were."""
    before = {r[0]: r[1] for r in run_sql("SELECT model_id, is_active FROM ai_model")}
    ids = list(before)
    yield
    run_sql("DELETE FROM model_training WHERE model_id <> ALL(:ids)", ids=ids)
    run_sql("DELETE FROM model_performance WHERE model_id <> ALL(:ids)", ids=ids)
    run_sql("DELETE FROM ai_model WHERE model_id <> ALL(:ids)", ids=ids)
    run_sql("DELETE FROM training_dataset WHERE starts_with(dataset_name, 'TEST_')")
    for model_id, active in before.items():
        run_sql("UPDATE ai_model SET is_active = :a WHERE model_id = :m", a=active, m=model_id)


def test_retrain_requires_login():
    r = client.post("/api/models/retrain")
    assert r.status_code == 401, r.text


def test_retrain_invalid_risk_type(admin_headers):
    r = client.post("/api/models/retrain", json={"risk_type": "FOO"}, headers=admin_headers)
    assert r.status_code == 422, r.text


def test_retrain_returns_503_when_ml_code_missing(admin_headers, monkeypatch):
    monkeypatch.setitem(sys.modules, "ml.train", None)  # makes "import ml.train" fail
    before = count("ai_model")
    r = client.post("/api/models/retrain", headers=admin_headers)
    assert r.status_code == 503, r.text
    assert r.json()["error"]["code"] == 503
    assert count("ai_model") == before


def test_retrain_returns_500_when_training_fails(admin_headers, monkeypatch):
    def boom(risk_type):
        raise RuntimeError("boom")

    install_fake_train(monkeypatch, boom)
    before = count("ai_model")
    r = client.post("/api/models/retrain", headers=admin_headers)
    assert r.status_code == 500, r.text
    assert "boom" not in r.text  # the internal message is not shown
    assert count("ai_model") == before


def test_retrain_registers_new_version(admin_headers, monkeypatch, restore_db):
    install_fake_train(monkeypatch, fake_metrics)
    r = client.post("/api/models/retrain", json={"risk_type": "THERMAL"}, headers=admin_headers)
    assert r.status_code == 201, r.text
    items = r.json()["retrained"]
    assert len(items) == 1
    item = items[0]
    assert item["risk_type"] == "THERMAL"
    assert item["version"] != "v0"
    assert item["test_sample_count"] == 200

    # the new model is the one active THERMAL classifier
    active = run_sql("SELECT model_id FROM ai_model WHERE risk_type = 'THERMAL' "
                     "AND task_type = 'RISK_CLASSIFICATION' AND is_active")
    assert [row[0] for row in active] == [item["model_id"]]

    # TEST_SET metrics were stored, measured on the test set size
    perf = run_sql("SELECT evaluation_type, sample_count, accuracy FROM model_performance "
                   "WHERE model_id = :m", m=item["model_id"])
    assert len(perf) == 1
    assert perf[0][0] == "TEST_SET" and perf[0][1] == 200 and float(perf[0][2]) == 0.9

    # the dataset is recorded as synthetic and linked to the model
    link = run_sql("SELECT d.is_synthetic, t.rows_used FROM model_training t "
                   "JOIN training_dataset d ON d.dataset_id = t.dataset_id WHERE t.model_id = :m",
                   m=item["model_id"])
    assert link[0][0] is True and link[0][1] == 1000


def test_retrain_without_body_trains_both(admin_headers, monkeypatch, restore_db):
    install_fake_train(monkeypatch, fake_metrics)
    r = client.post("/api/models/retrain", headers=admin_headers)
    assert r.status_code == 201, r.text
    assert sorted(i["risk_type"] for i in r.json()["retrained"]) == ["HEALTH", "THERMAL"]


def test_retrain_twice_increments_version(admin_headers, monkeypatch, restore_db):
    install_fake_train(monkeypatch, fake_metrics)
    first = client.post("/api/models/retrain", json={"risk_type": "HEALTH"}, headers=admin_headers)
    second = client.post("/api/models/retrain", json={"risk_type": "HEALTH"}, headers=admin_headers)
    assert first.status_code == 201 and second.status_code == 201
    v1 = int(first.json()["retrained"][0]["version"][1:])
    v2 = int(second.json()["retrained"][0]["version"][1:])
    assert v2 == v1 + 1
    # only the newest HEALTH classifier stays active
    active = run_sql("SELECT model_id FROM ai_model WHERE risk_type = 'HEALTH' "
                     "AND task_type = 'RISK_CLASSIFICATION' AND is_active")
    assert [row[0] for row in active] == [second.json()["retrained"][0]["model_id"]]
