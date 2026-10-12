import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Zap,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  Search,
  Stethoscope,
  BookOpen,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Play
} from 'lucide-react';
import { insightsApi, entriesApi } from '../api/client';
import { IDENTIFIABLE_DISEASES, DISEASE_CATEGORIES } from '../utils/identifiableDiseases';
import PainJourneySimulator from '../components/PainJourneySimulator';

export default function Insights() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator', 'diseases', 'trends'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoading(true);
        const [insightsRes, entriesRes] = await Promise.all([
          insightsApi.getInsights(),
          entriesApi.getAll({ limit: 100 })
        ]);
        setInsights(insightsRes.data.insights || null);
        setEntries(entriesRes.data.entries || []);
      } catch (err) {
        console.error('Failed to load insights:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, []);

  const filteredDiseases = IDENTIFIABLE_DISEASES.filter(d => {
    const matchesCategory = selectedCategory === 'All Categories' || d.category === selectedCategory;
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch = !query || 
      d.name.toLowerCase().includes(query) ||
      d.category.toLowerCase().includes(query) ||
      d.specialist.toLowerCase().includes(query) ||
      d.keySymptoms.some(s => s.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const totalEntries = insights?.total_entries || 0;
  const avgSeverity = insights?.avg_severity || 0;
  const frequentTriggers = insights?.frequent_triggers || [];
  const categoryBreakdown = insights?.category_breakdown || [];
  const recentTrend = insights?.recent_trend || [];
  const aiRecommendations = insights?.ai_recommendations || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Tabs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={26} className="text-amber-500" />
            <h1 style={{ fontSize: '1.85rem', letterSpacing: '-0.02em' }}>AI Medical Intelligence & Diagnostics</h1>
          </div>

          {/* Navigation Sub-tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-secondary)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '0.25rem'
          }}>
            <button
              onClick={() => setActiveTab('simulator')}
              className="btn btn-sm"
              style={{
                backgroundColor: activeTab === 'simulator' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'simulator' ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 'none',
                fontWeight: 600
              }}
            >
              <Play size={14} />
              <span>Pain Journey Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('diseases')}
              className="btn btn-sm"
              style={{
                backgroundColor: activeTab === 'diseases' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'diseases' ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 'none',
                fontWeight: 600
              }}
            >
              <BookOpen size={14} />
              <span>24 Identifiable Diseases</span>
              <span style={{
                backgroundColor: activeTab === 'diseases' ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem'
              }}>24</span>
            </button>

            <button
              onClick={() => setActiveTab('trends')}
              className="btn btn-sm"
              style={{
                backgroundColor: activeTab === 'trends' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'trends' ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 'none',
                fontWeight: 600
              }}
            >
              <Activity size={14} />
              <span>Personal Trends</span>
              {totalEntries > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'trends' ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.7rem'
                }}>{totalEntries}</span>
              )}
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Explore pain journey timeline simulations (Green/Yellow/Orange/Red), 24 detectable clinical conditions, and longitudinal telemetry.
        </p>
      </div>

      {/* Model Spec Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        padding: '1.25rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Identifiable Classes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>24 Conditions</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Multi-organ clinical spectrum</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Model Accuracy</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>96.67%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Holdout validation benchmark</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Inference Engine</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-teal)', marginTop: '0.2rem' }}>TF-IDF + Ridge</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>100% local, zero external API keys</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Emergency Triage</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>108 / 102</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>National emergency routing</div>
        </div>
      </div>

      {/* TAB 1: PAIN JOURNEY SIMULATOR & TIMELINE REPLAY */}
      {activeTab === 'simulator' && (
        <PainJourneySimulator userEntries={entries} />
      )}

      {/* TAB 2: 24 IDENTIFIABLE DISEASES */}
      {activeTab === 'diseases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Search & Category Filter Pills */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{
                position: 'relative',
                flex: 1,
                minWidth: '260px'
              }}>
                <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search diseases, symptoms (e.g. fever, headache, rash, chest pain)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.4rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="btn btn-secondary btn-sm"
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Filter size={13} /> Filter:
              </span>
              {DISEASE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    border: selectedCategory === cat ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: selectedCategory === cat ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                    color: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
            <span>Showing <strong>{filteredDiseases.length}</strong> of 24 identifiable medical conditions</span>
            <span>Click "Test in AI Logger" to pre-fill test narratives</span>
          </div>

          {/* 24 Disease Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredDiseases.map(disease => (
              <div
                key={disease.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderTop: '3px solid var(--accent-primary)'
                }}
              >
                <div>
                  {/* Top line: Icon, Name, Category */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{disease.icon}</span>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {disease.name}
                        </h3>
                        <span className="badge badge-primary" style={{ marginTop: '0.2rem', fontSize: '0.7rem' }}>
                          {disease.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Specialist & Severity */}
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Stethoscope size={14} className="text-indigo-500" />
                      <span style={{ color: 'var(--text-secondary)' }}>Specialist:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{disease.specialist}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span style={{ color: 'var(--text-secondary)' }}>Clinical Severity:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{disease.severityRisk}</strong>
                    </div>
                  </div>

                  {/* Key Clinical Symptoms */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                      Key Clinical Hallmarks:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {disease.keySymptoms.map((symp, sIdx) => (
                        <span
                          key={sIdx}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.55rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          • {symp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <button
                  onClick={() => {
                    const sampleText = `I have been experiencing ${disease.keySymptoms.slice(0, 3).join(', ')} along with persistent discomfort.`;
                    navigate(`/log?prefill=${encodeURIComponent(sampleText)}`);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontWeight: 600,
                    marginTop: '0.5rem'
                  }}
                >
                  <span>Test in AI Logger</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {filteredDiseases.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No matching diseases found</p>
              <p style={{ fontSize: '0.85rem' }}>Try clearing your search or picking "All Categories".</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERSONAL TELEMETRY & TRENDS */}
      {activeTab === 'trends' && (
        <>
          {(!insights || totalEntries === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
              <Sparkles size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No personalized symptom logs yet</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>Log a few symptom flare-ups in the logger to generate trigger correlations and longitudinal severity graphs.</p>
              <button onClick={() => navigate('/log')} className="btn btn-primary btn-sm">
                Log First Symptom
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Top High-level KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Tracked Episodes</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>{totalEntries}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Across all categories</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Average Severity Rating</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: avgSeverity > 6 ? 'var(--severity-sev)' : 'var(--severity-mild)' }}>
                    {avgSeverity} / 10
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {avgSeverity > 6 ? 'High symptom intensity' : 'Moderate/controlled intensity'}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Identified Distinct Triggers</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-teal)' }}>
                    {frequentTriggers.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Leading: {frequentTriggers[0]?.trigger || 'None'}</div>
                </div>
              </div>

              {/* AI Clinical Recommendations & Insights Cards */}
              <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--accent-primary-light) 100%)', border: '1px solid var(--border-focus)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} className="text-amber-500" />
                  Pattern Detection & Clinical Advisory
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {aiRecommendations.map((rec, idx) => (
                    <div key={idx} style={{
                      padding: '0.9rem 1.1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--accent-primary)',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      💡 {rec}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visualizations Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Severity Trend Visualizer */}
                <div className="card">
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={18} className="text-indigo-600" />
                    Recent Severity Chronology
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.65rem', height: '180px', padding: '1rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    {recentTrend.map((point, idx) => {
                      const heightPercent = Math.max(15, (point.severity / 10) * 100);
                      let barColor = '#10b981';
                      if (point.severity > 3) barColor = '#f59e0b';
                      if (point.severity > 6) barColor = '#f97316';
                      if (point.severity > 8) barColor = '#ef4444';

                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{point.severity}</span>
                          <div style={{
                            width: '100%',
                            height: `${heightPercent}%`,
                            backgroundColor: barColor,
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease'
                          }} title={`${point.symptom}: Severity ${point.severity}/10 on ${new Date(point.date).toLocaleDateString()}`} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40px' }}>
                            {new Date(point.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    <span>Past logged events (Chronological)</span>
                    <span>Scale: 1-10</span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="card">
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} className="text-teal-600" />
                    Symptom Category Breakdown
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {categoryBreakdown.map((cat, idx) => {
                      const pct = Math.round((cat.count / totalEntries) * 100);
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                            <span>{cat.category}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{cat.count} logs ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
                              borderRadius: '4px'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trigger Correlations */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={18} className="text-amber-500" />
                    Identified Environmental & Lifestyle Triggers
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {frequentTriggers.map((trig, idx) => (
                      <div key={idx} style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            ⚡ {trig.trigger}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Reported with {trig.count} symptom flare-ups
                          </div>
                        </div>
                        <span className="badge badge-primary">{trig.count} Episodes</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
