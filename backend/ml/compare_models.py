
from pathlib import Path

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split, cross_validate, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
df = pd.read_csv(ROOT / "data" / "Telco-Customer-Churn.csv")

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

def make_pipeline(classifier):
    preprocess = ColumnTransformer([
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), numeric),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]), categorical),
    ])

    return Pipeline([
        ("preprocessor", preprocess),
        ("classifier", classifier),
    ])

models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    ),
}

# Compare using cross-validation on training data only.
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scoring = {
    "roc_auc": "roc_auc",
    "f1": "f1",
    "recall": "recall",
    "precision": "precision",
}

for name, classifier in models.items():
    pipeline = make_pipeline(classifier)

    scores = cross_validate(
        pipeline,
        X_train,
        y_train,
        cv=cv,
        scoring=scoring,
        n_jobs=-1,
    )

    print(f"\n--- {name} (5-fold CV) ---")
    for metric in scoring:
        values = scores[f"test_{metric}"]
        print(f"{metric}: {values.mean():.4f} +/- {values.std():.4f}")

# Fit candidates on training data and inspect their held-out
# test metrics as a final comparison after CV.
# Treat these test results as exploratory if choosing a model
# based on them; ideally reserve a final test set for one-time use.
for name, classifier in models.items():
    pipeline = make_pipeline(classifier)
    pipeline.fit(X_train, y_train)

    pred = pipeline.predict(X_test)
    prob = pipeline.predict_proba(X_test)[:, 1]

    print(f"\n--- {name} (test set) ---")
    print(f"Accuracy:  {accuracy_score(y_test, pred):.4f}")
    print(f"Precision: {precision_score(y_test, pred, zero_division=0):.4f}")
    print(f"Recall:    {recall_score(y_test, pred, zero_division=0):.4f}")
    print(f"F1-score:  {f1_score(y_test, pred, zero_division=0):.4f}")
    print(f"ROC-AUC:   {roc_auc_score(y_test, prob):.4f}")
