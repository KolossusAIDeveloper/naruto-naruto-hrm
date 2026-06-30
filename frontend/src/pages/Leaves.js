import React, { useState, useEffect, useCallback } from 'react';
import { leavesAPI, employeesAPI } from '../services/api';
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

const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: '#f59e0b22', color: '#f59e0b', border: '#f59e0b44' },
  approved: { label: 'Approved', bg: 'var(--success)22', color: 'var(--success)', border: 'var(--success)44' },
  rejected: { label: 'Rejected', bg: 'var(--danger)22', color: 'var(--danger)', border: 'var(--danger)44' },
  cancelled: { label: 'Cancelled', bg: '#6b728022', color: '#6b7280', border: '#6b728044' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#6b728022', color: '#6b7280', border: '#6b728044' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 11px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
    }}>{cfg.label}</span>
  );
};

const Modal = ({ title, onClose, children, width = 540 }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: width,
      border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      maxHeight: '92vh', display: 'flex', flexDirection: 'column'
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

function calcBusinessDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const leaveTypeLabel = v => LEAVE_TYPES.find(t => t.value === v)?.label || v;

export default function Leaves() {
  const { isAdmin, isManager } = useAuth();
  const canApprove = isAdmin() || isManager();

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 15;

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  // Submit Leave Modal
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ employee: '', leave_type: '', start_date: '', end_date: '', reason: '' });
  const [totalDays, setTotalDays] = useState(0);
  const [saving, setSaving] = useState(false);

  // Approve/Reject Modal
  const [actionTarget, setActionTarget] = useState(null); // { leave, action }
  const [actionComment, setActionComment] = useState('');
  const [actioning, setActioning] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeesAPI.list({ limit: 500 });
      setEmployees(res.data.results || res.data || []);
    } catch {}
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (filterEmployee) params.employee_search = filterEmployee;
      if (filterType) params.leave_type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterStart) params.start_date_after = filterStart;
      if (filterEnd) params.end_date_before = filterEnd;
      const res = await leavesAPI.list(params);
      const data = res.data;
      if (data.results !== undefined) {
        setLeaves(data.results);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
      } else {
        setLeaves(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch {
      showToast('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterEmployee, filterType, filterStatus, filterStart, filterEnd]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { setPage(1); }, [filterEmployee, filterType, filterStatus, filterStart, filterEnd]);
  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  useEffect(() => {
    setTotalDays(calcBusinessDays(form.start_date, form.end_date));
  }, [form.start_date, form.end_date]);

  const handleSubmitLeave = async e => {
    e.preventDefault();
    if (!form.employee) return showToast('Please select an employee', 'error');
    if (!form.leave_type) return showToast('Please select a leave type', 'error');
    if (!form.start_date || !form.end_date) return showToast('Please enter start and end dates', 'error');
    if (new Date(form.end_date) < new Date(form.start_date)) return showToast('End date must be after start date', 'error');
    setSaving(true);
    try {
      await leavesAPI.create({
        employee: parseInt(form.employee),
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: totalDays,
        reason: form.reason,
      });
      showToast('Leave request submitted successfully');
      setShowSubmit(false);
      setForm({ employee: '', leave_type: '', start_date: '', end_date: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to submit leave', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    setActioning(true);
    try {
      if (actionTarget.action === 'approve') {
        await leavesAPI.approve(actionTarget.leave.id, { comment: actionComment });
        showToast('Leave approved successfully');
      } else if (actionTarget.action === 'reject') {
        await leavesAPI.reject(actionTarget.leave.id, { comment: actionComment });
        showToast('Leave rejected');
      }
      setActionTarget(null);
      setActionComment('');
      fetchLeaves();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Action failed', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleCancel = async leaveId => {
    try {
      await leavesAPI.cancel(leaveId);
      showToast('Leave cancelled');
      fetchLeaves();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Cancel failed', 'error');
    }
  };

  const empName = leave => {
    if (leave.employee_name) return leave.employee_name;
    const emp = employees.find(e => e.id === (leave.employee?.id || leave.employee));
    if (emp) return `${emp.first_name} ${emp.last_name}`;
    return 'Unknown';
  };

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)', fontWeight: 700 }}>Leave Requests</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Manage employee leave requests</p>
        </div>
        <button onClick={() => { setForm({ employee: '', leave_type: '', start_date: '', end_date: '', reason: '' }); setShowSubmit(true); }} style={btnPrimary}>
          + Submit Leave
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end'
      }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={labelStyle}>Search Employee</label>
          <input style={inputStyle} placeholder="Name or ID..." value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={labelStyle}>Leave Type</label>
          <select style={inputStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={labelStyle}>From Date</label>
          <input type="date" style={inputStyle} value={filterStart} onChange={e => setFilterStart(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={labelStyle}>To Date</label>
          <input type="date" style={inputStyle} value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
        </div>
        <button onClick={() => { setFilterEmployee(''); setFilterType(''); setFilterStatus(''); setFilterStart(''); setFilterEnd(''); }} style={{ ...btnSecondary, padding: '10px 16px' }}>
          Clear
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)',
                    fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No leave requests found.
                </td></tr>
              ) : leaves.map((leave, i) => (
                <tr key={leave.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)08'
                }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{empName(leave)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{leaveTypeLabel(leave.leave_type)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatDate(leave.start_date)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatDate(leave.end_date)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {leave.total_days ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={leave.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {leave.status === 'pending' && canApprove && (
                        <>
                          <button
                            onClick={() => { setActionTarget({ leave, action: 'approve' }); setActionComment(''); }}
                            style={{ padding: '5px 12px', background: 'var(--success)22', color: 'var(--success)', border: '1px solid var(--success)44', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >Approve</button>
                          <button
                            onClick={() => { setActionTarget({ leave, action: 'reject' }); setActionComment(''); }}
                            style={{ padding: '5px 12px', background: 'var(--danger)22', color: 'var(--danger)', border: '1px solid var(--danger)44', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >Reject</button>
                        </>
                      )}
                      {leave.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(leave.id)}
                          style={{ padding: '5px 12px', background: '#6b728022', color: '#6b7280', border: '1px solid #6b728044', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >Cancel</button>
                      )}
                      {!['pending'].includes(leave.status) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnSecondary, padding: '7px 16px', opacity: page === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...btnSecondary, padding: '7px 16px', opacity: page === totalPages ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit Leave Modal */}
      {showSubmit && (
        <Modal title="Submit Leave Request" onClose={() => setShowSubmit(false)}>
          <form onSubmit={handleSubmitLeave}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Employee *</label>
              <select style={inputStyle} value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} required>
                <option value="">-- Select Employee --</option>
                {employees.filter(e => e.employment_status === 'active' || !e.employment_status).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — {emp.employee_id || emp.id}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Leave Type *</label>
              <select style={inputStyle} value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))} required>
                <option value="">-- Select Type --</option>
                {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>End Date *</label>
                <input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
              </div>
            </div>
            {(form.start_date && form.end_date) && (
              <div style={{ padding: '10px 14px', background: 'var(--accent)11', borderRadius: 8, marginBottom: 18, border: '1px solid var(--accent)33' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>
                  Total Business Days: {totalDays}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>(weekends excluded)</span>
              </div>
            )}
            <div style={fieldStyle}>
              <label style={labelStyle}>Reason</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Optional reason for leave..."
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowSubmit(false)} style={btnSecondary}>Cancel</button>
              <button type="submit" style={btnPrimary} disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Leave'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approve/Reject Modal */}
      {actionTarget && (
        <Modal
          title={actionTarget.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
          onClose={() => setActionTarget(null)}
          width={420}
        >
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
            {actionTarget.action === 'approve' ? 'Approve' : 'Reject'} leave request for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{empName(actionTarget.leave)}</strong>
            {' '}({leaveTypeLabel(actionTarget.leave.leave_type)}, {actionTarget.leave.total_days} day{actionTarget.leave.total_days !== 1 ? 's' : ''})?
          </p>
          <div style={fieldStyle}>
            <label style={labelStyle}>Comment (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={actionComment}
              onChange={e => setActionComment(e.target.value)}
              placeholder="Add a comment..."
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setActionTarget(null)} style={btnSecondary}>Cancel</button>
            <button
              onClick={handleAction}
              disabled={actioning}
              style={{
                ...btnPrimary,
                background: actionTarget.action === 'approve' ? 'var(--success)' : 'var(--danger)'
              }}
            >
              {actioning ? 'Processing...' : actionTarget.action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
