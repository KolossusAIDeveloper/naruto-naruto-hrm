import React, { useState, useEffect, useCallback } from 'react';
import { announcementsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--accent)' };
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: 'var(--bg-card)', border: `1px solid ${colors[type] || 'var(--border)'}`,
      borderLeft: `4px solid ${colors[type] || 'var(--accent)'}`,
      borderRadius: 8, padding: '12px 20px', color: 'var(--text-primary)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 280, maxWidth: 400,
      display: 'flex', alignItems: 'center', gap: 12
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
    </div>
  );
};

const Modal = ({ title, onClose, children, width = 520 }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: width,
      border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>×</button>
      </div>
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  </div>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box'
};
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 };
const fieldStyle = { marginBottom: 18 };
const btnPrimary = {
  padding: '10px 20px', background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600
};
const btnSecondary = {
  padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 14
};
const btnDanger = {
  padding: '8px 16px', background: 'var(--danger)', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
};

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', icon: '📢' },
  important: { label: 'Important', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', icon: '⚠️' },
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', icon: '🚨' },
};

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function AnnouncementCard({ ann, isLatest, onArchive, onDelete, canAdmin }) {
  const [expanded, setExpanded] = useState(isLatest);
  const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
  const previewLength = 100;

  return (
    <div style={{
      background: isLatest && !ann.is_archived ? cfg.bg : 'var(--bg-card)',
      border: `1px solid ${isLatest && !ann.is_archived ? cfg.border : 'var(--border)'}`,
      borderLeft: isLatest && !ann.is_archived ? `4px solid ${cfg.color}` : '4px solid transparent',
      borderRadius: 12, padding: '20px 24px', marginBottom: 14,
      opacity: ann.is_archived ? 0.6 : 1, transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {isLatest && !ann.is_archived && (
              <span style={{
                background: 'var(--accent)', color: '#fff', fontSize: 10,
                padding: '2px 8px', borderRadius: 9999, fontWeight: 700, letterSpacing: 0.5
              }}>LATEST</span>
            )}
            <PriorityBadge priority={ann.priority} />
            {ann.is_archived && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12,
                fontSize: 11, fontWeight: 600, background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)'
              }}>Archived</span>
            )}
          </div>
          <h3
            style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
            onClick={() => setExpanded(v => !v)}
          >
            {ann.title}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {ann.created_by_name ? `By ${ann.created_by_name} · ` : ''}{formatDate(ann.created_at)}
          </div>
        </div>
        {canAdmin && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => onArchive(ann)}
              style={{ ...btnSecondary, padding: '7px 14px', fontSize: 12 }}
            >
              {ann.is_archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={() => onDelete(ann)}
              style={{ ...btnDanger, padding: '7px 14px', fontSize: 12 }}
            >Delete</button>
          </div>
        )}
      </div>

      {expanded ? (
        <div style={{
          color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4
        }}>
          {ann.body}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500 }}>
              Show less ▲
            </button>
          </div>
        </div>
      ) : (
        ann.body && (
          <div
            onClick={() => setExpanded(true)}
            style={{ color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginTop: 6, lineHeight: 1.5 }}
          >
            {ann.body.length > previewLength ? ann.body.slice(0, previewLength) + '...' : ann.body}
            {ann.body.length > previewLength && (
              <span style={{ color: 'var(--accent)', marginLeft: 4, fontWeight: 500 }}>Read more ▼</span>
            )}
          </div>
        )
      )}
    </div>
  );
}

const EMPTY_FORM = { title: '', body: '', priority: 'normal' };

export default function Announcements() {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (showArchived) params.include_archived = 'true';
      const res = await announcementsAPI.list(params);
      let data = res.data.results || res.data || [];
      if (!showArchived) data = data.filter(a => !a.is_archived);
      setAnnouncements(data);
    } catch {
      showToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim()) return showToast('Title is required', 'error');
    if (!form.body.trim()) return showToast('Body is required', 'error');
    setSaving(true);
    try {
      await announcementsAPI.create({ title: form.title.trim(), body: form.body.trim(), priority: form.priority });
      showToast('Announcement posted successfully');
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchAnnouncements();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to post announcement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async ann => {
    try {
      await announcementsAPI.archive(ann.id);
      showToast(ann.is_archived ? 'Announcement unarchived' : 'Announcement archived');
      fetchAnnouncements();
    } catch {
      showToast('Failed to update announcement', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await announcementsAPI.delete(deleteTarget.id);
      showToast('Announcement deleted');
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch {
      showToast('Failed to delete announcement', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const latestIdx = announcements.findIndex(a => !a.is_archived);

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)', fontWeight: 700 }}>Announcements</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Company-wide announcements and updates</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            Show archived
          </label>
          {isAdmin() && (
            <button onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }} style={btnPrimary}>
              + New Announcement
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : announcements.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 80, color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📢</div>
          <p style={{ fontSize: 16, margin: '0 0 20px' }}>
            {showArchived ? 'No archived announcements.' : 'No announcements yet.'}
          </p>
          {isAdmin() && !showArchived && (
            <button onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }} style={btnPrimary}>
              Post First Announcement
            </button>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 800 }}>
          {announcements.map((ann, idx) => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              isLatest={idx === latestIdx}
              onArchive={handleArchive}
              onDelete={setDeleteTarget}
              canAdmin={isAdmin()}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal title="New Announcement" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Title *</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Announcement title..."
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Body *</label>
              <textarea
                style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Announcement details..."
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            {/* Preview */}
            {form.priority !== 'normal' && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 18,
                background: PRIORITY_CONFIG[form.priority]?.bg,
                border: `1px solid ${PRIORITY_CONFIG[form.priority]?.border}`,
                color: PRIORITY_CONFIG[form.priority]?.color, fontSize: 13, fontWeight: 600
              }}>
                {PRIORITY_CONFIG[form.priority]?.icon} This will appear as a {form.priority} announcement
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} style={btnSecondary}>Cancel</button>
              <button type="submit" style={btnPrimary} disabled={saving}>
                {saving ? 'Posting...' : '📢 Post Announcement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal title="Delete Announcement" onClose={() => setDeleteTarget(null)} width={420}>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"{deleteTarget.title}"</strong>?
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteTarget(null)} style={btnSecondary}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={btnDanger}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
