import React, { useState, useEffect } from 'react';
import {
  Pill,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { medicationsApi } from '../api/client';

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once Daily',
    started_at: new Date().toISOString().slice(0, 10),
    ended_at: '',
    active: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMedications = async () => {
    try {
      setLoading(true);
      const res = await medicationsApi.getAll();
      setMedications(res.data.medications || []);
    } catch (err) {
      console.error('Failed to load medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, []);

  const handleToggleActive = async (id) => {
    try {
      await medicationsApi.toggle(id);
      loadMedications();
    } catch (err) {
      alert('Failed to update medication status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medication record?')) return;
    try {
      await medicationsApi.delete(id);
      loadMedications();
    } catch (err) {
      alert('Failed to delete medication');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await medicationsApi.create(formData);
      setShowModal(false);
      setFormData({
        name: '',
        dosage: '',
        frequency: 'Once Daily',
        started_at: new Date().toISOString().slice(0, 10),
        ended_at: '',
        active: true
      });
      loadMedications();
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add medication');
    } finally {
      setSaving(false);
    }
  };

  const activeMeds = medications.filter((m) => m.active === 1 || m.active === true);
  const pastMeds = medications.filter((m) => m.active === 0 || m.active === false);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Medications & Regimens</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Keep an accurate log of your active prescriptions, supplements, and dosages for doctor summaries.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <PlusCircle size={18} />
          Add Medication
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
          <p style={{ color: 'var(--text-muted)' }}>Loading medication regimens...</p>
        </div>
      ) : (
        <>
          {/* Active Medications Section */}
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} className="text-emerald-500" />
              Active Medications ({activeMeds.length})
            </h2>

            {activeMeds.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <Pill size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <p style={{ fontWeight: 600 }}>No active medications listed</p>
                <p style={{ fontSize: '0.85rem' }}>Add your current prescriptions to link them with symptom triggers.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {activeMeds.map((med) => (
                  <div key={med.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', borderLeft: '4px solid var(--severity-mild)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {med.name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                            {med.dosage || 'Dosage not specified'}
                          </div>
                        </div>
                        <span className="badge badge-mild">Active</span>
                      </div>

                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div><strong>Schedule:</strong> {med.frequency || 'Daily'}</div>
                        <div><strong>Started:</strong> {new Date(med.started_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => handleToggleActive(med.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Mark Discontinued
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
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
          </div>

          {/* Past / Discontinued Medications */}
          {pastMeds.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} />
                Past & Discontinued Medications ({pastMeds.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {pastMeds.map((med) => (
                  <div key={med.id} className="card" style={{ opacity: 0.75 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{med.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{med.dosage} • {med.frequency}</div>
                      </div>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Inactive</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => handleToggleActive(med.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Re-activate
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem 0.5rem' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD MEDICATION MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Add New Medication</h2>

            {error && (
              <div className="alert-banner alert-emergency mb-3">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Medication / Supplement Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sumatriptan, Lisinopril, Vitamin D3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dosage</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 50mg, 10ml, 2 tablets"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <option value="Once Daily (Morning)">Once Daily (Morning)</option>
                    <option value="Once Daily (Night)">Once Daily (Night)</option>
                    <option value="Twice Daily (BID)">Twice Daily (BID)</option>
                    <option value="Three Times Daily (TID)">Three Times Daily (TID)</option>
                    <option value="As Needed (PRN)">As Needed (PRN)</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.started_at}
                  onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
