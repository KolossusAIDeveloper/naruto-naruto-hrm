import React, { useState, useEffect, useCallback } from 'react';
import { activityAPI } from '../services/api';

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

const ACTION_CONFIG = {
  employee_created:     { label: 'Employee Created',     category: 'create', color: 'var(--success)', bg: 'var(--success)22', icon: '👤' },
  employee_updated:     { label: 'Employee Updated',     category: 'update', color: 'var(--accent)',   bg: 'var(--accent)22',   icon: '✏️' },
  employee_deleted:     { label: 'Employee Deleted',     category: 'delete', color: 'var(--danger)',   bg: 'var(--danger)22',   icon: '🗑️' },
  leave_approved:       { label: 'Leave Approved',       category: 'create', color: 'var(--success)', bg: 'var(--success)22', icon: '✅' },
  leave_rejected:       { label: 'Leave Rejected',       category: 'delete', color: 'var(--danger)',   bg: 'var(--danger)22',   icon: '❌' },
  salary_updated:       { label: 'Salary Updated',       category: 'update', color: 'var(--accent)',   bg: 'var(--accent)22',   icon: '💰' },
  payroll_processed:    { label: 'Payroll Processed',    category: 'create', color: 'var(--success)', bg: 'var(--success)22', icon: '💵' },
  announcement_created: { label: 'Announcement Created', category: 'create', color: 'var(--success)', bg: 'var(--success)22', icon: '📢' },
  attendance_marked:    { label: 'Attendance Marked',    category: 'update', color: 'var(--accent)',   bg: 'var(--accent)22',   icon: '📋' },
};

const ROW_TINTS = {
  create: 'rgba(16,185,129,0.04)',
  update: 'rgba(99,102,241,0.04)',
  delete: 'rgba(239,68,68,0.04)',
};

const ACTION_OPTIONS = [
  { value: 'employee_created',     label: 'Employee Created' },
  { value: 'employee_updated',     label: 'Employee Updated' },
  { value: 'employee_deleted',     label: 'Employee Deleted' },
  { value: 'leave_approved',       label: 'Leave Approved' },
  { value: 'leave_rejected',       label: 'Leave Rejected' },
  { value: 'salary_updated',       label: 'Salary Updated' },
  { value: 'payroll_processed',    label: 'Payroll Processed' },
  { value: 'announcement_created', label: 'Announcement Created' },
  { value: 'attendance_marked',    label: 'Attendance Marked' },
];

const formatTimestamp = ts => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const inputStyle = {
  padding: '10px 14px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box'
};
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 };
const btnPrimary = {
  padding: '10px 20px', background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600
};
const btnSecondary = {
  padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 14
};

const PAGE_SIZE = 20;

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionType, setActionType] = useState('');
  // Applied filters (only updated on search)
  const [appliedFilters, setAppliedFilters] = useState({ start_date: '', end_date: '', action_type: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (appliedFilters.start_date) params.start_date = appliedFilters.start_date;
      if (appliedFilters.end_date) params.end_date = appliedFilters.end_date;
      if (appliedFilters.action_type) params.action_type = appliedFilters.action_type;
      const res = await activityAPI.list(params);
      const data = res.data;
      if (data.results !== undefined) {
        setLogs(data.results);
        setTotal(data.count || 0);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setLogs(arr);
        setTotal(arr.length);
      }
    } catch {
      showToast('Failed to load activity logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilters = e => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({ start_date: startDate, end_date: endDate, action_type: actionType });
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActionType('');
    setPage(1);
    setAppliedFilters({ start_date: '', end_date: '', action_type: '' });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getActionMeta = type => ACTION_CONFIG[type] || { label: type || 'Unknown', category: 'update', color: 'var(--text-muted)', bg: 'var(--bg-secondary)', icon: '📌' };

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)', fontWeight: 700 }}>Activity Log</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          System-wide action history — {total} record{total !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '16px 20px', marginBottom: 20
      }}>
        <form onSubmit={applyFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={labelStyle}>From Date</label>
            <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={labelStyle}>To Date</label>
            <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <label style={labelStyle}>Action Type</label>
            <select style={{ ...inputStyle, minWidth: 200 }} value={actionType} onChange={e => setActionType(e.target.value)}>
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={btnPrimary}>Filter</button>
            <button type="button" onClick={clearFilters} style={btnSecondary}>Clear</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ margin: 0, fontSize: 15 }}>No activity logs found.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Timestamp', 'Action Type', 'Description', 'Performed By'].map(h => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)',
                      fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase',
                      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const meta = getActionMeta(log.action_type);
                  const tint = ROW_TINTS[meta.category] || 'transparent';
                  return (
                    <tr key={log.id || i} style={{
                      borderBottom: '1px solid var(--border)',
                      background: tint
                    }}>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatTimestamp(log.timestamp || log.created_at)}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 11px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`
                        }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', color: 'var(--text-secondary)', fontSize: 13, maxWidth: 420 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}
                          title={log.description}>
                          {log.description || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13 }}>
                        {log.performed_by_name || log.user_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)22',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                            }}>
                              {(log.performed_by_name || log.user_name || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {log.performed_by_name || log.user_name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>System</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                style={{ ...btnSecondary, padding: '6px 12px', fontSize: 13, opacity: page === 1 ? 0.5 : 1 }}
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...btnSecondary, padding: '6px 12px', fontSize: 13, opacity: page === 1 ? 0.5 : 1 }}
              >‹</button>
              {pageNumbers().map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '6px 12px', fontSize: 13, borderRadius: 8, cursor: 'pointer', border: 'none',
                    background: p === page ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: p === page ? '#fff' : 'var(--text-primary)', fontWeight: p === page ? 700 : 400
                  }}
                >{p}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ ...btnSecondary, padding: '6px 12px', fontSize: 13, opacity: page === totalPages ? 0.5 : 1 }}
              >›</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                style={{ ...btnSecondary, padding: '6px 12px', fontSize: 13, opacity: page === totalPages ? 0.5 : 1 }}
              >»</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
