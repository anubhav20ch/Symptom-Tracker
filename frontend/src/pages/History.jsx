import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Activity,
  ChevronRight,
  ExternalLink,
  Play,
  List
} from 'lucide-react';
import { entriesApi, symptomsApi, feedbackApi, API_ORIGIN } from '../api/client';
import PainJourneySimulator from '../components/PainJourneySimulator';

export default function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'simulator'

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minSeverity, setMinSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classificationType, setClassificationType] = useState('');

  // Selected Entry Modal
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryDetailsLoading, setEntryDetailsLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const catRes = await symptomsApi.getCategories();
        setCategories(catRes.data.categories || []);
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    }
    init();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (minSeverity) params.min_severity = minSeverity;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (classificationType) params.classification_type = classificationType;

      const res = await entriesApi.getAll(params);
      setEntries(res.data.entries || []);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      loadEntries();
    }, 300);
    return () => clearTimeout(delay);
  }, [search, selectedCategory, minSeverity, startDate, endDate, classificationType]);

  const openEntryDetail = async (id) => {
    try {
      setEntryDetailsLoading(true);
      setFeedbackSuccess('');
      const res = await entriesApi.getById(id);
      setSelectedEntry(res.data.entry);
    } catch (err) {
      console.error('Failed to get entry details:', err);
    } finally {
      setEntryDetailsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this symptom entry?')) return;
    try {
      await entriesApi.delete(id);
      setSelectedEntry(null);
      loadEntries();
    } catch (err) {
      alert('Failed to delete entry');
    }
  };

  const handleFeedback = async (entryId, wasHelpful) => {
    try {
      await feedbackApi.submit({
        entry_id: entryId,
        was_helpful: wasHelpful,
        comment: 'User feedback from history modal'
      });
      setFeedbackSuccess('Feedback submitted! Thank you.');
      loadEntries();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const getSeverityBadge = (severity) => {
    let cls = 'badge-mild';
    if (severity >= 4 && severity <= 6) cls = 'badge-moderate';
    if (severity >= 7 && severity <= 8) cls = 'badge-severe';
    if (severity >= 9) cls = 'badge-critical';
    return <span className={`badge ${cls}`}>{severity}/10</span>;
  };

  const getClassificationBadge = (type) => {
    switch (type) {
      case 'Emergency Attention':
        return <span className="badge badge-critical">Emergency Triage</span>;
      case 'Urgent Doctor Visit':
        return <span className="badge badge-severe">Urgent Consult</span>;
      case 'Routine Consultation':
        return <span className="badge badge-moderate">Routine Checkup</span>;
      default:
        return <span className="badge badge-mild">Home Care Advisory</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Symptom History & Log</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Filter, inspect, and simulate all your past pain flare-up chronologies and clinical classifications.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-secondary)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setViewMode('list')}
              className="btn btn-sm"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <List size={14} />
              <span>Timeline List</span>
            </button>
            <button
              onClick={() => setViewMode('simulator')}
              className="btn btn-sm"
              style={{
                backgroundColor: viewMode === 'simulator' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'simulator' ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Play size={14} />
              <span>Simulate Pain Journey</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/log')}
            className="btn btn-primary"
          >
            <Activity size={18} />
            Log New Symptom
          </button>
        </div>
      </div>

      {/* RENDER SIMULATOR IF SELECTED */}
      {viewMode === 'simulator' ? (
        <PainJourneySimulator userEntries={entries} />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search symptom, notes, triggers..."
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          {/* Category */}
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Classification */}
          <select
            className="form-select"
            value={classificationType}
            onChange={(e) => setClassificationType(e.target.value)}
          >
            <option value="">All Triage Types</option>
            <option value="Home Care Advisory">Home Care Advisory</option>
            <option value="Routine Consultation">Routine Consultation</option>
            <option value="Urgent Doctor Visit">Urgent Doctor Visit</option>
            <option value="Emergency Attention">Emergency Attention</option>
          </select>

          {/* Min Severity */}
          <select
            className="form-select"
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value)}
          >
            <option value="">Any Severity</option>
            <option value="4">Severity 4+ (Moderate & above)</option>
            <option value="7">Severity 7+ (Severe & above)</option>
            <option value="9">Severity 9+ (Critical only)</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
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
          <p style={{ color: 'var(--text-muted)' }}>Filtering your health records...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Activity size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No matching symptoms found</h3>
          <p style={{ fontSize: '0.875rem' }}>Try clearing filters or logging a new symptom entry.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => openEntryDetail(entry.id)}
              className="card card-interactive"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.1rem 1.4rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px' }}>
                {getSeverityBadge(entry.severity)}
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {entry.symptom_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{entry.symptom_category}</span>
                    <span>•</span>
                    <span>{entry.body_location}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {entry.emotion_score !== undefined && entry.emotion_score !== null && (
                    <span className="badge" style={{
                      backgroundColor: entry.emotion_score <= 3 ? 'rgba(239, 68, 68, 0.15)' : entry.emotion_score >= 7 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: entry.emotion_score <= 3 ? '#ef4444' : entry.emotion_score >= 7 ? '#10b981' : '#f59e0b',
                      fontWeight: 700
                    }}>
                      {entry.emotion_score <= 2 ? '😭' : entry.emotion_score <= 4 ? '😢' : entry.emotion_score <= 6 ? '😐' : entry.emotion_score <= 8 ? '🙂' : '😄'} Mood {entry.emotion_score}/10
                    </span>
                  )}
                  {entry.trigger && entry.trigger !== 'None Reported' && (
                    <span className="badge badge-primary">
                      ⚡ {entry.trigger}
                    </span>
                  )}
                  {entry.attachment_count > 0 && (
                    <span className="badge badge-mild">
                      <Paperclip size={12} /> {entry.attachment_count} File
                    </span>
                  )}
                </div>

                <div>{getClassificationBadge(entry.classification_type)}</div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '100px', textAlign: 'right' }}>
                  {new Date(entry.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* ENTRY DETAIL MODAL */}
      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                  {getSeverityBadge(selectedEntry.severity)}
                  <h2 style={{ fontSize: '1.4rem' }}>{selectedEntry.symptom_name}</h2>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Logged: {new Date(selectedEntry.started_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Numerical Clinical Biomarkers Telemetry Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: '0.65rem',
              marginBottom: '1.25rem',
              padding: '0.85rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>EMOTION / MOOD</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: (selectedEntry.emotion_score || 5) <= 3 ? '#ef4444' : (selectedEntry.emotion_score || 5) >= 7 ? '#10b981' : '#f59e0b' }}>
                  {(selectedEntry.emotion_score || 5) <= 3 ? '😭' : (selectedEntry.emotion_score || 5) >= 7 ? '😄' : '😐'} {selectedEntry.emotion_score || 5}/10
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(1=Sad, 10=Happy)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAIN SEVERITY</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: selectedEntry.severity >= 8 ? '#ef4444' : '#f59e0b' }}>
                  {selectedEntry.severity}/10
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ENERGY LEVEL</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6' }}>
                  {selectedEntry.energy_level || 5}/10
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>STRESS LEVEL</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
                  {selectedEntry.stress_level || 4}/10
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>URGENCY RISK</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: (selectedEntry.urgency_score || 25) >= 75 ? '#ef4444' : '#10b981' }}>
                  {selectedEntry.urgency_score || 25}/100
                </div>
              </div>
            </div>

            {/* Classification Card */}
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
              borderLeft: '4px solid var(--accent-primary)',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                  Rule-Based Triage Assessment
                </span>
                {getClassificationBadge(selectedEntry.classification_type)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                {selectedEntry.recommendation}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedEntry.reasoning}
              </p>
            </div>

            {/* Context Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>BODY LOCATION</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedEntry.body_location}</div>
              </div>
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REPORTED TRIGGER</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedEntry.trigger || 'None'}</div>
              </div>
            </div>

            {/* Description / Notes */}
            {selectedEntry.description && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  PATIENT NOTES
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {selectedEntry.description}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  ATTACHED FILES & PHOTOS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedEntry.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`${API_ORIGIN}${att.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'flex-start', gap: '0.5rem' }}
                    >
                      <Paperclip size={16} />
                      <span>{att.file_name}</span>
                      <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Helpful triage?</span>
                <button
                  type="button"
                  onClick={() => handleFeedback(selectedEntry.id, true)}
                  className="btn btn-secondary btn-sm"
                  title="Mark as helpful"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(selectedEntry.id, false)}
                  className="btn btn-secondary btn-sm"
                  title="Mark as unhelpful"
                >
                  <ThumbsDown size={14} />
                </button>
                {feedbackSuccess && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--severity-mild)', fontWeight: 600 }}>{feedbackSuccess}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleDelete(selectedEntry.id)}
                  className="btn btn-danger btn-sm"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
