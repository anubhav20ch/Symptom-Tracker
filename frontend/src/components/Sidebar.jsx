import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  PlusCircle,
  Clock,
  Pill,
  Bell,
  Calendar,
  FileText,
  Sparkles,
  Share2,
  User,
  LogOut,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Activity },
    { to: '/log', label: 'Log Symptom', icon: PlusCircle, highlight: true },
    { to: '/history', label: 'History & Timeline', icon: Clock },
    { to: '/insights', label: 'AI Health Insights', icon: Sparkles },
    { to: '/medications', label: 'Medications', icon: Pill },
    { to: '/reminders', label: 'Reminders', icon: Bell },
    { to: '/appointments', label: 'Doctor Visits', icon: Calendar },
    { to: '/reports', label: 'Clinical PDF Export', icon: FileText },
    { to: '/caregiver', label: 'Caregiver Sharing', icon: Share2 },
    { to: '/profile', label: 'Profile & Settings', icon: User },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.4rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
          flexShrink: 0
        }}>
          <Stethoscope size={20} strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Symptom<span style={{ color: 'var(--accent-primary)' }}>Log</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Health Intelligence
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{
        flex: 1,
        padding: '1.1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        overflowY: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.62rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-primary-light)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
                transition: 'all var(--transition-fast)',
                position: 'relative'
              })}
            >
              <Icon size={18} strokeWidth={2} />
              <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>
              {item.highlight && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.65rem',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '0.12rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}>
                  NEW
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div style={{
        padding: '0.9rem 1rem',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        backgroundColor: 'var(--bg-tertiary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.825rem',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.825rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              letterSpacing: '-0.01em'
            }}>
              {user?.name || 'Patient User'}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {user?.email || 'patient@symptomlog.com'}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color var(--transition-fast), background-color var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--severity-crit)';
            e.currentTarget.style.backgroundColor = 'var(--severity-crit-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
