import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, PhoneCall, BookOpen } from 'lucide-react';

export default function Help() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link to="/" className="btn btn-text" style={{ alignSelf: 'flex-start', padding: 0 }}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Help & clinical support</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
            Frequently asked questions, system usage guidelines, and clinical emergency contacts.
          </p>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>How do I export my clinical records?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Navigate to <strong>Profile & Settings</strong> while logged in, or use the <strong>Reports</strong> tab to generate a signed clinical PDF summary for your physician. You can also download your full raw JSON archive under Data Portability (PRIV-2).
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>How do caregiver links work?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Under <strong>Sharing</strong>, you can generate time-limited, read-only links with custom scopes (symptoms, medications, appointments). Caregivers never register an account, and you can revoke access at any moment (CARE-5).
            </p>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>What do the severity numbers mean?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Symptom severity is measured on a standard 0 to 10 clinical analog scale: 1–3 represents mild discomfort, 4–6 represents moderate interference with daily activities, 7–8 represents severe distress, and 9–10 indicates critical pain requiring urgent evaluation.
            </p>
          </div>

          <div className="panel" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PhoneCall size={18} aria-hidden="true" />
              <span>Emergency contact numbers</span>
            </h2>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li><strong>Emergency Ambulance:</strong> 108 / 102 / 911</li>
              <li><strong>National Emergency Helpline:</strong> 112</li>
              <li><strong>Mental Health Helpline (KIRAN):</strong> 1800-599-0019</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
