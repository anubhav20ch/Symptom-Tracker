import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { entriesApi, medicationsApi, appointmentsApi, remindersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doses, setDoses] = useState([]);
  const [adherence, setAdherence] = useState({ percentage: 100, taken: 0, missed: 0, total: 0 });
  const [showWhyGuidance, setShowWhyGuidance] = useState(false);

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true);
        const [entriesRes, medsRes, apptsRes, dosesRes] = await Promise.all([
          entriesApi.getAll({ limit: 10 }),
          medicationsApi.getAll({ limit: 20 }),
          appointmentsApi.getAll({ limit: 5 }),
          remindersApi.getDoses({ limit: 50 }).catch(() => ({ data: { doses: [], adherence: null } }))
        ]);

        setEntries(entriesRes.data?.entries || []);
        setMedications(medsRes.data?.medications || []);
        setAppointments(apptsRes.data?.appointments || []);
        setDoses(dosesRes.data?.doses || []);
        if (dosesRes.data?.adherence) {
          setAdherence(dosesRes.data.adherence);
        }
      } catch (err) {
        console.error('[Overview Load Error]:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  // DASH-1: current date in long form (e.g. "Monday, 12 October 2026")
  const dateFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const activeEntries = entries.filter((e) => !e.ended_at);
  const latestEntry = entries[0] || null;

  // Filter next upcoming appointment
  const nextAppt = appointments
    .filter((a) => a.status !== 'cancelled' && new Date(a.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0] || null;

  // Helper for duration
  const getDurationText = (startedAt) => {
    if (!startedAt) return 'Onset date unrecorded';
    const diffDays = Math.max(0, Math.round((new Date() - new Date(startedAt)) / (1000 * 60 * 60 * 24)));
    if (diffDays === 0) return 'Started today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  // Helper for segmented bar
  const renderSegmentedBar = (sev) => {
    const total = 10;
    return (
      <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }} aria-label={`Severity ${sev} of 10`}>
        {Array.from({ length: total }, (_, i) => {
          const filled = i < sev;
          return (
            <span
              key={i}
              style={{
                width: '6px',
                height: '14px',
                borderRadius: '1px',
                backgroundColor: filled ? `var(--sev-${Math.min(10, Math.max(1, sev))})` : 'var(--border-muted)',
                display: 'inline-block'
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* DASH-1: Heading & Status Line */}
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{dateFormatted}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          {activeEntries.length > 0
            ? `${activeEntries.length} active symptom ${activeEntries.length === 1 ? 'record' : 'records'} currently monitored.`
            : 'No active symptoms currently recorded. Routine monitoring.'}
        </p>
      </div>

      {/* Overview 2-column layout (UI-7) */}
      <div className="overview-grid">
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* DASH-2: Active Symptoms Table */}
          <section className="panel" aria-labelledby="active-symptoms-heading">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 id="active-symptoms-heading" style={{ fontSize: '1.15rem' }}>Active symptoms</h2>
              <button onClick={() => navigate('/log')} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                <PlusCircle size={14} aria-hidden="true" />
                <span>Log symptom</span>
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading active records...</div>
            ) : activeEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
                Nothing logged yet. When you log a symptom it appears here with its severity over time.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="clinical-table" aria-label="Active symptoms table">
                  <thead>
                    <tr>
                      <th scope="col">Symptom</th>
                      <th scope="col">Duration</th>
                      <th scope="col">Severity</th>
                      <th scope="col">Triage tier</th>
                      <th scope="col">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEntries.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong style={{ display: 'block' }}>{e.symptom_name}</strong>
                          {e.body_location && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.body_location}</span>}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{getDurationText(e.started_at)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, marginRight: '0.5rem' }}>{e.severity}/10</span>
                          {renderSegmentedBar(e.severity)}
                        </td>
                        <td>
                          <span className={`chip ${e.classification_type?.toLowerCase().includes('urgent') ? 'tier-urgent' : ''}`}>
                            {e.classification_type || 'Routine Acute'}
                          </span>
                        </td>
                        <td>
                          {/* Mini SVG Trend Line */}
                          <svg width="48" height="18" aria-hidden="true">
                            <polyline
                              fill="none"
                              stroke="var(--primary)"
                              strokeWidth="2"
                              points={`0,${18 - (e.severity * 1.5)} 16,${18 - (Math.max(1, e.severity - 1) * 1.5)} 32,${18 - (e.severity * 1.5)} 48,${18 - (e.severity * 1.5)}`}
                            />
                          </svg>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* DASH-3: Today's Doses Checklist */}
          <section className="panel" aria-labelledby="today-doses-heading">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 id="today-doses-heading" style={{ fontSize: '1.15rem' }}>Today's doses</h2>
              <Link to="/medications" className="btn btn-text" style={{ fontSize: '0.8rem' }}>
                Manage medicines &rarr;
              </Link>
            </div>

            {medications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No active medications prescribed or scheduled.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {medications.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-muted)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface-subtle)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{m.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {m.dosage} {m.frequency ? `— ${m.frequency}` : ''}
                      </div>
                    </div>
                    <span className="chip" style={{ fontSize: '0.75rem' }}>
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Side Rail (UI-7, DASH-4, DASH-5) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* DASH-4: Next Appointment */}
          <section className="panel" aria-labelledby="next-appt-heading">
            <h2 id="next-appt-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} aria-hidden="true" />
              <span>Next appointment</span>
            </h2>

            {nextAppt ? (
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600 }}>
                  {new Date(nextAppt.scheduled_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {new Date(nextAppt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ marginTop: '0.5rem', fontWeight: 500 }}>
                  Dr. {nextAppt.doctor_name || 'Assigned Physician'}
                </div>
                {nextAppt.specialty && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{nextAppt.specialty}</div>}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <p>No upcoming appointments scheduled.</p>
                <Link to="/appointments" className="btn btn-secondary" style={{ marginTop: '0.65rem', width: '100%' }}>
                  Book appointment
                </Link>
              </div>
            )}
          </section>

          {/* DASH-5: Latest Guidance with "Why am I seeing this?" disclosure */}
          <section className="panel" aria-labelledby="latest-guidance-heading">
            <h2 id="latest-guidance-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} aria-hidden="true" />
              <span>Latest clinical guidance</span>
            </h2>

            {latestEntry?.recommendation ? (
              <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                <p>{latestEntry.recommendation}</p>

                <button
                  onClick={() => setShowWhyGuidance(!showWhyGuidance)}
                  className="btn btn-text"
                  style={{ marginTop: '0.5rem', padding: 0, fontSize: '0.78rem' }}
                  aria-expanded={showWhyGuidance}
                >
                  <HelpCircle size={13} aria-hidden="true" />
                  <span>Why am I seeing this?</span>
                  {showWhyGuidance ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showWhyGuidance && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div><strong>Rule applied:</strong> {latestEntry.triage_rule_id || 'ROUTINE_ACUTE'}</div>
                    {latestEntry.reasoning && <div style={{ marginTop: '0.25rem' }}>{latestEntry.reasoning}</div>}
                    <div style={{ marginTop: '0.25rem' }}><strong>Engine version:</strong> {latestEntry.triage_version || '1.1.0'}</div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Guidance will appear here when you record a symptom.
              </p>
            )}
          </section>

          {/* DASH-5: 7-Day Adherence Summary */}
          <section className="panel" aria-labelledby="adherence-heading">
            <h2 id="adherence-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              7-day medication adherence
            </h2>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--primary)' }}>
                {adherence.percentage ?? 100}%
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>overall adherence</span>
            </div>

            <div
              style={{
                height: '8px',
                width: '100%',
                backgroundColor: 'var(--border-muted)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}
              role="progressbar"
              aria-valuenow={adherence.percentage ?? 100}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                style={{
                  height: '100%',
                  width: `${adherence.percentage ?? 100}%`,
                  backgroundColor: 'var(--primary)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Taken: {adherence.taken ?? 0}</span>
              <span>Missed: {adherence.missed ?? 0}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
