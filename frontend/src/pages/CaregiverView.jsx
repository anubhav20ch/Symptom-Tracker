import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  Pill,
  Clock,
  ShieldCheck,
  AlertTriangle,
  User,
  Heart
} from 'lucide-react';
import { caregiverApi } from '../api/client';
import EmergencyBanner from '../components/EmergencyBanner';

export default function CaregiverView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSharedData() {
      try {
        setLoading(true);
        const res = await caregiverApi.getView(token);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'This shared health record link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    }
    loadSharedData();
  }, [token]);

  const getSeverityBadge = (severity) => {
    let cls = 'badge-mild';
    if (severity >= 4 && severity <= 6) cls = 'badge-moderate';
    if (severity >= 7 && severity <= 8) cls = 'badge-severe';
    if (severity >= 9) cls = 'badge-critical';
    return <span className={`badge ${cls}`}>{severity}/10</span>;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--accent-primary-light)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>Verifying secure caregiver link...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', padding: '1.5rem' }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem' }}>
          <AlertTriangle size={48} className="text-red-500" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Access Link Expired or Invalid</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <Link to="/login" className="btn btn-primary">
            Return to SymptomLog
          </Link>
        </div>
      </div>
    );
  }

  const { patient, entries = [], medications = [], expires_at } = data;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Stethoscope size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>SymptomLog Caregiver Station</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Authorized Read-Only Health Record</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-teal)', backgroundColor: 'var(--accent-teal-light)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
            <ShieldCheck size={16} />
            <span>Link active until {new Date(expires_at).toLocaleDateString()}</span>
          </div>
        </div>

        <EmergencyBanner />

        {/* Patient Demographics Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem'
            }}>
              {patient.name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem' }}>{patient.name}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Age: {patient.age || 'N/A'} • Gender: {patient.gender || 'N/A'}
              </div>
            </div>
          </div>

          {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Chronic Conditions: </span>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                {patient.chronic_conditions.map((c, i) => (
                  <span key={i} className="badge badge-primary">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Medications */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={20} className="text-teal-600" />
            Active Medications & Dosage
          </h3>

          {medications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active medications recorded.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {medications.map((med) => (
                <div key={med.id} style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{med.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{med.dosage}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Schedule: {med.frequency}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Symptom Episodes History */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} className="text-indigo-600" />
            Recent Symptom Flare-ups & Triage Assessments ({entries.length})
          </h3>

          {entries.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent symptoms recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {entries.map((entry) => (
                <div key={entry.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {getSeverityBadge(entry.severity)}
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{entry.symptom_name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({entry.body_location})</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(entry.started_at).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Triage: {entry.recommendation}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {entry.reasoning}
                  </p>
                  {entry.trigger && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      ⚡ Trigger: {entry.trigger}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
