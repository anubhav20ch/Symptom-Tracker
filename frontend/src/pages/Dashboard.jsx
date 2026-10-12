import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  PlusCircle,
  Clock,
  Pill,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { entriesApi, medicationsApi, appointmentsApi, insightsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [entriesRes, medsRes, apptsRes, insightsRes] = await Promise.all([
          entriesApi.getAll({ limit: 5 }),
          medicationsApi.getAll(),
          appointmentsApi.getAll(),
          insightsApi.getInsights()
        ]);
        setEntries(entriesRes.data.entries || []);
        setMedications(medsRes.data.medications || []);
        setAppointments(apptsRes.data.appointments || []);
        setInsights(insightsRes.data.insights || null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const getSeverityBadgeClass = (severity) => {
    if (severity <= 3) return 'badge-mild';
    if (severity <= 6) return 'badge-moderate';
    if (severity <= 8) return 'badge-severe';
    return 'badge-critical';
  };

  const getClassificationBadge = (type) => {
    switch (type) {
      case 'Emergency Attention':
        return <span className="badge badge-critical">🚨 Emergency</span>;
      case 'Urgent Doctor Visit':
        return <span className="badge badge-severe">🩺 Urgent Consult</span>;
      case 'Routine Consultation':
        return <span className="badge badge-moderate">📅 Routine Check</span>;
      default:
        return <span className="badge badge-mild">🏡 Home Care</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2.5px solid var(--border-subtle)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          margin: '0 auto 1.25rem'
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Synchronizing health intelligence...</p>
      </div>
    );
  }

  const activeMeds = medications.filter((m) => m.active === 1 || m.active === true);
  const upcomingAppts = appointments.filter((a) => a.status === 'scheduled');
  const latestEntry = entries[0];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Minimalist Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem 2.25rem',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '640px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              Personal Health Station
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', color: '#ffffff', marginBottom: '0.45rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Welcome back, {user?.name || 'Patient'}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {entries.length > 0
              ? `You have recorded ${entries.length} recent health entries. Longitudinal health intelligence active.`
              : 'Begin logging your physical symptoms to calibrate real-time AI triage and physician summaries.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate('/log')}
            className="btn"
            style={{
              backgroundColor: '#ffffff',
              color: '#4f46e5',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
              fontWeight: 700
            }}
          >
            <PlusCircle size={17} />
            <span>Log Symptom</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="btn"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <span>Clinical PDF</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.25rem 1.4rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Activity size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Entries
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.1rem' }}>
              {insights?.total_entries ?? entries.length}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.25rem 1.4rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-teal-light)',
            color: 'var(--accent-teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Pill size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Medications
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.1rem' }}>
              {activeMeds.length}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.25rem 1.4rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--severity-mod-bg)',
            color: 'var(--severity-mod)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Doctor Visits
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.1rem' }}>
              {upcomingAppts.length}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.25rem 1.4rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--severity-sev-bg)',
            color: 'var(--severity-sev)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Severity
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.1rem' }}>
              {insights?.avg_severity ? `${insights.avg_severity}/10` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Entries & AI Triage Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Symptom Logs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
              Recent Symptom Entries
            </h2>
            <Link to="/history" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View History <ChevronRight size={14} />
            </Link>
          </div>

          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Activity size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No symptoms logged yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click below to create your first entry</p>
              <button
                onClick={() => navigate('/log')}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1rem' }}
              >
                Log Symptom
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => navigate('/history')}
                  style={{
                    padding: '0.8rem 1rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`badge ${getSeverityBadgeClass(entry.severity)}`}>
                      {entry.severity}/10
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {entry.symptom_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {entry.body_location} • {new Date(entry.started_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div>{getClassificationBadge(entry.classification_type)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Health Intelligence & Triage Advice */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Sparkles size={18} style={{ color: '#f59e0b' }} />
              Automated Triage & Insights
            </h2>
            <Link to="/insights" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Full Insights <ChevronRight size={14} />
            </Link>
          </div>

          {latestEntry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'space-between' }}>
              <div style={{
                padding: '1rem 1.15rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--accent-primary)'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  Latest AI Triage ({latestEntry.symptom_name})
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.925rem', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                  {latestEntry.recommendation}
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {latestEntry.reasoning}
                </p>
              </div>

              {insights?.frequent_triggers?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                    Frequent Triggers
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {insights.frequent_triggers.map((t, idx) => (
                      <span key={idx} className="badge badge-primary">
                        ⚡ {t.trigger} ({t.count}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-teal-light)',
                color: 'var(--accent-teal)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <ShieldCheck size={16} />
                <span>Encrypted on-device health memory active</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Sparkles size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No AI insights generated yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Log symptoms to trigger personalized machine triage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
