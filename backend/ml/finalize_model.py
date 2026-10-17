
from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]

DATA_PATH = ROOT / "data" / "Telco-Customer-Churn.csv"
MODEL_DIR = ROOT / "backend" / "models"
MODEL_PATH = MODEL_DIR / "churn_model_tuned.joblib"

# Load and prepare data
df = pd.read_csv(DATA_PATH)
df = df.drop(columns=["customerID"])

df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"].astype(str).str.strip(),
    errors="coerce",
)

y = df.pop("Churn").map({"No": 0, "Yes": 1})
X = df

if y.isna().any():
    raise ValueError("Unexpected values found in the Churn target.")

# Reproduce the original train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

numeric = X.select_dtypes(include="number").columns.tolist()
categorical = X.select_dtypes(
    include=["object", "category", "string"]
).columns.tolist()

preprocessor = ColumnTransformer([
    ("num", Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ]), numeric),
    ("cat", Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore")),
    ]), categorical),
])

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=42,
    )),
])

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42,
)

search = GridSearchCV(
    pipeline,
    param_grid={
        "classifier__C": [0.01, 0.1, 1.0, 10.0, 100.0],
    },
    scoring="roc_auc",
    cv=cv,
    n_jobs=-1,
    refit=True,
)

print("Training and tuning model...")
search.fit(X_train, y_train)

best_model = search.best_estimator_

# Final evaluation on the held-out split
predictions = best_model.predict(X_test)
probabilities = best_model.predict_proba(X_test)[:, 1]

print("\n--- SELECTED MODEL ---")
print("Best parameters:", search.best_params_)
print(f"Best CV ROC-AUC: {search.best_score_:.4f}")

print("\n--- TEST SET RESULTS ---")
print(f"Accuracy:  {accuracy_score(y_test, predictions):.4f}")
print(f"Precision: {precision_score(y_test, predictions, zero_division=0):.4f}")
print(f"Recall:    {recall_score(y_test, predictions, zero_division=0):.4f}")
print(f"F1-score:  {f1_score(y_test, predictions, zero_division=0):.4f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, probabilities):.4f}")

print("\nConfusion matrix:")
print(confusion_matrix(y_test, predictions, labels=[0, 1]))

print("\nClassification report:")
print(classification_report(
    y_test,
    predictions,
    labels=[0, 1],
    target_names=["Stayed", "Churned"],
    zero_division=0,
))

# Save separately; don't replace the current API model yet.
MODEL_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(best_model, MODEL_PATH)

print(f"\nTuned model saved to: {MODEL_PATH}")
print("Existing API model has not been overwritten.")
