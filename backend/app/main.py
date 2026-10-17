
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Locate the saved model
ROOT_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT_DIR / "backend" / "models" / "churn_model_tuned.joblib"

if not MODEL_PATH.exists():
    raise RuntimeError(
        f"Model not found at {MODEL_PATH}. "
        "Run backend/ml/train_model.py first."
    )

model = joblib.load(MODEL_PATH)

app = FastAPI(
    title="ChurnSense API",
    description="Predict customer churn using a trained ML model.",
    version="1.0.0",
)

# Allow the local React development server to access this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class CustomerInput(BaseModel):
    gender: str
    SeniorCitizen: int = Field(ge=0, le=1)
    Partner: str
    Dependents: str
    tenure: int = Field(ge=0, le=100)
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    MonthlyCharges: float = Field(ge=0)
    TotalCharges: float = Field(ge=0)


@app.get("/")
def home():
    return {
        "message": "Welcome to ChurnSense API",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
    }


@app.post("/predict")
def predict_churn(customer: CustomerInput):
    try:
        # Convert validated request into one model input row
        customer_df = pd.DataFrame([customer.model_dump()])

        # Probability of churn (class 1)
        probabilities = model.predict_proba(customer_df)[0]
        churn_probability = float(probabilities[1])

        # Use the model's actual class prediction
        prediction = int(model.predict(customer_df)[0])

        return {
            "prediction": (
                "Churn likely" if prediction == 1 else "Churn unlikely"
            ),
            "churn_probability": round(churn_probability, 4),
            "risk_percentage": round(churn_probability * 100, 2),
            "model_version": "1.0.0",
        }

    except Exception as exc:
        # Log the detailed error server-side; don't expose internals.
        print(f"Prediction error: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Check the API server logs.",
        ) from exc
