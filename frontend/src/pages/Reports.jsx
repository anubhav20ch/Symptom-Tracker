import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { reportsApi, openAuthenticatedFile } from '../api/client';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [title, setTitle] = useState('Patient Clinical Symptom Summary');
  const [latestReport, setLatestReport] = useState(null);
  const [formError, setFormError] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getAll();
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setFormError('');

    // A report with no date range silently covered "all time" with no
    // indication that the range fields had been ignored. Both dates are
    // now required, and a missing or backwards range is surfaced as a
    // clear error instead of generating a report anyway.
    if (!startDate || !endDate) {
      setFormError('Select both a "From Date" and a "To Date" before generating a report — a date range is required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError('The "From Date" must be on or before the "To Date".');
      return;
    }

    setGenerating(true);
    try {
      const res = await reportsApi.generate({
        start_date: startDate,
        end_date: endDate,
        title
      });
      setLatestReport(res.data.report);
      loadReports();
      confetti({ particleCount: 70, spread: 60 });
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to generate clinical PDF report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Doctor-Ready Clinical PDF Reports</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Generate printable, formatted clinical summaries detailing your symptom chronologies, triage assessments, active medications, and identified triggers for your physician.
        </p>
      </div>

      {/* Generator Card */}
      <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} className="text-indigo-600" />
          Generate New PDF Report
        </h2>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Report Title / Description</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neurologist Consultation Summary - October 2026"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From Date *</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setFormError(''); }}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To Date *</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setFormError(''); }}
                required
              />
            </div>
          </div>

          {formError && (
            <div className="animate-fade-in" style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={generating}
            className="btn btn-primary btn-lg"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            <FileText size={18} />
            {generating ? 'Compiling Medical PDF...' : 'Generate Clinical PDF Report'}
          </button>
        </form>

        {latestReport && (
          <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--accent-teal-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} className="text-emerald-600" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>Report Ready!</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{latestReport.title}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthenticatedFile(latestReport.download_url)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Previously Generated Reports */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} />
          Report History Archive
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--accent-primary-light)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 0.75rem'
            }} />
          </div>
        ) : reports.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p>No reports generated yet. Click "Generate Clinical PDF Report" above.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reports.map((rep) => (
              <div key={rep.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--accent-primary-light)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {rep.title || 'Patient Clinical Summary'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Generated {new Date(rep.generated_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openAuthenticatedFile(rep.download_url)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Download size={15} />
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
