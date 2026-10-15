import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-muted)'
          }}
        >
          {user?.name ? `Patient record: ${user.name}` : 'Patient Portal'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/log')}
          className="btn btn-primary"
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}
        >
          <PlusCircle size={15} aria-hidden="true" />
          <span>Log a symptom</span>
        </button>
      </div>
    </header>
  );
}
