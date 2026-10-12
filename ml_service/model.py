import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from dataset import TRAINING_DATA


class SymptomNLPModel:
    def __init__(self):
        self.pipeline = None
        self.category_map = {}
        self.default_location_map = {}
        self.default_severity_map = {}
        self.train()

    def train(self):
        texts = []
        labels = []
        for text, symptom, category, sev, loc, trigger in TRAINING_DATA:
            texts.append(text)
            labels.append(symptom)
            self.category_map[symptom] = category
            self.default_location_map[symptom] = loc
            self.default_severity_map[symptom] = sev

        # Pipeline: TF-IDF with unigrams, bigrams, trigrams + Logistic Regression
        self.pipeline = Pipeline(
            [
                ("tfidf", TfidfVectorizer(ngram_range=(1, 3), lowercase=True, stop_words="english", min_df=1)),
                ("clf", LogisticRegression(C=3.0, max_iter=1000, random_state=42)),
            ]
        )

        self.pipeline.fit(texts, labels)
        print(f"Model trained on {len(texts)} samples across {len(set(labels))} symptom classes.")

    def extract_severity(self, text: str) -> int:
        lower = text.lower()

        # Explicit score e.g. "8/10", "severity 7", "level 9", "rated 5"
        score_match = re.search(r"(\b[0-9]|10)\s*(?:/|out of|\b)\s*10\b", lower)
        if score_match:
            try:
                val = int(score_match.group(1))
                if 1 <= val <= 10:
                    return val
            except ValueError:
                pass

        score_word_match = re.search(r"(?:severity|level|pain)\s*(?:is|of|level|:)?\s*([0-9]|10)\b", lower)
        if score_word_match:
            try:
                val = int(score_word_match.group(1))
                if 1 <= val <= 10:
                    return val
            except ValueError:
                pass

        # Keywords
        urgent_keywords = ["excruciating", "unbearable", "crushing", "worst ever", "extreme pain", "emergency", "agony"]
        if any(k in lower for k in urgent_keywords):
            return 9

        high_keywords = [
            "severe",
            "very intense",
            "throbbing badly",
            "sharp stabbing",
            "debilitating",
            "hurts intensely",
        ]
        if any(k in lower for k in high_keywords):
            return 8

        mod_high_keywords = ["intense", "pounding", "heavy pressure", "quite painful", "feverish"]
        if any(k in lower for k in mod_high_keywords):
            return 6

        mod_keywords = ["moderate", "constant ache", "uncomfortable", "stiff", "scratchy", "burning"]
        if any(k in lower for k in mod_keywords):
            return 5

        mild_keywords = ["mild", "slight", "minor", "a bit", "little bit", "dull ache", "light"]
        if any(k in lower for k in mild_keywords):
            return 3

        return 5  # default fallback

    def extract_body_location(self, text: str, predicted_symptom: str) -> str:
        lower = text.lower()
        location_keywords = [
            (
                "Head / Face",
                ["head", "forehead", "temple", "temples", "scalp", "face", "eyes", "eye", "sinus", "sinuses", "cheek"],
            ),
            ("Throat", ["throat", "swallow", "tonsil", "glands", "vocal"]),
            ("Neck / Shoulders", ["neck", "cervical", "shoulder", "shoulders", "trapezius"]),
            ("Chest", ["chest", "ribs", "sternum", "lungs", "heart", "breast"]),
            ("Upper Abdomen", ["stomach", "epigastric", "upper abdomen", "gallbladder"]),
            ("Lower Abdomen", ["lower abdomen", "belly", "gut", "intestine", "pelvic", "pelvis", "appendix"]),
            ("Abdomen", ["abdomen", "abdominal"]),
            ("Lower Back", ["lower back", "lumbar", "sciatica", "spine", "backbone"]),
            ("Upper Back", ["upper back", "scapula", "mid back"]),
            (
                "Arms / Hands",
                ["arm", "arms", "forearm", "wrist", "wrists", "hand", "hands", "finger", "fingers", "elbow"],
            ),
            ("Legs / Knees", ["leg", "legs", "knee", "knees", "calf", "calves", "thigh", "hamstring", "shin"]),
            ("Feet / Ankles", ["foot", "feet", "ankle", "ankles", "heel", "toe", "toes"]),
            ("Skin", ["skin", "rash", "hives", "welts", "eczema", "itch"]),
            (
                "General Body",
                [
                    "general",
                    "whole body",
                    "full body",
                    "everywhere",
                    "systemic",
                    "chills",
                    "fever",
                    "exhaustion",
                    "weakness",
                ],
            ),
        ]

        for loc, kws in location_keywords:
            if any(re.search(r"\b" + re.escape(kw) + r"\b", lower) for kw in kws):
                return loc

        # Default to location mapped from symptom
        return self.default_location_map.get(predicted_symptom, "General Body")

    def extract_trigger(self, text: str) -> str:
        lower = text.lower()
        trigger_patterns = [
            (r"(?:after|following|from)\s+([a-zA-Z0-9\s]{3,35})(?:\.|\,|$|\band\b)", 1),
            (r"(?:triggered by|due to|caused by|because of)\s+([a-zA-Z0-9\s]{3,35})(?:\.|\,|$|\band\b)", 1),
            (r"(?:when|while)\s+([a-zA-Z0-9\s]{3,35})(?:\.|\,|$|\band\b)", 1),
        ]

        for pat, group in trigger_patterns:
            m = re.search(pat, lower)
            if m:
                extracted = m.group(group).strip()
                # Clean filler words
                extracted = re.sub(r"^(i|my|the|a|an|some)\s+", "", extracted)
                if len(extracted) >= 3 and len(extracted) <= 40:
                    return extracted.title()

        # Keyword heuristics
        if any(w in lower for w in ["screen", "computer", "laptop", "phone"]):
            return "Screen Time / Eye Strain"
        if any(w in lower for w in ["stress", "work", "deadline", "anxiety", "worried"]):
            return "Stress / High Pressure"
        if any(w in lower for w in ["sleep", "tired", "insomnia", "late night", "restless"]):
            return "Poor Sleep / Fatigue"
        if any(
            w in lower for w in ["spicy", "junk food", "heavy meal", "dinner", "pizza", "dairy", "coffee", "caffeine"]
        ):
            return "Diet / Food Trigger"
        if any(w in lower for w in ["workout", "exercise", "lifting", "running", "gym"]):
            return "Physical Exertion"
        if any(w in lower for w in ["cold air", "weather", "rain", "winter", "dust", "pollen"]):
            return "Weather / Environmental"

        return "None Reported"

    def predict(self, text: str) -> dict:
        if not text or not text.strip():
            return {
                "symptom": "General Discomfort",
                "category": "General",
                "confidence": 0.5,
                "suggested_severity": 5,
                "body_location": "General Body",
                "trigger": "None Reported",
                "alternative_symptoms": [],
                "extracted_keywords": [],
            }

        # Predict symptom and probabilities
        probs = self.pipeline.predict_proba([text])[0]
        classes = self.pipeline.classes_
        top_indices = np.argsort(probs)[::-1]

        best_idx = int(top_indices[0])
        predicted_symptom = str(classes[best_idx])
        confidence = float(probs[best_idx])

        # Top 3 alternatives
        alternatives = []
        for idx in top_indices[1:4]:
            if probs[idx] > 0.03:
                alternatives.append(
                    {
                        "symptom": str(classes[idx]),
                        "category": str(self.category_map.get(classes[idx], "General")),
                        "confidence": round(float(probs[idx]), 3),
                    }
                )

        severity = int(self.extract_severity(text))
        body_loc = str(self.extract_body_location(text, predicted_symptom))
        trigger = str(self.extract_trigger(text))

        # Keyword extraction: tokens with high TF-IDF weights
        vectorizer = self.pipeline.named_steps["tfidf"]
        transformed = vectorizer.transform([text])
        feature_names = vectorizer.get_feature_names_out()
        tfidf_scores = transformed.toarray()[0]
        keyword_indices = np.argsort(tfidf_scores)[::-1]

        extracted_keywords = [str(feature_names[i]) for i in keyword_indices[:6] if tfidf_scores[i] > 0]

        return {
            "symptom": str(predicted_symptom),
            "category": str(self.category_map.get(predicted_symptom, "General")),
            "confidence": round(confidence, 3),
            "suggested_severity": severity,
            "body_location": body_loc,
            "trigger": trigger,
            "alternative_symptoms": alternatives,
            "extracted_keywords": extracted_keywords,
        }


model_instance = SymptomNLPModel()
