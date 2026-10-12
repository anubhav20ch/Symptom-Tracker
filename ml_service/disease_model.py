"""
Disease prediction model trained on the Symptom2Disease dataset.

Dataset: data/Symptom2Disease.csv (1,200 labeled patient symptom descriptions
across 24 disease classes, 50 samples per class). This is a *separate* model
from the symptom/body-location extractor in model.py -- this one maps a raw
free-text symptom description directly to a probable disease/condition name,
which is the "diseases it can detect" capability of the NLP engine.
"""

import csv
import os
import re
from datetime import datetime, timezone

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "Symptom2Disease.csv")

# Human-readable display names + broad category for each raw dataset label
DISEASE_META = {
    "Psoriasis": ("Psoriasis", "Dermatology"),
    "Varicose Veins": ("Varicose Veins", "Cardiovascular"),
    "Typhoid": ("Typhoid Fever", "Infectious Disease"),
    "Chicken pox": ("Chickenpox", "Infectious Disease"),
    "Impetigo": ("Impetigo", "Dermatology"),
    "Dengue": ("Dengue Fever", "Infectious Disease"),
    "Fungal infection": ("Fungal Skin Infection", "Dermatology"),
    "Common Cold": ("Common Cold", "Respiratory"),
    "Pneumonia": ("Pneumonia", "Respiratory"),
    "Dimorphic Hemorrhoids": ("Hemorrhoids (Dimorphic)", "Gastrointestinal"),
    "Arthritis": ("Arthritis", "Musculoskeletal"),
    "Acne": ("Acne", "Dermatology"),
    "Bronchial Asthma": ("Bronchial Asthma", "Respiratory"),
    "Hypertension": ("Hypertension (High Blood Pressure)", "Cardiovascular"),
    "Migraine": ("Migraine", "Neurological"),
    "Cervical spondylosis": ("Cervical Spondylosis", "Musculoskeletal"),
    "Jaundice": ("Jaundice", "Hepatic / Digestive"),
    "Malaria": ("Malaria", "Infectious Disease"),
    "urinary tract infection": ("Urinary Tract Infection", "General / Urological"),
    "allergy": ("Allergy", "ENT / Immunological"),
    "gastroesophageal reflux disease": ("Acid Reflux / GERD", "Gastrointestinal"),
    "drug reaction": ("Drug Reaction", "Dermatology / Immunological"),
    "peptic ulcer disease": ("Peptic Ulcer Disease", "Gastrointestinal"),
    "diabetes": ("Diabetes", "Endocrine"),
}


