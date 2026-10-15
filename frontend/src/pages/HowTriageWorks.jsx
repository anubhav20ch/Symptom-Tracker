import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Info, CheckCircle, ArrowLeft } from 'lucide-react';

export default function HowTriageWorks() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link to="/" className="btn btn-text" style={{ alignSelf: 'flex-start', padding: 0 }}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>How our clinical triage works</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
            SymptomLog implements a deterministic, versioned clinical rule engine (TRIAGE-7) rather than an unconstrained generative AI model. Every result records the exact rule applied and reasons behind it.
          </p>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel tier-urgent">
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} aria-hidden="true" />
              <span>1. Urgent / Emergency Attention</span>
            </h2>
            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Triggered immediately when severe red-flag conditions are detected, such as acute chest pain (severity &ge; 7), critical shortness of breath, sudden neurological deficits, or severe systemic allergic reactions. The engine resolves conflicts by granting Urgent criteria highest precedence.
            </p>
          </div>

          <div className="panel tier-chronic">
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} aria-hidden="true" />
              <span>2. Chronic Care / Specialist Referral</span>
            </h2>
            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Evaluated when symptoms persist beyond 90 days, or when an entry directly references an established chronic condition (such as asthma, hypertension, or migraine) requiring ongoing clinical specialist monitoring.
            </p>
          </div>

          <div className="panel tier-recurring">
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={20} aria-hidden="true" />
              <span>3. Recurring Pattern / General Physician Consult</span>
            </h2>
            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Triggered when the patient logs 3 or more occurrences of the same symptom cluster within a rolling 30-day window, suggesting an emerging clinical pattern that warrants primary care evaluation.
            </p>
          </div>

          <div className="panel tier-acute">
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} aria-hidden="true" />
              <span>4. Routine Acute / Self-Care Monitoring</span>
            </h2>
            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Assigned to mild-to-moderate, isolated episodes of short duration (&lt; 14 days). Provides static self-care guidance marked with clinical review timestamps.
            </p>
          </div>
        </section>

        <div className="panel">
          <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Deterministic precedence order (TRIAGE-8)</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            When an entry satisfies multiple tier criteria simultaneously, the engine applies fixed precedence: <strong>Urgent &rarr; Chronic Care &rarr; Recurring Pattern &rarr; Routine Acute</strong>. This guarantees emergency indications are never downgraded by concurrent chronic conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
