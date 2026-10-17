
from pathlib import Path

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import make_scorer, f1_score
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "Telco-Customer-Churn.csv"

df = pd.read_csv(DATA_PATH)
df = df.drop(columns=["customerID"])

df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"].astype(str).str.strip(),
    errors="coerce",
)

y = df.pop("Churn").map({"No": 0, "Yes": 1})
X = df

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
    estimator=pipeline,
    param_grid={
        "classifier__C": [0.01, 0.1, 1.0, 10.0, 100.0],
    },
    scoring={
        "roc_auc": "roc_auc",
        "f1": make_scorer(f1_score, zero_division=0),
        "recall": "recall",
        "precision": "precision",
    },
    refit="roc_auc",
    cv=cv,
    n_jobs=-1,
)

search.fit(X_train, y_train)

print("Best parameters:", search.best_params_)
print(f"Best CV ROC-AUC: {search.best_score_:.4f}")

results = pd.DataFrame(search.cv_results_)
columns = [
    "param_classifier__C",
    "mean_test_roc_auc",
    "mean_test_f1",
    "mean_test_recall",
    "mean_test_precision",
]
print("\n--- CROSS-VALIDATION RESULTS ---")
print(results[columns].to_string(index=False))

print("\nBest model selected using CV ROC-AUC.")
print("The test set has not been used to select the parameters.")
print("Next: evaluate this chosen model once on the held-out test set.")
