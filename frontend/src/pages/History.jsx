import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUpDown,
  Paperclip,
  Trash2,
  Calendar,
  PlusCircle,
  FileText
} from 'lucide-react';
import { entriesApi, symptomsApi, openAuthenticatedFile } from '../api/client';

export default function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minSeverity, setMinSeverity] = useState('');
  const [classificationType, setClassificationType] = useState('');

  // HIST-3: Sorting state
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // HIST-4: Pagination state
  const [page, setPage] = useState(1);
  const limit = 20;

  // HIST-5: Expandable rows set of entry IDs
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    async function fetchCategories() {
      try {
        const catRes = await symptomsApi.getCategories();
        setCategories(catRes.data?.categories || []);
      } catch (err) {
        // non-blocking
      }
    }
    fetchCategories();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = {
        limit,
        offset: (page - 1) * limit
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (minSeverity) params.min_severity = minSeverity;
      if (classificationType) params.classification_type = classificationType;

      const res = await entriesApi.getAll(params);
      let list = res.data?.entries || [];
      const totalCount = res.data?.total ?? list.length;

      // In-memory sort by selected column (HIST-3)
      list = [...list].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (sortField === 'created_at' || sortField === 'started_at') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        } else if (sortField === 'severity') {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      setEntries(list);
      setTotal(totalCount);
    } catch (err) {
      console.error('[History Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [page, search, selectedCategory, minSeverity, classificationType, sortField, sortDirection]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this symptom record?')) return;
    try {
      await entriesApi.delete(id);
      loadEntries();
    } catch (err) {
      console.error('[Delete Error]:', err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Symptom history</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {total} clinical {total === 1 ? 'record' : 'records'} logged. Click any row to expand details.
          </p>
        </div>
        <Link to="/log" className="btn btn-primary" style={{ padding: '0.45rem 0.85rem' }}>
          <PlusCircle size={15} aria-hidden="true" />
          <span>Log new symptom</span>
        </Link>
      </div>

      {/* Filter Row (UI-11) */}
      <div
        className="panel"
        style={{
          padding: '0.85rem 1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end'
        }}
        role="search"
        aria-label="Filter symptom records"
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="filter-search" style={{ fontSize: '0.78rem' }}>Search symptom or text</label>
          <input
            id="filter-search"
            type="text"
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: '0.4rem 0.6rem' }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="filter-cat" style={{ fontSize: '0.78rem' }}>Category</label>
          <select
            id="filter-cat"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            style={{ padding: '0.4rem 0.6rem' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="filter-tier" style={{ fontSize: '0.78rem' }}>Triage tier</label>
          <select
            id="filter-tier"
            value={classificationType}
            onChange={(e) => { setClassificationType(e.target.value); setPage(1); }}
            style={{ padding: '0.4rem 0.6rem' }}
          >
            <option value="">All Tiers</option>
            <option value="Urgent Medical Attention">Urgent / Emergency</option>
            <option value="Specialist Referral">Chronic Care</option>
            <option value="General Physician Consult">Recurring Pattern</option>
            <option value="Self-Care Guidance">Routine Acute</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="filter-sev" style={{ fontSize: '0.78rem' }}>Min severity</label>
          <select
            id="filter-sev"
            value={minSeverity}
            onChange={(e) => { setMinSeverity(e.target.value); setPage(1); }}
            style={{ padding: '0.4rem 0.6rem' }}
          >
            <option value="">Any Severity</option>
            <option value="4">4+ (Moderate)</option>
            <option value="7">7+ (Severe)</option>
            <option value="9">9+ (Critical)</option>
          </select>
        </div>
      </div>

      {/* Dense Table (UI-11, HIST-3, HIST-4, HIST-5) */}
      <section className="panel" style={{ padding: 0, overflow: 'hidden' }} aria-labelledby="history-table-heading">
        <h2 id="history-table-heading" className="sr-only" style={{ display: 'none' }}>Symptom entries table</h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="clinical-table" aria-label="Clinical history records">
            <thead>
              <tr>
                <th style={{ width: '40px' }} aria-label="Expand column"></th>
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    Recorded date
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </span>
                </th>
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => toggleSort('symptom_name')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    Symptom
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </span>
                </th>
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => toggleSort('severity')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    Severity
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </span>
                </th>
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => toggleSort('classification_type')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    Triage tier
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </span>
                </th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading clinical entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No symptom entries found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isExpanded = expandedIds.has(entry.id);
                  const isUrgent = entry.classification_type?.toLowerCase().includes('urgent');

                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        onClick={() => toggleExpand(entry.id)}
                        style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--bg-surface-subtle)' : undefined }}
                        aria-expanded={isExpanded}
                      >
                        <td style={{ textAlign: 'center' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                          {new Date(entry.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <strong>{entry.symptom_name}</strong>
                          {entry.body_location && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {entry.body_location}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, marginRight: '0.35rem' }}>{entry.severity}/10</span>
                        </td>
                        <td>
                          <span className={`chip ${isUrgent ? 'tier-urgent' : ''}`} style={{ fontSize: '0.72rem' }}>
                            {entry.classification_type || 'Routine Acute'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>
                          {entry.ended_at ? 'Resolved' : 'Active'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => handleDelete(entry.id, e)}
                            className="btn btn-text"
                            style={{ color: 'var(--danger-text)', padding: '0.2rem' }}
                            title="Delete entry"
                            aria-label={`Delete entry for ${entry.symptom_name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* HIST-5: Expandable inline row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '2px solid var(--border-default)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                              {entry.description && (
                                <div>
                                  <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Full Description:</strong>
                                  <p style={{ marginTop: '0.2rem' }}>{entry.description}</p>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                <div>
                                  <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Onset Date:</strong>
                                  <span>{entry.started_at ? new Date(entry.started_at).toLocaleString('en-GB') : 'Unrecorded'}</span>
                                </div>
                                {entry.triggers && (
                                  <div>
                                    <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Triggers:</strong>
                                    <span>{entry.triggers}</span>
                                  </div>
                                )}
                                <div>
                                  <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Triage Rule:</strong>
                                  <span>{entry.triage_rule_id || 'ROUTINE_ACUTE'} (v{entry.triage_version || '1.1.0'})</span>
                                </div>
                                {entry.recommended_specialist && (
                                  <div>
                                    <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Specialist:</strong>
                                    <span>{entry.recommended_specialist}</span>
                                  </div>
                                )}
                              </div>

                              {entry.reasoning && (
                                <div>
                                  <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Clinical Reason:</strong>
                                  <p style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>{entry.reasoning}</p>
                                </div>
                              )}

                              {/* Follow-up linkage (ENTRY-10) */}
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/log?follow_up=${entry.id}`);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                >
                                  Log follow-up to this symptom
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/appointments?symptom=${encodeURIComponent(entry.symptom_name)}`);
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                >
                                  Book appointment for this symptom
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* HIST-4: Pagination controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing page {page} of {totalPages} ({total} entries total)
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
