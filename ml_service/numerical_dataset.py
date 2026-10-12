"""
Numerical Symptom & Emotion Clinical Dataset Generator and Loader.

Based on clinical assessment standards:
- ESAS-r (Edmonton Symptom Assessment System): Pain, Tiredness, Depression, Anxiety, Wellbeing.
- Warriner / VAD Affective Norms: 1 to 10 scale (1 = Sad / Agony / Despair, 10 = Happy / Serene / Peak Wellbeing).
- Emergency Severity Index (ESI) & Manchester Triage System for numerical urgency calculation.
"""

import csv
import os
import random

import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CSV_PATH = os.path.join(DATA_DIR, "numerical_symptom_dataset.csv")

ANATOMICAL_MAP = {
    "Head & Brain": 1,
    "Eyes, ENT & Throat": 2,
    "Chest & Lungs": 3,
    "Cardiovascular / Heart": 4,
    "Upper Abdomen / Stomach": 5,
    "Lower Abdomen & Pelvis": 6,
    "Spine, Neck & Back": 7,
    "Limbs & Joints": 8,
    "Skin & Dermis": 9,
    "Whole Body / Systemic": 10,
}

CATEGORY_MAP = {
    "Neurological": 1,
    "Respiratory": 2,
    "Cardiovascular": 3,
    "Gastrointestinal": 4,
    "Musculoskeletal": 5,
    "Dermatological": 6,
    "ENT": 7,
    "General": 8,
}

FEATURE_COLUMNS = [
    "emotion_score",  # 1 (Sad/Agony) -> 10 (Happy/Serene)
    "pain_severity",  # 1 (Minimal) -> 10 (Excruciating)
    "energy_level",  # 1 (Bedridden/Exhausted) -> 10 (Peak Vitality)
    "stress_level",  # 1 (Calm) -> 10 (Extreme Panic)
    "sleep_quality",  # 1 (Severe Insomnia) -> 10 (Restorative 8h)
    "functional_impairment",  # 1 (Normal Work/Active) -> 10 (Incapacitated)
    "duration_days",  # 0.1 to 180+ days
    "frequency_30d",  # Number of episodes in rolling 30 days
    "is_red_flag_symptom",  # 0 or 1 (e.g. Chest Pain, Respiratory failure)
    "is_known_chronic",  # 0 or 1 (Diagnosed Chronic History)
    "body_location_code",  # 1 to 10
    "symptom_category_code",  # 1 to 8
]

TARGET_COLUMN = "classification_type"  # 'acute', 'recurring', 'chronic', 'urgent'
TARGET_ENCODING = {"acute": 0, "recurring": 1, "chronic": 2, "urgent": 3}
REVERSE_TARGET_ENCODING = {0: "acute", 1: "recurring", 2: "chronic", 3: "urgent"}


def compute_clinical_targets(row):
    """
    Computes precise, clinically ground-truthed target labels and urgency score
    from the numerical biomarkers according to triage protocols.
    """
    emotion = row["emotion_score"]
    pain = row["pain_severity"]
    energy = row["energy_level"]
    stress = row["stress_level"]
    sleep = row["sleep_quality"]
    impairment = row["functional_impairment"]
    duration = row["duration_days"]
    freq = row["frequency_30d"]
    is_red_flag = row["is_red_flag_symptom"]
    is_chronic = row["is_known_chronic"]

    # 1. Urgent Rule:
    # High pain (>= 8) + red flag, OR pain >= 9, OR extreme distress (emotion <= 2, stress >= 9, impairment >= 8) with chest/breathing
    is_urgent = (
        (is_red_flag and pain >= 7)
        or (pain >= 9)
        or (is_red_flag and emotion <= 3 and stress >= 8)
        or (pain >= 8 and emotion <= 2)
        or (impairment >= 9 and pain >= 8)
    )

    # 2. Chronic Rule:
    # Diagnosed chronic OR duration >= 90 days (and not acute emergency)
    is_chronic_case = not is_urgent and (is_chronic or duration >= 90)

    # 3. Recurring Rule:
    # 3+ episodes in rolling 30 days
    is_recurring_case = not is_urgent and not is_chronic_case and (freq >= 3)

    # 4. Acute Rule:
    # Isolated episode < 14 days, low frequency
    if is_urgent:
        cls_type = "urgent"
    elif is_chronic_case:
        cls_type = "chronic"
    elif is_recurring_case:
        cls_type = "recurring"
    else:
        cls_type = "acute"

    # Urgency Score calculation (0 - 100 continuous clinical scale):
    # Higher pain, higher stress, higher impairment, inverted emotion (11 - emotion), inverted energy (11 - energy)
    urgency_raw = (
        (pain * 3.5)
        + ((11 - emotion) * 2.5)
        + (stress * 1.5)
        + (impairment * 1.5)
        + ((11 - energy) * 0.5)
        + ((11 - sleep) * 0.5)
        + (is_red_flag * 25.0)
    )
    urgency_score = min(100.0, max(5.0, round(urgency_raw * 0.85, 1)))

    if is_urgent:
        urgency_score = max(80.0, urgency_score)
    elif cls_type == "acute" and pain <= 4:
        urgency_score = min(40.0, urgency_score)

    return cls_type, urgency_score


