import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  PlusCircle,
  Activity,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Clock,
  FileText,
  HelpCircle,
  ArrowRight,
  Stethoscope,
  Brain,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Moon,
  BatteryCharging,
  Smile,
  Frown,
  Meh,
  Copy,
  Check,
  ShieldCheck,
  Info,
  Sliders,
  Send,
  HeartPulse,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { entriesApi, symptomsApi, nlpApi, feedbackApi } from '../api/client';
import EmergencyBanner from '../components/EmergencyBanner';
import { IDENTIFIABLE_DISEASES } from '../utils/identifiableDiseases';

// Quick 1-Click Clinical Scenario Presets
const QUICK_PRESETS = [
  {
    id: 'migraine',
    label: 'Throbbing Migraine',
    icon: '🧠',
    text: "Severe throbbing migraine on the right side of my head, sharp pain with light sensitivity. Feeling down and exhausted.",
    emotion: 2,
    pain: 8,
    energy: 2,
    stress: 7,
    symptom: 'Migraine',
    location: 'Head & Brain',
    category: 'Neurological'
  },
  {
    id: 'chest_pain',
    label: 'Chest Pressure & Tightness',
    icon: '🫀',
    text: "Intense crushing chest tightness radiating slightly, shortness of breath and high anxiety. Feeling terrified.",
    emotion: 1,
    pain: 9,
    energy: 2,
    stress: 10,
    symptom: 'Chest Pain',
    location: 'Cardiovascular / Heart',
    category: 'Cardiovascular'
  },
  {
    id: 'sore_throat',
    label: 'Cold & Sore Throat',
    icon: '🧣',
    text: "Scratchy throat, mild dry cough, and sinus congestion for 2 days. Feeling sluggish but coping okay.",
    emotion: 5,
    pain: 4,
    energy: 4,
    stress: 3,
    symptom: 'Sore Throat',
    location: 'Eyes, ENT & Throat',
    category: 'ENT'
  },
  {
    id: 'acid_reflux',
    label: 'Stomach Ache & GERD',
    icon: '🔥',
    text: "Burning sensation rising into upper abdomen and chest after spicy meal, moderate cramping.",
    emotion: 4,
    pain: 6,
    energy: 5,
    stress: 5,
    symptom: 'Acid Reflux / GERD',
    location: 'Upper Abdomen / Stomach',
    category: 'Gastrointestinal'
  },
  {
    id: 'back_pain',
    label: 'Lumbar Lower Back Pain',
    icon: '🦴',
    text: "Stiff aching lower back pain after lifting boxes, difficult to bend over. Frustrated and tired.",
    emotion: 3,
    pain: 6,
    energy: 4,
    stress: 5,
    symptom: 'Lower Back Pain',
    location: 'Spine, Neck & Back',
    category: 'Musculoskeletal'
  },
  {
    id: 'routine_good',
    label: 'Feeling Great / Routine Check',
    icon: '✨',
    text: "Slept 8 hours, feeling energetic, joyful, and healthy. Just checking in for daily telemetry.",
    emotion: 9,
    pain: 1,
    energy: 9,
    stress: 1,
    symptom: 'General Vitality',
    location: 'Whole Body / Systemic',
    category: 'General'
  }
];

