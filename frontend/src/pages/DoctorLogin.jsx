import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Stethoscope, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { doctorApi } from '../api/client';

export default function DoctorLogin() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState(location.state?.password || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await doctorApi.login({ email, password });
      localStorage.setItem('symptomlog_doctor_token', res.data.token);
      localStorage.setItem('symptomlog_doctor', JSON.stringify(res.data.doctor));
      navigate('/doctor/portal', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid physician credentials.');
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
      padding: '1.5rem'
    }}>
      <div className="card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0d9488 0%, #4f46e5 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(13, 148, 136, 0.3)',
            marginBottom: '1rem'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem' }}>Physician Portal</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sign in to review linked patient appointments and symptom context
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-emergency" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-email">Physician Email</label>
            <div style={{ position: 'relative' }}>
              <input
                id="doc-email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="you@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={17} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="doc-password"
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

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}>
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Logins for Doctors */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
            Instant Physician Demo Logins (Password: <code style={{ fontSize: '0.75rem' }}>doctor123</code>)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => { setEmail('jennifer.vance@symptomlog.com'); setPassword('doctor123'); }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title="Dr. Jennifer Vance, MD (Neurology)"
            >
              🩺 Dr. Vance
            </button>
            <button
              type="button"
              onClick={() => { setEmail('robert.sterling@symptomlog.com'); setPassword('doctor123'); }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title="Dr. Robert Sterling, MD (Pulmonology)"
            >
              🩺 Dr. Sterling
            </button>
            <button
              type="button"
              onClick={() => { setEmail('amelia.ferreira@symptomlog.com'); setPassword('doctor123'); }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title="Dr. Amelia Ferreira, MD (Dermatology)"
            >
              🩺 Dr. Ferreira
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.8rem' }}>
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            ← Patient Sign In
          </Link>
          <Link to="/admin/login" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
            Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
