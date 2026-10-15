import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import EmergencyBanner from './EmergencyBanner';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-canvas)'
        }}
      >
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          Loading clinical record...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: '70px' }}>
        <Navbar />
        <main tabIndex={-1} style={{ flex: 1, padding: '1.25rem 1rem' }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
            <EmergencyBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
