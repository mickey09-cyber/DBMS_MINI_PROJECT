"""POST /api/models/retrain: train the risk models in ml/ and register the new versions.

The training itself is done by ml.train.train_model(risk_type) (written by the ML owner).
This file only calls it and records the result in the database, in one transaction:
  ai_model (new version, active)  ->  training_dataset  ->  model_training  ->  model_performance (TEST_SET)
If the ML code cannot be imported the endpoint answers 503 and changes nothing.
"""
from pathlib import Path
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import predictor  # also puts the project root on sys.path so "ml" can be imported
from app.database import get_db
from app.security import require_roles

PROJECT_ROOT = Path(__file__).resolve().parents[3]

router = APIRouter(prefix="/api", tags=["models"])


class RetrainRequest(BaseModel):
    risk_type: Optional[Literal["THERMAL", "HEALTH"]] = None  # leave out to retrain both


class RetrainedModel(BaseModel):
    model_id: int
    model_name: str
    version: str
    risk_type: str
    algorithm: str
    artifact_path: str
    dataset_id: int
    sample_count: int
    test_sample_count: int
    accuracy: float
    macro_f1: float
    recall_high_critical: Optional[float] = None
    baseline_accuracy: Optional[float] = None
    note: str


class RetrainResult(BaseModel):
    retrained: List[RetrainedModel]


def _relative(path_str: str) -> str:
    """Store a path relative to the project folder, so it is the same on every computer."""
    p = Path(path_str)
    if not p.is_absolute():
        return p.as_posix()
    try:
        return p.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return p.name


def _register(db: Session, risk_type: str, m: dict) -> dict:
    source = db.execute(
        text("SELECT data_source_id FROM data_source WHERE source_type = 'SIMULATOR' "
             "ORDER BY data_source_id LIMIT 1")
    ).first()
    if source is None:
        raise HTTPException(status_code=409,
                            detail="No SIMULATOR row in data_source, so the dataset cannot be registered.")

    name_row = db.execute(
        text("SELECT model_name FROM ai_model WHERE risk_type = :rt AND task_type = 'RISK_CLASSIFICATION' "
             "ORDER BY model_id DESC LIMIT 1"),
        {"rt": risk_type},
    ).first()
    model_name = name_row.model_name if name_row else f"{risk_type.lower()}_risk_classifier"

    next_n = db.execute(
        text("SELECT coalesce(max((substring(version from '^v([0-9]+)$'))::int), -1) + 1 "
             "FROM ai_model WHERE model_name = :n"),
        {"n": model_name},
    ).scalar()
    version = f"v{next_n}"

    # Only one active classifier per risk type: switch the old ones off first.
    db.execute(
        text("UPDATE ai_model SET is_active = false "
             "WHERE risk_type = :rt AND task_type = 'RISK_CLASSIFICATION' AND is_active"),
        {"rt": risk_type},
    )

    note = str(m.get("note") or "")
    artifact = _relative(m["artifact_path"])
    model_id = db.execute(
        text("INSERT INTO ai_model (model_name, version, task_type, algorithm, trained_at, "
             "artifact_path, is_active, notes, risk_type) "
             "VALUES (:name, :ver, 'RISK_CLASSIFICATION', :algo, now(), :path, true, :notes, :rt) "
             "RETURNING model_id"),
        {"name": model_name, "ver": version, "algo": m["algorithm"], "path": artifact,
         "notes": (note + " Dataset: " + str(m["dataset_name"]))[:2000], "rt": risk_type},
    ).scalar()

    dataset_name = f"{m['dataset_name']} - {risk_type}"
    dataset_id = db.execute(
        text("INSERT INTO training_dataset (dataset_name, version, data_source_id, is_synthetic, row_count, notes) "
             "VALUES (:n, 'v1', :src, :syn, :rows, :notes) "
             "ON CONFLICT (dataset_name, version) DO UPDATE "
             "SET row_count = EXCLUDED.row_count, notes = EXCLUDED.notes "
             "RETURNING dataset_id"),
        {"n": dataset_name, "src": source.data_source_id,
         "syn": "SYNTHETIC" in str(m["dataset_name"]).upper(),
         "rows": int(m["sample_count"]),
         "notes": "Registered by POST /api/models/retrain. " + note},
    ).scalar()

    db.execute(
        text("INSERT INTO model_training (model_id, dataset_id, rows_used) VALUES (:m, :d, :r)"),
        {"m": model_id, "d": dataset_id, "r": int(m["sample_count"])},
    )

    baseline = m.get("baseline_threshold_rule") or {}
    test_n = int(m.get("test_sample_count") or m["sample_count"])
    perf_notes = "TEST_SET (held-out part of the training data). "
    if baseline:
        perf_notes += ("Plain threshold-rule baseline on the same test set: "
                       f"accuracy {baseline.get('accuracy')}, macro_f1 {baseline.get('macro_f1')}, "
                       f"recall_high_critical {baseline.get('recall_high_critical')}. ")
    perf_notes += note
    db.execute(
        text("INSERT INTO model_performance (model_id, evaluation_type, sample_count, accuracy, "
             "macro_f1, recall_high_critical, notes) "
             "VALUES (:m, 'TEST_SET', :n, :acc, :f1, :rec, :notes)"),
        {"m": model_id, "n": test_n, "acc": m["accuracy"], "f1": m["macro_f1"],
         "rec": m.get("recall_high_critical"), "notes": perf_notes[:2000]},
    )

    return {
        "model_id": model_id, "model_name": model_name, "version": version,
        "risk_type": risk_type, "algorithm": m["algorithm"], "artifact_path": artifact,
        "dataset_id": dataset_id, "sample_count": int(m["sample_count"]),
        "test_sample_count": test_n, "accuracy": float(m["accuracy"]),
        "macro_f1": float(m["macro_f1"]),
        "recall_high_critical": (None if m.get("recall_high_critical") is None
                                 else float(m["recall_high_critical"])),
        "baseline_accuracy": baseline.get("accuracy"),
        "note": note,
    }


@router.post("/models/retrain", response_model=RetrainResult, status_code=201)
def retrain(
    body: Optional[RetrainRequest] = None,
    user: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    """Train the risk model(s) on the synthetic data and register the new version(s).

    Leave the body out to retrain both THERMAL and HEALTH. Admin only.
    """
    risk_types = [body.risk_type] if body is not None and body.risk_type else ["THERMAL", "HEALTH"]

    try:
        from ml.train import train_model
    except Exception as exc:  # ImportError, or a missing library such as scikit-learn
        raise HTTPException(status_code=503,
                            detail="The ML training code is not available: " + str(exc)[:200])

    results = []
    for rt in risk_types:
        try:
            results.append((rt, train_model(rt)))
        except Exception as exc:
            raise HTTPException(status_code=500,
                                detail=f"Training failed for {rt}: {exc.__class__.__name__}")

    try:
        saved = [_register(db, rt, metrics) for rt, metrics in results]
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error. Nothing was registered.")

    predictor.reset_ml()  # next prediction loads the freshly trained files
    return {"retrained": saved}
