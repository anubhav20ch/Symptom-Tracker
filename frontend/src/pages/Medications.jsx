import React, { useState, useEffect, useRef } from 'react';
import {
  Pill,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  Trash2,
  Calendar,
  Volume2
} from 'lucide-react';
import { medicationsApi, remindersApi } from '../api/client';

// Simple Web Audio API chime for the visual + sound alarm (UI-13)
function playAlarmChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (err) {
    // AudioContext blocked by browser autoplay policy until user gesture
  }
}

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once Daily');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // UI-13 & A11Y-4: Focus-trapping alertdialog state
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [skipReason, setSkipReason] = useState('Felt better / unnecessary');
  const [showSkipInput, setShowSkipInput] = useState(false);
  const dialogRef = useRef(null);
  const takenBtnRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [medsRes, remsRes, dosesRes] = await Promise.all([
        medicationsApi.getAll(),
        remindersApi.getAll().catch(() => ({ data: { reminders: [] } })),
        remindersApi.getDoses({ limit: 30 }).catch(() => ({ data: { doses: [] } }))
      ]);
      setMedications(medsRes.data?.medications || []);
      setReminders(remsRes.data?.reminders || []);
      setDoses(dosesRes.data?.doses || []);
    } catch (err) {
      console.error('[Medications Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trap focus in alertdialog when active (A11Y-4)
  useEffect(() => {
    if (activeAlarm) {
      playAlarmChime();
      takenBtnRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              last.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeAlarm]);

  const handleCreateMedication = async (e) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) {
      setFormError('Please enter medication name and prescribed dosage.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      // MED-4: strictly store what user/physician inputs, no dosing advice
      await medicationsApi.create({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        active: true
      });
      setName('');
      setDosage('');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to save medication');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedication = async (id) => {
    if (!window.confirm('Are you sure you want to remove this medication record?')) return;
    try {
      await medicationsApi.delete(id);
      loadData();
    } catch (err) {
      console.error('[Delete Med Error]:', err);
    }
  };

  const handleDoseAction = async (status, reason = null) => {
    if (!activeAlarm) return;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      await remindersApi.logDose({
        reminder_id: activeAlarm.reminder_id || activeAlarm.id,
        dose_date: todayStr,
        status,
        skip_reason: reason
      });
      setActiveAlarm(null);
      setShowSkipInput(false);
      loadData();
    } catch (err) {
      console.error('[Log Dose Error]:', err);
      setActiveAlarm(null);
    }
  };

  // Day Timeline slots (UI-13)
  const timelineSlots = [
    { period: 'Morning (08:00)', time: '08:00', label: 'Morning doses' },
    { period: 'Afternoon (13:00)', time: '13:00', label: 'Mid-day doses' },
    { period: 'Evening (18:00)', time: '18:00', label: 'Evening doses' },
    { period: 'Night (21:00)', time: '21:00', label: 'Bedtime doses' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Medicines & dose schedule</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Daily scheduled timeline of prescribed doses and medication management.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.85rem' }}
          >
            <PlusCircle size={15} aria-hidden="true" />
            <span>Add medicine</span>
          </button>
        </div>
      </div>

      {/* MED-4 Notice */}
      <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <strong>Clinical notice (MED-4):</strong> SymptomLog does not provide dosing advice or drug-interaction checks. Take medications strictly as prescribed by your doctor.
      </div>

      {/* UI-13: Day Timeline of Doses */}
      <section className="panel" aria-labelledby="timeline-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="timeline-heading" style={{ fontSize: '1.15rem' }}>Day dose timeline (Today)</h2>
          {medications.length > 0 && (
            <button
              onClick={() => setActiveAlarm(medications[0])}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              title="Test dose alert"
            >
              <Volume2 size={13} aria-hidden="true" />
              <span>Simulate dose alarm</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {timelineSlots.map((slot, idx) => {
            const slotMeds = medications.filter((_, i) => (i % timelineSlots.length) === idx);

            return (
              <div
                key={slot.period}
                style={{
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Clock size={15} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <strong style={{ fontSize: '0.85rem' }}>{slot.period}</strong>
                </div>

                {slotMeds.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No doses scheduled</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {slotMeds.map((med) => (
                      <div
                        key={med.id}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{med.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{med.dosage}</div>
                        </div>
                        <button
                          onClick={() => setActiveAlarm(med)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                        >
                          Action
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Prescribed Medications Table */}
      <section className="panel" aria-labelledby="meds-list-heading">
        <h2 id="meds-list-heading" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
          Current medication records
        </h2>

        {loading ? (
          <div style={{ padding: '1.5rem 0', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : medications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No medications recorded yet. Click "Add medicine" to create a new prescription or dose record.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table" aria-label="Prescribed medications list">
              <thead>
                <tr>
                  <th scope="col">Medicine name</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Prescribed by</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.dosage}</td>
                    <td>{m.frequency}</td>
                    <td>{m.doctor_name ? `Dr. ${m.doctor_name}` : 'Self-recorded'}</td>
                    <td>
                      <span className="chip" style={{ fontSize: '0.72rem' }}>
                        {m.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteMedication(m.id)}
                        className="btn btn-text"
                        style={{ color: 'var(--danger-text)', padding: '0.2rem' }}
                        aria-label={`Delete ${m.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* UI-13 & A11Y-4: Focus-Trapping Medication Alarm AlertDialog */}
      {activeAlarm && (
        <div className="modal-backdrop" role="presentation">
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alarm-dialog-title"
            aria-describedby="alarm-dialog-desc"
            className="modal-dialog"
            style={{ borderLeft: '6px solid var(--primary)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Bell size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h2 id="alarm-dialog-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                Medication dose due
              </h2>
            </div>

            <p id="alarm-dialog-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Scheduled dose of <strong>{activeAlarm.name}</strong> ({activeAlarm.dosage}). Please confirm administration.
            </p>

            {showSkipInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <label htmlFor="skip-reason" style={{ fontSize: '0.85rem' }}>Reason for skipping dose:</label>
                <select
                  id="skip-reason"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                >
                  <option value="Felt better / unnecessary">Felt better / unnecessary</option>
                  <option value="Side effects / nauseous">Side effects / adverse reaction</option>
                  <option value="Away from home / forgot supply">Away from home / forgot supply</option>
                  <option value="Physician instructed pause">Physician instructed pause</option>
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleDoseAction('skipped', skipReason)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Confirm skip
                  </button>
                  <button
                    onClick={() => setShowSkipInput(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  ref={takenBtnRef}
                  onClick={() => handleDoseAction('taken')}
                  className="btn btn-primary"
                  style={{ minWidth: '100px' }}
                >
                  <CheckCircle size={15} aria-hidden="true" />
                  <span>Taken</span>
                </button>

                <button
                  onClick={() => setShowSkipInput(true)}
                  className="btn btn-secondary"
                >
                  <XCircle size={15} aria-hidden="true" />
                  <span>Skip dose</span>
                </button>

                <button
                  onClick={() => {
                    alert('Alarm snoozed for 15 minutes.');
                    setActiveAlarm(null);
                  }}
                  className="btn btn-secondary"
                >
                  <Clock size={15} aria-hidden="true" />
                  <span>Snooze (15m)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="add-med-title">
            <h2 id="add-med-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Record medication</h2>

            {formError && (
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMedication} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="med-name">Medicine name *</label>
                <input
                  id="med-name"
                  type="text"
                  placeholder="e.g. Paracetamol, Metformin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="med-dosage">Dosage *</label>
                <input
                  id="med-dosage"
                  type="text"
                  placeholder="e.g. 500mg, 1 tablet"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="med-freq">Frequency</label>
                <select id="med-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="Once Daily">Once Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Three Times Daily">Three Times Daily</option>
                  <option value="As Needed (PRN)">As Needed (PRN)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Save medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
