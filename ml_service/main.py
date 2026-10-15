from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import jobs
import model_registry
from dataset import CANONICAL_SYMPTOMS
from disease_model import disease_model_instance
from model import model_instance
from numerical_model import numerical_model_instance

app = FastAPI(
    title="SymptomLog ML/NLP Microservice",
    description="Microservice for extracting symptoms, numerical biomarkers (Emotion 1-10, Pain, Stress, Energy), and clinical classification.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    text: str = Field(..., description="Free text user description of their symptoms", min_length=1)


class AlternativeSymptom(BaseModel):
    symptom: str
    category: str
    confidence: float


class ExtractResponse(BaseModel):
    symptom: str
    category: str
    confidence: float
    suggested_severity: int
    body_location: str
    trigger: str
    alternative_symptoms: List[AlternativeSymptom]
    extracted_keywords: List[str]
    # NLP-8: identifies exactly which trained artifact produced this result.
    model_version: Optional[str] = None


class FeedbackRequest(BaseModel):
    entry_id: Optional[str] = None
    original_text: str
    predicted_symptom: str
    corrected_symptom: Optional[str] = None
    was_helpful: bool
    comment: Optional[str] = None


class DiseasePredictRequest(BaseModel):
    text: str = Field(..., description="Free text description of symptoms", min_length=1)


class AlternativeDisease(BaseModel):
    disease: str
    category: str
    confidence: float


class DiseasePredictResponse(BaseModel):
    disease: str
    category: str
    confidence: float
    alternative_diseases: List[AlternativeDisease]
    # NLP-10: exactly the top three candidates (unfiltered), for a caller
    # that wants to show more than just the "worth mentioning" alternatives.
    candidates: List[AlternativeDisease] = []
    # NLP-9: true when `confidence` is below the model's own conservative
    # floor (see disease_model.LOW_CONFIDENCE_THRESHOLD).
    low_confidence: bool = False
    model_holdout_accuracy: Optional[float] = None
    # NLP-8: identifies exactly which trained artifact produced this result.
    model_version: Optional[str] = None
    disclaimer: str = (
        "Advisory NLP estimate only, trained on the Symptom2Disease dataset. "
        "Not a certified medical diagnosis -- consult a licensed physician."
    )


class NumericalClassifyRequest(BaseModel):
    emotion_score: float = Field(..., ge=1.0, le=10.0, description="1=Sad/Agony, 10=Happy/Serene")
    pain_severity: float = Field(..., ge=1.0, le=10.0, description="1=Minimal, 10=Excruciating")
    energy_level: Optional[float] = Field(5.0, ge=1.0, le=10.0, description="1=Bedridden, 10=Peak Vitality")
    stress_level: Optional[float] = Field(5.0, ge=1.0, le=10.0, description="1=Calm, 10=Extreme Panic")
    sleep_quality: Optional[float] = Field(5.0, ge=1.0, le=10.0, description="1=Severe Insomnia, 10=Restorative 8h")
    functional_impairment: Optional[float] = Field(3.0, ge=1.0, le=10.0, description="1=Normal, 10=Incapacitated")
    duration_days: Optional[float] = Field(1.0, ge=0.0)
    frequency_30d: Optional[int] = Field(1, ge=1)
    is_red_flag_symptom: Optional[int] = Field(0, ge=0, le=1)
    is_known_chronic: Optional[int] = Field(0, ge=0, le=1)
    body_location_code: Optional[int] = Field(1, ge=1, le=10)
    symptom_category_code: Optional[int] = Field(1, ge=1, le=8)


class SmartAnalyzeRequest(BaseModel):
    text: str = Field(..., description="Natural language free-text of how patient is feeling", min_length=1)
    user_chronic_conditions: Optional[List[str]] = None
    overrides: Optional[Dict[str, Any]] = None


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SymptomLog Numerical & ML/NLP Engine",
        "numerical_model_holdout_accuracy": numerical_model_instance.holdout_accuracy,
        "disease_classes_count": len(disease_model_instance.classes_),
        "disease_model_holdout_accuracy": disease_model_instance.holdout_accuracy,
    }