def generate_synthetic_dataset(num_samples=1600):
    """
    Generates a balanced, realistic numerical dataset representing real clinical presentations
    and saves it to CSV.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    random.seed(42)
    np.random.seed(42)

    rows = []

    # Distribution profile archetypes:
    archetypes = [
        # (type, count, pain_range, emotion_range, energy_range, stress_range, sleep_range, impair_range, duration_range, freq_range, red_flag_prob, chronic_prob)
        ("urgent", 380, (7, 10), (1, 3), (1, 4), (7, 10), (1, 4), (7, 10), (0.1, 5), (1, 3), 0.75, 0.2),
        ("chronic", 420, (3, 7), (3, 6), (2, 6), (4, 7), (2, 6), (4, 7), (90, 365), (1, 5), 0.05, 0.9),
        ("recurring", 400, (4, 8), (2, 5), (3, 6), (5, 8), (2, 5), (4, 8), (1, 14), (3, 7), 0.08, 0.3),
        ("acute_mild", 250, (1, 4), (6, 10), (6, 9), (1, 4), (6, 9), (1, 3), (0.5, 7), (1, 2), 0.0, 0.0),
        ("acute_moderate", 250, (4, 6), (4, 7), (4, 7), (4, 7), (4, 7), (3, 6), (1, 12), (1, 2), 0.05, 0.05),
    ]

    for arch_name, count, p_r, e_r, en_r, s_r, sl_r, imp_r, d_r, f_r, rf_p, chr_p in archetypes:
        for _ in range(count):
            pain = int(np.clip(round(np.random.uniform(p_r[0], p_r[1])), 1, 10))
            emotion = int(np.clip(round(np.random.uniform(e_r[0], e_r[1])), 1, 10))
            energy = int(np.clip(round(np.random.uniform(en_r[0], en_r[1])), 1, 10))
            stress = int(np.clip(round(np.random.uniform(s_r[0], s_r[1])), 1, 10))
            sleep = int(np.clip(round(np.random.uniform(sl_r[0], sl_r[1])), 1, 10))
            impairment = int(np.clip(round(np.random.uniform(imp_r[0], imp_r[1])), 1, 10))
            duration = round(float(np.random.uniform(d_r[0], d_r[1])), 1)
            freq = int(np.clip(round(np.random.uniform(f_r[0], f_r[1])), 1, 8))
            is_red_flag = 1 if (random.random() < rf_p) else 0
            is_chronic = 1 if (random.random() < chr_p) else 0

            # Anatomical location and category correlation
            if is_red_flag:
                loc_code = random.choice([3, 4, 1])  # Chest, Heart, Head
                cat_code = 3 if loc_code == 4 else (2 if loc_code == 3 else 1)
            else:
                loc_code = random.randint(1, 10)
                cat_code = random.randint(1, 8)

            row = {
                "emotion_score": emotion,
                "pain_severity": pain,
                "energy_level": energy,
                "stress_level": stress,
                "sleep_quality": sleep,
                "functional_impairment": impairment,
                "duration_days": duration,
                "frequency_30d": freq,
                "is_red_flag_symptom": is_red_flag,
                "is_known_chronic": is_chronic,
                "body_location_code": loc_code,
                "symptom_category_code": cat_code,
            }

            cls_type, urgency = compute_clinical_targets(row)
            row["classification_type"] = cls_type
            row["urgency_score"] = urgency

            rows.append(row)

    # Write CSV
    all_headers = FEATURE_COLUMNS + ["classification_type", "urgency_score"]
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[NUMERICAL DATASET] Generated {len(rows)} samples saved to: {CSV_PATH}")
    return rows


def load_numerical_dataset():
    """Loads dataset from CSV, generating it if not present."""
    if not os.path.exists(CSV_PATH):
        generate_synthetic_dataset()

    X = []
    y_cls = []
    y_urgency = []

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            features = [float(row[col]) for col in FEATURE_COLUMNS]
            X.append(features)
            y_cls.append(TARGET_ENCODING[row["classification_type"]])
            y_urgency.append(float(row["urgency_score"]))

    return np.array(X), np.array(y_cls), np.array(y_urgency)


if __name__ == "__main__":
    generate_synthetic_dataset()
