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
  FileText,
  History,
  RotateCcw,
  Check,
  Filter
} from 'lucide-react';
import { adminApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminPortal() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // overview | doctors | appointments | dataset | models | audit
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [datasetStatus, setDatasetStatus] = useState(null);

  // Model Lifecycle State (ADMIN-12..15)
  const [models, setModels] = useState([]);
  const [activeModelVersion, setActiveModelVersion] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [retrainJob, setRetrainJob] = useState(null);
  const [retrainPolling, setRetrainPolling] = useState(false);

  // Audit Logs State (ADMIN-10)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditLimit] = useState(25);
  const [auditFilters, setAuditFilters] = useState({
    actor_type: '',
    action: '',
    date_from: '',
    date_to: '',
  });
  const [auditLoading, setAuditLoading] = useState(false);

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
  const [validationReport, setValidationReport] = useState(null);

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

  const loadModelRegistry = async () => {
    setModelsLoading(true);
    try {
      const res = await adminApi.listModels();
      setModels(res.data?.versions || []);
      setActiveModelVersion(res.data?.active_version || null);
    } catch (err) {
      console.warn('Failed to fetch model versions', err);
    } finally {
      setModelsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const params = {
        limit: auditLimit,
        offset: auditOffset,
      };
      if (auditFilters.actor_type) params.actor_type = auditFilters.actor_type;
      if (auditFilters.action) params.action = auditFilters.action;
      if (auditFilters.date_from) params.date_from = auditFilters.date_from;
      if (auditFilters.date_to) params.date_to = auditFilters.date_to;

      const res = await adminApi.getAuditLogs(params);
      setAuditLogs(res.data?.logs || []);
      setAuditTotal(res.data?.total || 0);
    } catch (err) {
      console.warn('Failed to load audit logs', err);
    } finally {
      setAuditLoading(false);
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

  useEffect(() => {
    if (activeTab === 'models') {
      loadModelRegistry();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, auditOffset]);

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

  // Validate Dataset CSV before upload (ADMIN-11)
  const handleValidateDataset = async () => {
    if (!datasetFile) return;
    setDatasetError('');
    setValidationReport(null);
    setDatasetUploading(true);

    const formData = new FormData();
    formData.append('dataset', datasetFile);

    try {
      const res = await adminApi.validateDataset(formData);
      setValidationReport(res.data?.validation || res.data);
      setNotification({ type: 'success', message: 'Dataset schema and class distribution validated successfully.' });
    } catch (err) {
      setDatasetError(err.response?.data?.error?.message || 'Dataset validation failed.');
    } finally {
      setDatasetUploading(false);
    }
  };

  // Upload Dataset & Start Async Retrain (ADMIN-12)
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
      setNotification({ type: 'success', message: res.data?.message || 'Retraining initiated.' });
      
      if (res.data?.job_id) {
        setRetrainJob({ id: res.data.job_id, status: 'running' });
        pollRetrainJob(res.data.job_id);
      }
      loadAllData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Dataset upload failed.';
      setDatasetError(msg);
    } finally {
      setDatasetUploading(false);
    }
  };

  const pollRetrainJob = (jobId) => {
    setRetrainPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await adminApi.getRetrainStatus(jobId);
        const job = res.data?.job || res.data;
        setRetrainJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(interval);
          setRetrainPolling(false);
          loadAllData();
          loadModelRegistry();
          if (job.status === 'completed') {
            setNotification({ type: 'success', message: `Retraining job ${jobId} finished: ${job.message || 'New candidate model ready'}` });
          } else {
            setNotification({ type: 'error', message: `Retraining job ${jobId} failed: ${job.error || 'Unknown error'}` });
          }
        }
      } catch (err) {
        clearInterval(interval);
        setRetrainPolling(false);
      }
    }, 2000);
  };

  // Activate Model Version (ADMIN-13)
  const handleActivateModel = async (version) => {
    if (!window.confirm(`Promote model version ${version} to active production? This will route all live triage evaluations to this model.`)) {
      return;
    }
    try {
      const res = await adminApi.activateModel({ version });
      setNotification({ type: 'success', message: res.data?.message || `Model ${version} is now active.` });
      loadModelRegistry();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error?.message || 'Failed to activate model version.' });
    }
  };

  // Rollback Model Version (ADMIN-14)
  const handleRollbackModel = async (targetVersion) => {
    if (!window.confirm(`Initiate rollback to version ${targetVersion || 'previous'}?`)) {
      return;
    }
    try {
      const res = await adminApi.rollbackModel({ target_version: targetVersion });
      setNotification({ type: 'success', message: res.data?.message || 'Model rollback completed.' });
      loadModelRegistry();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error?.message || 'Failed to rollback model.' });
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
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
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              SymptomLog Clinical Administration
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Governance & ML Lifecycle Station
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
          <div className={`alert-banner ${notification.type === 'error' ? 'alert-emergency' : 'alert-info'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          width: 'fit-content',
          flexWrap: 'wrap'
        }} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'overview' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Activity size={15} />
            <span>Overview</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'doctors'}
            onClick={() => setActiveTab('doctors')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'doctors' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'doctors' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Stethoscope size={15} />
            <span>Physicians ({doctors.length})</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'appointments'}
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'appointments' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'appointments' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Calendar size={15} />
            <span>Appointments ({appointments.length})</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'dataset'}
            onClick={() => setActiveTab('dataset')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'dataset' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'dataset' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Database size={15} />
            <span>Dataset & Ingestion</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'models'}
            onClick={() => setActiveTab('models')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'models' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'models' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <History size={15} />
            <span>Model Lifecycle (ADMIN-12..15)</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'audit' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'audit' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <FileText size={15} />
            <span>Audit Logs (ADMIN-10)</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW TELEMETRY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Registered Patients</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="tabular-nums">{stats?.total_users ?? 0}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Physicians</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="tabular-nums">{stats?.total_doctors ?? doctors.length}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Bookings</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="tabular-nums">{stats?.total_appointments ?? appointments.length}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>ML Dataset Samples</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="tabular-nums">
                    {datasetStatus?.total_samples ?? 1200} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>({datasetStatus?.classes_count ?? 24} classes)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Model Health Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Machine Learning Service Status</h2>
                </div>
                <span className="badge badge-mild">
                  Operational (Active: {datasetStatus?.active_version || 'v1.0.0'})
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                On-device symptom classification engine utilizing TF-IDF feature extraction and Multinomial Logistic Regression with clinical thresholding.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Holdout Accuracy</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700 }} className="tabular-nums">
                    {datasetStatus?.ml_holdout_accuracy ? `${(datasetStatus.ml_holdout_accuracy * 100).toFixed(2)}%` : '96.67%'}
                  </div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Holdout Macro F1</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700 }} className="tabular-nums">
                    {datasetStatus?.ml_holdout_macro_f1 ? `${(datasetStatus.ml_holdout_macro_f1 * 100).toFixed(2)}%` : '96.61%'}
                  </div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ingested File</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    Symptom2Disease.csv ({datasetStatus?.file_size_kb ?? 224} KB)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PHYSICIANS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'doctors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Credentialed Physicians</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage medical providers with access to the Physician Portal.</p>
              </div>
              <button
                onClick={() => setShowDoctorModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <PlusCircle size={16} />
                <span>Add Physician</span>
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Name & NPI</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Specialty</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Linked Patients</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{doc.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{doc.npi_number || 'NPI pending'}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{doc.specialty || 'General Practice'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{doc.email}</td>
                        <td style={{ padding: '0.85rem 1rem' }} className="tabular-nums">{doc.patient_count ?? 0} active</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemoveDoctor(doc.id, doc.name)}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--severity-crit)', borderColor: 'var(--severity-crit-border)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {doctors.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No physician records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: APPOINTMENTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'appointments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Clinical Bookings</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Master consultation schedule and physician reassignment.</p>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date & Time</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Patient</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Physician</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reason</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr key={appt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleString() : 'Unscheduled'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{appt.patient_name || 'Patient'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.patient_email}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{appt.doctor_name || 'Unassigned'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{appt.reason || 'General Follow-up'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge ${appt.status === 'completed' ? 'badge-mild' : appt.status === 'cancelled' ? 'badge-crit' : 'badge-mod'}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenApptEdit(appt)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No clinical consultations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: DATASET INGESTION & VALIDATION (ADMIN-11) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dataset' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Dataset Ingestion & Class Validation</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Upload candidate training corpora in CSV format. Schema and class balance are verified prior to pipeline execution.
              </p>
            </div>

            {datasetError && (
              <div className="alert-banner alert-emergency">
                <AlertCircle size={18} />
                <span>{datasetError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Upload Candidate Dataset</h3>
                <form onSubmit={handleDatasetUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Select .csv File (text, label)</label>
                    <input
                      type="file"
                      accept=".csv"
                      className="form-input"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setDatasetFile(e.target.files[0]);
                          setDatasetError('');
                          setValidationReport(null);
                        }
                      }}
                    />
                  </div>

                  {datasetFile && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleValidateDataset}
                        disabled={datasetUploading}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Validate Schema Only (ADMIN-11)
                      </button>
                      <button
                        type="submit"
                        disabled={datasetUploading}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        {datasetUploading ? 'Uploading...' : 'Upload & Trigger Job'}
                      </button>
                    </div>
                  )}
                </form>

                {validationReport && (
                  <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
                      Validation Report (ADMIN-11):
                    </div>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div>Total Rows: <span className="tabular-nums font-mono">{validationReport.total_rows ?? validationReport.rows_count}</span></div>
                      <div>Distinct Classes: <span className="tabular-nums font-mono">{validationReport.classes_count ?? (validationReport.class_distribution ? Object.keys(validationReport.class_distribution).length : 0)}</span></div>
                      <div>Status: <span className="badge badge-mild">Schema Valid</span></div>
                    </div>
                    {validationReport.class_distribution && (
                      <div style={{ marginTop: '0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Class Distribution:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.35rem' }}>
                          {Object.entries(validationReport.class_distribution).map(([cls, cnt]) => (
                            <div key={cls} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px' }}>
                              <span style={{ fontWeight: 600 }}>{cls}:</span> <span className="tabular-nums">{cnt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dataset Schema Requirements</h3>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>File format: UTF-8 encoded comma-separated values (<code>.csv</code>).</li>
                  <li>Header columns: exactly <code>text</code> and <code>label</code>.</li>
                  <li>Minimum volume: at least 10 non-empty sample rows.</li>
                  <li>Class diversity: minimum of 2 discrete classification targets.</li>
                  <li>Clinical copy: natural patient symptom narratives without formatting markup.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: MODEL LIFECYCLE (ADMIN-12..15) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'models' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ML Model Lifecycle Governance</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Version registry, holdout metrics gating (ADMIN-13: Acc &ge; 0.80, F1 &ge; 0.75), and one-click rollback (ADMIN-14).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleRollbackModel(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RotateCcw size={14} />
                  <span>Rollback to Previous (ADMIN-14)</span>
                </button>
                <button
                  onClick={loadModelRegistry}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw size={14} className={modelsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {retrainJob && (
              <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {retrainPolling ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        Async Retraining Job: <span className="font-mono">{retrainJob.id}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Status: <span className="font-mono font-semibold">{retrainJob.status}</span> &bull; {retrainJob.message || 'Processing dataset...'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Version</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Holdout Acc</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Macro F1</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gating Check</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Registered</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((mod) => {
                      const isActive = mod.status === 'active' || mod.version === activeModelVersion;
                      const acc = mod.metrics?.accuracy ?? mod.accuracy ?? 0;
                      const f1 = mod.metrics?.macro_f1 ?? mod.macro_f1 ?? 0;
                      const passesGate = acc >= 0.80 && f1 >= 0.75;

                      return (
                        <tr key={mod.version} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {mod.version}
                            {isActive && <span className="badge badge-mild" style={{ marginLeft: '0.5rem' }}>Active</span>}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge ${isActive ? 'badge-mild' : mod.status === 'candidate' ? 'badge-mod' : 'badge-neutral'}`}>
                              {mod.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }} className="tabular-nums font-mono">
                            {(acc * 100).toFixed(2)}%
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }} className="tabular-nums font-mono">
                            {(f1 * 100).toFixed(2)}%
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {passesGate ? (
                              <span style={{ color: 'var(--severity-mild)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={14} /> Meets gates
                              </span>
                            ) : (
                              <span style={{ color: 'var(--severity-crit)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AlertTriangle size={14} /> Below gate
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {mod.registered_at ? new Date(mod.registered_at).toLocaleString() : 'Baseline'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            {!isActive && (
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  onClick={() => handleActivateModel(mod.version)}
                                  disabled={!passesGate}
                                  className="btn btn-secondary btn-sm"
                                  title={passesGate ? 'Activate version' : 'Gating threshold not met'}
                                >
                                  Activate
                                </button>
                                <button
                                  onClick={() => handleRollbackModel(mod.version)}
                                  className="btn btn-outline btn-sm"
                                  title="Rollback to this version"
                                >
                                  Rollback
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {models.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No model versions recorded. (ADMIN-15)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: AUDIT LOG VIEWER (ADMIN-10) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Immutable System Audit Trail</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Append-only log of patient, physician, administrative and lifecycle actions with metadata.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 140px' }}>
                <label className="form-label">Actor Type</label>
                <select
                  className="form-select"
                  value={auditFilters.actor_type}
                  onChange={(e) => setAuditFilters({ ...auditFilters, actor_type: e.target.value })}
                >
                  <option value="">All Actors</option>
                  <option value="user">User / Patient</option>
                  <option value="doctor">Physician</option>
                  <option value="admin">Administrator</option>
                  <option value="system">System Daemon</option>
                </select>
              </div>

              <div style={{ flex: '1 1 180px' }}>
                <label className="form-label">Action Pattern</label>
                <input
                  type="text"
                  placeholder="e.g. auth, triage, model"
                  className="form-input"
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                />
              </div>

              <div style={{ flex: '1 1 150px' }}>
                <label className="form-label">Date From</label>
                <input
                  type="date"
                  className="form-input"
                  value={auditFilters.date_from}
                  onChange={(e) => setAuditFilters({ ...auditFilters, date_from: e.target.value })}
                />
              </div>

              <div style={{ flex: '1 1 150px' }}>
                <label className="form-label">Date To</label>
                <input
                  type="date"
                  className="form-input"
                  value={auditFilters.date_to}
                  onChange={(e) => setAuditFilters({ ...auditFilters, date_to: e.target.value })}
                />
              </div>

              <button
                onClick={() => {
                  setAuditOffset(0);
                  loadAuditLogs();
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Filter size={14} />
                <span>Filter Logs</span>
              </button>
            </div>

            {/* Audit Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Actor</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Action</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target / Resource</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>IP Address</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at || log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge badge-neutral font-mono">{log.actor_type || 'user'} #{log.actor_id ?? 'N/A'}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {log.action}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {log.resource_type ? `${log.resource_type} #${log.resource_id ?? ''}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {log.ip_address || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }} title={JSON.stringify(log.metadata || {})}>
                          {log.metadata ? JSON.stringify(log.metadata) : '-'}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No audit log entries matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <span className="tabular-nums font-mono">{auditLogs.length}</span> of <span className="tabular-nums font-mono">{auditTotal}</span> entries
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={auditOffset === 0 || auditLoading}
                    onClick={() => setAuditOffset(Math.max(0, auditOffset - auditLimit))}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditOffset + auditLimit >= auditTotal || auditLoading}
                    onClick={() => setAuditOffset(auditOffset + auditLimit)}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Provision Physician Account</h2>
              <button onClick={() => setShowDoctorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {doctorError && (
              <div className="alert-banner alert-emergency mb-4">
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Modify Appointment Details</h2>
              <button onClick={() => setSelectedAppt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {apptError && (
              <div className="alert-banner alert-emergency mb-4">
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