export default function LogSymptom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Natural Language Input State
  const [userNarrative, setUserNarrative] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Numerical Biomarkers (Scale: 1 to 10)
  // Warriner / VAD Scale: 1 = Sad / Agony / Despair, 10 = Happy / Serene
  const [emotionScore, setEmotionScore] = useState(5);
  const [painSeverity, setPainSeverity] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(4);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [functionalImpairment, setFunctionalImpairment] = useState(3);
  const [durationDays, setDurationDays] = useState(1);
  const [frequency30d, setFrequency30d] = useState(1);

  // Clinical Metadata
  const [symptomName, setSymptomName] = useState('');
  const [symptomCategory, setSymptomCategory] = useState('General');
  const [bodyLocation, setBodyLocation] = useState('Whole Body / Systemic');
  const [trigger, setTrigger] = useState('Mental Stress & Anxiety');
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Live AI & Numerical Model Analysis State
  const [livePrediction, setLivePrediction] = useState(null);
  const [modelAccuracy, setModelAccuracy] = useState(0.9912);
  const [showAdvancedTuning, setShowAdvancedTuning] = useState(false);
  const [diseaseDrawer, setDiseaseDrawer] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Debounced auto-analyze ref
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Fetch model stats on load
    nlpApi.getNumericalStats()
      .then(res => {
        if (res.data?.holdout_accuracy) setModelAccuracy(res.data.holdout_accuracy);
      })
      .catch(() => {});

    const prefillVal = searchParams.get('prefill');
    if (prefillVal) {
      setUserNarrative(prefillVal);
      runSmartAnalysis(prefillVal);
    }
  }, [searchParams]);

  // Execute Numerical ML Smart Analysis
  const runSmartAnalysis = async (textToAnalyze, manualOverrides = null) => {
    const text = textToAnalyze || userNarrative;
    if (!text || !text.trim()) return;

    setAnalyzing(true);
    setError('');

    try {
      const overrides = manualOverrides || {};
      const res = await nlpApi.smartAnalyze(text, overrides);
      const data = res.data?.analysis;

      if (data) {
        const nums = data.extracted_numbers || {};
        const pred = data.prediction || {};

        if (!manualOverrides) {
          if (nums.emotion_score !== undefined) setEmotionScore(Math.round(nums.emotion_score));
          if (nums.pain_severity !== undefined) setPainSeverity(Math.round(nums.pain_severity));
          if (nums.energy_level !== undefined) setEnergyLevel(Math.round(nums.energy_level));
          if (nums.stress_level !== undefined) setStressLevel(Math.round(nums.stress_level));
          if (nums.sleep_quality !== undefined) setSleepQuality(Math.round(nums.sleep_quality));
          if (nums.functional_impairment !== undefined) setFunctionalImpairment(Math.round(nums.functional_impairment));
          if (nums.duration_days !== undefined) setDurationDays(nums.duration_days);
          if (nums.frequency_30d !== undefined) setFrequency30d(nums.frequency_30d);

          if (nums.inferred_symptom_name && !symptomName) setSymptomName(nums.inferred_symptom_name);
          if (nums.inferred_category) setSymptomCategory(nums.inferred_category);
          if (nums.inferred_body_location) setBodyLocation(nums.inferred_body_location);
        }

        setLivePrediction(pred);
        if (data.holdout_model_accuracy) setModelAccuracy(data.holdout_model_accuracy);
      }
    } catch (err) {
      console.warn('Smart analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Debounced input change
  const handleNarrativeChange = (e) => {
    const text = e.target.value;
    setUserNarrative(text);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (text.trim().length >= 8) {
        runSmartAnalysis(text);
      }
    }, 600);
  };

  // Re-predict when user manually tweaks numerical sliders
  const handleNumericalSliderChange = (param, value) => {
    const updatedVal = parseFloat(value);
    const overrides = {
      emotion_score: param === 'emotion' ? updatedVal : emotionScore,
      pain_severity: param === 'pain' ? updatedVal : painSeverity,
      energy_level: param === 'energy' ? updatedVal : energyLevel,
      stress_level: param === 'stress' ? updatedVal : stressLevel,
      sleep_quality: param === 'sleep' ? updatedVal : sleepQuality,
      functional_impairment: param === 'impairment' ? updatedVal : functionalImpairment,
      duration_days: durationDays,
      frequency_30d: frequency30d
    };

    if (param === 'emotion') setEmotionScore(updatedVal);
    if (param === 'pain') setPainSeverity(updatedVal);
    if (param === 'energy') setEnergyLevel(updatedVal);
    if (param === 'stress') setStressLevel(updatedVal);
    if (param === 'sleep') setSleepQuality(updatedVal);
    if (param === 'impairment') setFunctionalImpairment(updatedVal);

    runSmartAnalysis(userNarrative || 'Symptom episode check-in', overrides);
  };

  // Load a quick scenario preset
  const applyPreset = (preset) => {
    setUserNarrative(preset.text);
    setEmotionScore(preset.emotion);
    setPainSeverity(preset.pain);
    setEnergyLevel(preset.energy);
    setStressLevel(preset.stress);
    setSymptomName(preset.symptom);
    setBodyLocation(preset.location);
    setSymptomCategory(preset.category);

    runSmartAnalysis(preset.text, {
      emotion_score: preset.emotion,
      pain_severity: preset.pain,
      energy_level: preset.energy,
      stress_level: preset.stress
    });
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSymptom = symptomName.trim() || livePrediction?.inferred_symptom_name || 'General Discomfort';

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        symptom_name: finalSymptom,
        symptom_category: symptomCategory,
        severity: parseInt(painSeverity, 10),
        body_location: bodyLocation,
        trigger: trigger,
        description: userNarrative || `${finalSymptom} episode recorded via Numerical Triage Engine`,
        started_at: new Date(startedAt).toISOString(),
        ended_at: endedAt ? new Date(endedAt).toISOString() : null,
        // Numerical Biomarkers
        emotion_score: parseFloat(emotionScore),
        energy_level: parseFloat(energyLevel),
        stress_level: parseFloat(stressLevel),
        sleep_quality: parseFloat(sleepQuality),
        functional_impairment: parseFloat(functionalImpairment),
        urgency_score: livePrediction?.urgency_score ? parseFloat(livePrediction.urgency_score) : 35.0
      };

      const res = await entriesApi.create(payload);
      const createdEntry = res.data.entry;
      const classification = res.data.classification;

      // Attachment handling if file provided
      if (selectedFile && createdEntry?.id) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
          await entriesApi.uploadAttachment(createdEntry.id, formData);
        } catch (uploadErr) {
          console.warn('Attachment upload note:', uploadErr);
        }
      }

      setCreatedResult({
        entry: createdEntry,
        classification: classification,
        prediction: livePrediction
      });

      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to log symptom entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedback = async (wasHelpful) => {
    if (!createdResult?.entry?.id) return;
    try {
      await feedbackApi.submit({
        entry_id: createdResult.entry.id,
        was_helpful: wasHelpful,
        comment: feedbackComment
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
  };

  // Helper labels & styling for Emotion (1 to 10)
  const getEmotionDetails = (val) => {
    if (val <= 2) return { label: 'Extreme Sadness / Agony / Despair', emoji: '😭', color: '#ef4444' };
    if (val <= 4) return { label: 'Sad / Depressed / Distressed', emoji: '😢', color: '#f97316' };
    if (val <= 6) return { label: 'Neutral / Coping / Flat', emoji: '😐', color: '#f59e0b' };
    if (val <= 8) return { label: 'Calm / Relieved / Good', emoji: '🙂', color: '#3b82f6' };
    return { label: 'Joyful / Happy / Optimal Wellbeing', emoji: '😄', color: '#10b981' };
  };

  const emotionInfo = getEmotionDetails(emotionScore);

  // Helper labels for Pain (1 to 10)
  const getPainDetails = (val) => {
    if (val <= 3) return { label: 'Mild / Noticeable', color: '#10b981' };
    if (val <= 6) return { label: 'Moderate / Distracting', color: '#f59e0b' };
    if (val <= 8) return { label: 'Severe / Impairing', color: '#f97316' };
    return { label: 'Critical / Excruciating Pain', color: '#ef4444' };
  };

  const painInfo = getPainDetails(painSeverity);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Brain size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                Smart Symptom & Emotion Logger
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                Powered by a <strong>Numerical Clinical Triage ML Dataset</strong> (Warriner Emotion Norms 1=Sad to 10=Happy + ESAS-r Pain Telemetry).
              </p>
            </div>
          </div>
        </div>

        {/* Model Accuracy Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.45rem 0.85rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <ShieldCheck size={16} color="#10b981" />
          <span>Numerical ML Accuracy: <strong style={{ color: '#10b981' }}>{(modelAccuracy * 100).toFixed(1)}%</strong></span>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-emergency">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS CARD */}
      {createdResult ? (
        <div className="card animate-fade-in" style={{ border: '2px solid var(--accent-primary)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Symptom & Emotion Logged Successfully!</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Your numerical biomarkers were evaluated through the clinical classification engine.
              </p>
            </div>
          </div>

          {/* Triage Result Box */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: `5px solid ${painInfo.color}`,
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                Classification: {createdResult.classification.classification_type.toUpperCase()}
              </span>
              <span className={`badge ${createdResult.classification.classification_type === 'urgent' ? 'badge-critical' : 'badge-primary'}`}>
                Urgency Score: {createdResult.entry.urgency_score || 35}/100
              </span>
            </div>

            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {createdResult.classification.recommendation}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {createdResult.classification.reasoning}
            </div>

            {createdResult.classification.classification_type === 'urgent' && (
              <div style={{ marginTop: '0.5rem' }}>
                <EmergencyBanner />
              </div>
            )}
          </div>

          {/* Biomarker Summary Pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emotion / Mood</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: emotionInfo.color }}>
                {emotionInfo.emoji} {createdResult.entry.emotion_score}/10
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pain Severity</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: painInfo.color }}>
                {createdResult.entry.severity}/10
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Energy Level</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>
                {createdResult.entry.energy_level}/10
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stress Level</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                {createdResult.entry.stress_level}/10
              </div>
            </div>
          </div>

          {/* Feedback prompt */}
          {!feedbackSubmitted ? (
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Was this numerical assessment accurate to how you feel?
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ThumbsUp size={15} /> Yes, Very Accurate
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ThumbsDown size={15} /> Not Accurate
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ Thank you for your feedback! It feeds the model retraining dataset.
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setCreatedResult(null);
                setUserNarrative('');
                setSymptomName('');
                setLivePrediction(null);
                setFeedbackSubmitted(false);
              }}
              className="btn btn-primary"
            >
              <PlusCircle size={16} /> Log Another Entry
            </button>
            <button
              onClick={() => navigate('/history')}
              className="btn btn-secondary"
            >
              View Symptom Timeline
            </button>
          </div>
        </div>
      ) : (
        /* MAIN INTERACTIVE LOGGER */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* HERO NATURAL LANGUAGE CARD */}
          <div className="card" style={{
            background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(79, 70, 229, 0.05) 100%)',
            border: '1px solid var(--border-focus)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} className="text-indigo-600" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  How are you feeling right now?
                </h2>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Just type naturally — our numerical AI analyzes emotional state & severity automatically.
              </span>
            </div>

            {/* Quick 1-Click Presets */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Quick 1-Click Scenario Presets:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '0.45rem 0.8rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Narrative Textarea */}
            <div style={{ position: 'relative' }}>
              <textarea
                rows={4}
                className="form-textarea"
                style={{
                  fontSize: '0.98rem',
                  lineHeight: '1.6',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-focus)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
                placeholder="Example: I'm feeling so sad and frustrated today. My head is pounding on the right temple with a sharp throbbing pain around level 8. I can't sleep or work..."
                value={userNarrative}
                onChange={handleNarrativeChange}
              />
              {analyzing && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: 'var(--accent-primary)',
                  backgroundColor: 'var(--bg-card)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Extracting Numerical Datapoints...</span>
                </div>
              )}
            </div>

            {/* TWO PRIMARY VISUAL METERS (EMOTION & PAIN) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}>
              
              {/* 1. EMOTION SCALE (Happy = 10, Sad = 1) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Emotion / Affect Score</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Warriner Norm)</span>
                  </label>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: emotionInfo.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{emotionInfo.emoji}</span>
                    <span>{emotionScore}/10</span>
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: emotionInfo.color, fontWeight: 600 }}>
                  {emotionInfo.label}
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={emotionScore}
                  onChange={(e) => handleNumericalSliderChange('emotion', e.target.value)}
                  style={{
                    width: '100%',
                    accentColor: emotionInfo.color,
                    cursor: 'pointer'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>1: Sad / Agony 😭</span>
                  <span>5: Neutral 😐</span>
                  <span>10: Happy / Joyful 😄</span>
                </div>
              </div>

              {/* 2. PAIN SEVERITY SCALE (1 to 10) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Physical Pain Severity</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(ESAS-r)</span>
                  </label>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: painInfo.color
                  }}>
                    {painSeverity}/10
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: painInfo.color, fontWeight: 600 }}>
                  {painInfo.label}
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={painSeverity}
                  onChange={(e) => handleNumericalSliderChange('pain', e.target.value)}
                  style={{
                    width: '100%',
                    accentColor: painInfo.color,
                    cursor: 'pointer'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>1: Minimal</span>
                  <span>5: Moderate</span>
                  <span>10: Excruciating</span>
                </div>
              </div>

            </div>

            {/* LIVE PREDICTION & CLINICAL REASONING CARD */}
            {livePrediction && (
              <div className="animate-fade-in" style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                borderLeft: `5px solid ${painInfo.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HeartPulse size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                      Automated Numerical Triage Assessment
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={`badge ${livePrediction.classification_type === 'urgent' ? 'badge-critical' : 'badge-primary'}`}>
                      {livePrediction.classification_type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Risk Index: {livePrediction.urgency_score}/100
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {livePrediction.recommendation}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {livePrediction.clinical_reasoning}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {livePrediction.disclaimer}
                </div>
              </div>
            )}

            {/* OPTIONAL EXPANDABLE FINE-TUNING DRAWER */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedTuning(!showAdvancedTuning)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: 0
                }}
              >
                <Sliders size={14} />
                <span>{showAdvancedTuning ? 'Hide Biomarker Fine-Tuning' : 'Fine-Tune Energy, Stress & Clinical Tags (Optional)'}</span>
                {showAdvancedTuning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdvancedTuning && (
                <div className="animate-fade-in" style={{
                  marginTop: '1rem',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem'
                }}>
                  {/* Energy Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                      <span>Energy / Vitality</span>
                      <span>{energyLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={energyLevel}
                      onChange={(e) => handleNumericalSliderChange('energy', e.target.value)}
                    />
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>1=Bedridden, 10=High Energy</span>
                  </div>

                  {/* Stress Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                      <span>Stress / Anxiety</span>
                      <span>{stressLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={stressLevel}
                      onChange={(e) => handleNumericalSliderChange('stress', e.target.value)}
                    />
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>1=Calm, 10=Panic/Crisis</span>
                  </div>

                  {/* Sleep Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                      <span>Sleep Quality</span>
                      <span>{sleepQuality}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sleepQuality}
                      onChange={(e) => handleNumericalSliderChange('sleep', e.target.value)}
                    />
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>1=Insomnia, 10=Restful 8h</span>
                  </div>

                  {/* Primary Symptom Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Primary Symptom Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Migraine, Chest Pain..."
                      value={symptomName}
                      onChange={(e) => setSymptomName(e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                    />
                  </div>

                  {/* Body Location */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Body Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Head & Brain, Chest, Stomach..."
                      value={bodyLocation}
                      onChange={(e) => setBodyLocation(e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                    />
                  </div>

                  {/* Trigger */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Suspected Trigger</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Lack of sleep, Stress, Diet..."
                      value={trigger}
                      onChange={(e) => setTrigger(e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Logging will calculate your 30-day longitudinal frequency and alert doctors if recurring.
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Send size={16} />
                <span>{submitting ? 'Recording Entry...' : 'Save & Log Episode'}</span>
              </button>
            </div>

          </div>

          {/* BROWSE 24 CONDITIONS DRAWER TOGGLE */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                  Browse 24 ML-Identifiable Clinical Conditions (Symptom2Disease)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDiseaseDrawer(!diseaseDrawer)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                {diseaseDrawer ? 'Hide Diseases' : 'Show 24 Diseases'}
              </button>
            </div>

            {diseaseDrawer && (
              <div className="animate-fade-in" style={{
                marginTop: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: '0.5rem',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                {IDENTIFIABLE_DISEASES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      const sampleText = `I have been experiencing ${d.keySymptoms.join(', ')}. Feeling down and uncomfortable.`;
                      setUserNarrative(sampleText);
                      setSymptomName(d.name);
                      setSymptomCategory(d.category);
                      runSmartAnalysis(sampleText);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{d.icon}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {d.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
