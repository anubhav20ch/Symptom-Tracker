import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Lock, Mail, User, Heart, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: 'Female',
    chronic_conditions: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : null,
        chronic_conditions: formData.chronic_conditions
          ? formData.chronic_conditions.split(',').map((c) => c.trim()).filter(Boolean)
          : []
      };
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '2rem 1.5rem'
    }}>
      <div className="card animate-fade-in" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #0d9488 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
            marginBottom: '1rem'
          }}>
            <Stethoscope size={28} />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem' }}>Create Your Health Log</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Personalized clinical symptom tracking with automated triage guidance
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-banner alert-emergency mb-4" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Sarah Connor"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <User size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Mail size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                name="password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <Lock size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="age">Age</label>
              <input
                id="age"
                name="age"
                type="number"
                min="1"
                max="125"
                className="form-input"
                placeholder="e.g. 32"
                value={formData.age}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer Not to Say">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="chronic_conditions">
              Chronic Conditions (comma separated)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="chronic_conditions"
                name="chronic_conditions"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="e.g. Asthma, Migraine, Hypertension"
                value={formData.chronic_conditions}
                onChange={handleChange}
              />
              <Heart size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Experience Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, user_tier: 'clinical' })}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: formData.user_tier !== 'casual' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: formData.user_tier !== 'casual' ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>🩺 Clinical Patient</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Full triage & doctor summaries</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, user_tier: 'casual' })}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: formData.user_tier === 'casual' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: formData.user_tier === 'casual' ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>⚡ Casual Tracker</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quick logs & alarm schedules</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
          >
            {loading ? 'Creating Account...' : 'Get Started'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
