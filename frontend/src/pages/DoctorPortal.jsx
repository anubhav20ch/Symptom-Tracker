import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  LogOut,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Send,
  ShieldCheck,
  Pill,
  Bell,
  Lock,
  PlusCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { doctorApi } from '../api/client';

export default function DoctorPortal() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [reviewMessage, setReviewMessage] = useState({});

  // Active Prescribing State per appointment
  const [prescribeOpenId, setPrescribeOpenId] = useState(null);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('Twice daily');
  const [medDuration, setMedDuration] = useState('7');
  const [medReminderTime, setMedReminderTime] = useState('08:00');
  const [medInstructions, setMedInstructions] = useState('');
  const [prescribing, setPrescribing] = useState(false);
  const [prescribeMessage, setPrescribeMessage] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('symptomlog_doctor');
    if (!stored) {
      navigate('/doctor/login', { replace: true });
      return;
    }
    setDoctor(JSON.parse(stored));
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await doctorApi.getAppointments();
      setAppointments(res.data.appointments || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
      console.error('Failed to load physician appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await doctorApi.logout(); } catch (e) { /* ignore */ }
    localStorage.removeItem('symptomlog_doctor_token');
    localStorage.removeItem('symptomlog_doctor');
    navigate('/doctor/login', { replace: true });
  };

  const handleReview = async (id, status) => {
    setSavingId(id);
    setReviewMessage((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await doctorApi.reviewAppointment(id, {
        status,
        doctor_review_notes: noteDrafts[id] !== undefined ? noteDrafts[id] : undefined
      });
      setReviewMessage((prev) => ({
        ...prev,
        [id]: {
          type: 'success',
          text: status === 'completed'
            ? '✓ Consultation completed! E-prescribing privileges are now locked.'
            : status === 'cancelled'
            ? 'Appointment marked as cancelled.'
            : status === 'scheduled'
            ? 'Appointment re-opened as active (scheduled).'
            : 'Clinical evaluation notes updated successfully.'
        }
      }));
      await loadAppointments();
    } catch (err) {
      setReviewMessage((prev) => ({
        ...prev,
        [id]: {
          type: 'error',
          text: err.response?.data?.error?.message || 'Failed to submit review'
        }
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handlePrescribe = async (apptId) => {
    if (!medName.trim() || !medDosage.trim()) {
      setPrescribeMessage({ [apptId]: { type: 'error', text: 'Medication name and dosage are required.' } });
      return;
    }

    setPrescribing(true);
    setPrescribeMessage({});

    try {
      const res = await doctorApi.prescribeMedication(apptId, {
        name: medName,
        dosage: medDosage,
        frequency: medFrequency,
        duration_days: parseInt(medDuration, 10) || 7,
        reminder_time: medReminderTime,
        instructions: medInstructions
      });

      setPrescribeMessage({
        [apptId]: {
          type: 'success',
          text: res.data?.message || `Prescribed ${medName} with auto-expiring ${medDuration}-day alarm schedule.`
        }
      });

      // Clear form
      setMedName('');
      setMedDosage('');
      setMedInstructions('');
      setTimeout(() => setPrescribeOpenId(null), 2500);
      loadAppointments();
    } catch (err) {
      setPrescribeMessage({
        [apptId]: {
          type: 'error',
          text: err.response?.data?.error?.message || 'Failed to prescribe medication.'
        }
      });
    } finally {
      setPrescribing(false);
    }
  };

  if (!doctor) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--bg-secondary)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'var(--glass-blur)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d9488 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)'
          }}>
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>Physician Consultation Portal</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{doctor.name} • {doctor.specialty}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <LogOut size={14} /> <span>Sign Out</span>
        </button>
      </div>

      <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.3rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Patient Clinical Consultations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Review longitudinal symptom histories, prescribe medications with auto-expiring alarms, and record clinical notes.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid var(--border-subtle)',
              borderTopColor: 'var(--accent-teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <span>Loading patient queue...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <Stethoscope size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No appointments currently assigned to your queue</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {appointments.map((appt) => {
              const isActive = appt.status === 'scheduled';
              const isCompleted = appt.status === 'completed';
              const isCancelled = appt.status === 'cancelled';

              return (
                <div key={appt.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Patient Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                      }}>
                        {appt.patient_name ? appt.patient_name.charAt(0) : 'P'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{appt.patient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {appt.patient_age ? `${appt.patient_age} yrs • ` : ''} {appt.patient_gender || 'Patient'}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${isCompleted ? 'badge-mild' : isCancelled ? 'badge-critical' : 'badge-primary'}`} style={{ textTransform: 'capitalize' }}>
                      {appt.status}
                    </span>
                  </div>

                  {/* Scheduled Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <Clock size={15} />
                    <span>Scheduled for: {new Date(appt.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>

                  {/* Linked Symptom Entry */}
                  {appt.entry_symptom_name && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.825rem',
                      borderLeft: '3px solid var(--accent-primary)'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Linked Symptom Log: {appt.entry_symptom_name} (Severity: {appt.entry_severity}/10)
                      </div>
                      {appt.entry_description && (
                        <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                          "{appt.entry_description}"
                        </div>
                      )}
                    </div>
                  )}

                  {appt.notes && (
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Patient pre-visit notes: "{appt.notes}"
                    </p>
                  )}

                  {/* ----------------------------------------------------------- */}
                  {/* PRESCRIBE MEDICATION & SCHEDULE ALARM SECTION */}
                  {/* ----------------------------------------------------------- */}
                  <div style={{
                    padding: '1rem 1.15rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'rgba(15, 23, 42, 0.03)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Pill size={17} style={{ color: 'var(--accent-teal)' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          Prescribe Medication & Auto-Expiring Alarm Schedule
                        </span>
                      </div>

                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => setPrescribeOpenId(prescribeOpenId === appt.id ? null : appt.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          {prescribeOpenId === appt.id ? <ChevronUp size={14} /> : <PlusCircle size={14} />}
                          <span>{prescribeOpenId === appt.id ? 'Close Panel' : 'Prescribe & Schedule'}</span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          <Lock size={13} />
                          <span>Privileges Locked (Session {appt.status})</span>
                        </div>
                      )}
                    </div>

                    {!isActive && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                        🔒 Notice: Modification privileges for this patient's medication and alarm schedules are locked because this appointment is no longer active.
                      </p>
                    )}

                    {/* Prescribe Form (Active Appointments Only) */}
                    {isActive && prescribeOpenId === appt.id && (
                      <div className="animate-fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-subtle)' }}>
                        {prescribeMessage[appt.id] && (
                          <div className={`alert-banner ${prescribeMessage[appt.id].type === 'error' ? 'alert-emergency' : 'alert-info'} mb-3`} style={{ marginBottom: '0.85rem' }}>
                            {prescribeMessage[appt.id].type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                            <span style={{ fontSize: '0.8rem' }}>{prescribeMessage[appt.id].text}</span>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label className="form-label">Medication Name</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Sumatriptan, Amoxicillin"
                              value={medName}
                              onChange={(e) => setMedName(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label className="form-label">Dosage</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. 50mg, 500mg"
                              value={medDosage}
                              onChange={(e) => setMedDosage(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label className="form-label">Frequency</label>
                            <select
                              className="form-select"
                              value={medFrequency}
                              onChange={(e) => setMedFrequency(e.target.value)}
                            >
                              <option value="Once daily">Once daily</option>
                              <option value="Twice daily">Twice daily (Morning & Night)</option>
                              <option value="Three times daily">Three times daily</option>
                              <option value="As needed (PRN)">As needed (PRN)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label className="form-label">Course Duration (Auto-Expiry)</label>
                            <select
                              className="form-select"
                              value={medDuration}
                              onChange={(e) => setMedDuration(e.target.value)}
                            >
                              <option value="3">3 Days (Short Course)</option>
                              <option value="5">5 Days</option>
                              <option value="7">7 Days (1 Week Course)</option>
                              <option value="10">10 Days</option>
                              <option value="14">14 Days (2 Weeks)</option>
                              <option value="30">30 Days (1 Month)</option>
                              <option value="90">90 Days (Chronic Regimen)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label className="form-label">Daily Alarm Chime Time</label>
                            <input
                              type="time"
                              className="form-input"
                              value={medReminderTime}
                              onChange={(e) => setMedReminderTime(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                          <label className="form-label">Prescription & Alarm Instructions</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Take with food. The alarm will automatically expire after 7 days."
                            value={medInstructions}
                            onChange={(e) => setMedInstructions(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handlePrescribe(appt.id)}
                            disabled={prescribing}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #4f46e5 100%)' }}
                          >
                            <Bell size={14} />
                            <span>{prescribing ? 'Scheduling...' : `Prescribe & Set ${medDuration}-Day Auto-Alarm`}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clinical Review Notes */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Clinical Consultation Review (Visible to Patient)</label>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder={appt.doctor_review_notes || 'Enter clinical evaluation notes or treatment advice...'}
                      defaultValue={appt.doctor_review_notes || ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
                    <button
                      onClick={() => handleReview(appt.id, 'completed')}
                      disabled={savingId === appt.id}
                      className="btn btn-primary btn-sm"
                      title="Marks appointment complete and locks prescribing privileges"
                    >
                      <CheckCircle2 size={14} /> Complete Consultation & Lock
                    </button>
                    <button
                      onClick={() => handleReview(appt.id, 'cancelled')}
                      disabled={savingId === appt.id}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--severity-crit)' }}
                    >
                      <XCircle size={14} /> Cancel Appointment
                    </button>
                    <button
                      onClick={() => handleReview(appt.id, appt.status)}
                      disabled={savingId === appt.id}
                      className="btn btn-outline btn-sm"
                    >
                      <Send size={14} /> Save Notes Only
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
