import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Shield, Database, Trash2, Eye } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link to="/" className="btn btn-text" style={{ alignSelf: 'flex-start', padding: 0 }}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Privacy policy & data subject rights</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
            SymptomLog is built on principles of data minimization, transparent governance, and user ownership. This document details how your health records are handled (PRIV-1 to PRIV-6).
          </p>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>1. Explicit consent (PRIV-1)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              We capture explicit, timestamped consent at registration before any symptom or biomarker data is collected. You can review your consent timestamp in your profile anytime.
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>2. Data portability & complete export (PRIV-2)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You may download a complete, machine-readable JSON export of every row linked to your account (symptoms, medications, appointments, audit logs, and shared links) via your Profile settings.
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>3. Deletion requests & cascade erasure (PRIV-3, PRIV-6)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You can request account deletion at any time. To protect against accidental loss, requests have a 24-hour grace window during which you can cancel. After this window, our automated retention worker cascades deletion across every dependent database table with zero orphaned records.
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>4. Access transparency (PRIV-4)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Every time a physician, caregiver link, or administrator accesses your record, an immutable audit event is recorded and made queryable directly from your account access log.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
