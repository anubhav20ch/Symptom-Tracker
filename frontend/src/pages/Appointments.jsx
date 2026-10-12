import React, { useState, useEffect } from 'react';
import {
  Calendar,
  PlusCircle,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Trash2,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { appointmentsApi, entriesApi, doctorApi } from '../api/client';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [entries, setEntries] = useState([]);
  const [doctorsDirectory, setDoctorsDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    doctor_name: 'Dr. Sarah Lin, MD',
    doctor_id: '',
    specialty: 'Neurology',
    scheduled_at: '',
    entry_id: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [apptsRes, entriesRes, doctorsRes] = await Promise.all([
        appointmentsApi.getAll(),
        entriesApi.getAll({ limit: 20 }),
        doctorApi.directory().catch(() => ({ data: { doctors: [] } }))
      ]);
      setAppointments(apptsRes.data.appointments || []);
      setEntries(entriesRes.data.entries || []);
      setDoctorsDirectory(doctorsRes.data.doctors || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await appointmentsApi.updateStatus(id, status);
      loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel and delete this appointment?')) return;
    try {
      await appointmentsApi.delete(id);
      loadData();
    } catch (err) {
      alert('Failed to delete appointment');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.scheduled_at) return;
    setSaving(true);
    try {
      await appointmentsApi.create({
        ...formData,
        entry_id: formData.entry_id ? formData.entry_id : null,
        doctor_id: formData.doctor_id ? formData.doctor_id : null
      });
      setShowModal(false);
      setFormData({
        doctor_name: 'Dr. Sarah Lin, MD',
        doctor_id: '',
        specialty: 'Neurology',
        scheduled_at: '',
        entry_id: '',
        notes: ''
      });
      loadData();
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to schedule appointment');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-mild">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-critical">Cancelled</span>;
      default:
        return <span className="badge badge-primary">Scheduled</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Doctor Consultations & Appointments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Schedule and manage medical visits linked directly to specific symptom logs for comprehensive clinical handoffs.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <PlusCircle size={18} />
          Book Consultation
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--accent-primary-light)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Calendar size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No appointments scheduled</h3>
          <p style={{ fontSize: '0.875rem' }}>Link your severe symptom flare-ups directly with specialist visits.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {appointments.map((appt) => (
            <div key={appt.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--accent-primary-light)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {appt.doctor_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
                        {appt.specialty}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(appt.status)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <Clock size={16} />
                  <span>{new Date(appt.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>

                {appt.entry_symptom_name && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    marginBottom: '0.5rem',
                    borderLeft: '3px solid var(--accent-primary)'
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Linked Symptom: {appt.entry_symptom_name} (Severity {appt.entry_severity}/10)
                    </div>
                  </div>
                )}

                {appt.notes && (
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{appt.notes}"
                  </p>
                )}

                {appt.doctor_review_notes && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--accent-primary-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    borderLeft: '3px solid var(--accent-teal)'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>
                      Physician Review Note
                    </div>
                    <div style={{ color: 'var(--text-primary)' }}>{appt.doctor_review_notes}</div>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {appt.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(appt.id, 'completed')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <CheckCircle2 size={13} /> Complete
                    </button>
                  )}
                  {appt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(appt.id, 'cancelled')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(appt.id)}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '0.35rem 0.5rem' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULE APPOINTMENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Schedule Doctor Consultation</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {doctorsDirectory.length > 0 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Registered Physician Portal Account (Optional)</label>
                  <select
                    className="form-select"
                    value={formData.doctor_id}
                    onChange={(e) => {
                      const selected = doctorsDirectory.find((d) => String(d.id) === e.target.value);
                      setFormData({
                        ...formData,
                        doctor_id: e.target.value,
                        doctor_name: selected ? selected.name : formData.doctor_name,
                        specialty: selected ? (selected.specialty || formData.specialty) : formData.specialty
                      });
                    }}
                  >
                    <option value="">-- Enter doctor name manually below --</option>
                    {doctorsDirectory.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Linking a registered physician lets them review this visit in their Physician Portal.
                  </span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Doctor Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Sarah Lin"
                    value={formData.doctor_name}
                    onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value, doctor_id: '' })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Specialty</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Neurology, Cardiology, GP"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Link to Logged Symptom Flare (Optional)</label>
                <select
                  className="form-select"
                  value={formData.entry_id}
                  onChange={(e) => setFormData({ ...formData, entry_id: e.target.value })}
                >
                  <option value="">-- None / General Checkup --</option>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.symptom_name} (Severity {entry.severity}/10) — {new Date(entry.started_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Preparation Notes & Questions for Doctor</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  placeholder="Questions to ask, test results to bring..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
