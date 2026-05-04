"""
Mindful Digital Soul — FastAPI Backend
Loads the pre-trained depression prediction model and serves predictions.
Production-ready: env-based config, input validation, explanation layer.
"""

import os
import time
import logging
from collections import deque
from contextlib import asynccontextmanager

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ─── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mindful-api")

# ─── Model Holder ───────────────────────────────────────────────────────────────
model = None

# ─── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown."""
    global model
    model_path = os.environ.get("MODEL_PATH", "./student_depression_best_model.pkl")
    if not os.path.exists(model_path):
        logger.error(f"Model file not found at {model_path}")
        logger.warning("API will run but predictions will return 503 until model is available.")
    else:
        model = joblib.load(model_path)
        logger.info(f"✅ Model loaded from {model_path}")
    yield
    logger.info("Shutting down Mindful Digital Soul API")

app = FastAPI(
    title="Mindful Digital Soul API",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ───────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://localhost:8080"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ─── Request Logging Middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response

# ─── In-Memory Stats (bounded) ─────────────────────────────────────────────────
MAX_STATS = 1000
stats = {"total_users": 0, "sleep_durations": deque(maxlen=MAX_STATS)}

SLEEP_HOURS_MAP = {
    "Less than 5 hours": 4.0,
    "5-6 hours": 5.5,
    "7-8 hours": 7.5,
    "More than 8 hours": 9.0,
    "Others": 6.0,
}

# ─── Factor Weights (for explanation layer) ─────────────────────────────────────
FACTOR_INFO = {
    "Sleep Duration": {
        "weight": "high",
        "good": ["7-8 hours", "More than 8 hours"],
        "risk": ["Less than 5 hours"],
        "tip": "Aim for 7-8 hours of quality sleep per night.",
    },
    "Academic Pressure": {
        "weight": "high",
        "threshold_risk": 4,
        "tip": "Break study sessions into focused 25-min blocks (Pomodoro technique).",
    },
    "Financial Stress": {
        "weight": "medium",
        "threshold_risk": 4,
        "tip": "Consider budgeting tools and campus financial counseling resources.",
    },
    "Work/Study Hours": {
        "weight": "medium",
        "threshold_risk": 10,
        "tip": "Ensure you schedule regular breaks and leisure time.",
    },
    "Dietary Habits": {
        "weight": "medium",
        "good": ["Healthy"],
        "risk": ["Unhealthy"],
        "tip": "Balanced nutrition directly impacts mental clarity and mood.",
    },
    "Study Satisfaction": {
        "weight": "medium",
        "threshold_low": 2,
        "tip": "Explore study groups or alternative learning methods.",
    },
    "Suicidal Thoughts": {
        "weight": "critical",
        "tip": "Please reach out to a mental health professional or crisis helpline.",
    },
    "Family History": {
        "weight": "informational",
        "tip": "Family history is a risk factor — proactive self-care is especially important.",
    },
}

# ─── Request / Response Models ──────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    Gender: str
    Age: float
    Academic_Pressure: float = Field(..., alias="Academic Pressure")
    Work_Pressure: float = Field(..., alias="Work Pressure")
    CGPA: float
    Study_Satisfaction: float = Field(..., alias="Study Satisfaction")
    Job_Satisfaction: float = Field(..., alias="Job Satisfaction")
    Sleep_Duration: str = Field(..., alias="Sleep Duration")
    Dietary_Habits: str = Field(..., alias="Dietary Habits")
    Degree: str
    Suicidal_Thoughts: str = Field(..., alias="Have you ever had suicidal thoughts ?")
    Work_Study_Hours: float = Field(..., alias="Work/Study Hours")
    Financial_Stress: float = Field(..., alias="Financial Stress")
    Family_History: str = Field(..., alias="Family History of Mental Illness")

    class Config:
        populate_by_name = True

    @field_validator("Age")
    @classmethod
    def validate_age(cls, v):
        if not 10 <= v <= 100:
            raise ValueError("Age must be between 10 and 100")
        return v

    @field_validator("CGPA")
    @classmethod
    def validate_cgpa(cls, v):
        if not 0 <= v <= 10:
            raise ValueError("CGPA must be between 0 and 10")
        return v

    @field_validator("Academic_Pressure", "Work_Pressure", "Study_Satisfaction")
    @classmethod
    def validate_pressure_scale(cls, v):
        if not 0 <= v <= 5:
            raise ValueError("Value must be between 0 and 5")
        return v

    @field_validator("Job_Satisfaction")
    @classmethod
    def validate_job_satisfaction(cls, v):
        if not 0 <= v <= 4:
            raise ValueError("Job Satisfaction must be between 0 and 4")
        return v

    @field_validator("Work_Study_Hours")
    @classmethod
    def validate_work_hours(cls, v):
        if not 0 <= v <= 24:
            raise ValueError("Work/Study Hours must be between 0 and 24")
        return v

    @field_validator("Financial_Stress")
    @classmethod
    def validate_financial_stress(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Financial Stress must be between 1 and 5")
        return v


class FactorExplanation(BaseModel):
    factor: str
    status: str          # "positive", "neutral", "risk", "critical"
    detail: str
    suggestion: str


class PredictionResponse(BaseModel):
    label: str
    confidence: float
    risk_score: float
    total_users: int
    avg_sleep_duration: float
    message: str
    explanations: list[FactorExplanation]
    suggestions: list[str]


# ─── Explanation Engine ─────────────────────────────────────────────────────────

def build_explanations(req: PredictionRequest) -> tuple[list[FactorExplanation], list[str]]:
    """Analyze input factors and produce human-readable explanations."""
    explanations = []
    suggestions = []

    # Sleep Duration
    sleep = req.Sleep_Duration
    info = FACTOR_INFO["Sleep Duration"]
    if sleep in info.get("risk", []):
        explanations.append(FactorExplanation(
            factor="Sleep Duration",
            status="risk",
            detail=f"Your sleep duration ({sleep}) is below recommended levels.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])
    elif sleep in info.get("good", []):
        explanations.append(FactorExplanation(
            factor="Sleep Duration",
            status="positive",
            detail=f"Your sleep duration ({sleep}) is in a healthy range.",
            suggestion="Keep maintaining your sleep schedule!",
        ))
    else:
        explanations.append(FactorExplanation(
            factor="Sleep Duration",
            status="neutral",
            detail=f"Your sleep duration ({sleep}) is moderate.",
            suggestion=info["tip"],
        ))

    # Academic Pressure
    info = FACTOR_INFO["Academic Pressure"]
    if req.Academic_Pressure >= info["threshold_risk"]:
        explanations.append(FactorExplanation(
            factor="Academic Pressure",
            status="risk",
            detail=f"High academic pressure ({int(req.Academic_Pressure)}/5) is a significant stress factor.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])
    elif req.Academic_Pressure <= 2:
        explanations.append(FactorExplanation(
            factor="Academic Pressure",
            status="positive",
            detail=f"Your academic pressure ({int(req.Academic_Pressure)}/5) appears manageable.",
            suggestion="Great balance — keep it up!",
        ))

    # Financial Stress
    info = FACTOR_INFO["Financial Stress"]
    if req.Financial_Stress >= info["threshold_risk"]:
        explanations.append(FactorExplanation(
            factor="Financial Stress",
            status="risk",
            detail=f"Elevated financial stress ({int(req.Financial_Stress)}/5) can impact mental wellbeing.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])

    # Work/Study Hours
    info = FACTOR_INFO["Work/Study Hours"]
    if req.Work_Study_Hours >= info["threshold_risk"]:
        explanations.append(FactorExplanation(
            factor="Work/Study Hours",
            status="risk",
            detail=f"Long work/study hours ({int(req.Work_Study_Hours)}h/day) can lead to burnout.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])

    # Dietary Habits
    info = FACTOR_INFO["Dietary Habits"]
    if req.Dietary_Habits in info.get("risk", []):
        explanations.append(FactorExplanation(
            factor="Dietary Habits",
            status="risk",
            detail="Unhealthy dietary habits can negatively affect mood and energy.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])
    elif req.Dietary_Habits in info.get("good", []):
        explanations.append(FactorExplanation(
            factor="Dietary Habits",
            status="positive",
            detail="Your healthy dietary habits support mental wellness.",
            suggestion="Excellent — nutrition is a strong foundation!",
        ))

    # Study Satisfaction
    info = FACTOR_INFO["Study Satisfaction"]
    if req.Study_Satisfaction <= info.get("threshold_low", 2):
        explanations.append(FactorExplanation(
            factor="Study Satisfaction",
            status="risk",
            detail=f"Low study satisfaction ({int(req.Study_Satisfaction)}/5) may indicate academic disengagement.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])

    # Suicidal Thoughts (critical flag)
    if req.Suicidal_Thoughts == "Yes":
        info = FACTOR_INFO["Suicidal Thoughts"]
        explanations.append(FactorExplanation(
            factor="Mental Wellness Flag",
            status="critical",
            detail="You've indicated experience with suicidal thoughts.",
            suggestion=info["tip"],
        ))
        suggestions.insert(0, info["tip"])

    # Family History
    if req.Family_History == "Yes":
        info = FACTOR_INFO["Family History"]
        explanations.append(FactorExplanation(
            factor="Family History",
            status="informational",
            detail="A family history of mental illness is a known risk factor.",
            suggestion=info["tip"],
        ))
        suggestions.append(info["tip"])

    # Deduplicate suggestions
    seen = set()
    unique_suggestions = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            unique_suggestions.append(s)

    return explanations, unique_suggestions


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@app.post("/api/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please try again later.")

    data = {
        "Gender": [req.Gender],
        "Age": [req.Age],
        "Academic Pressure": [req.Academic_Pressure],
        "Work Pressure": [req.Work_Pressure],
        "CGPA": [req.CGPA],
        "Study Satisfaction": [req.Study_Satisfaction],
        "Job Satisfaction": [req.Job_Satisfaction],
        "Sleep Duration": [req.Sleep_Duration],
        "Dietary Habits": [req.Dietary_Habits],
        "Degree": [req.Degree],
        "Have you ever had suicidal thoughts ?": [req.Suicidal_Thoughts],
        "Work/Study Hours": [req.Work_Study_Hours],
        "Financial Stress": [req.Financial_Stress],
        "Family History of Mental Illness": [req.Family_History],
    }
    df = pd.DataFrame(data)

    try:
        proba_output = model.predict_proba(df)[0]
        # Handle both binary and multi-class: take the last class probability
        proba = float(proba_output[-1]) if len(proba_output) >= 2 else float(proba_output[0])
    except AttributeError:
        # Model doesn't support predict_proba — use predict
        try:
            pred = model.predict(df)[0]
            proba = float(pred)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Prediction failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Prediction failed: {str(e)}")

    if proba < 0.3:
        label = "Excellent"
        message = "Your mental wellness indicators look great! Keep up the healthy habits and continue prioritizing your well-being."
    elif proba < 0.6:
        label = "Good"
        message = "You're doing okay overall, but some areas could use attention. Consider monitoring your stress levels and sleep quality."
    else:
        label = "Needs Attention"
        message = "Some indicators suggest elevated risk. Please consider reaching out to a counselor or mental health professional for support."

    risk_score = round(proba * 100, 1)
    confidence = round((1 - proba if proba < 0.5 else proba) * 100, 1)

    # Build explanations
    explanations, suggestions = build_explanations(req)

    # Update stats (bounded)
    stats["total_users"] += 1
    stats["sleep_durations"].append(SLEEP_HOURS_MAP.get(req.Sleep_Duration, 6.0))
    avg_sleep = round(sum(stats["sleep_durations"]) / len(stats["sleep_durations"]), 1)

    return PredictionResponse(
        label=label,
        confidence=confidence,
        risk_score=risk_score,
        total_users=stats["total_users"],
        avg_sleep_duration=avg_sleep,
        message=message,
        explanations=explanations,
        suggestions=suggestions,
    )


@app.get("/api/stats")
def get_stats():
    avg_sleep = 0.0
    if stats["sleep_durations"]:
        avg_sleep = round(sum(stats["sleep_durations"]) / len(stats["sleep_durations"]), 1)
    return {"total_users": stats["total_users"], "avg_sleep_duration": avg_sleep}


@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring and cold-start pinging."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "total_predictions": stats["total_users"],
    }


@app.get("/")
def root():
    return {"status": "ok", "message": "Mindful Digital Soul API v2.0 is running"}
