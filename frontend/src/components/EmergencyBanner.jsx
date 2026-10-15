import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function EmergencyBanner({ isCritical = false }) {
  if (isCritical) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="panel tier-urgent"
        style={{
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'flex-start'
        }}
      >
        <ShieldAlert size={22} style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--danger-text)' }}>
            Urgent Medical Attention Recommended
          </div>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Your reported symptoms suggest a high-severity or acute condition. Please contact emergency services (108 / 112 / 911) or proceed to the nearest emergency department immediately.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="panel"
      style={{
        backgroundColor: 'var(--caution-bg)',
        borderColor: 'var(--caution-border)',
        borderLeft: '4px solid var(--caution-text)',
        marginBottom: '1.25rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        gap: '0.65rem',
        alignItems: 'center'
      }}
    >
      <AlertTriangle size={18} style={{ color: 'var(--caution-text)', flexShrink: 0 }} />
      <div style={{ fontSize: '0.82rem', color: 'var(--caution-text)' }}>
        <strong>Advisory notice:</strong> SymptomLog is a record-keeping and triage guidance tool. It does not replace clinical evaluation. In an emergency, contact local emergency services immediately.
      </div>
    </div>
  );
}
