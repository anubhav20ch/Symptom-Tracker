import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  ArrowRight,
  Sparkles,
  Edit2
} from 'lucide-react';
import { entriesApi, nlpApi, feedbackApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BODY_REGIONS = [
  { code: 'head_front', label: 'Head / Face', view: 'front' },
  { code: 'neck_front', label: 'Neck (front)', view: 'front' },
  { code: 'chest', label: 'Chest', view: 'front' },
  { code: 'abdomen', label: 'Abdomen / Stomach', view: 'front' },
  { code: 'pelvis_groin', label: 'Pelvis / Groin', view: 'front' },
  { code: 'shoulder_left_front', label: 'Left Shoulder', view: 'front' },
  { code: 'shoulder_right_front', label: 'Right Shoulder', view: 'front' },
  { code: 'arm_left', label: 'Left Arm', view: 'front' },
  { code: 'arm_right', label: 'Right Arm', view: 'front' },
  { code: 'hand_left', label: 'Left Hand', view: 'front' },
  { code: 'hand_right', label: 'Right Hand', view: 'front' },
  { code: 'leg_left_front', label: 'Left Leg (front)', view: 'front' },
  { code: 'leg_right_front', label: 'Right Leg (front)', view: 'front' },
  { code: 'foot_left', label: 'Left Foot', view: 'front' },
  { code: 'foot_right', label: 'Right Foot', view: 'front' },
  { code: 'head_back', label: 'Back of Head', view: 'back' },
  { code: 'neck_back', label: 'Neck (back)', view: 'back' },
  { code: 'upper_back', label: 'Upper Back', view: 'back' },
  { code: 'lower_back', label: 'Lower Back', view: 'back' },
  { code: 'buttocks', label: 'Buttocks', view: 'back' },
  { code: 'leg_left_back', label: 'Left Leg (back)', view: 'back' },
  { code: 'leg_right_back', label: 'Right Leg (back)', view: 'back' },
  { code: 'whole_body', label: 'Whole Body / Systemic', view: 'both' }
];

export default function LogSymptom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const followUpId = searchParams.get('follow_up');

  // Form State
  const [description, setDescription] = useState('');
  const [symptomName, setSymptomName] = useState('');
  const [severity, setSeverity] = useState(5);
  const [bodyLocation, setBodyLocation] = useState('');
  const [bodyRegionCode, setBodyRegionCode] = useState('');
  const [bodyMapView, setBodyMapView] = useState('front');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 16));
  const [triggers, setTriggers] = useState('');
  const [notes, setNotes] = useState('');

  // UI-8: "What we picked up" side panel state
  const [pickedUpChips, setPickedUpChips] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const analyzeTimer = useRef(null);

  // Submission & UI-10 Classification Result State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  // UI-8: NLP auto-extraction debounced while typing
  useEffect(() => {
    if (description.trim().length < 6) {
      setPickedUpChips(null);
      return;
    }
    clearTimeout(analyzeTimer.current);
    analyzeTimer.current = setTimeout(async () => {
      try {
        setNlpLoading(true);
        const res = await nlpApi.smartAnalyze(description);
        const data = res.data;
        if (data) {
          setPickedUpChips({
            symptom: data.symptom_extracted || data.matched_catalogue_symptom || 'Unspecified symptom',
            location: data.body_location || '',
            severity: data.severity_extracted || severity,
            triggers: data.triggers_extracted || '',
            confidence: data.confidence ? Math.round(data.confidence * 100) : 85
          });
          // Auto-fill form fields if not already manually typed
          if (!symptomName && data.symptom_extracted) {
            setSymptomName(data.symptom_extracted);
          }
          if (!bodyLocation && data.body_location) {
            setBodyLocation(data.body_location);
          }
          if (data.severity_extracted) {
            setSeverity(data.severity_extracted);
          }
        }
      } catch (err) {
        // Non-blocking fallback
      } finally {
        setNlpLoading(false);
      }
    }, 600);

    return () => clearTimeout(analyzeTimer.current);
  }, [description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptomName.trim()) {
      setErrorMsg('Please specify a symptom name.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload = {
        symptom_name: symptomName.trim(),
        severity: Number(severity),
        description: description.trim() || undefined,
        body_location: bodyLocation.trim() || undefined,
        body_region_code: bodyRegionCode || undefined,
        started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
        triggers: triggers.trim() || undefined,
        notes: notes.trim() || undefined,
        follow_up_to_entry_id: followUpId ? Number(followUpId) : undefined
      };

      const res = await entriesApi.create(payload);
      setResult(res.data.entry || res.data);
    } catch (err) {
      console.error('[Create Entry Error]:', err);
      setErrorMsg(err.response?.data?.error?.message || 'We could not save this entry. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedback = async (isHelpful) => {
    if (!result?.id || feedbackGiven !== null) return;
    try {
      await feedbackApi.submit({
        entryId: result.id,
        isHelpful,
        predictedClassification: result.classification_type || 'Routine Acute'
      });
      setFeedbackGiven(isHelpful);
    } catch (err) {
      console.error('[Feedback error]:', err);
    }
  };

  // UI-10: Result screen once entry is logged
  if (result) {
    const tier = result.classification_type || 'Routine Acute';
    const isUrgent = tier.toLowerCase().includes('urgent') || tier.toLowerCase().includes('emergency');
    const isChronic = tier.toLowerCase().includes('chronic');
    const isRecurring = tier.toLowerCase().includes('recurring');

    let tierClass = 'tier-acute';
    let Icon = CheckCircle;
    if (isUrgent) {
      tierClass = 'tier-urgent';
      Icon = ShieldAlert;
    } else if (isChronic) {
      tierClass = 'tier-chronic';
      Icon = AlertTriangle;
    } else if (isRecurring) {
      tierClass = 'tier-recurring';
      Icon = Info;
    }

    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Triage advisory summary</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Your entry has been recorded in your clinical record with timestamp {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          </p>
        </div>

        {/* UI-10: Labelled panel with left rule and distinct icon shape (never color alone) */}
        <section className={`panel ${tierClass}`} style={{ padding: '1.5rem' }} aria-labelledby="triage-result-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Icon size={26} aria-hidden="true" />
            <h2 id="triage-result-heading" style={{ fontSize: '1.35rem', margin: 0 }}>
              {tier}
            </h2>
          </div>

          <div style={{ fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1rem' }}>
            <strong>Clinical reason:</strong> {result.reasoning || 'Standard clinical threshold evaluation.'}
          </div>

          {result.recommendation && (
            <div style={{ fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              <strong>Recommended action:</strong> {result.recommendation}
            </div>
          )}

          {result.recommended_specialist && (
            <div style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              <strong>Suggested specialist:</strong> {result.recommended_specialist}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Severity: {result.severity}/10</span>
            <span>Triage version: {result.triage_version || '1.1.0'}</span>
            <span>Rule: {result.triage_rule_id || 'ROUTINE_ACUTE'}</span>
          </div>
        </section>

        {/* UI-10 / CLIN-4: Medical disclaimer & Hedged phrasing */}
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>Medical disclaimer:</strong> Symptoms entered may be consistent with several conditions. {result.disclaimer || 'SymptomLog provides structured symptom tracking and advisory triage guidance. It is not a certified diagnostic device and does not replace emergency care.'}
        </div>

        {/* UI-10: Helpful / Not helpful feedback & Appointment booking */}
        <div className="panel" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Was this guidance helpful?</span>
            <button
              onClick={() => handleFeedback(true)}
              className={`btn btn-secondary ${feedbackGiven === true ? 'btn-primary' : ''}`}
              style={{ padding: '0.35rem 0.65rem' }}
              aria-label="Mark guidance as helpful"
            >
              <ThumbsUp size={15} aria-hidden="true" />
              <span>Yes</span>
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className={`btn btn-secondary ${feedbackGiven === false ? 'btn-primary' : ''}`}
              style={{ padding: '0.35rem 0.65rem' }}
              aria-label="Mark guidance as not helpful"
            >
              <ThumbsDown size={15} aria-hidden="true" />
              <span>No</span>
            </button>
            {feedbackGiven !== null && (
              <span style={{ fontSize: '0.78rem', color: 'var(--success-text)' }}>Thank you for your feedback.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back to overview
            </button>
            <button
              onClick={() => navigate(`/appointments?symptom=${encodeURIComponent(result.symptom_name || '')}&specialist=${encodeURIComponent(result.recommended_specialist || '')}`)}
              className="btn btn-primary"
            >
              <Calendar size={15} aria-hidden="true" />
              <span>Book an appointment</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter body regions for active view
  const currentViewRegions = BODY_REGIONS.filter(
    (r) => r.view === bodyMapView || r.view === 'both'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Log a symptom</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Describe what you are experiencing. Our clinical engine will extract key markers and provide triage guidance.
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="panel" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
          {errorMsg}
        </div>
      )}

      {/* 2-column layout: Single-column intake form (UI-8) + "What we picked up" side panel */}
      <div className="overview-grid">
        {/* Main Intake Form */}
        <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Free Text Description */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="symptom-description">
              What are you experiencing? *
            </label>
            <span className="form-hint" id="desc-hint">
              Type naturally (e.g., "Severe throbbing headache behind right eye with nausea for 2 days").
            </span>
            <textarea
              id="symptom-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your symptoms in your own words..."
              aria-describedby="desc-hint"
              required
            />
          </div>

          {/* Symptom Name & Severity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="symptom-name">Symptom name *</label>
              <input
                id="symptom-name"
                type="text"
                value={symptomName}
                onChange={(e) => setSymptomName(e.target.value)}
                placeholder="e.g. Migraine, Chest Pain"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="severity-range">
                Severity: <strong>{severity}/10</strong>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
                <input
                  id="severity-range"
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>
          </div>

          {/* UI-9: Body-map control (front/back toggle, labelled region buttons + accessible text list) */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="body-map-view">Body region</label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setBodyMapView('front')}
                  className={`btn ${bodyMapView === 'front' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Front view
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMapView('back')}
                  className={`btn ${bodyMapView === 'back' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Back view
                </button>
              </div>
            </div>

            {/* Visual Region Button Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.4rem',
                marginBottom: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-muted)',
                borderRadius: 'var(--radius-sm)'
              }}
              role="group"
              aria-label={`Body regions: ${bodyMapView} view`}
            >
              {currentViewRegions.map((region) => (
                <button
                  key={region.code}
                  type="button"
                  onClick={() => {
                    setBodyRegionCode(region.code);
                    if (!bodyLocation) setBodyLocation(region.label);
                  }}
                  className={`btn ${bodyRegionCode === region.code ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', textAlign: 'center', whiteSpace: 'normal', height: '100%' }}
                >
                  {region.label}
                </button>
              ))}
            </div>

            {/* Accessible Text Fallback Dropdown (UI-9) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="form-hint">Text list alternative:</span>
              <select
                id="body-map-view"
                value={bodyRegionCode}
                onChange={(e) => {
                  setBodyRegionCode(e.target.value);
                  const found = BODY_REGIONS.find((r) => r.code === e.target.value);
                  if (found && !bodyLocation) setBodyLocation(found.label);
                }}
                aria-label="Select body region from text list"
              >
                <option value="">-- Select body region (optional) --</option>
                {BODY_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label} ({r.view})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Onset Date & Triggers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="started-at">Onset date/time (ENTRY-9)</label>
              <input
                id="started-at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="triggers">Known triggers</label>
              <input
                id="triggers"
                type="text"
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                placeholder="e.g. Stress, Bright lights, Cold weather"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {submitting ? 'Analyzing & recording entry...' : 'Save entry & view triage guidance'}
          </button>
        </form>

        {/* UI-8: "What we picked up" Side Panel */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <section className="panel" aria-labelledby="picked-up-heading">
            <h2 id="picked-up-heading" style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} aria-hidden="true" style={{ color: 'var(--primary)' }} />
              <span>What we picked up</span>
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Real-time clinical markers extracted from your description. Click any chip to edit.
            </p>

            {nlpLoading ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                Analyzing text...
              </div>
            ) : !pickedUpChips ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Start typing your description to see extracted chips for symptom, location, severity, and triggers.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Symptom</span>
                    <strong style={{ fontSize: '0.875rem' }}>{pickedUpChips.symptom}</strong>
                  </div>
                  <span className="chip" style={{ fontSize: '0.72rem' }}>
                    {pickedUpChips.confidence}% conf
                  </span>
                </div>

                {pickedUpChips.location && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Location</span>
                      <strong style={{ fontSize: '0.875rem' }}>{pickedUpChips.location}</strong>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Detected Severity</span>
                    <strong style={{ fontSize: '0.875rem' }}>{pickedUpChips.severity}/10</strong>
                  </div>
                </div>

                {pickedUpChips.triggers && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Triggers</span>
                      <strong style={{ fontSize: '0.875rem' }}>{pickedUpChips.triggers}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
