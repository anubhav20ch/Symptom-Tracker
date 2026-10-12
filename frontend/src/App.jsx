import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LogSymptom from './pages/LogSymptom';
import History from './pages/History';
import Insights from './pages/Insights';
import Medications from './pages/Medications';
import Reminders from './pages/Reminders';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import CaregiverShare from './pages/CaregiverShare';
import CaregiverView from './pages/CaregiverView';
import Profile from './pages/Profile';
import DoctorLogin from './pages/DoctorLogin';
import DoctorPortal from './pages/DoctorPortal';
import AdminLogin from './pages/AdminLogin';
import AdminPortal from './pages/AdminPortal';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public Shared Token Route */}
          <Route path="/share/:token" element={<CaregiverView />} />

          {/* Physician Portal */}
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/portal" element={<DoctorPortal />} />

          {/* Admin Control Center */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPortal />} />

          {/* Protected Main Application Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/log" element={<LogSymptom />} />
            <Route path="/history" element={<History />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/caregiver" element={<CaregiverShare />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
