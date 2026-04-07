from __future__ import annotations

from functools import lru_cache

import joblib

try:
    from .suggestions import get_task_suggestions
    from .train_model import MODEL_PATH, VECTORIZER_PATH, train_and_save_model
except ImportError:
    from suggestions import get_task_suggestions
    from train_model import MODEL_PATH, VECTORIZER_PATH, train_and_save_model


@lru_cache(maxsize=1)
def load_artifacts():
    if not MODEL_PATH.exists() or not VECTORIZER_PATH.exists():
        train_and_save_model()

    try:
        model = joblib.load(MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)
    except Exception:
        train_and_save_model()
        model = joblib.load(MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)

    return model, vectorizer


def predict_task(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Task text is required.")

    model, vectorizer = load_artifacts()
    task_vector = vectorizer.transform([text])
    probabilities = model.predict_proba(task_vector)[0]
    best_index = max(range(len(probabilities)), key=probabilities.__getitem__)
    category = str(model.classes_[best_index])
    suggestions = get_task_suggestions(category, text)

    return {
        "category": category,
        "confidence": round(float(probabilities[best_index]), 4),
        "materials": suggestions["materials"],
        "best_practices": suggestions["best_practices"],
        "safety": suggestions["safety"],
    }
