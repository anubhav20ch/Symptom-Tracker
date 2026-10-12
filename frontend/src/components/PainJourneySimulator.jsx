import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Activity,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Info,
  ChevronRight,
  ShieldCheck,
  FileText,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Color Mapping Schema
export const getPainColor = (severity) => {
  if (severity <= 1) return { color: '#10b981', label: 'No Pain / Baseline', bg: 'rgba(16, 185, 129, 0.15)', name: 'Green' };
  if (severity <= 4) return { color: '#f59e0b', label: 'Minor Discomfort', bg: 'rgba(245, 158, 11, 0.15)', name: 'Yellow' };
  if (severity <= 7) return { color: '#f97316', label: 'Medium / Moderate Pain', bg: 'rgba(249, 115, 22, 0.15)', name: 'Orange' };
  return { color: '#ef4444', label: 'Severe / Acute Pain', bg: 'rgba(239, 68, 68, 0.18)', name: 'Red' };
};

// Default Demo Simulation Data for Instant Clinical Visualization
const SAMPLE_SIMULATION_DATA = [
  {
    day: 1,
    date: '2026-09-10',
    symptom: 'Slight stiffness',
    location: 'Nape of Neck',
    severity: 2,
    sensation: 'Dull Ache',
    trigger: 'Long laptop hours',
    diseaseHypothesis: 'Cervical Strain',
    notes: 'Mild tightness along the upper neck and nape after work.'
  },
  {
    day: 3,
    date: '2026-09-12',
    symptom: 'Resting baseline',
    location: 'General Body',
    severity: 0,
    sensation: 'No Pain',
    trigger: 'Adequate rest',
    diseaseHypothesis: 'Normal Baseline',
    notes: 'Feeling good, rested over the weekend with zero pain.'
  },
  {
    day: 6,
    date: '2026-09-15',
    symptom: 'Nape & Upper Trapezius tension',
    location: 'Nape of Neck',
    severity: 3,
    sensation: 'Persistent Ache',
    trigger: 'Poor sleep posture',
    diseaseHypothesis: 'Cervical Muscle Tension',
    notes: 'Felt tightness returning to nape area upon waking up.'
  },
  {
    day: 9,
    date: '2026-09-18',
    symptom: 'Migrating throbbing ache',
    location: 'Medulla / Occipital Base',
    severity: 6,
    sensation: 'Throbbing & Pulsating',
    trigger: 'Stress & Dehydration',
    diseaseHypothesis: 'Occipital Migraine / Spondylosis',
    notes: 'Pain shifted from nape up into the base of skull (medulla area).'
  },
  {
    day: 14,
    date: '2026-09-23',
    symptom: 'Acute throbbing headache flare-up',
    location: 'Medulla / Occipital Base',
    severity: 8,
    sensation: 'Severe Throbbing & Pressure',
    trigger: 'High mental stress & missed lunch',
    diseaseHypothesis: 'Migraine Flare-up (Severe)',
    notes: 'Intense headache near medulla with photophobia. Had to lie down in dark room.'
  },
  {
    day: 18,
    date: '2026-09-27',
    symptom: 'Radiating pain to shoulder',
    location: 'Spine & Nape',
    severity: 5,
    sensation: 'Pins & Needles tingling',
    trigger: 'Driving & physical exertion',
    diseaseHypothesis: 'Cervical Spondylosis',
    notes: 'Stiffness extending from nape down to right trapezius.'
  },
  {
    day: 22,
    date: '2026-10-01',
    symptom: 'Moderate epigastric burning',
    location: 'Upper Abdomen / Stomach',
    severity: 4,
    sensation: 'Burning & Acidic',
    trigger: 'Spicy dinner & NSAID medication',
    diseaseHypothesis: 'Peptic Acidity',
    notes: 'Felt mild burning in upper stomach area.'
  },
  {
    day: 26,
    date: '2026-10-05',
    symptom: 'Subsided nape stiffness',
    location: 'Nape of Neck',
    severity: 2,
    sensation: 'Mild tightness',
    trigger: 'Physical therapy stretching',
    diseaseHypothesis: 'Recovering Stage',
    notes: 'Pain significantly reduced after warm compresses and prescribed routine.'
  },
  {
    day: 30,
    date: '2026-10-09',
    symptom: 'Controlled baseline',
    location: 'General Body',
    severity: 1,
    sensation: 'Near zero discomfort',
    trigger: 'Good hydration and posture',
    diseaseHypothesis: 'Maintained Health',
    notes: 'Ready for scheduled 1-month doctor follow-up review with full diary log.'
  }
];

