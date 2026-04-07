from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from .predictor import predict_task
except ImportError:
    from predictor import predict_task


app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    task = payload.get("task", "")

    if not isinstance(task, str) or not task.strip():
        return jsonify({"message": "task is required"}), 400

    try:
        return jsonify(predict_task(task))
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    except Exception as error:
        return jsonify({"message": "Prediction failed", "details": str(error)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
