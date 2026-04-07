from __future__ import annotations

import json
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

try:
    from .text_utils import normalize_text
except ImportError:
    from text_utils import normalize_text


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "task_dataset.json"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "task_classifier.joblib"
VECTORIZER_PATH = ARTIFACTS_DIR / "task_vectorizer.joblib"
METRICS_PATH = ARTIFACTS_DIR / "training_metrics.json"


def load_dataset() -> tuple[list[str], list[str]]:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    texts: list[str] = []
    labels: list[str] = []

    for category, samples in dataset.items():
        for sample in samples:
            texts.append(sample)
            labels.append(category)

    return texts, labels


def train_and_save_model(test_size: float = 0.2, random_state: int = 42) -> dict:
    texts, labels = load_dataset()

    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=test_size,
        random_state=random_state,
        stratify=labels,
    )

    vectorizer = TfidfVectorizer(
        preprocessor=normalize_text,
        ngram_range=(1, 2),
        min_df=1,
    )
    x_train_vectors = vectorizer.fit_transform(x_train)
    x_test_vectors = vectorizer.transform(x_test)

    model = LogisticRegression(max_iter=1000)
    model.fit(x_train_vectors, y_train)

    predictions = model.predict(x_test_vectors)
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    metrics = {
        "accuracy": round(float(accuracy), 4),
        "train_samples": len(x_train),
        "test_samples": len(x_test),
        "categories": sorted(set(labels)),
        "classification_report": report,
        "model_path": str(MODEL_PATH),
        "vectorizer_path": str(VECTORIZER_PATH),
    }
    METRICS_PATH.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

    return metrics


if __name__ == "__main__":
    training_summary = train_and_save_model()
    print(json.dumps(training_summary, ensure_ascii=False, indent=2))