@app.post("/extract", response_model=ExtractResponse)
def extract_symptom(req: ExtractRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    result = model_instance.predict(req.text)
    return result


@app.post("/numerical/classify")
def classify_numerical(req: NumericalClassifyRequest):
    """
    Direct numerical classifier based on the clinical biomarkers dataset.
    """
    feature_dict = req.model_dump()
    result = numerical_model_instance.predict(feature_dict)
    return {"features": feature_dict, "prediction": result, "model_accuracy": numerical_model_instance.holdout_accuracy}


@app.post("/numerical/smart-analyze")
def smart_analyze(req: SmartAnalyzeRequest):
    """
    Translates free-text natural language into numerical clinical biomarkers
    (Happy=10, Sad=1, Pain 1-10, Stress, Energy) and predicts triage classification.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = numerical_model_instance.analyze_text_and_predict(
        text=req.text, user_chronic_conditions=req.user_chronic_conditions, overrides=req.overrides
    )
    return result


@app.get("/numerical/stats")
def numerical_stats():
    """
    Returns statistical metrics, holdout accuracy, and feature importances
    for the numerical clinical model.
    """
    return {
        "holdout_accuracy": numerical_model_instance.holdout_accuracy,
        "feature_importances": numerical_model_instance.feature_importances,
        "scoring_scales": {
            "emotion_score": "1 = Extreme Sadness/Agony/Despair to 10 = Happy/Joyful/Peak Wellbeing",
            "pain_severity": "1 = Minimal to 10 = Excruciating Pain",
            "energy_level": "1 = Completely Exhausted/Bedridden to 10 = Vibrant Energy",
            "stress_level": "1 = Completely Calm to 10 = Severe Panic/Crisis",
            "sleep_quality": "1 = Severe Insomnia to 10 = Restorative 8+ Hours",
            "functional_impairment": "1 = Normal Activities to 10 = Fully Incapacitated",
        },
    }


@app.get("/dictionary")
def get_symptom_dictionary():
    dict_items = []
    for s in CANONICAL_SYMPTOMS:
        dict_items.append(
            {
                "name": s,
                "category": model_instance.category_map.get(s, "General"),
                "typical_location": model_instance.default_location_map.get(s, "General Body"),
            }
        )
    return {"symptoms": dict_items}


@app.post("/feedback")
def collect_feedback(fb: FeedbackRequest):
    print(f"[ML FEEDBACK RECEIVED] entry={fb.entry_id} helpful={fb.was_helpful} comment={fb.comment}")
    return {"status": "success", "message": "Feedback recorded for model retraining pipeline"}


@app.post("/predict-disease", response_model=DiseasePredictResponse)
def predict_disease(req: DiseasePredictRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    result = disease_model_instance.predict(req.text)
    return result


@app.get("/diseases")
def list_supported_diseases():
    return {
        "count": len(disease_model_instance.classes_),
        "diseases": disease_model_instance.disease_catalogue(),
        "model_holdout_accuracy": disease_model_instance.holdout_accuracy,
        "model_holdout_macro_f1": disease_model_instance.holdout_f1,
    }


class RetrainRequest(BaseModel):
    custom_dataset_path: Optional[str] = None
    dataset_reference: Optional[str] = None
    # ADMIN-13 override: activate the newly trained version even if its
    # holdout accuracy doesn't clear MIN_HOLDOUT_ACCURACY_THRESHOLD.
    force_activate: Optional[bool] = False


# ADMIN-12: retraining now runs as an asynchronous background job. The
# triggering request returns a job id immediately; GET /retrain/{job_id}
# polls status/progress/result instead of the caller blocking on however
# long training actually takes.
@app.post("/retrain")
def retrain_model(req: Optional[RetrainRequest] = None):
    job_id = jobs.create_job("disease_retrain")

    def _run():
        jobs.update_job(job_id, status="running", progress=10)
        try:
            stats = disease_model_instance.train(
                custom_path=req.custom_dataset_path if req else None,
                dataset_reference=req.dataset_reference if req else None,
                force_activate=bool(req and req.force_activate),
            )
            jobs.update_job(job_id, status="completed", progress=100, result=stats)
        except Exception as e:
            jobs.update_job(job_id, status="failed", progress=100, error=str(e))

    jobs.run_in_background(_run)
    return {"job_id": job_id, "status": "queued"}


@app.get("/retrain/{job_id}")
def retrain_job_status(job_id: str):
    job = jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Retraining job not found")
    return job


# ADMIN-15: full model-version history (metrics + activation status).
@app.get("/models")
def list_model_versions(model_type: Optional[str] = None):
    return {"versions": model_registry.list_entries(model_type)}


class ActivateModelRequest(BaseModel):
    version_id: str
    # ADMIN-13 override: bypass the metrics gate for a brand-new version.
    force: Optional[bool] = False


# ADMIN-13: activates a specific trained version, subject to metrics-gated
# activation unless explicitly overridden.
@app.post("/models/activate")
def activate_model_version(req: ActivateModelRequest):
    try:
        entry = disease_model_instance.activate_version(req.version_id, force=req.force)
        return {"status": "activated", "version": entry}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


class RollbackModelRequest(BaseModel):
    version_id: str


# ADMIN-14: rolls back to any previously activated version, no gate
# re-check (it already cleared the gate, or was explicitly overridden,
# the first time it went live).
@app.post("/models/rollback")
def rollback_model_version(req: RollbackModelRequest):
    try:
        entry = disease_model_instance.rollback_to(req.version_id)
        return {"status": "rolled_back", "version": entry}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
