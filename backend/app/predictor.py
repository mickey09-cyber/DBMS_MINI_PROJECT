"""Risk prediction used by the backend.

Uses the trained Random Forest models in ml/ (trained on SYNTHETIC data) when they are
available, otherwise fixed threshold rules. current_kind() says which one is answering.
The thresholds in _rules_predict are the same ones used to generate the synthetic training
data (ml/generate_data.py). They are a project SUGGESTION, not from the Word document.
"""
import sys
from pathlib import Path

# ml/ sits next to backend/, so the project root must be importable.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

RULES_KIND = "PLACEHOLDER_RULES"
ML_KIND = "RANDOM_FOREST_SYNTHETIC"

_ml_predict = None
_warned = False


def _get_ml():
    """Return ml.predict.predict_risk if both trained models load, else None (use fixed rules).

    Checked again on every call while the models are missing, so training them (or calling
    POST /api/models/retrain) switches the backend over without a restart.
    """
    global _ml_predict, _warned
    if _ml_predict is not None:
        return _ml_predict
    try:
        from ml.predict import predict_risk as ml_predict
        ml_predict({"max_temp_c": 30.0}, "THERMAL")
        ml_predict({"capacity_pct": 95.0}, "HEALTH")
    except Exception as exc:
        if not _warned:
            print("[predictor] ML models not available, using fixed rules:", repr(exc))
            _warned = True
        return None
    _ml_predict = ml_predict
    return _ml_predict


def reset_ml():
    """Forget the loaded models (called after retraining) so the new files are used."""
    global _ml_predict, _warned
    _ml_predict = None
    _warned = False
    module = sys.modules.get("ml.predict")
    cache = getattr(module, "_cache", None)
    if isinstance(cache, dict):
        cache.clear()


def current_kind() -> str:
    return ML_KIND if _get_ml() is not None else RULES_KIND


MODEL_KIND = current_kind()  # value at startup; kept so older imports keep working


def _rules_predict(features: dict, risk_type: str) -> dict:
    if risk_type == "THERMAL":
        value = features.get("max_temp_c")
        if value is None:
            raise ValueError("missing feature: max_temp_c")
        if value < 40:
            level = "LOW"
        elif value < 50:
            level = "MEDIUM"
        elif value < 60:
            level = "HIGH"
        else:
            level = "CRITICAL"
    elif risk_type == "HEALTH":
        value = features.get("capacity_pct")
        if value is None:
            raise ValueError("missing feature: capacity_pct")
        if value >= 90:
            level = "LOW"
        elif value >= 80:
            level = "MEDIUM"
        elif value >= 70:
            level = "HIGH"
        else:
            level = "CRITICAL"
    else:
        raise ValueError("Unknown risk_type: " + str(risk_type))

    # No confidence: fixed rules are not probabilistic, and inventing a number would mislead.
    return {"level": level, "confidence": None}


def predict_risk(features: dict, risk_type: str) -> dict:
    risk_type = str(risk_type).upper()
    ml_predict = _get_ml()
    if ml_predict is not None:
        return ml_predict(features, risk_type)
    return _rules_predict(features, risk_type)
