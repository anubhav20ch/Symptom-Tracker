import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Database } from 'lucide-react';
import { adminApi } from '../api/client';

export default function AdminLogin() {
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
      const res = await adminApi.login({ email, password });
      if (res.data?.token) {
        localStorage.setItem('symptomlog_admin_token', res.data.token);
        localStorage.setItem('symptomlog_admin', JSON.stringify(res.data.admin));
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid administrator credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@symptomlog.com');
    setPassword('admin123');
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
        padding: '2.5rem 2.25rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(14, 165, 233, 0.35)',
            marginBottom: '1rem'
          }}>
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem', letterSpacing: '-0.025em' }}>
            System Administrator
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Authenticate to manage physicians, appointments, and AI model datasets
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-banner alert-emergency mb-4" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.825rem' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Admin Email</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="admin@symptomlog.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Master Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.8rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)'
            }}
          >
            {loading ? 'Verifying Credentials...' : 'Access Admin Control Center'}
            <ArrowRight size={17} />
          </button>
        </form>

        {/* Demo Quick-Fill */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-subtle)' }}>
          <button
            type="button"
            onClick={handleDemoFill}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Database size={15} />
            <span>Fill Demo Admin Credentials (`admin@symptomlog.com`)</span>
          </button>
        </div>

        {/* Navigation back */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.8rem' }}>
          <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            ← Patient Sign In
          </Link>
          <Link to="/doctor/login" style={{ color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600 }}>
            Physician Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