def load_dataset_from_path(file_path):
    texts, labels = [], []
    with open(file_path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = (row.get("text") or row.get("description") or row.get("symptom") or "").strip()
            label = (row.get("label") or row.get("disease") or row.get("condition") or "").strip()
            if text and label:
                texts.append(text)
                labels.append(label)
    return texts, labels


def load_dataset():
    return load_dataset_from_path(DATA_PATH)


# NLP-9: below this top-candidate confidence, the result is flagged
# low_confidence so the UI can show a review prompt instead of asserting
# the prediction outright (Phase 5 renders this; the flag itself is set
# here, next to the number it's judging). Tunable: with 24 roughly-
# balanced classes a uniform-random guess would score ~0.04, so 0.3 is a
# deliberately conservative floor, not a tight one.
LOW_CONFIDENCE_THRESHOLD = 0.3


class DiseasePredictionModel:
    """TF-IDF + Logistic Regression multiclass classifier over Symptom2Disease."""

    def __init__(self):
        self.pipeline = None
        self.classes_ = []
        self.holdout_accuracy = None
        self.holdout_f1 = None
        self.trained_at = None
        self.train()

    @property
    def model_version(self):
        # NLP-8: identifies exactly which trained artifact produced a given
        # result. Retraining (ADMIN-8/ADMIN-12) replaces this in place;
        # a full versioned model registry with rollback is Phase 4 scope
        # (ADMIN-13..15) -- this is the minimal "which model made this call"
        # answer needed now.
        if not self.trained_at:
            return "disease-model-untrained"
        return f"disease-model-{self.trained_at}"

    def train(self, custom_path=None):
        texts, labels = load_dataset() if not custom_path else load_dataset_from_path(custom_path)

        if len(texts) < 10:
            raise ValueError("Dataset must contain at least 10 valid samples to train.")

        unique_labels = sorted(set(labels))
        if len(unique_labels) < 2:
            raise ValueError("Dataset must contain at least 2 distinct disease classes.")

        # Determine if stratification is possible
        try:
            x_train, x_test, y_train, y_test = train_test_split(
                texts, labels, test_size=0.2, random_state=42, stratify=labels
            )
        except Exception:
            x_train, x_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)

        self.pipeline = Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        lowercase=True,
                        stop_words="english",
                        min_df=1,
                        sublinear_tf=True,
                    ),
                ),
                ("clf", LogisticRegression(C=5.0, max_iter=2000, random_state=42)),
            ]
        )

        self.pipeline.fit(x_train, y_train)

        preds = self.pipeline.predict(x_test)
        self.holdout_accuracy = round(float(accuracy_score(y_test, preds)), 4)
        self.holdout_f1 = round(float(f1_score(y_test, preds, average="macro")), 4)

        # Refit on the full dataset for best production accuracy once validated
        self.pipeline.fit(texts, labels)
        self.classes_ = sorted(set(labels))
        self.trained_at = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        print(
            f"[DiseaseModel] Successfully retrained on {len(texts)} samples, "
            f"{len(self.classes_)} disease classes. "
            f"Holdout accuracy={self.holdout_accuracy}, macro-F1={self.holdout_f1}"
        )
        return {
            "samples_count": len(texts),
            "classes_count": len(self.classes_),
            "classes": self.classes_,
            "holdout_accuracy": self.holdout_accuracy,
            "holdout_macro_f1": self.holdout_f1,
        }

    def disease_catalogue(self):
        return [
            {
                "raw_label": raw,
                "display_name": DISEASE_META.get(raw, (raw, "General"))[0],
                "category": DISEASE_META.get(raw, (raw, "General"))[1],
            }
            for raw in self.classes_
        ]

    def predict(self, text: str) -> dict:
        clean = re.sub(r"\s+", " ", text or "").strip()
        if not clean:
            return {
                "disease": "Unknown",
                "category": "General",
                "confidence": 0.0,
                "alternative_diseases": [],
                "candidates": [],
                "low_confidence": True,
                "model_holdout_accuracy": self.holdout_accuracy,
                "model_version": self.model_version,
            }

        probs = self.pipeline.predict_proba([clean])[0]
        classes = self.pipeline.classes_
        order = np.argsort(probs)[::-1]

        def to_candidate(idx):
            label = str(classes[idx])
            display, category = DISEASE_META.get(label, (label, "General"))
            return {"disease": display, "category": category, "confidence": round(float(probs[idx]), 3)}

        best_idx = int(order[0])
        display_name, category = DISEASE_META.get(str(classes[best_idx]), (str(classes[best_idx]), "General"))
        best_confidence = round(float(probs[best_idx]), 3)

        # NLP-10: exactly the top three candidates, unfiltered by any
        # confidence floor -- a caller that only wants "worth mentioning"
        # alternatives still has `alternative_diseases` for that.
        candidates = [to_candidate(idx) for idx in order[:3]]

        alternatives = [to_candidate(idx) for idx in order[1:4] if probs[idx] > 0.03]

        return {
            "disease": display_name,
            "category": category,
            "confidence": best_confidence,
            "alternative_diseases": alternatives,
            "candidates": candidates,
            # NLP-9: a conservative floor, not a tight one -- see
            # LOW_CONFIDENCE_THRESHOLD's own comment.
            "low_confidence": best_confidence < LOW_CONFIDENCE_THRESHOLD,
            "model_holdout_accuracy": self.holdout_accuracy,
            "model_version": self.model_version,
        }


disease_model_instance = DiseasePredictionModel()
