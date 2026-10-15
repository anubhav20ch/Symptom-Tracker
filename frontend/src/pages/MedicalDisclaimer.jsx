import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function MedicalDisclaimer() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link to="/" className="btn btn-text" style={{ alignSelf: 'flex-start', padding: 0 }}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Medical & clinical disclaimer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
            Important clinical context regarding the nature and boundaries of SymptomLog's advisory capabilities.
          </p>
        </div>

        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} style={{ color: 'var(--caution-text)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Non-diagnostic advisory aid</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                SymptomLog is an intelligent health record-keeping and triage tracking tool. The classifications, condition associations, and self-care notes provided through this service are generated for informational and record-keeping purposes only.
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            SymptomLog <strong>does not establish a doctor-patient relationship</strong>, is not certified as a medical diagnostic device, and does not provide prescription dosing advice (MED-4). Predictive phrasing presented to patients is intentionally hedged (CLIN-4) and should be validated through consultation with a licensed medical professional.
          </p>

          <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', fontSize: '0.875rem' }}>
            <strong>Emergency situations:</strong> If you experience severe chest pain, sudden numbness, difficulty speaking, severe breathing distress, or heavy blood loss, do not wait for application guidance. Call emergency services immediately (108 / 112 / 911).
          </div>
        </section>
      </div>
    </div>
  );
}
