import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Stethoscope,
  Calendar,
  Database,
  Upload,
  PlusCircle,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  LogOut,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Activity,
  ArrowRight,
  X,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { adminApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminPortal() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // overview | doctors | appointments | dataset
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [datasetStatus, setDatasetStatus] = useState(null);

  // Doctor Form Modal State
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('doctor123');
  const [docSpecialty, setDocSpecialty] = useState('General Medicine');
  const [docNpi, setDocNpi] = useState('');
  const [doctorSubmitting, setDoctorSubmitting] = useState(false);
  const [doctorError, setDoctorError] = useState('');

  // Appointment Edit Modal State
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [editStatus, setEditStatus] = useState('scheduled');
  const [editDate, setEditDate] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [apptSubmitting, setApptSubmitting] = useState(false);
  const [apptError, setApptError] = useState('');

  // Dataset Upload State
  const [datasetFile, setDatasetFile] = useState(null);
  const [datasetUploading, setDatasetUploading] = useState(false);
  const [datasetError, setDatasetError] = useState('');
  const [datasetSuccess, setDatasetSuccess] = useState(null);

  // Status Notification
  const [notification, setNotification] = useState(null);

  const adminUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('symptomlog_admin')) || { name: 'Admin' };
    } catch {
      return { name: 'Admin' };
    }
  })();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, apptsRes, dataRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getDoctors(),
        adminApi.getAppointments(),
        adminApi.getDatasetStatus()
      ]);
      setStats(statsRes.data?.stats || null);
      setDoctors(docsRes.data?.doctors || []);
      setAppointments(apptsRes.data?.appointments || []);
      setDatasetStatus(dataRes.data?.dataset || null);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('symptomlog_admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadAllData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {}
    localStorage.removeItem('symptomlog_admin_token');
    localStorage.removeItem('symptomlog_admin');
    navigate('/admin/login');
  };

  // Add Doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setDoctorError('');
    setDoctorSubmitting(true);
    try {
      const res = await adminApi.addDoctor({
        name: docName,
        email: docEmail,
        password: docPassword,
        specialty: docSpecialty,
        npi_number: docNpi || `NPI-${Date.now().toString().slice(-8)}`
      });
      setShowDoctorModal(false);
      setDocName('');
      setDocEmail('');
      setDocNpi('');
      setNotification({ type: 'success', message: res.data?.message || 'Physician added successfully' });
      loadAllData();
    } catch (err) {
      setDoctorError(err.response?.data?.error?.message || 'Failed to add physician.');
    } finally {
      setDoctorSubmitting(false);
    }
  };

  // Remove Doctor
  const handleRemoveDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove Dr. ${name}? Any linked appointments will be preserved.`)) {
      return;
    }
    try {
      const res = await adminApi.removeDoctor(id);
      setNotification({ type: 'success', message: res.data?.message || 'Doctor removed.' });
      loadAllData();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error?.message || 'Failed to remove doctor.' });
    }
  };

  // Open Appointment Edit Modal
  const handleOpenApptEdit = (appt) => {
    setSelectedAppt(appt);
    setEditStatus(appt.status || 'scheduled');
    setEditDate(appt.scheduled_at ? new Date(appt.scheduled_at).toISOString().slice(0, 16) : '');
    setEditDoctorId(appt.doctor_id || '');
    setEditReason(appt.reason || '');
    setEditNotes(appt.notes || '');
    setApptError('');
  };

  // Save Appointment Changes
  const handleSaveApptEdit = async (e) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setApptError('');
    setApptSubmitting(true);
    try {
      await adminApi.updateAppointment(selectedAppt.id, {
        status: editStatus,
        scheduled_at: editDate,
        doctor_id: editDoctorId ? parseInt(editDoctorId, 10) : null,
        reason: editReason,
        notes: editNotes
      });
      setSelectedAppt(null);
      setNotification({ type: 'success', message: 'Appointment details updated successfully.' });
      loadAllData();
    } catch (err) {
      setApptError(err.response?.data?.error?.message || 'Failed to update appointment.');
    } finally {
      setApptSubmitting(false);
    }
  };

  // Upload Dataset & Retrain
  const handleDatasetUpload = async (e) => {
    e.preventDefault();
    setDatasetError('');
    setDatasetSuccess(null);

    if (!datasetFile) {
      setDatasetError('Please select a CSV dataset file first.');
      return;
    }

    if (!datasetFile.name.toLowerCase().endsWith('.csv')) {
      setDatasetError('Invalid file format. Only .csv files are supported.');
      return;
    }

    setDatasetUploading(true);
    const formData = new FormData();
    formData.append('dataset', datasetFile);

    try {
      const res = await adminApi.uploadDataset(formData);
      setDatasetSuccess(res.data);
      setDatasetFile(null);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      loadAllData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Dataset validation or retraining failed. Please verify CSV format.';
      setDatasetError(msg);
    } finally {
      setDatasetUploading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading administrative station...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{
        height: '64px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'var(--glass-blur)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
          }}>
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Symptom<span style={{ color: '#0284c7' }}>Log</span> Admin Control Center
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Master Management Portal
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={loadAllData}
            className="btn btn-secondary btn-sm"
            title="Refresh Station Data"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--severity-crit)', borderColor: 'var(--severity-crit-border)' }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Global Notification Banner */}
        {notification && (
          <div className={`alert-banner ${notification.type === 'error' ? 'alert-emergency' : 'alert-info'} animate-fade-in`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          width: 'fit-content',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'overview' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Activity size={16} />
            <span>System Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'doctors' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'doctors' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Stethoscope size={16} />
            <span>Manage Physicians ({doctors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'appointments' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'appointments' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Calendar size={16} />
            <span>All Appointments ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'dataset' ? '#0284c7' : 'transparent',
              color: activeTab === 'dataset' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Database size={16} />
            <span>Dataset & ML Retraining</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW TELEMETRY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Registered Patients</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{stats?.total_users ?? 0}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--accent-teal-light)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Physicians</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{stats?.total_doctors ?? doctors.length}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--severity-mod-bg)', color: 'var(--severity-mod)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Bookings</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{stats?.total_appointments ?? appointments.length}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--accent-cyan-light)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>ML Samples / Classes</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>
                    {datasetStatus?.total_samples ?? 1200} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>({datasetStatus?.classes_count ?? 24} classes)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Model Health Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Sparkles size={20} style={{ color: '#0284c7' }} />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Natural Language Engine Telemetry</h2>
                </div>
                <span className="badge badge-mild">
                  ● Service Status: Operational
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                The on-device machine learning service is continuously evaluating symptom descriptions using TF-IDF feature extraction and Multinomial Logistic Regression.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Holdout Accuracy</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--severity-mild)' }}>
                    {datasetStatus?.ml_holdout_accuracy ? `${(datasetStatus.ml_holdout_accuracy * 100).toFixed(2)}%` : '96.67%'}
                  </div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Macro F1-Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {datasetStatus?.ml_holdout_macro_f1 ? `${(datasetStatus.ml_holdout_macro_f1 * 100).toFixed(2)}%` : '96.61%'}
                  </div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Training Dataset File</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.35rem' }}>
                    Symptom2Disease.csv ({datasetStatus?.file_size_kb ?? 224} KB)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: DOCTOR MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'doctors' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Physician Directory & Provisioning</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add new accredited doctors or remove inactive profiles.</p>
              </div>
              <button
                onClick={() => setShowDoctorModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusCircle size={16} />
                <span>Add New Physician</span>
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Physician Name</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Specialty</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>NPI Number</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Email Address</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Bookings</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No physicians found. Add one above.
                        </td>
                      </tr>
                    ) : (
                      doctors.map((doc) => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color var(--transition-fast)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-teal-light)', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                                Dr
                              </div>
                              <span>{doc.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span className="badge badge-primary">{doc.specialty || 'General'}</span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{doc.npi_number}</td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>{doc.email}</td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span className="badge badge-neutral">{doc.appointment_count || 0} visits</span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleRemoveDoctor(doc.id, doc.name)}
                              className="btn btn-sm btn-danger"
                              title="Delete Doctor Profile"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <Trash2 size={14} />
                              <span>Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: APPOINTMENTS MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'appointments' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Master Appointment Schedule</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Inspect, reschedule, reassign physicians, or update clinical status for all patient visits.
              </p>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Patient</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Assigned Physician</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Scheduled Date & Time</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Chief Complaint / Reason</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '0.9rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No appointments found.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((appt) => {
                        const statusBadge = appt.status === 'completed'
                          ? 'badge-mild'
                          : appt.status === 'cancelled'
                          ? 'badge-critical'
                          : 'badge-moderate';

                        return (
                          <tr key={appt.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <div style={{ fontWeight: 600 }}>{appt.patient_name || 'Patient'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{appt.patient_email}</div>
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                                {appt.assigned_doctor_name || appt.doctor_name || 'Unassigned Doctor'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {appt.assigned_doctor_specialty || appt.specialty || 'General'}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              {appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleString() : 'Not Set'}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', maxWidth: '240px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {appt.reason || 'Routine consultation'}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <span className={`badge ${statusBadge}`} style={{ textTransform: 'capitalize' }}>
                                {appt.status}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleOpenApptEdit(appt)}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Edit3 size={13} />
                                <span>Change</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: DATASET MANAGEMENT, VALIDATION & ML RETRAINING */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dataset' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>AI Disease Model Dataset & Training Center</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Upload a verified symptom dataset (.csv) to dynamically retrain and deploy the on-device NLP disease classifier.
              </p>
            </div>

            {/* Current Dataset Metrics Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(2, 132, 199, 0.08) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileSpreadsheet size={22} style={{ color: '#0284c7' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Dataset Summary</h3>
                </div>
                <span className="badge badge-primary">Symptom2Disease.csv</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Clinical Samples</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{datasetStatus?.total_samples ?? 1200}</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Distinct Disease Classes</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{datasetStatus?.classes_count ?? 24}</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Validated Holdout Accuracy</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--severity-mild)' }}>
                    {datasetStatus?.ml_holdout_accuracy ? `${(datasetStatus.ml_holdout_accuracy * 100).toFixed(2)}%` : '96.67%'}
                  </div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>File Size</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{datasetStatus?.file_size_kb ?? 224} KB</div>
                </div>
              </div>

              {datasetStatus?.classes?.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                    Recognized Disease Classes:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {datasetStatus.classes.map((cls, idx) => (
                      <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ERROR ALERT MODAL / BANNER IF DATASET IS INVALID */}
            {datasetError && (
              <div className="alert-banner alert-emergency animate-fade-in" style={{ border: '2px solid var(--severity-crit)', padding: '1.25rem' }}>
                <AlertCircle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                    DATASET VALIDATION REJECTED
                  </div>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                    {datasetError}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem' }}>
                    Please check the required CSV format below and ensure columns match <code>text</code> and <code>label</code>.
                  </div>
                </div>
              </div>
            )}

            {/* SUCCESS BANNER UPON VALIDATION & RETRAINING */}
            {datasetSuccess && (
              <div className="alert-banner alert-info animate-fade-in" style={{ border: '2px solid var(--accent-teal)', backgroundColor: 'var(--accent-teal-light)', color: 'var(--accent-teal)', padding: '1.25rem' }}>
                <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    DATASET VALIDATED & MODEL RETRAINED SUCCESSFULLY!
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Processed {datasetSuccess.validation?.total_samples} samples across {datasetSuccess.validation?.classes_count} disease classes.
                  </div>
                  {datasetSuccess.retrain?.metrics && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                      New Model Accuracy: {(datasetSuccess.retrain.metrics.holdout_accuracy * 100).toFixed(2)}% | Macro-F1: {(datasetSuccess.retrain.metrics.holdout_macro_f1 * 100).toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Box & Requirements Guide */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Upload Form */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>Upload New CSV Dataset</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Upload a verified CSV dataset to update the model. The dataset will be strictly validated before training is allowed.
                  </p>

                  <form onSubmit={handleDatasetUpload}>
                    <div style={{
                      border: '2px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '2rem 1.5rem',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      marginBottom: '1.25rem',
                      transition: 'border-color var(--transition-fast)'
                    }}
                    onClick={() => document.getElementById('dataset-file-input').click()}
                    >
                      <Upload size={32} style={{ margin: '0 auto 0.75rem', color: '#0284c7' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        {datasetFile ? datasetFile.name : 'Click to Browse or Drag & Drop Dataset (.CSV)'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {datasetFile ? `${(datasetFile.size / 1024).toFixed(1)} KB selected` : 'Maximum file size: 25 MB'}
                      </div>
                      <input
                        id="dataset-file-input"
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setDatasetFile(e.target.files[0]);
                            setDatasetError('');
                          }
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={datasetUploading || !datasetFile}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.85rem',
                        background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {datasetUploading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Validating & Retraining ML Model...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Validate & Retrain Disease Model</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Strict Dataset Format Requirements Guide */}
              <div className="card" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                  Strict Schema & Format Requirements
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                  The dataset parser strictly checks incoming files. Uploads failing any of the following criteria will trigger an automatic error alert:
                </p>

                <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li><strong>File Format:</strong> Standard Comma-Separated Values (<code>.csv</code>) encoded in UTF-8.</li>
                  <li><strong>Required Header Columns:</strong> Must include <code>text</code> (the free-text symptom description) and <code>label</code> (the target condition name).</li>
                  <li><strong>Minimum Samples:</strong> Must contain at least <strong>10 valid data rows</strong>.</li>
                  <li><strong>Multi-Class Diversity:</strong> Must span at least <strong>2 distinct disease classes</strong>.</li>
                  <li><strong>Data Quality:</strong> Empty or corrupt rows exceeding threshold will be rejected.</li>
                </ul>

                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Sample Valid CSV Schema:
                  </div>
                  <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)', overflowX: 'auto' }}>
{`text,label
"I have severe throbbing pain in my forehead and nausea",Migraine
"Shortness of breath and wheezing at night",Bronchial Asthma
"High fever, body chills, and fatigue since 3 days",Malaria`}
                  </pre>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD DOCTOR */}
      {/* ------------------------------------------------------------- */}
      {showDoctorModal && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Provision New Physician Account</h2>
              <button onClick={() => setShowDoctorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {doctorError && (
              <div className="alert-banner alert-emergency mb-4" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.825rem' }}>{doctorError}</span>
              </div>
            )}

            <form onSubmit={handleAddDoctor}>
              <div className="form-group">
                <label className="form-label">Full Doctor Name & Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Arthur Conan, MD"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Medical Specialty</label>
                <select
                  className="form-select"
                  value={docSpecialty}
                  onChange={(e) => setDocSpecialty(e.target.value)}
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Gastroenterology">Gastroenterology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="ENT (Otolaryngology)">ENT (Otolaryngology)</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">NPI Registry Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. NPI-1049284729"
                  value={docNpi}
                  onChange={(e) => setDocNpi(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Doctor Login Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="doctor@symptomlog.com"
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="doctor123"
                  value={docPassword}
                  onChange={(e) => setDocPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={doctorSubmitting}
                  className="btn btn-primary"
                >
                  {doctorSubmitting ? 'Creating...' : 'Create Physician Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT / REASSIGN APPOINTMENT */}
      {/* ------------------------------------------------------------- */}
      {selectedAppt && (
        <div className="modal-overlay" onClick={() => setSelectedAppt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Modify Appointment Details</h2>
              <button onClick={() => setSelectedAppt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {apptError && (
              <div className="alert-banner alert-emergency mb-4" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.825rem' }}>{apptError}</span>
              </div>
            )}

            <form onSubmit={handleSaveApptEdit}>
              <div className="form-group">
                <label className="form-label">Patient</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${selectedAppt.patient_name || 'Patient'} (${selectedAppt.patient_email || ''})`}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign / Reassign Physician</label>
                <select
                  className="form-select"
                  value={editDoctorId}
                  onChange={(e) => setEditDoctorId(e.target.value)}
                >
                  <option value="">-- Keep Current / Custom Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Booking Status</label>
                <select
                  className="form-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Visit</label>
                <input
                  type="text"
                  className="form-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preparation / Admin Notes</label>
                <textarea
                  className="form-textarea"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes for the patient or clinic staff..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAppt(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={apptSubmitting}
                  className="btn btn-primary"
                >
                  {apptSubmitting ? 'Updating...' : 'Save Appointment Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
