import React, { useState, useEffect } from 'react';
import { activityAPI } from '../services/api';
import toast from 'react-hot-toast';

const ACTION_LABELS = {
  employee_created: { label: 'Employee Created', color: 'badge-success', icon: '👤' },
  employee_updated: { label: 'Employee Updated', color: 'badge-info', icon: '✏️' },
  employee_deleted: { label: 'Employee Deleted', color: 'badge-danger', icon: '🗑️' },
  leave_submitted: { label: 'Leave Submitted', color: 'badge-default', icon: '📅' },
  leave_approved: { label: 'Leave Approved', color: 'badge-success', icon: '✅' },
  leave_rejected: { label: 'Leave Rejected', color: 'badge-danger', icon: '❌' },
  leave_cancelled: { label: 'Leave Cancelled', color: 'badge-warning', icon: '🚫' },
  salary_updated: { label: 'Salary Updated', color: 'badge-info', icon: '💰' },
  payroll_processed: { label: 'Payroll Processed', color: 'badge-success', icon: '💵' },
  announcement_created: { label: 'Announcement', color: 'badge-purple', icon: '📢' },
  attendance_marked: { label: 'Attendance Marked', color: 'badge-info', icon: '📋' },
  department_created: { label: 'Department Created', color: 'badge-success', icon: '🏢' },
  department_updated: { label: 'Department Updated', color: 'badge-info', icon: '🏢' },
  department_deleted: { label: 'Department Deleted', color: 'badge-danger', icon: '🏢' },
  other: { label: 'Other', color: 'badge-default', icon: '📌' },
};

const ROW_TINTS = {
  employee_created: 'rgba(16,185,129,0.04)',
  employee_deleted: 'rgba(239,68,68,0.04)',
  leave_approved: 'rgba(16,185,129,0.04)',
  leave_rejected: 'rgba(239,68,68,0.04)',
  payroll_processed: 'rgba(16,185,129,0.04)',
  department_deleted: 'rgba(239,68,68,0.04)',
};

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', action_type: '' });
  const PAGE_SIZE = 20;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: PAGE_SIZE };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.action_type) params.action_type = filters.action_type;
      const res = await activityAPI.list(params);
      setLogs(res.data.results || res.data);
      setTotal(res.data.count || (res.data.results || res.data).length);
    } catch {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Activity Log</div>
          <div className="page-subtitle">System-wide action history</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.start_date}
              onChange={e => setFilters({ ...filters, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.end_date}
              onChange={e => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Action Type</label>
            <select
              className="form-input"
              style={{ minWidth: 180 }}
              value={filters.action_type}
              onChange={e => setFilters({ ...filters, action_type: e.target.value })}
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary">🔍 Filter</button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setFilters({ start_date: '', end_date: '', action_type: '' });
                setPage(1);
                setTimeout(() => load(1), 0);
              }}
            >Clear</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div>No activity logs found</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const meta = ACTION_LABELS[log.action_type] || ACTION_LABELS.other;
                  const tint = ROW_TINTS[log.action_type];
                  return (
                    <tr key={log.id} style={tint ? { background: tint } : {}}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtTime(log.timestamp)}
                      </td>
                      <td>
                        <span className={`badge ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ maxWidth: 400, color: 'var(--text-secondary)', fontSize: 13 }}>
                        {log.description}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {log.performed_by_name || (
                          <span style={{ color: 'var(--text-muted)' }}>System</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
