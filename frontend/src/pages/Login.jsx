import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem'
    }}>
      <div className="card animate-fade-in" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem' }}>Welcome Back</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sign in to track symptoms and clinical insights
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
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Comprehensive Demo Accounts Hub */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Instant Demo Logins
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              7 Active Profiles
            </span>
          </div>

          {/* Patient Demo Accounts */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>👤</span> <span>Patients (Pass: <code style={{ fontSize: '0.65rem' }}>password123</code>)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleDemoFill('demo@symptomlog.com', 'password123')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem', padding: '0.45rem 0.2rem', textAlign: 'center' }}
                title="Sarah Chen — Migraine & Asthma"
              >
                Sarah (Demo)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('marcus@symptomlog.com', 'password123')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem', padding: '0.45rem 0.2rem', textAlign: 'center' }}
                title="Marcus Brody — Hypertension & Back Pain"
              >
                Marcus
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('elena@symptomlog.com', 'password123')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem', padding: '0.45rem 0.2rem', textAlign: 'center' }}
                title="Elena Rostova — Dermatology & Eczema"
              >
                Elena
              </button>
            </div>
          </div>

          {/* Physician Demo Accounts */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-teal)', fontWeight: 600, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>🩺</span> <span>Physicians (Pass: <code style={{ fontSize: '0.65rem' }}>doctor123</code>)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => navigate('/doctor/login', { state: { email: 'jennifer.vance@symptomlog.com', password: 'doctor123' } })}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem', padding: '0.45rem 0.2rem', textAlign: 'center', borderColor: 'rgba(13, 148, 136, 0.25)' }}
                title="Dr. Jennifer Vance, MD — Neurology"
              >
                Dr. Vance
              </button>
              <button
                type="button"
                onClick={() => navigate('/doctor/login', { state: { email: 'robert.sterling@symptomlog.com', password: 'doctor123' } })}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem', padding: '0.45rem 0.2rem', textAlign: 'center', borderColor: 'rgba(13, 148, 136, 0.25)' }}
                title="Dr. Robert Sterling, MD — Pulmonology"
              >
                Dr. Sterling
              </button>
              <button
                type="button"
                onClick={() => navigate('/doctor/login', { state: { email: 'amelia.ferreira@symptomlog.com', password: 'doctor123' } })}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem', padding: '0.45rem 0.2rem', textAlign: 'center', borderColor: 'rgba(13, 148, 136, 0.25)' }}
                title="Dr. Amelia Ferreira, MD — Dermatology"
              >
                Dr. Ferreira
              </button>
            </div>
          </div>

          {/* Admin Demo Account */}
          <div>
            <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>🛡️</span> <span>Admin Portal (Pass: <code style={{ fontSize: '0.65rem' }}>admin123</code>)</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/login', { state: { email: 'admin@symptomlog.com', password: 'admin123' } })}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', fontSize: '0.725rem', padding: '0.45rem 0.5rem', textAlign: 'center', borderColor: 'rgba(2, 132, 199, 0.25)' }}
              title="Chief System Administrator (admin@symptomlog.com)"
            >
              🛡️ System Administrator (`admin@symptomlog.com`)
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Create one here
          </Link>
        </div>

        {/* Portal Direct Links */}
        <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
          Direct Portals:{' '}
          <Link to="/doctor/login" style={{ color: 'var(--accent-teal)', fontWeight: 600, textDecoration: 'none' }}>
            Physician Portal
          </Link>
          {' • '}
          <Link to="/admin/login" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
            Admin Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
