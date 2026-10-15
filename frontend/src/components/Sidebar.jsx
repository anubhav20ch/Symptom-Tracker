import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  PlusCircle,
  Clock,
  Sparkles,
  Pill,
  Calendar,
  FileText,
  Share2,
  LogOut,
  Moon,
  Sun,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// UI-6: Left sidebar with exact labels at >=1024px and bottom tab bar below 1024px.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: Activity },
  { to: '/log', label: 'Log a symptom', icon: PlusCircle },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/insights', label: 'Insights', icon: Sparkles },
  { to: '/medications', label: 'Medicines', icon: Pill },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/caregiver', label: 'Sharing', icon: Share2 }
];

export default function Sidebar() {
  const { user, logout, toggleDarkMode } = useAuth();

  return (
    <>
      {/* Desktop Persistent Left Sidebar (>=1024px) */}
      <aside
        className="desktop-sidebar"
        aria-label="Primary navigation"
        style={{
          width: '240px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}
          >
            <Activity size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.1 }}>
              SymptomLog
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              Clinical Health Record
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, padding: '0.85rem 0.65rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--primary)' : 'transparent'
                  })}
                >
                  <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User & Accessibility Controls Footer */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderTop: '1px solid var(--border-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          {user && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user.name || user.email}</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <button
              onClick={toggleDarkMode}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              title="Toggle color theme"
              aria-label="Toggle light and dark mode"
            >
              {user?.dark_mode ? <Sun size={15} /> : <Moon size={15} />}
              <span>Theme</span>
            </button>
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              title="Sign out"
              aria-label="Sign out of account"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar (<1024px) (UI-6) */}
      <nav
        className="mobile-tab-bar"
        aria-label="Mobile Navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-default)',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50,
          padding: '0 0.5rem'
        }}
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.15rem',
                textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: isActive ? 700 : 500
              })}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Responsive media query styling */}
      <style>{`
        @media (max-width: 1023px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-tab-bar {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
