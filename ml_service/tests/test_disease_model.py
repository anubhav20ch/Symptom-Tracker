"""Narrow regression coverage for the NLP-8/9/10 fields added in Phase 2.
The full ML contract/fallback suite (TEST-4) is Phase 6 work.
"""

from disease_model import LOW_CONFIDENCE_THRESHOLD, DiseasePredictionModel


def test_predict_returns_exactly_three_candidates():
    model = DiseasePredictionModel()
    result = model.predict("severe itchy red scaly rash patches on elbows and knees")
    assert len(result["candidates"]) == 3


def test_predict_includes_model_version():
    model = DiseasePredictionModel()
    result = model.predict("a headache")
    assert result["model_version"].startswith("disease-model-")


def test_low_confidence_flag_matches_threshold():
    model = DiseasePredictionModel()
    result = model.predict("I feel a little strange today")
    assert result["low_confidence"] == (result["confidence"] < LOW_CONFIDENCE_THRESHOLD)


def test_empty_text_is_flagged_low_confidence():
    model = DiseasePredictionModel()
    result = model.predict("")
    assert result["low_confidence"] is True
    assert result["candidates"] == []
