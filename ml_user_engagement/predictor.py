from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import joblib

try:
    from .train_model import FEATURE_NAMES, MODEL_PATH, score_metrics, train_and_save_model
except ImportError:
    from train_model import FEATURE_NAMES, MODEL_PATH, score_metrics, train_and_save_model


FEATURE_CATALOG = {
    "Calendar conflict management": ("quotesRequested", "quotesAccepted"),
    "AI project insights": ("projectsCreated", "quotesAccepted"),
    "Invoice archiving": ("invoicesCreated",),
    "Marketplace recommendations": ("quotesRequested",),
    "Premium project management": ("projectsCreated", "invoicesCreated"),
}


def safe_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def normalize_metrics(payload: dict[str, Any]) -> dict[str, int]:
    return {name: safe_int(payload.get(name)) for name in FEATURE_NAMES}


def probability_for_label(model: Any, row: list[int], label: str) -> float:
    classes = list(getattr(model, "classes_", []))
    probabilities = model.predict_proba([row])[0]
    if label not in classes:
        return 0.0
    return float(probabilities[classes.index(label)])


def heuristic_confidence(metrics: dict[str, int], label: str, kind: str) -> float:
    engagement, premium = score_metrics(metrics)
    selected = engagement if kind == "engagement" else premium
    total = sum(metrics.values())
    base = 0.58 if selected == label else 0.44
    return min(0.94, base + min(total, 55) / 180)


def suggested_features(metrics: dict[str, int], engagement: str, premium: str) -> list[str]:
    features: list[str] = []

    if metrics["quotesRequested"] >= 6 or metrics["quotesAccepted"] >= 3:
        features.append("Calendar conflict management")
    if metrics["projectsCreated"] >= 3:
        features.append("AI project insights")
    if metrics["invoicesCreated"] >= 2:
        features.append("Invoice archiving")
    if metrics["quotesRequested"] >= 4 and metrics["quotesAccepted"] <= max(1, metrics["quotesRequested"] // 4):
        features.append("Marketplace recommendations")
    if premium in {"MEDIUM", "HIGH"} or engagement == "HIGH":
        features.append("Premium project management")

    if not features:
        features.append("Marketplace recommendations")

    return list(dict.fromkeys(features))[:4]


def recommendation_message(metrics: dict[str, int], engagement: str, premium: str, features: list[str]) -> str:
    if engagement == "HIGH" and premium == "HIGH":
        return "Highly active artisan detected. Recommend Premium subscription."
    if metrics["projectsCreated"] >= 4 and metrics["invoicesCreated"] >= 3:
        return "This artisan frequently creates projects and invoices. Suggest advanced project management tools."
    if "AI project insights" in features:
        return "Recommend AI analytics dashboard for improved project monitoring."
    if metrics["quotesRequested"] >= 5:
        return "Quote activity is rising. Recommend marketplace recommendations and calendar conflict management."
    return "Engagement is still developing. Recommend feature discovery through marketplace recommendations."


def predict(payload: dict[str, Any]) -> dict[str, Any]:
    metrics = normalize_metrics(payload)
    row = [metrics[name] for name in FEATURE_NAMES]
    source = "ml"

    try:
        if not Path(MODEL_PATH).exists():
            train_and_save_model()
        artifact = joblib.load(MODEL_PATH)
        engagement_model = artifact["engagement_model"]
        premium_model = artifact["premium_model"]
        engagement = str(engagement_model.predict([row])[0])
        premium = str(premium_model.predict([row])[0])
        engagement_confidence = probability_for_label(engagement_model, row, engagement)
        premium_confidence = probability_for_label(premium_model, row, premium)
    except Exception:
        source = "heuristic"
        engagement, premium = score_metrics(metrics)
        engagement_confidence = heuristic_confidence(metrics, engagement, "engagement")
        premium_confidence = heuristic_confidence(metrics, premium, "premium")

    features = suggested_features(metrics, engagement, premium)
    confidence = round((engagement_confidence + premium_confidence) / 2, 4)

    return {
        "metrics": metrics,
        "engagementLevel": engagement,
        "premiumPotential": premium,
        "premiumProbability": {"LOW": 0.18, "MEDIUM": 0.56, "HIGH": 0.86}.get(premium, 0.25),
        "suggestedFeatures": features,
        "recommendationMessage": recommendation_message(metrics, engagement, premium, features),
        "confidenceScore": confidence,
        "source": source,
    }


if __name__ == "__main__":
    raw_payload = sys.stdin.read().strip() or "{}"
    print(json.dumps(predict(json.loads(raw_payload)), ensure_ascii=False))
