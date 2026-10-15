import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldAlert, ArrowRight, Lock, Clock, HeartPulse } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Public Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}
          >
            <Activity size={18} strokeWidth={2.2} />
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.2rem' }}>
            SymptomLog
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <Link to="/how-triage-works" className="btn btn-text">How triage works</Link>
          <Link to="/privacy" className="btn btn-text">Privacy</Link>
          <Link to="/disclaimer" className="btn btn-text">Medical disclaimer</Link>
          <Link to="/help" className="btn btn-text">Help</Link>
          <Link to="/login" className="btn btn-secondary">Sign in</Link>
          <Link to="/register" className="btn btn-primary">Create account</Link>
        </nav>
      </header>

      {/* Main Content (UI-16: modest home page, one headline, 3 sections, primary action, visible disclaimer) */}
      <main style={{ flex: 1, maxWidth: '860px', margin: '0 auto', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Headline & Primary Action */}
        <section style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h1 style={{ fontSize: '2.5rem', lineHeight: 1.15, maxWidth: '720px' }}>
            Keep a clear record of how you feel, and know when to see a doctor.
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.5 }}>
            SymptomLog provides structured health tracking, deterministic clinical triage guidance, and secure record sharing designed to clinical record standards.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              <span>Get started — create an account</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem' }}>
              Sign in to your record
            </Link>
          </div>
        </section>

        {/* 3 Short Informative Sections (UI-16) */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>1. Structured clinical tracking</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Record symptoms, onset dates, severity (0–10), anatomical regions, and triggers without marketing distractions or emojis.
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>2. Deterministic triage guidance</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Versioned clinical logic transparently evaluates symptoms across Urgent, Chronic Care, Recurring, and Acute tiers with clear "Why am I seeing this?" disclosures.
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>3. Governed privacy & sharing</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Export your complete machine-readable data anytime, revoke caregiver links on demand, and audit all data accesses with least-privilege physician controls.
            </p>
          </div>
        </section>

        {/* Visible Medical Disclaimer (UI-16) */}
        <footer
          style={{
            borderTop: '1px solid var(--border-default)',
            paddingTop: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}
        >
          <strong>Medical disclaimer:</strong> SymptomLog is a personal tracking and triage advisory system. It does not provide definitive medical diagnoses or dosing instructions. In the event of a life-threatening emergency, acute chest pain, or severe breathing difficulties, contact emergency medical services immediately (108 / 112 / 911).
        </footer>
      </main>
    </div>
  );
}
