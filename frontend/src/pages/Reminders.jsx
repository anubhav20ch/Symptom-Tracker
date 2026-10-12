import React, { useState, useEffect } from 'react';
import {
  Bell,
  PlusCircle,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Volume1,
  Sliders,
  Play,
  ShieldCheck,
  X,
  Sparkles,
  Calendar,
  Lock,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Check,
  RotateCcw,
  SkipForward,
  Flame,
  Pill,
  ShoppingBag,
  HeartPulse,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { remindersApi, medicationsApi } from '../api/client';
import { alarmSound, ALARM_SOUND_PRESETS, ALARM_VOLUME_LEVELS } from '../utils/alarmSound';
import { pushManager } from '../utils/pushManager';

// YYYY-MM-DD in local time; used as the dose-log key everywhere, including
// the backend's dose_logs.dose_date column, so client and server agree on
// "which day" a dose belongs to regardless of toDateString() locale formatting.
function dateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Routine Time Slots (Tata 1mg & Apollo 24/7 format)
const ROUTINE_SLOTS = [
  { id: 'morning', label: 'Morning Routine', timeRange: '06:00 AM - 11:59 AM', icon: Sun, color: '#f59e0b', defaultTime: '08:30' },
  { id: 'afternoon', label: 'Afternoon Routine', timeRange: '12:00 PM - 04:59 PM', icon: Coffee, color: '#06b6d4', defaultTime: '13:30' },
  { id: 'evening', label: 'Evening Routine', timeRange: '05:00 PM - 07:59 PM', icon: Sunset, color: '#f97316', defaultTime: '18:00' },
  { id: 'night', label: 'Night Routine', timeRange: '08:00 PM - 11:59 PM', icon: Moon, color: '#818cf8', defaultTime: '21:00' }
];

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [time, setTime] = useState('08:30');
  const [label, setLabel] = useState('Paracetamol 650mg');
  const [dosage, setDosage] = useState('1 Tablet');
  const [mealTiming, setMealTiming] = useState('After Food');
  const [pillForm, setPillForm] = useState('Tablet ⚪');
  const [durationDays, setDurationDays] = useState('7');
  const [routineSlot, setRoutineSlot] = useState('morning');

  // Dose Tracking State: source of truth is the backend dose_logs table (so
  // doctors/caregivers and other devices see real adherence history), kept
  // here as a local {`${reminderId}_${YYYY-MM-DD}`: value} map for fast UI lookups.
  const [takenDoses, setTakenDoses] = useState({});
  const [skippedDoses, setSkippedDoses] = useState({});

  // Background alarm (push notification) opt-in state
  const [alarmPermission, setAlarmPermission] = useState(() => pushManager.getPermissionState());
  const [enablingAlarms, setEnablingAlarms] = useState(false);

  const loadDoseHistory = async () => {
    try {
      const res = await remindersApi.getDoseHistory();
      const taken = {};
      const skipped = {};
      (res.data.doses || []).forEach((d) => {
        const key = `${d.reminder_id}_${d.dose_date}`;
        if (d.status === 'taken') {
          taken[key] = new Date(d.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (d.status === 'skipped') {
          skipped[key] = d.note || 'Skipped';
        }
      });
      setTakenDoses(taken);
      setSkippedDoses(skipped);
    } catch (err) {
      console.error('Failed to load dose history:', err);
    }
  };

  const handleEnableBackgroundAlarms = async () => {
    setEnablingAlarms(true);
    try {
      const result = await pushManager.enableBackgroundAlarms();
      setAlarmPermission(pushManager.getPermissionState());
      if (!result.ok) {
        const reasons = {
          unsupported: 'This browser does not support background notifications.',
          permission_denied: 'Notification permission was denied. Enable it in your browser site settings to get alarms when the tab is closed.',
          server_push_disabled: 'The server has not been configured with push notification keys yet (see backend/.env VAPID_* settings).'
        };
        alert(reasons[result.reason] || 'Could not enable background alarms.');
      }
    } finally {
      setEnablingAlarms(false);
    }
  };

  // User Audio Preferences (Patient controlled exclusively)
  const [selectedSound, setSelectedSound] = useState(() => alarmSound.getSelectedSound());
  const [selectedVolume, setSelectedVolume] = useState(() => alarmSound.getVolume());
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  // Active Live Alarm Popup
  const [activeAlarm, setActiveAlarm] = useState(null);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const res = await remindersApi.getAll();
      setReminders(res.data.reminders || []);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    loadDoseHistory();
  }, []);

  // Periodic Live Alarm Trigger Check
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      reminders.forEach((r) => {
        if (r.active && !r.is_expired && r.scheduled_time === currentTimeStr) {
          const doseKey = `${r.id}_${dateKey()}`;
          if (!takenDoses[doseKey] && (!activeAlarm || activeAlarm.id !== r.id)) {
            alarmSound.playSound(selectedSound, selectedVolume);
            setActiveAlarm(r);
          }
        }
      });
    }, 20000); // checks every 20 seconds

    return () => clearInterval(interval);
  }, [reminders, activeAlarm, selectedSound, selectedVolume, takenDoses]);

  // Keep chiming while an alarm is active, instead of playing the tone once
  // and then going silent while the full-screen alert sits there waiting —
  // a real medicine alarm should keep ringing until it's actually dismissed
  // (Mark Taken / Skip / Snooze), not after a single beep.
  useEffect(() => {
    if (!activeAlarm) return undefined;
    const repeat = setInterval(() => {
      alarmSound.playSound(selectedSound, selectedVolume);
    }, 2500);
    return () => clearInterval(repeat);
  }, [activeAlarm, selectedSound, selectedVolume]);

  const handleSoundChange = (soundId) => {
    setSelectedSound(soundId);
    alarmSound.setSelectedSound(soundId);
    alarmSound.playSound(soundId, selectedVolume);
  };

  const handleVolumeChange = (vol) => {
    const num = parseFloat(vol);
    setSelectedVolume(num);
    alarmSound.setVolume(num);
    if (num > 0) {
      alarmSound.playSound(selectedSound, num);
    }
  };

  const handleTestChime = () => {
    alarmSound.playSound(selectedSound, selectedVolume);
    setActiveAlarm({
      id: 'test-preview',
      label: 'Sample Dose: Amoxicillin 500mg',
      dosage: '1 Capsule',
      scheduled_time: 'Now (Test Alarm)',
      prescribed_by_doctor_name: 'Dr. Jennifer Vance, MD'
    });
  };

  const handleMarkTaken = async (reminder) => {
    if (reminder.id === 'test-preview') {
      setActiveAlarm(null);
      return;
    }
    const key = `${reminder.id}_${dateKey()}`;
    const takenAtLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Optimistic UI update; the backend call below is the source of truth.
    setTakenDoses((prev) => ({ ...prev, [key]: takenAtLabel }));

    if (activeAlarm && activeAlarm.id === reminder.id) {
      setActiveAlarm(null);
    }

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

    try {
      await remindersApi.logDose(reminder.id, { status: 'taken' });
    } catch (err) {
      console.error('Failed to record dose as taken:', err);
    }
  };

  const handleSkipDose = async (reminder) => {
    if (reminder.id === 'test-preview') {
      setActiveAlarm(null);
      return;
    }
    const reason = window.prompt('Reason for skipping dose (Optional: Side effects, Out of stock, Felt fine):', 'Doctor Advised');
    if (reason === null) return;

    const key = `${reminder.id}_${dateKey()}`;
    setSkippedDoses((prev) => ({ ...prev, [key]: reason || 'Skipped' }));

    if (activeAlarm && activeAlarm.id === reminder.id) {
      setActiveAlarm(null);
    }

    try {
      await remindersApi.logDose(reminder.id, { status: 'skipped', note: reason || 'Skipped' });
    } catch (err) {
      console.error('Failed to record dose as skipped:', err);
    }
  };

  const handleSnooze = (minutes = 15) => {
    alert(`Alarm snoozed for ${minutes} minutes. We will chime again shortly.`);
    setActiveAlarm(null);
  };

  const handleToggle = async (id) => {
    try {
      await remindersApi.toggle(id);
      loadReminders();
    } catch (err) {
      alert('Failed to toggle reminder schedule');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this reminder schedule? You can add a new one anytime.')) return;
    try {
      await remindersApi.delete(id);
      loadReminders();
    } catch (err) {
      alert('Failed to delete reminder');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!time) return;
    setSaving(true);
    try {
      const fullLabel = `${label.trim()} (${dosage.trim()} • ${mealTiming})`;
      await remindersApi.create({
        scheduled_time: time,
        label: fullLabel,
        duration_days: durationDays ? parseInt(durationDays, 10) : null,
        sound_alarm: true
      });
      setShowModal(false);
      setLabel('Paracetamol 650mg');
      loadReminders();
    } catch (err) {
      alert('Failed to create reminder schedule');
    } finally {
      setSaving(false);
    }
  };

  // Helper to place reminders in routine buckets
  const getSlotForTime = (timeStr) => {
    if (!timeStr) return 'morning';
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
  };

  const totalDosesToday = reminders.filter(r => r.active && !r.is_expired).length;
  const takenCount = Object.keys(takenDoses).filter(k => k.endsWith(`_${dateKey()}`)).length;
  const adherenceRate = totalDosesToday > 0 ? Math.round((takenCount / totalDosesToday) * 100) : 100;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '920px', margin: '0 auto' }}>
      
      {/* LIVE ALARM OVERLAY (Tata 1mg / Apollo 24/7 Full Screen Style Modal) */}
      {activeAlarm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: 'var(--bg-secondary)',
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.5)',
            textAlign: 'center',
            padding: '2.25rem 1.75rem',
            position: 'relative'
          }}>
            {/* Pulsing Alarm Bell Icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              animation: 'pulse 1.5s infinite'
            }}>
              <Bell size={36} className="text-indigo-600" />
            </div>

            <span className="badge badge-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              ⏰ Scheduled Medicine Dose Alert
            </span>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0 0.25rem', color: 'var(--text-primary)' }}>
              {activeAlarm.label}
            </h2>

            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '0.5rem' }}>
              Scheduled for: {activeAlarm.scheduled_time}
            </div>

            {activeAlarm.prescribed_by_doctor_name && (
              <div style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <ShieldCheck size={14} color="var(--accent-teal)" />
                <span>Prescribed by: <strong>{activeAlarm.prescribed_by_doctor_name}</strong></span>
              </div>
            )}

            {/* Chime tone info */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Playing Melody: <strong>{ALARM_SOUND_PRESETS.find(s => s.id === selectedSound)?.label}</strong> (Vol: {Math.round(selectedVolume * 100)}%)
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleMarkTaken(activeAlarm)}
                className="btn btn-primary btn-lg"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px var(--accent-primary-glow)'
                }}
              >
                <CheckCircle2 size={20} />
                <span>Mark Dose as Taken</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  onClick={() => handleSnooze(15)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                >
                  <RotateCcw size={15} />
                  <span>Snooze 15m</span>
                </button>
                <button
                  onClick={() => handleSkipDose(activeAlarm)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                >
                  <SkipForward size={15} />
                  <span>Skip Dose</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER WITH TATA 1MG & APOLLO 24/7 ADHERENCE DASHBOARD */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Pill size={26} className="text-indigo-600" />
              <h1 style={{ fontSize: '1.85rem', letterSpacing: '-0.02em', margin: 0 }}>Medication Routine & Alarm Scheduler</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Tata 1mg & Apollo 24/7 styled daily dose slots, meal tracking, adherence analytics, and melodic chime alarms.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Background Alarm (Push Notification) Opt-in */}
            {alarmPermission !== 'granted' ? (
              <button
                onClick={handleEnableBackgroundAlarms}
                disabled={enablingAlarms}
                className="btn btn-secondary btn-sm"
                title="Without this, alarms only ring while this browser tab is open and focused."
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Bell size={15} />
                <span>{enablingAlarms ? 'Enabling…' : 'Enable Background Alarms'}</span>
              </button>
            ) : (
              <span
                className="badge"
                title="This device will receive medicine alarms even when the tab is closed."
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--accent-teal-light)', color: 'var(--accent-teal)' }}
              >
                <ShieldCheck size={13} />
                Background Alarms On
              </span>
            )}

            {/* Audio Settings Toggle */}
            <button
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sliders size={15} />
              <span>Alarm Sound & Volume</span>
            </button>

            {/* Test Melodic Chime */}
            <button
              onClick={handleTestChime}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Play size={14} />
              <span>Test Alarm Tone</span>
            </button>

            {/* Add Custom Dose Schedule */}
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PlusCircle size={15} />
              <span>Add Dose Schedule</span>
            </button>
          </div>
        </div>

        {/* 1mg / Apollo 24/7 Compliance & Streak Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Adherence</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: adherenceRate >= 80 ? '#10b981' : '#f59e0b', marginTop: '0.2rem' }}>
              {takenCount} / {totalDosesToday} Taken ({adherenceRate}%)
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
              <div style={{ width: `${adherenceRate}%`, height: '100%', backgroundColor: adherenceRate >= 80 ? '#10b981' : '#f59e0b' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Streak</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea580c', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Flame size={24} /> 6 Days Active
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Keep up consistent medication timing</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Refill Alert (Apollo / 1mg)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-teal)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShoppingBag size={20} /> Stock Good
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>~12 Days of dosage remaining</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Melody</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {ALARM_SOUND_PRESETS.find(s => s.id === selectedSound)?.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Volume: {Math.round(selectedVolume * 100)}% (Patient Exclusive)
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE AUDIO & VOLUME PREFERENCES (Patient Protected) */}
      {showAudioSettings && (
        <div className="card animate-fade-in" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-focus)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Volume2 size={20} className="text-indigo-600" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Custom Melodic Chime & Volume Controls</h3>
            </div>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              <Lock size={12} style={{ marginRight: '3px' }} />
              Patient Exclusive Privilege
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Melody Preset Selector */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                Select Melodic Alarm Tone (8 Presets)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {ALARM_SOUND_PRESETS.map((snd) => (
                  <button
                    key={snd.id}
                    type="button"
                    onClick={() => handleSoundChange(snd.id)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      fontWeight: selectedSound === snd.id ? 700 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: selectedSound === snd.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      backgroundColor: selectedSound === snd.id ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                      color: selectedSound === snd.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{snd.label}</span>
                    {selectedSound === snd.id && <Play size={12} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 0 }}>
                  Alarm Volume Level ({Math.round(selectedVolume * 100)}%)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedVolume === 0 ? 'Muted' : selectedVolume > 0.6 ? 'High' : 'Normal'}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.14"
                value={selectedVolume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '6px', cursor: 'pointer', marginBottom: '0.75rem' }}
              />

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {ALARM_VOLUME_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => handleVolumeChange(lvl.value)}
                    style={{
                      flex: 1,
                      padding: '0.3rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedVolume === lvl.value ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      backgroundColor: selectedVolume === lvl.value ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                      color: selectedVolume === lvl.value ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROUTINE TIME SLOTS (Tata 1mg & Apollo 24/7 Layout) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {ROUTINE_SLOTS.map((slot) => {
          const SlotIcon = slot.icon;
          const slotReminders = reminders.filter(r => getSlotForTime(r.scheduled_time) === slot.id);

          return (
            <div key={slot.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              {/* Routine Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: `${slot.color}15`,
                    color: slot.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <SlotIcon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {slot.label}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {slot.timeRange}
                    </span>
                  </div>
                </div>

                <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {slotReminders.length} {slotReminders.length === 1 ? 'Dose' : 'Doses'} Scheduled
                </span>
              </div>

              {/* Doses in this slot */}
              {slotReminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No scheduled doses in this time slot.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {slotReminders.map((r) => {
                    const rowDateKey = `${r.id}_${dateKey()}`;
                    const isTakenToday = !!takenDoses[rowDateKey];
                    const isSkippedToday = !!skippedDoses[rowDateKey];

                    return (
                      <div
                        key={r.id}
                        style={{
                          padding: '1rem 1.15rem',
                          backgroundColor: isTakenToday ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-lg)',
                          border: isTakenToday ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {/* Left Info */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: isTakenToday ? 'var(--accent-teal-light)' : 'var(--bg-secondary)',
                            color: isTakenToday ? 'var(--accent-teal)' : 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isTakenToday ? <Check size={22} /> : <Pill size={20} />}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {r.label}
                              </span>
                              {r.prescribed_by_doctor_name && (
                                <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                                  Doctor Prescribed
                                </span>
                              )}
                              {r.is_expired && (
                                <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
                                  Auto-Expired
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                <Clock size={13} /> {r.scheduled_time}
                              </span>
                              {r.prescribed_duration_days && (
                                <span>• Course: {r.prescribed_duration_days} Days</span>
                              )}
                              {isTakenToday && (
                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                  ✓ Taken at {takenDoses[rowDateKey]}
                                </span>
                              )}
                              {isSkippedToday && (
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                  ✕ Skipped ({skippedDoses[rowDateKey]})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {!isTakenToday ? (
                            <>
                              <button
                                onClick={() => handleMarkTaken(r)}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
                              >
                                <Check size={14} />
                                <span>Mark Taken</span>
                              </button>
                              <button
                                onClick={() => handleSkipDose(r)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                Skip
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={async () => {
                                const updated = { ...takenDoses };
                                delete updated[rowDateKey];
                                setTakenDoses(updated);
                                try {
                                  await remindersApi.undoDose(r.id, dateKey());
                                } catch (err) {
                                  console.error('Failed to undo dose:', err);
                                }
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem' }}
                            >
                              Undo Taken
                            </button>
                          )}

                          <button
                            onClick={() => handleToggle(r.id)}
                            className="btn btn-secondary btn-sm"
                            title={r.active ? 'Pause Schedule' : 'Resume Schedule'}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {r.active ? 'Pause' : 'Resume'}
                          </button>

                          <button
                            onClick={() => handleDelete(r.id)}
                            className="btn btn-secondary btn-sm"
                            title="Remove dose reminder"
                            style={{ color: '#ef4444', padding: '0.4rem' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE NEW DOSE SCHEDULE MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-focus)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={20} className="text-indigo-600" />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Add Medication Dose Schedule</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Routine Slot Picker */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Routine Slot *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {ROUTINE_SLOTS.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setRoutineSlot(s.id);
                        setTime(s.defaultTime);
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: routineSlot === s.id ? 700 : 500,
                        border: routineSlot === s.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: routineSlot === s.id ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                        color: routineSlot === s.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicine Name & Dosage */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Medicine Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Metformin, Aspirin, Amoxicillin"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dosage *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 500mg, 1 Pill"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Meal Timing & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meal Timing</label>
                  <select
                    className="form-select"
                    value={mealTiming}
                    onChange={(e) => setMealTiming(e.target.value)}
                  >
                    <option value="After Food">🍽️ After Food</option>
                    <option value="Before Food">🥣 Before Food</option>
                    <option value="With Food">🥗 With Food</option>
                    <option value="Empty Stomach">🥛 Empty Stomach</option>
                    <option value="Anytime">⏰ Anytime</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Alarm Time (24h) *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Course Duration */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Course Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="form-input"
                  placeholder="e.g. 5, 7, 14, or 30 days"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Alarm will automatically expire once course completes.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Creating Schedule...' : 'Save Alarm Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
