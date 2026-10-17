
from pathlib import Path

import joblib
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "Telco-Customer-Churn.csv"
MODEL_PATH = ROOT / "backend" / "models" / "churn_model.joblib"
OUTPUT_DIR = ROOT / "backend" / "ml" / "evaluation_outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load the same data and saved pipeline
df = pd.read_csv(DATA_PATH)
df = df.drop(columns=["customerID"])

df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"].astype(str).str.strip(),
    errors="coerce",
)

y = df["Churn"].map({"No": 0, "Yes": 1})
X = df.drop(columns=["Churn"])

# Must match the original training split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

model = joblib.load(MODEL_PATH)

# Predictions from the untouched test set
probabilities = model.predict_proba(X_test)[:, 1]
predictions = model.predict(X_test)

print("\n--- BASELINE TEST RESULTS ---")
print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
print(f"ROC-AUC: {roc_auc_score(y_test, probabilities):.4f}")
print("\nClassification report:")
print(
    classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["Stayed", "Churned"],
        zero_division=0,
    )
)

# 1. Confusion matrix
cm = confusion_matrix(y_test, predictions, labels=[0, 1])

sns.set_theme(style="whitegrid")
fig, ax = plt.subplots(figsize=(6, 5))

sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Blues",
    xticklabels=["Stayed", "Churned"],
    yticklabels=["Stayed", "Churned"],
    ax=ax,
)

ax.set_title("Confusion Matrix — Logistic Regression")
ax.set_xlabel("Predicted")
ax.set_ylabel("Actual")
fig.tight_layout()
fig.savefig(OUTPUT_DIR / "confusion_matrix.png", dpi=150)
plt.close(fig)

# 2. ROC curve
fpr, tpr, thresholds = roc_curve(y_test, probabilities)
auc = roc_auc_score(y_test, probabilities)

fig, ax = plt.subplots(figsize=(7, 5))
ax.plot(fpr, tpr, label=f"Logistic Regression (AUC={auc:.3f})")
ax.plot([0, 1], [0, 1], linestyle="--", label="Random baseline")

ax.set_title("ROC Curve")
ax.set_xlabel("False Positive Rate")
ax.set_ylabel("True Positive Rate")
ax.legend()
fig.tight_layout()
fig.savefig(OUTPUT_DIR / "roc_curve.png", dpi=150)
plt.close(fig)

# 3. Explore thresholds (diagnostic only)
print("\n--- THRESHOLD COMPARISON ---")
print("Threshold | Precision | Recall | F1-score")

for threshold in [0.30, 0.40, 0.50, 0.60, 0.70]:
    threshold_predictions = (probabilities >= threshold).astype(int)

    report = classification_report(
        y_test,
        threshold_predictions,
        labels=[0, 1],
        output_dict=True,
        zero_division=0,
    )

    churn_metrics = report["1"]

    print(
        f"{threshold:9.2f} | "
        f"{churn_metrics['precision']:.3f}     | "
        f"{churn_metrics['recall']:.3f} | "
        f"{churn_metrics['f1-score']:.3f}"
    )

print(f"\nEvaluation charts saved in: {OUTPUT_DIR}")
