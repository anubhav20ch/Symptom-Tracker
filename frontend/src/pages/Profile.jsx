import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Key,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { accountApi } from '../api/client';
import api from '../api/client';

export default function Profile() {
  const { user, updateProfile, toggleDarkMode } = useAuth();

  // Basic profile state
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState(user?.gender || 'Female');
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Password change state (AUTH-15)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Privacy & Data Subject Rights state (PRIV-2, PRIV-3, PRIV-4)
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [accessLogs, setAccessLogs] = useState([]);
  const [showAccessLogs, setShowAccessLogs] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchPrivacyStatus() {
      try {
        const res = await accountApi.getDeletionStatus();
        setDeletionStatus(res.data?.deletion_request || null);
      } catch (_) {}
    }
    fetchPrivacyStatus();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await updateProfile({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        gender
      });

      // Update timezone (AUTH-18)
      if (timezone) {
        await api.put('/auth/timezone', { timezone });
      }

      setSuccess('Profile details and time zone updated.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassSaving(true);
    setPassSuccess('');
    setPassError('');
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPassSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPassError(err.response?.data?.error?.message || 'Failed to update password');
    } finally {
      setPassSaving(false);
    }
  };

  // PRIV-2: Machine-readable data export
  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await accountApi.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `symptomlog_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export account data.');
    } finally {
      setExporting(false);
    }
  };

  // PRIV-3: Request deletion
  const handleRequestDeletion = async () => {
    if (!window.confirm('Request account deletion? You will have a 24-hour grace period to cancel before permanent erasure.')) return;
    try {
      const res = await accountApi.requestDeletion();
      setDeletionStatus(res.data?.deletion_request || { status: 'pending' });
      setSuccess('Account deletion requested. You may cancel at any time within the grace window.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to request account deletion');
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await accountApi.cancelDeletion();
      setDeletionStatus(null);
      setSuccess('Account deletion request has been cancelled.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to cancel deletion request');
    }
  };

  // PRIV-4: View access log
  const handleToggleAccessLog = async () => {
    if (!showAccessLogs) {
      try {
        const res = await accountApi.getAccessLog();
        setAccessLogs(res.data?.access_log || []);
      } catch (_) {}
    }
    setShowAccessLogs(!showAccessLogs);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Account & privacy settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Manage your demographics, time zone, security credentials, and data subject rights.
        </p>
      </div>

      {success && (
        <div className="panel" style={{ backgroundColor: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)', fontSize: '0.85rem' }}>
          {success}
        </div>
      )}
      {error && (
        <div className="panel" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Demographics & Timezone (AUTH-18) */}
      <section className="panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Demographics & preferences</h2>

        <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="user-name">Full name *</label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="user-email">Email (read-only)</label>
              <input
                id="user-email"
                type="email"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="user-age">Age</label>
              <input
                id="user-age"
                type="number"
                min="0"
                max="130"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="user-gender">Gender</label>
              <select id="user-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer Not to Say">Prefer Not to Say</option>
              </select>
            </div>

            {/* AUTH-18 Time Zone */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="user-tz">Profile time zone (AUTH-18)</label>
              <input
                id="user-tz"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Kolkata, UTC"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving...' : 'Save demographics'}
          </button>
        </form>
      </section>

      {/* Change Password (AUTH-12, AUTH-15) */}
      <section className="panel" aria-labelledby="security-heading">
        <h2 id="security-heading" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Change password</h2>

        {passSuccess && (
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
            {passSuccess}
          </div>
        )}
        {passError && (
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
            {passError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="curr-pass">Current password</label>
              <input
                id="curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="new-pass">New password (min 10 chars, letter + digit)</label>
              <input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={passSaving} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
            {passSaving ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </section>

      {/* PRIV-1 to PRIV-4: Data Subject Rights & Privacy */}
      <section className="panel" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
          Data subject rights & portability (PRIV-1 .. PRIV-4)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Manage your data export, inspect data access audit logs, or request account erasure.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          {/* PRIV-2: Machine-readable JSON Export */}
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="btn btn-secondary"
          >
            <Download size={15} aria-hidden="true" />
            <span>{exporting ? 'Generating JSON...' : 'Export all data (JSON)'}</span>
          </button>

          {/* PRIV-4: Access log */}
          <button
            onClick={handleToggleAccessLog}
            className="btn btn-secondary"
          >
            <Eye size={15} aria-hidden="true" />
            <span>{showAccessLogs ? 'Hide access log' : 'View access log'}</span>
          </button>

          {/* PRIV-3: Request or Cancel Deletion */}
          {deletionStatus?.status === 'pending' ? (
            <button
              onClick={handleCancelDeletion}
              className="btn btn-secondary"
              style={{ color: 'var(--primary)' }}
            >
              Cancel pending deletion request
            </button>
          ) : (
            <button
              onClick={handleRequestDeletion}
              className="btn btn-secondary"
              style={{ color: 'var(--danger-text)' }}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Request account deletion</span>
            </button>
          )}
        </div>

        {deletionStatus?.status === 'pending' && (
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--danger-text)', marginBottom: '1rem' }}>
            <strong>Account deletion pending:</strong> Requested on {new Date(deletionStatus.requested_at).toLocaleString('en-GB')}. Your account will be permanently erased once the 24-hour grace window elapses unless you click Cancel above.
          </div>
        )}

        {/* PRIV-4: Access Log Table */}
        {showAccessLogs && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-muted)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Data access audit trail</h3>
            {accessLogs.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No cross-ownership data accesses recorded yet.</p>
            ) : (
              <table className="clinical-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Accessor</th>
                    <th>Action</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{new Date(log.occurred_at).toLocaleString('en-GB')}</td>
                      <td><strong>{log.accessor_type}</strong></td>
                      <td>{log.action}</td>
                      <td>{log.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
