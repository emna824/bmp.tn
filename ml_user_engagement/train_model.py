from __future__ import annotations

import csv
import json
import random
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATASET_PATH = DATA_DIR / "artisan_activity_dataset.csv"
MODEL_PATH = ARTIFACTS_DIR / "user_engagement_model.joblib"
METRICS_PATH = ARTIFACTS_DIR / "training_metrics.json"

FEATURE_NAMES = [
    "loginCount",
    "projectsCreated",
    "quotesRequested",
    "quotesAccepted",
    "invoicesCreated",
    "subscriptionPayments",
]


def clamp(value: int, minimum: int = 0, maximum: int = 120) -> int:
    return max(minimum, min(maximum, int(value)))


def score_metrics(row: dict[str, int]) -> tuple[str, str]:
    engagement_score = (
        row["loginCount"] * 0.8
        + row["projectsCreated"] * 2.4
        + row["quotesRequested"] * 1.7
        + row["quotesAccepted"] * 2.7
        + row["invoicesCreated"] * 2.2
        + row["subscriptionPayments"] * 3.0
    )

    premium_score = (
        row["projectsCreated"] * 2.1
        + row["quotesAccepted"] * 2.6
        + row["invoicesCreated"] * 2.5
        + row["subscriptionPayments"] * 6.0
        + row["loginCount"] * 0.45
    )

    engagement = "LOW"
    if engagement_score >= 58:
        engagement = "HIGH"
    elif engagement_score >= 24:
        engagement = "MEDIUM"

    premium = "LOW"
    if premium_score >= 48:
        premium = "HIGH"
    elif premium_score >= 20:
        premium = "MEDIUM"

    return engagement, premium


def build_profile(rng: random.Random, profile: str) -> dict[str, int]:
    if profile == "new":
        values = {
            "loginCount": rng.randint(0, 10),
            "projectsCreated": rng.randint(0, 2),
            "quotesRequested": rng.randint(0, 3),
            "quotesAccepted": rng.randint(0, 1),
            "invoicesCreated": rng.randint(0, 1),
            "subscriptionPayments": 0,
        }
    elif profile == "active":
        values = {
            "loginCount": rng.randint(10, 35),
            "projectsCreated": rng.randint(2, 10),
            "quotesRequested": rng.randint(3, 16),
            "quotesAccepted": rng.randint(1, 8),
            "invoicesCreated": rng.randint(1, 9),
            "subscriptionPayments": rng.choices([0, 1, 2], weights=[0.72, 0.22, 0.06])[0],
        }
    elif profile == "commercial":
        values = {
            "loginCount": rng.randint(28, 80),
            "projectsCreated": rng.randint(8, 28),
            "quotesRequested": rng.randint(12, 45),
            "quotesAccepted": rng.randint(7, 32),
            "invoicesCreated": rng.randint(6, 36),
            "subscriptionPayments": rng.choices([0, 1, 2, 3, 4, 5], weights=[0.18, 0.2, 0.24, 0.2, 0.12, 0.06])[0],
        }
    else:
        values = {
            "loginCount": rng.randint(4, 24),
            "projectsCreated": rng.randint(0, 5),
            "quotesRequested": rng.randint(6, 30),
            "quotesAccepted": rng.randint(0, 5),
            "invoicesCreated": rng.randint(0, 4),
            "subscriptionPayments": rng.choices([0, 1], weights=[0.9, 0.1])[0],
        }

    # Small realistic correlation: accepted quotes often become invoices.
    if values["quotesAccepted"] > 0:
        values["invoicesCreated"] = clamp(
            max(values["invoicesCreated"], values["quotesAccepted"] - rng.randint(0, 3)),
            maximum=80,
        )

    return values


def generate_dataset(rows: int = 1200, random_state: int = 42) -> list[dict[str, int | str]]:
    rng = random.Random(random_state)
    profiles = ["new", "active", "commercial", "quote_heavy"]
    weights = [0.28, 0.38, 0.2, 0.14]
    dataset: list[dict[str, int | str]] = []

    for index in range(rows):
        profile = rng.choices(profiles, weights=weights)[0]
        metrics = build_profile(rng, profile)
        engagement, premium = score_metrics(metrics)
        dataset.append(
            {
                "artisanId": f"synthetic-artisan-{index + 1:04d}",
                **metrics,
                "engagementLevel": engagement,
                "premiumPotential": premium,
            }
        )

    return dataset


def ensure_dataset(rows: int = 1200) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dataset = generate_dataset(rows=max(rows, 1000))
    with DATASET_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["artisanId", *FEATURE_NAMES, "engagementLevel", "premiumPotential"])
        writer.writeheader()
        writer.writerows(dataset)


def load_dataset() -> tuple[list[list[int]], list[str], list[str]]:
    ensure_dataset()
    x_values: list[list[int]] = []
    engagement_labels: list[str] = []
    premium_labels: list[str] = []

    with DATASET_PATH.open("r", encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            x_values.append([int(row[name]) for name in FEATURE_NAMES])
            engagement_labels.append(row["engagementLevel"])
            premium_labels.append(row["premiumPotential"])

    return x_values, engagement_labels, premium_labels


def train_and_save_model(test_size: float = 0.2, random_state: int = 42) -> dict:
    x_values, engagement_labels, premium_labels = load_dataset()
    stratify_labels = [f"{engagement}:{premium}" for engagement, premium in zip(engagement_labels, premium_labels)]

    x_train, x_test, y_engagement_train, y_engagement_test, y_premium_train, y_premium_test = train_test_split(
        x_values,
        engagement_labels,
        premium_labels,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_labels,
    )

    engagement_model = RandomForestClassifier(n_estimators=140, max_depth=8, random_state=random_state, class_weight="balanced")
    premium_model = RandomForestClassifier(n_estimators=140, max_depth=8, random_state=random_state + 1, class_weight="balanced")
    engagement_model.fit(x_train, y_engagement_train)
    premium_model.fit(x_train, y_premium_train)

    engagement_predictions = engagement_model.predict(x_test)
    premium_predictions = premium_model.predict(x_test)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "feature_names": FEATURE_NAMES,
        "engagement_model": engagement_model,
        "premium_model": premium_model,
    }
    joblib.dump(artifact, MODEL_PATH)

    metrics = {
        "dataset_path": str(DATASET_PATH),
        "model_path": str(MODEL_PATH),
        "rows": len(x_values),
        "train_samples": len(x_train),
        "test_samples": len(x_test),
        "engagement_accuracy": round(float(accuracy_score(y_engagement_test, engagement_predictions)), 4),
        "premium_accuracy": round(float(accuracy_score(y_premium_test, premium_predictions)), 4),
        "engagement_report": classification_report(y_engagement_test, engagement_predictions, output_dict=True, zero_division=0),
        "premium_report": classification_report(y_premium_test, premium_predictions, output_dict=True, zero_division=0),
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    print(json.dumps(train_and_save_model(), indent=2))

