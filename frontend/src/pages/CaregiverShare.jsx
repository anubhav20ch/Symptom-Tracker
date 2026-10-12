import React, { useState } from 'react';
import {
  Share2,
  Copy,
  CheckCircle2,
  Lock,
  Clock,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { caregiverApi } from '../api/client';

export default function CaregiverShare() {
  const [daysValid, setDaysValid] = useState('14');
  const [generating, setGenerating] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setCopied(false);
    try {
      const res = await caregiverApi.generateLink(parseInt(daysValid, 10));
      setShareData(res.data);
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      alert('Failed to generate secure share link');
    } finally {
      setGenerating(false);
    }
  };

  const getFullShareUrl = () => {
    if (!shareData?.token) return '';
    return `${window.location.origin}/share/${shareData.token}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Family & Caregiver Secure Sharing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Generate a read-only, time-limited secure link to share your ongoing symptom chronologies and medications with family members, nurses, or caregivers.
        </p>
      </div>

      {/* Generator Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} className="text-teal-600" />
          Create Secure Time-Limited Link
        </h2>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Link Expiration Duration</label>
            <select
              className="form-select"
              value={daysValid}
              onChange={(e) => setDaysValid(e.target.value)}
            >
              <option value="1">24 Hours (1 Day)</option>
              <option value="7">7 Days (1 Week)</option>
              <option value="14">14 Days (2 Weeks - Recommended)</option>
              <option value="30">30 Days (1 Month)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
          >
            <Share2 size={18} />
            {generating ? 'Generating Secure Token...' : 'Generate Caregiver Link'}
          </button>
        </form>

        {shareData && (
          <div className="animate-fade-in" style={{ marginTop: '1.75rem', padding: '1.25rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                Active Secure Link
              </span>
              <span className="badge badge-mild">
                Expires {new Date(shareData.expires_at).toLocaleDateString()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                readOnly
                className="form-input"
                value={getFullShareUrl()}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-primary"
                style={{ flexShrink: 0 }}
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                🔒 Read-only snapshot of your symptoms, medications, and triage assessments.
              </span>
              <a
                href={`/share/${shareData.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Preview Caregiver View <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Demo Caregiver Link */}
      <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck size={18} className="text-indigo-600" />
          Pre-Configured Demo Caregiver Token
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          For quick testing, a demo token is automatically seeded into the database:
        </p>
        <a
          href="/share/demo-caregiver-share-sarah-2026"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          Open Demo Caregiver Portal (/share/demo-caregiver-share-sarah-2026) <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
