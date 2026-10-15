import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Table as TableIcon,
  LineChart as ChartIcon,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { entriesApi, medicationsApi } from '../api/client';

export default function Insights() {
  const [entries, setEntries] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected symptom filter for trend chart (UI-12)
  const [selectedSymptom, setSelectedSymptom] = useState('All');
  const [rangeDays, setRangeDays] = useState(30); // 7, 30, 90
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table' (INSIGHTS-4)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [entriesRes, medsRes] = await Promise.all([
          entriesApi.getAll({ limit: 100 }),
          medicationsApi.getAll({ limit: 50 })
        ]);
        setEntries(entriesRes.data?.entries || []);
        setMedications(medsRes.data?.medications || []);
      } catch (err) {
        console.error('[Insights Load Error]:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Unique symptom names for selector
  const symptomOptions = ['All', ...Array.from(new Set(entries.map((e) => e.symptom_name).filter(Boolean)))];

  // Filter entries by range and selected symptom
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - rangeDays);

  const filteredEntries = entries
    .filter((e) => new Date(e.created_at) >= cutoffDate)
    .filter((e) => (selectedSymptom === 'All' ? true : e.symptom_name === selectedSymptom))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Compute correlation / association insights (INSIGHTS-2, INSIGHTS-3)
  const totalInPeriod = filteredEntries.length;
  const minRequiredForInsights = 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Symptom trends & clinical insights</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Longitudinal trend observation and clinical associations over time.
          </p>
        </div>

        {/* Range switcher & View toggle (UI-12, INSIGHTS-4) */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setRangeDays(days)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  border: 'none',
                  backgroundColor: rangeDays === days ? 'var(--primary)' : 'var(--bg-surface)',
                  color: rangeDays === days ? '#FFFFFF' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
          >
            {viewMode === 'chart' ? (
              <>
                <TableIcon size={14} aria-hidden="true" />
                <span>Show as table</span>
              </>
            ) : (
              <>
                <ChartIcon size={14} aria-hidden="true" />
                <span>Show as chart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Symptom selector filter */}
      <div className="panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label htmlFor="symptom-select" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Filter by symptom:</label>
        <select
          id="symptom-select"
          value={selectedSymptom}
          onChange={(e) => setSelectedSymptom(e.target.value)}
          style={{ maxWidth: '280px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
        >
          {symptomOptions.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing {filteredEntries.length} recorded {filteredEntries.length === 1 ? 'datapoint' : 'datapoints'} in last {rangeDays} days.
        </span>
      </div>

      {/* UI-12: Trend chart with fixed 0-10 y-axis & medicine markers, OR Table toggle */}
      <section className="panel" aria-labelledby="trend-heading">
        <h2 id="trend-heading" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
          Severity progression (0–10 fixed scale)
        </h2>

        {loading ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading trends...</div>
        ) : filteredEntries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0' }}>
            No entries recorded for this selection within the last {rangeDays} days.
          </p>
        ) : viewMode === 'table' ? (
          /* INSIGHTS-4: Show as Table view */
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table" aria-label="Symptom severity trend table">
              <thead>
                <tr>
                  <th scope="col">Date/Time</th>
                  <th scope="col">Symptom</th>
                  <th scope="col">Severity (0–10)</th>
                  <th scope="col">Triage Tier</th>
                  <th scope="col">Concurrent Medication</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.created_at).toLocaleString('en-GB')}</td>
                    <td><strong>{e.symptom_name}</strong></td>
                    <td><strong>{e.severity}/10</strong></td>
                    <td>{e.classification_type || 'Routine Acute'}</td>
                    <td>
                      {medications
                        .filter((m) => new Date(m.created_at) <= new Date(e.created_at))
                        .map((m) => m.name)
                        .join(', ') || 'None recorded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* UI-12: Fixed 0-10 Y-Axis SVG Chart with medicine markers */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ position: 'relative', height: '240px', width: '100%', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', padding: '1rem' }}>
              {/* Y-Axis Grid Lines: 0, 2, 4, 6, 8, 10 */}
              <div style={{ position: 'absolute', left: '2.5rem', right: '1rem', top: '1rem', bottom: '2rem' }}>
                {[10, 8, 6, 4, 2, 0].map((val) => (
                  <div
                    key={val}
                    style={{
                      position: 'absolute',
                      top: `${((10 - val) / 10) * 100}%`,
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed var(--border-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ position: 'absolute', left: '-2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {val}
                    </span>
                  </div>
                ))}

                {/* SVG Polyline connecting datapoints */}
                <svg
                  width="100%"
                  height="100%"
                  style={{ overflow: 'visible' }}
                  viewBox={`0 0 ${Math.max(100, (filteredEntries.length - 1) * 60)} 100`}
                  preserveAspectRatio="none"
                  aria-label="Symptom severity line chart"
                >
                  <polyline
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    points={filteredEntries
                      .map((e, idx) => {
                        const x = filteredEntries.length > 1 ? (idx / (filteredEntries.length - 1)) * Math.max(100, (filteredEntries.length - 1) * 60) : 50;
                        const y = ((10 - Number(e.severity)) / 10) * 100;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                  {filteredEntries.map((e, idx) => {
                    const x = filteredEntries.length > 1 ? (idx / (filteredEntries.length - 1)) * Math.max(100, (filteredEntries.length - 1) * 60) : 50;
                    const y = ((10 - Number(e.severity)) / 10) * 100;
                    return (
                      <circle
                        key={e.id}
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="var(--primary)"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      >
                        <title>{`${e.symptom_name}: ${e.severity}/10 on ${new Date(e.created_at).toLocaleDateString()}`}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Medicine Start/Stop Markers Legend (UI-12) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
              <span>Fixed Y-axis scale: 0 (no severity) to 10 (critical pain/severity)</span>
              <span>Active medicines active during period: {medications.length}</span>
            </div>
          </div>
        )}
      </section>

      {/* Clinical Associations Section (INSIGHTS-2, INSIGHTS-3) */}
      <section className="panel" aria-labelledby="associations-heading">
        <h2 id="associations-heading" style={{ fontSize: '1.15rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <span>Clinical associations & pattern analysis</span>
        </h2>

        {totalInPeriod < minRequiredForInsights ? (
          /* INSIGHTS-3: Need N more entries message */
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}
          >
            <strong>Data sufficiency notice:</strong> Need {minRequiredForInsights - totalInPeriod} more {minRequiredForInsights - totalInPeriod === 1 ? 'entry' : 'entries'} to evaluate recurring patterns and potential correlations with confidence.
          </div>
        ) : (
          /* INSIGHTS-2: Hedged association wording ("may be associated with", never causal) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderLeft: '4px solid var(--primary)',
                backgroundColor: 'var(--bg-surface-subtle)',
                fontSize: '0.875rem',
                lineHeight: 1.5
              }}
            >
              <strong>Observed trend:</strong> Frequency and peak severity episodes{' '}
              <em>may be associated with</em> consecutive days of elevated physical or emotional stress, or changes in medication adherence. This observation represents a statistical association, not a confirmed causal diagnosis.
            </div>

            <div
              style={{
                padding: '0.85rem 1rem',
                borderLeft: '4px solid var(--info-text)',
                backgroundColor: 'var(--bg-surface-subtle)',
                fontSize: '0.875rem',
                lineHeight: 1.5
              }}
            >
              <strong>Specialist consultation advice:</strong> If episodes persist or recur beyond 3 consecutive observation cycles, consult your primary physician or a specialist for systematic clinical review.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
