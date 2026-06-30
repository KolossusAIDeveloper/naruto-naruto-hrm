import React, { useState, useEffect } from 'react';
import { announcementsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  normal: { bg: 'rgba(100,116,139,0.1)', border: 'var(--border)', color: '#94a3b8', label: 'Normal' },
  important: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', color: '#f59e0b', label: 'Important' },
  urgent: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', color: '#ef4444', label: 'Urgent' },
};

function AnnouncementCard({ ann, isLatest, onArchive, onDelete, isAdmin }) {
  const [expanded, setExpanded] = useState(isLatest);
  const p = PRIORITY_COLORS[ann.priority] || PRIORITY_COLORS.normal;

  return (
    <div style={{
      background: isLatest ? p.bg : 'var(--bg-card)',
      border: `1px solid ${isLatest ? p.border : 'var(--border)'}`,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      opacity: ann.is_archived ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {isLatest && !ann.is_archived && (
              <span style={{
                background: 'var(--accent)', color: 'white', fontSize: 10,
                padding: '2px 8px', borderRadius: 9999, fontWeight: 700,
              }}>LATEST</span>
            )}
            <span style={{
              background: p.bg, color: p.color, fontSize: 11,
              padding: '2px 8px', borderRadius: 9999, fontWeight: 600,
              border: `1px solid ${p.border}`,
            }}>
              {ann.priority === 'urgent' ? '🚨' : ann.priority === 'important' ? '⚠️' : '📢'} {p.label}
            </span>
            {ann.is_archived && (
              <span className="badge badge-default">Archived</span>
            )}
          </div>
          <div
            style={{ fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 4 }}
            onClick={() => setExpanded(!expanded)}
          >
            {ann.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {ann.created_by_name && `By ${ann.created_by_name} · `}
            {new Date(ann.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onArchive(ann.id)}
            >
              {ann.is_archived ? '📤 Unarchive' : '📁 Archive'}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(ann.id, ann.title)}
            >🗑️</button>
          </div>
        )}
      </div>
      {expanded && (
        <div style={{
          marginTop: 12, color: 'var(--text-secondary)', fontSize: 14,
          lineHeight: 1.6, whiteSpace: 'pre-wrap',
          borderTop: '1px solid var(--border)', paddingTop: 12,
        }}>
          {ann.body}
        </div>
      )}
      {!expanded && ann.body && (
        <div
          style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
          onClick={() => setExpanded(true)}
        >
          {ann.body.slice(0, 120)}{ann.body.length > 120 ? '... ' : ''}
          {ann.body.length > 120 && <span style={{ color: 'var(--accent)' }}>Read more</span>}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { title: '', body: '', priority: 'normal' };

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { isAdmin } = useAuth();

  const load = async (archived = showArchived) => {
    setLoading(true);
    try {
      const res = await announcementsAPI.list({ archived: archived ? 'true' : 'false' });
      setAnnouncements(res.data.results || res.data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(showArchived); }, [showArchived]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    try {
      await announcementsAPI.create(form);
      toast.success('Announcement posted!');
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch {
      toast.error('Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id) => {
    try {
      await announcementsAPI.archive(id);
      toast.success('Announcement updated');
      load();
    } catch {
      toast.error('Failed to update announcement');
    }
  };

  const handleDelete = async () => {
    try {
      await announcementsAPI.delete(confirmDelete.id);
      toast.success('Announcement deleted');
      setConfirmDelete(null);
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const active = announcements.filter(a => !a.is_archived);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Announcements</div>
          <div className="page-subtitle">Company-wide announcements</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          {isAdmin() && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + New Announcement
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <div>No announcements yet</div>
          {isAdmin() && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Post Announcement</button>
          )}
        </div>
      ) : (
        <div>
          {announcements.map((ann, idx) => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              isLatest={idx === 0 && !ann.is_archived}
              onArchive={handleArchive}
              onDelete={(id, title) => setConfirmDelete({ id, title })}
              isAdmin={isAdmin()}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Announcement</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Announcement title"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Body *</label>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder="Announcement details..."
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Posting...' : '📢 Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Delete Announcement</div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Delete "<strong>{confirmDelete.title}</strong>"? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