export default function PainJourneySimulator({ userEntries = [] }) {
  const navigate = useNavigate();

  // Parse user entries or fallback to sample clinical journey
  const timelineData = (userEntries && userEntries.length > 0)
    ? userEntries.map((e, idx) => ({
        day: idx + 1,
        date: new Date(e.started_at || e.created_at).toISOString().slice(0, 10),
        symptom: e.symptom_name || e.symptom || 'Reported Symptom',
        location: e.body_location || 'Head & Brain',
        severity: parseInt(e.severity, 10) || 0,
        sensation: e.description?.includes('[Sensation]:') ? e.description.split('[Sensation]:')[1].split('|')[0].trim() : 'Pain Sensation',
        trigger: e.trigger || 'None Reported',
        diseaseHypothesis: e.classification_type || 'Clinical Assessment',
        notes: e.description || ''
      })).sort((a, b) => new Date(a.date) - new Date(b.date))
    : SAMPLE_SIMULATION_DATA;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500); // ms per step
  const timerRef = useRef(null);

  const currentStep = timelineData[currentIndex] || timelineData[0];
  const painTheme = getPainColor(currentStep.severity);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= timelineData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, timelineData.length]);

  const handlePlayToggle = () => {
    if (currentIndex >= timelineData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // Helper to determine active anatomical zone highlight
  const isZoneActive = (zoneName) => {
    const loc = currentStep.location.toLowerCase();
    if (zoneName === 'nape' && (loc.includes('nape') || loc.includes('cervical') || loc.includes('neck'))) return true;
    if (zoneName === 'medulla' && (loc.includes('medulla') || loc.includes('occipital') || loc.includes('skull') || loc.includes('temple') || loc.includes('head'))) return true;
    if (zoneName === 'chest' && (loc.includes('chest') || loc.includes('heart') || loc.includes('lung'))) return true;
    if (zoneName === 'stomach' && (loc.includes('stomach') || loc.includes('epigastric') || loc.includes('abdomen'))) return true;
    if (zoneName === 'spine' && (loc.includes('spine') || loc.includes('back') || loc.includes('lumbar'))) return true;
    if (zoneName === 'limbs' && (loc.includes('limb') || loc.includes('joint') || loc.includes('knee') || loc.includes('shoulder'))) return true;
    return false;
  };

  return (
    <div className="card" style={{
      border: `2px solid ${painTheme.color}`,
      backgroundColor: 'var(--bg-card)',
      boxShadow: 'var(--shadow-lg)',
      padding: '1.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      transition: 'border-color 0.4s ease'
    }}>
      {/* Header & Color Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={24} style={{ color: painTheme.color }} />
            <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>
              Pain Journey Simulation & Timeline Replay
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Visual progression of pain intensity & anatomical locations tracked over time (Doctor / Hospital ready).
          </p>
        </div>

        {/* 4-Color Pain Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.4rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Green: 0-1 (No Pain)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Yellow: 2-4 (Minor)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f97316', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }} /> Orange: 5-7 (Medium)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} /> Red: 8-10 (Severe)
          </span>
        </div>
      </div>

      {/* Main Simulation Viewport (Body Heatmap + Live Telemetry) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
        
        {/* Visual Interactive Body Heatmap Display */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: '290px'
        }}>
          {/* Animated Body Silhouette Illustration with Glowing Nodes */}
          <div style={{ width: '200px', height: '230px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* 1. Medulla / Head Node */}
            <div style={{
              position: 'absolute',
              top: '10px',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isZoneActive('medulla') ? painTheme.color : 'var(--bg-tertiary)',
              border: `2px solid ${isZoneActive('medulla') ? '#ffffff' : 'var(--border-subtle)'}`,
              boxShadow: isZoneActive('medulla') ? `0 0 20px ${painTheme.color}` : 'none',
              transition: 'all 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              color: '#ffffff',
              zIndex: 3
            }}>
              🧠
            </div>

            {/* 2. Nape of Neck / Cervical Node */}
            <div style={{
              position: 'absolute',
              top: '60px',
              width: '36px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: isZoneActive('nape') ? painTheme.color : 'var(--bg-tertiary)',
              border: `2px solid ${isZoneActive('nape') ? '#ffffff' : 'var(--border-subtle)'}`,
              boxShadow: isZoneActive('nape') ? `0 0 20px ${painTheme.color}` : 'none',
              transition: 'all 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#ffffff',
              zIndex: 3
            }}>
              Nape
            </div>

            {/* 3. Chest / Heart Node */}
            <div style={{
              position: 'absolute',
              top: '90px',
              width: '80px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: isZoneActive('chest') ? painTheme.color : 'var(--bg-tertiary)',
              border: `2px solid ${isZoneActive('chest') ? '#ffffff' : 'var(--border-subtle)'}`,
              boxShadow: isZoneActive('chest') ? `0 0 20px ${painTheme.color}` : 'none',
              transition: 'all 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: isZoneActive('chest') ? '#ffffff' : 'var(--text-muted)',
              zIndex: 2
            }}>
              🫁 Chest
            </div>

            {/* 4. Stomach / Upper GI Node */}
            <div style={{
              position: 'absolute',
              top: '134px',
              width: '68px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: isZoneActive('stomach') ? painTheme.color : 'var(--bg-tertiary)',
              border: `2px solid ${isZoneActive('stomach') ? '#ffffff' : 'var(--border-subtle)'}`,
              boxShadow: isZoneActive('stomach') ? `0 0 20px ${painTheme.color}` : 'none',
              transition: 'all 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: isZoneActive('stomach') ? '#ffffff' : 'var(--text-muted)',
              zIndex: 2
            }}>
              🔥 GI
            </div>

            {/* 5. Spine & Lower Body */}
            <div style={{
              position: 'absolute',
              top: '174px',
              width: '56px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: (isZoneActive('spine') || isZoneActive('limbs')) ? painTheme.color : 'var(--bg-tertiary)',
              border: `2px solid ${(isZoneActive('spine') || isZoneActive('limbs')) ? '#ffffff' : 'var(--border-subtle)'}`,
              boxShadow: (isZoneActive('spine') || isZoneActive('limbs')) ? `0 0 20px ${painTheme.color}` : 'none',
              transition: 'all 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: (isZoneActive('spine') || isZoneActive('limbs')) ? '#ffffff' : 'var(--text-muted)',
              zIndex: 2
            }}>
              🦴 Spine
            </div>
          </div>

          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: painTheme.color,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span>Active Heatmap Target:</span>
            <strong>{currentStep.location}</strong>
          </div>
        </div>

        {/* Live Simulation Telemetry Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Day & Date Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              backgroundColor: painTheme.bg,
              color: painTheme.color,
              padding: '0.3rem 0.8rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              Day {currentStep.day} of {timelineData.length} • {currentStep.date}
            </span>

            <span style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: painTheme.color,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              {currentStep.severity} / 10 ({painTheme.name})
            </span>
          </div>

          {/* Pain Metric Details */}
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            borderLeft: `5px solid ${painTheme.color}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentStep.symptom}
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              <strong>📍 Pinpointed Area:</strong> {currentStep.location}
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              <strong>⚡ Sensation Characteristic:</strong> {currentStep.sensation}
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              <strong>🔬 AI Dataset Matching:</strong> <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{currentStep.diseaseHypothesis}</span>
            </div>

            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              <strong>📋 Clinical Observations:</strong> "{currentStep.notes}"
            </div>
          </div>
        </div>
      </div>

      {/* TIMELINE SCRUBBER & CONTROLS */}
      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        {/* Timeline Slider with Color Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Day 1</span>
          
          <input
            type="range"
            min="0"
            max={timelineData.length - 1}
            value={currentIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentIndex(parseInt(e.target.value, 10));
            }}
            style={{ flex: 1, accentColor: painTheme.color, height: '6px', cursor: 'pointer' }}
          />

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Day {timelineData.length}</span>
        </div>

        {/* Playback Buttons & Speed Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary btn-sm"
              title="Restart from Day 1"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex((p) => Math.max(0, p - 1));
              }}
              className="btn btn-secondary btn-sm"
              disabled={currentIndex === 0}
            >
              <SkipBack size={14} />
            </button>

            <button
              type="button"
              onClick={handlePlayToggle}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: painTheme.color, borderColor: painTheme.color }}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? 'Pause Simulation' : 'Play Pain Journey'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex((p) => Math.min(timelineData.length - 1, p + 1));
              }}
              className="btn btn-secondary btn-sm"
              disabled={currentIndex === timelineData.length - 1}
            >
              <SkipForward size={14} />
            </button>
          </div>

          {/* Speed Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speed:</span>
            {[
              { label: '1x', ms: 1500 },
              { label: '2x', ms: 800 },
              { label: '4x', ms: 400 }
            ].map(spd => (
              <button
                key={spd.label}
                type="button"
                onClick={() => setPlaybackSpeed(spd.ms)}
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: playbackSpeed === spd.ms ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: playbackSpeed === spd.ms ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                  color: playbackSpeed === spd.ms ? 'var(--accent-primary)' : 'var(--text-secondary)'
                }}
              >
                {spd.label}
              </button>
            ))}
          </div>

          {/* Link to 30-Day Hospital PDF Report */}
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          >
            <FileText size={14} />
            <span>Generate 30-Day Hospital Report →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
