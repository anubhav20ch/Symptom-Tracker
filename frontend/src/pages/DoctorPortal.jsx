import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  LogOut,
  Calendar,
  Clock,
  User,
  CheckCircle,
  FileText,
  Pill,
  Send,
  AlertCircle
} from 'lucide-react';
import { doctorApi } from '../api/client';

export default function DoctorPortal() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review & Prescribe form states
  const [reviewNotes, setReviewNotes] = useState('');
  const [statusAction, setStatusAction] = useState('confirmed');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('Once Daily');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

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
      const list = (res.data?.appointments || []).sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      );
      setAppointments(list);
      if (list.length > 0 && !selectedAppt) {
        setSelectedAppt(list[0]);
        setReviewNotes(list[0].doctor_notes || '');
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await doctorApi.logout();
    } catch (_) {}
    localStorage.removeItem('symptomlog_doctor');
    navigate('/doctor/login', { replace: true });
  };

  const handleSelectAppt = (appt) => {
    setSelectedAppt(appt);
    setReviewNotes(appt.doctor_notes || '');
    setActionSuccess('');
    setActionError('');
  };

  const handleSaveReview = async () => {
    if (!selectedAppt) return;
    try {
      setActionError('');
      await doctorApi.reviewAppointment(selectedAppt.id, {
        notes: reviewNotes,
        status: statusAction
      });
      setActionSuccess('Appointment review updated successfully.');
      loadAppointments();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to update appointment review');
    }
  };

  const handlePrescribe = async (e) => {
    e.preventDefault();
    if (!selectedAppt || !medName.trim() || !medDosage.trim()) return;
    try {
      setActionError('');
      await doctorApi.prescribe({
        patient_id: selectedAppt.user_id,
        appointment_id: selectedAppt.id,
        name: medName.trim(),
        dosage: medDosage.trim(),
        frequency: medFrequency,
        instructions: reviewNotes || undefined
      });
      setActionSuccess(`Prescription for ${medName} issued and linked to patient record.`);
      setMedName('');
      setDosage('');
      loadAppointments();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to issue prescription');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          height: '56px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Stethoscope size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <strong style={{ fontSize: '1rem' }}>SymptomLog Physician Workstation</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ({doctor?.name || doctor?.email} — {doctor?.specialty || 'General Practitioner'})
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
        >
          <LogOut size={14} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </header>

      {/* UI-14: Three-Pane Layout: Worklist | Appointment Detail | Patient Summary Timeline */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '320px minmax(360px, 1fr) 340px',
          height: 'calc(100vh - 56px)',
          overflow: 'hidden'
        }}
      >
        {/* Pane 1: Worklist View (DOC-11) */}
        <section
          style={{
            borderRight: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
          aria-label="Physician appointment worklist"
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-muted)', backgroundColor: 'var(--bg-surface-subtle)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Upcoming Worklist ({appointments.length})</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sorted chronologically</span>
          </div>

          {loading ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading worklist...</div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No appointments currently assigned within your active practice window.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {appointments.map((appt) => {
                const isSelected = selectedAppt?.id === appt.id;
                return (
                  <div
                    key={appt.id}
                    onClick={() => handleSelectAppt(appt)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--border-muted)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--primary-subtle)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{appt.patient_name || `Patient #${appt.user_id}`}</strong>
                      <span className="chip" style={{ fontSize: '0.68rem' }}>{appt.status}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(appt.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })},{' '}
                      {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {appt.symptom_name && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Chief complaint: <em>{appt.symptom_name}</em>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pane 2: Appointment Detail & Clinical Action */}
        <section
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            borderRight: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
          aria-label="Appointment detail and clinical review"
        >
          {actionSuccess && (
            <div className="panel" style={{ backgroundColor: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)', fontSize: '0.85rem' }}>
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="panel" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
              {actionError}
            </div>
          )}

          {!selectedAppt ? (
            <p style={{ color: 'var(--text-muted)' }}>Select an appointment from the worklist to view details.</p>
          ) : (
            <>
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>
                  Consultation: {selectedAppt.patient_name || `Patient #${selectedAppt.user_id}`}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Scheduled: {new Date(selectedAppt.scheduled_at).toLocaleString('en-GB')}
                </div>
              </div>

              {/* Consultation notes form */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Clinical Review Notes</h3>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter clinical examination notes, impressions, or guidance..."
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="appt-status" style={{ fontSize: '0.8rem' }}>Status:</label>
                    <select
                      id="appt-status"
                      value={statusAction}
                      onChange={(e) => setStatusAction(e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <button onClick={handleSaveReview} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem' }}>
                    Save review & status
                  </button>
                </div>
              </div>

              {/* Prescribe Medication Form (DOC-10) */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Pill size={16} aria-hidden="true" />
                  <span>Issue Linked Prescription (DOC-10)</span>
                </h3>
                <form onSubmit={handlePrescribe} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor="doc-med-name" style={{ fontSize: '0.78rem' }}>Medication name *</label>
                      <input
                        id="doc-med-name"
                        type="text"
                        placeholder="e.g. Amoxicillin, Sumatriptan"
                        value={medName}
                        onChange={(e) => setMedName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor="doc-med-dose" style={{ fontSize: '0.78rem' }}>Dosage *</label>
                      <input
                        id="doc-med-dose"
                        type="text"
                        placeholder="e.g. 500mg"
                        value={medDosage}
                        onChange={(e) => setMedDosage(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="doc-med-freq" style={{ fontSize: '0.78rem' }}>Frequency</label>
                    <select
                      id="doc-med-freq"
                      value={medFrequency}
                      onChange={(e) => setMedFrequency(e.target.value)}
                    >
                      <option value="Once Daily">Once Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Three Times Daily">Three Times Daily</option>
                      <option value="As Needed (PRN)">As Needed (PRN)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                    Issue prescription to patient
                  </button>
                </form>
              </div>
            </>
          )}
        </section>

        {/* Pane 3: Patient Summary Timeline */}
        <aside
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
          aria-label="Patient clinical summary timeline"
        >
          <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-muted)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} aria-hidden="true" />
              <span>Patient Profile</span>
            </h2>
            {selectedAppt && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div><strong>Name:</strong> {selectedAppt.patient_name || 'N/A'}</div>
                <div><strong>Age/Gender:</strong> {selectedAppt.patient_age ? `${selectedAppt.patient_age}y` : 'Unspecified'} {selectedAppt.patient_gender || ''}</div>
                <div><strong>Chronic:</strong> {selectedAppt.patient_chronic_conditions || 'None reported'}</div>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Appointment Context</h3>
            {selectedAppt ? (
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>Complaint:</strong> {selectedAppt.symptom_name || 'General consultation'}</div>
                {selectedAppt.patient_notes && (
                  <div>
                    <strong>Patient notes:</strong>
                    <p style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>{selectedAppt.patient_notes}</p>
                  </div>
                )}
                {selectedAppt.severity && (
                  <div><strong>Reported Severity:</strong> {selectedAppt.severity}/10</div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No patient selected</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
