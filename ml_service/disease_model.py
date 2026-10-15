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
import threading
from datetime import datetime, timezone

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

import model_registry

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "Symptom2Disease.csv")
MODEL_TYPE = "disease"

# ADMIN-13: a newly trained version only auto-activates if its holdout
# accuracy clears this floor; otherwise it's recorded (ADMIN-15 still lists
# it) but left inactive pending an explicit administrator override
# (force=True on activate_version). 0.5 is a deliberately loose gate -- the
# existing dataset holds ~0.97 -- meant to catch a genuinely broken
# retrain (e.g. a garbage/mislabeled uploaded CSV), not to second-guess a
# normal accuracy dip from a smaller admin-uploaded dataset.
MIN_HOLDOUT_ACCURACY_THRESHOLD = 0.5

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
        self._train_lock = threading.Lock()
        self.train(dataset_reference="default:data/Symptom2Disease.csv")

    @property
    def model_version(self):
        # NLP-8: identifies exactly which trained artifact produced a given
        # result. This now tracks whichever registry entry is active
        # (ADMIN-13..15), not just the most recently trained one -- an
        # administrator rollback (ADMIN-14) changes which version is
        # "current" without a new training run.
        if not self.trained_at:
            return "disease-model-untrained"
        return f"disease-model-{self.trained_at}"

    def _apply_entry(self, entry, pipeline_obj=None):
        """Makes `entry`'s trained artifact the one this instance actually
        serves predictions from. Does NOT touch the registry's active flag
        -- callers (train/activate_version) decide that separately."""
        self.pipeline = pipeline_obj if pipeline_obj is not None else model_registry.load_artifact(entry["artifact_path"])
        self.classes_ = sorted(entry["metrics"]["classes"])
        self.holdout_accuracy = entry["metrics"]["holdout_accuracy"]
        self.holdout_f1 = entry["metrics"]["holdout_macro_f1"]
        self.trained_at = entry["trained_at"]

    def train(self, custom_path=None, dataset_reference=None, force_activate=False):
        with self._train_lock:
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

            candidate = Pipeline(
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

            candidate.fit(x_train, y_train)

            preds = candidate.predict(x_test)
            holdout_accuracy = round(float(accuracy_score(y_test, preds)), 4)
            holdout_f1 = round(float(f1_score(y_test, preds, average="macro")), 4)

            # Refit on the full dataset for best production accuracy once validated
            candidate.fit(texts, labels)
            classes = sorted(set(labels))
            trained_at = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            version_id = f"disease-{trained_at}"

            metrics = {
                "samples_count": len(texts),
                "classes_count": len(classes),
                "classes": classes,
                "holdout_accuracy": holdout_accuracy,
                "holdout_macro_f1": holdout_f1,
            }

            artifact_path = model_registry.save_artifact(version_id, candidate)
            entry = {
                "id": version_id,
                "model_type": MODEL_TYPE,
                "dataset_reference": dataset_reference or custom_path or "default:data/Symptom2Disease.csv",
                "trained_at": trained_at,
                "metrics": metrics,
                "artifact_path": artifact_path,
                "active": False,
                "ever_active": False,
            }

            # ADMIN-13: metrics-gated activation. A version that doesn't
            # clear the floor is still recorded (ADMIN-15) but left
            # inactive -- the previously active version keeps serving
            # predictions -- unless an administrator explicitly overrides
            # the gate (force_activate).
            meets_threshold = holdout_accuracy >= MIN_HOLDOUT_ACCURACY_THRESHOLD
            activated = meets_threshold or force_activate
            if activated:
                self._apply_entry(entry, pipeline_obj=candidate)
                entry["active"] = True
                entry["ever_active"] = True

            model_registry.add_entry(entry)
            if activated:
                model_registry.set_active(version_id, MODEL_TYPE)

            print(
                f"[DiseaseModel] Trained version {version_id} on {len(texts)} samples, "
                f"{len(classes)} disease classes. Holdout accuracy={holdout_accuracy}, "
                f"macro-F1={holdout_f1}. Activated={activated} (meets_threshold={meets_threshold})."
            )

            return {
                "version_id": version_id,
                "activated": activated,
                "meets_threshold": meets_threshold,
                "threshold": MIN_HOLDOUT_ACCURACY_THRESHOLD,
                **metrics,
            }

    def activate_version(self, version_id, force=False):
        """ADMIN-13/14: activates a specific, already-trained version. Gated
        by the same accuracy floor unless `force` is True (an explicit
        administrator override, or a rollback to a version that was
        already proven active once)."""
        entry = model_registry.get_entry(version_id)
        if not entry or entry.get("model_type") != MODEL_TYPE:
            raise KeyError(f"No {MODEL_TYPE} model version found with id {version_id}")

        meets_threshold = entry["metrics"]["holdout_accuracy"] >= MIN_HOLDOUT_ACCURACY_THRESHOLD
        if not meets_threshold and not force:
            raise ValueError(
                f"Version {version_id} has holdout accuracy "
                f"{entry['metrics']['holdout_accuracy']}, below the "
                f"{MIN_HOLDOUT_ACCURACY_THRESHOLD} activation threshold. "
                "Pass force=true to override."
            )

        with self._train_lock:
            self._apply_entry(entry)
            activated_entry = model_registry.set_active(version_id, MODEL_TYPE)
        return activated_entry

    def rollback_to(self, version_id):
        """ADMIN-14: roll back to any version that was previously activated
        at some point -- always force-activates (no gate re-check), since
        it already cleared the gate (or was explicitly overridden) the
        first time it went live."""
        entry = model_registry.get_entry(version_id)
        if not entry or entry.get("model_type") != MODEL_TYPE:
            raise KeyError(f"No {MODEL_TYPE} model version found with id {version_id}")
        if not entry.get("ever_active"):
            raise ValueError(
                f"Version {version_id} was never activated -- use /models/activate instead."
            )
        return self.activate_version(version_id, force=True)

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
