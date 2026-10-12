import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, PlusCircle, HeartPulse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      height: '60px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2.25rem',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
    }}>
      {/* Left status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.28rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--accent-teal-light)',
          color: 'var(--accent-teal)',
          border: '1px solid rgba(20, 184, 166, 0.2)',
          fontSize: '0.775rem',
          fontWeight: 600,
          letterSpacing: '0.01em'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-teal)',
            display: 'inline-block',
            boxShadow: '0 0 8px var(--accent-teal)'
          }} />
          <HeartPulse size={14} />
          <span>Active Patient Telemetry</span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="btn btn-secondary btn-sm"
          title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode`}
          style={{
            padding: '0.45rem',
            borderRadius: 'var(--radius-md)',
            width: '34px',
            height: '34px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {darkMode ? (
            <Sun size={16} style={{ color: '#fbbf24' }} />
          ) : (
            <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
          )}
        </button>

        {/* Quick Log Button */}
        <button
          onClick={() => navigate('/log')}
          className="btn btn-primary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 8px var(--accent-primary-glow)'
          }}
        >
          <PlusCircle size={15} />
          <span>Log Symptom</span>
        </button>
      </div>
    </header>
  );
}
