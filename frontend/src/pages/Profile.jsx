import React, { useState } from 'react';
import {
  User,
  Heart,
  Save,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile, darkMode, toggleDarkMode } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState(user?.gender || 'Female');
  const [userTier, setUserTier] = useState(user?.user_tier || 'clinical');
  const [chronicConditions, setChronicConditions] = useState(() => {
    if (Array.isArray(user?.chronic_conditions)) {
      return user.chronic_conditions.join(', ');
    }
    return '';
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const parsedConditions = chronicConditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await updateProfile({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        gender,
        chronic_conditions: parsedConditions,
        user_tier: userTier
      });

      setSuccess('Profile details and experience mode successfully updated!');
      confetti({ particleCount: 40, spread: 50 });
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Account & Health Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Manage your personal demographics, chronic conditions, and app appearance preferences.
        </p>
      </div>

      {success && (
        <div className="alert-banner alert-info" style={{ backgroundColor: 'var(--accent-teal-light)', color: 'var(--accent-teal)' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-emergency">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address (Read-Only)</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Age</label>
              <input
                type="number"
                min="1"
                max="125"
                className="form-input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other / Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Chronic Health Conditions (Comma Separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Asthma, Migraine with Aura, Hypertension"
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              These chronic conditions inform the automated triage classification engine during symptom flare-ups.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Account Experience Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                onClick={() => setUserTier('clinical')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: userTier !== 'casual' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: userTier !== 'casual' ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  🩺 Full Clinical Patient
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Comprehensive 4-tier triage, physician appointments, and longitudinal PDF reports.
                </div>
              </div>

              <div
                onClick={() => setUserTier('casual')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: userTier === 'casual' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: userTier === 'casual' ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  ⚡ Casual Wellness Tracker
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Streamlined quick logging, daily alarms, and lightweight symptom tracking.
                </div>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <ShieldCheck size={18} className="text-teal-600" />
              <span>Data encrypted locally</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              <Save size={16} />
              {saving ? 'Saving Profile...' : 'Update Health Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Appearance & Theme Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            Application Theme
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Toggle between clinical high-contrast light mode and soothing OLED dark mode
          </div>
        </div>

        <button
          onClick={toggleDarkMode}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          <span>{darkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
        </button>
      </div>
    </div>
  );
}
