import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesAPI, leavesAPI, departmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            background: t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--success)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 500,
            minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const remove = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, add, remove };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'];
const ROLE_OPTIONS = ['admin', 'manager', 'employee'];
const EMP_TYPE_OPTIONS = ['full_time', 'part_time', 'contract'];
const EMP_STATUS_OPTIONS = ['active', 'on_leave', 'resigned', 'terminated'];

const STATUS_COLORS = {
  active: 'var(--success)',
  on_leave: 'var(--warning)',
  resigned: 'var(--text-muted)',
  terminated: 'var(--danger)',
};

const LEAVE_TYPE_LABELS = {
  sick_leave: 'Sick Leave',
  casual_leave: 'Casual Leave',
  annual_leave: 'Annual Leave',
  maternity_leave: 'Maternity Leave',
  paternity_leave: 'Paternity Leave',
  unpaid_leave: 'Unpaid Leave',
};

function toLabel(s) {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ employee, size = 90 }) {
  const API_URL = process.env.REACT_APP_API_URL || '';
  const initials = [employee.first_name?.[0], employee.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const [imgFailed, setImgFailed] = useState(false);

  if (employee.profile_photo && !imgFailed) {
    return (
      <img
        src={`${API_URL}${employee.profile_photo}`}
        alt={employee.full_name || initials}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid var(--border)' }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#6c63ff33',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, color: '#6c63ff', flexShrink: 0,
      border: '3px solid var(--border)',
    }}>
      {initials}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '11px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ width: 190, flexShrink: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({ label, children, half }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ open, onClose, onSuccess, departments, employee, isAdmin }) {
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && employee) {
      setForm({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        date_of_birth: employee.date_of_birth || '',
        gender: employee.gender || '',
        address: employee.address || '',
        department: employee.department || '',
        job_title: employee.job_title || '',
        role: employee.role || 'employee',
        employment_type: employee.employment_type || 'full_time',
        employment_status: employee.employment_status || 'active',
        join_date: employee.join_date || '',
        base_salary: employee.base_salary || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
      });
      setPhoto(null);
    }
  }, [open, employee]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'base_salary' && !isAdmin) return; // managers can't edit salary
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      if (photo) fd.append('profile_photo', photo);
      await employeesAPI.update(employee.id, fd);
      onSuccess('Employee updated successfully');
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update employee';
      onSuccess(null, msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
        width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', padding: '28px 30px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Employee</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px', marginBottom: 24 }}>
            <Field label="First Name" half>
              <input style={inputStyle} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required placeholder="First name" />
            </Field>
            <Field label="Last Name" half>
              <input style={inputStyle} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required placeholder="Last name" />
            </Field>
            <Field label="Email" half>
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </Field>
            <Field label="Phone" half>
              <input style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Date of Birth" half>
              <input style={inputStyle} type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
            </Field>
            <Field label="Gender" half>
              <select style={inputStyle} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">— Select —</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{toLabel(g)}</option>)}
              </select>
            </Field>
            <Field label="Address">
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Department" half>
              <select style={inputStyle} value={form.department} onChange={(e) => set('department', e.target.value)}>
                <option value="">— Select Department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Job Title" half>
              <input style={inputStyle} value={form.job_title} onChange={(e) => set('job_title', e.target.value)} />
            </Field>
            <Field label="Role" half>
              <select style={inputStyle} value={form.role} onChange={(e) => set('role', e.target.value)}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{toLabel(r)}</option>)}
              </select>
            </Field>
            <Field label="Employment Type" half>
              <select style={inputStyle} value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
                {EMP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{toLabel(t)}</option>)}
              </select>
            </Field>
            <Field label="Employment Status" half>
              <select style={inputStyle} value={form.employment_status} onChange={(e) => set('employment_status', e.target.value)}>
                {EMP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{toLabel(s)}</option>)}
              </select>
            </Field>
            <Field label="Join Date" half>
              <input style={inputStyle} type="date" value={form.join_date} onChange={(e) => set('join_date', e.target.value)} />
            </Field>
            {isAdmin && (
              <Field label="Base Salary (₹)" half>
                <input style={inputStyle} type="number" value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} min="0" step="0.01" />
              </Field>
            )}
            <Field label="Emergency Contact Name" half>
              <input style={inputStyle} value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
            </Field>
            <Field label="Emergency Contact Phone" half>
              <input style={inputStyle} value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} />
            </Field>
            <Field label="Profile Photo">
              <input type="file" accept="image/*" style={{ ...inputStyle, padding: '7px 10px' }} onChange={(e) => setPhoto(e.target.files[0] || null)} />
              {employee?.profile_photo && !photo && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Current photo kept unless a new file is chosen.</span>
              )}
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 22px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600,
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: '9px 22px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600, opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving…' : 'Update Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────
function ConfirmDialog({ open, message, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '28px 30px', maxWidth: 400, width: '100%',
      }}>
        <div style={{ fontSize: 20, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Confirm Delete</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600,
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '8px 20px', borderRadius: 7, border: 'none',
            background: 'var(--danger)', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Leave Balances Tab ───────────────────────────────────────────────────────
function LeaveBalancesTab({ employeeId }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    leavesAPI.balances({ employee: employeeId })
      .then((res) => {
        const data = res.data;
        setBalances(data.results ?? (Array.isArray(data) ? data : []));
      })
      .catch(() => setError('Failed to load leave balances.'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: 24 }}>{error}</div>;
  if (balances.length === 0) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>No leave balance data available.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {['Leave Type', 'Allowed Days', 'Used Days', 'Remaining'].map((h) => (
              <th key={h} style={{
                textAlign: 'left', padding: '10px 14px', background: 'var(--bg-secondary)',
                color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {balances.map((b, i) => {
            const remaining = (b.allowed_days || 0) - (b.used_days || 0);
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '11px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {LEAVE_TYPE_LABELS[b.leave_type] || toLabel(b.leave_type)}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{b.allowed_days ?? '—'}</td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{b.used_days ?? 0}</td>
                <td style={{ padding: '11px 14px', fontWeight: 600, color: remaining > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {remaining}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        borderRadius: 7,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ─── Employee Profile ─────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toasts, add: addToast, remove } = useToast();

  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeesAPI.get(id);
      setEmployee(res.data);
    } catch {
      addToast('Failed to load employee', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchEmployee();
    departmentsAPI.list({ page_size: 100 }).then((res) => {
      const data = res.data;
      setDepartments(data.results ?? (Array.isArray(data) ? data : []));
    }).catch(() => {});
  }, [fetchEmployee]);

  const handleEditSuccess = (successMsg, errorMsg) => {
    if (errorMsg) { addToast(errorMsg, 'error'); return; }
    addToast(successMsg, 'success');
    setEditOpen(false);
    fetchEmployee();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await employeesAPI.delete(id);
      addToast('Employee deleted successfully', 'success');
      setTimeout(() => navigate('/employees'), 1000);
    } catch {
      addToast('Failed to delete employee', 'error');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 16 }}>
        Loading employee…
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ padding: '40px 28px', color: 'var(--text-muted)', textAlign: 'center' }}>
        <div style={{ fontSize: 18, marginBottom: 12 }}>Employee not found.</div>
        <button onClick={() => navigate('/employees')} style={{
          padding: '8px 20px', borderRadius: 7, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600,
        }}>← Back to Employees</button>
      </div>
    );
  }

  const fullName = employee.full_name || `${employee.first_name} ${employee.last_name}`;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <Toast toasts={toasts} remove={remove} />

      {/* Back button */}
      <button
        onClick={() => navigate('/employees')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: 14, fontWeight: 500, marginBottom: 20, padding: 0,
        }}
      >
        ← Back to Employees
      </button>

      {/* Profile Header */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '28px 30px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <Avatar employee={employee} size={90} />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{fullName}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>{employee.job_title || '—'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {employee.department_name && (
              <span style={{
                background: '#6c63ff22', color: '#a5b4fc', border: '1px solid #6c63ff55',
                borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
              }}>
                {employee.department_name}
              </span>
            )}
            <span style={{
              background: (STATUS_COLORS[employee.employment_status] || 'var(--text-muted)') + '22',
              color: STATUS_COLORS[employee.employment_status] || 'var(--text-muted)',
              border: `1px solid ${(STATUS_COLORS[employee.employment_status] || 'var(--border)')}55`,
              borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
            }}>
              {toLabel(employee.employment_status)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>ID: {employee.employee_id}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setEditOpen(true)}
            style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            ✏️ Edit
          </button>
          {isAdmin() && (
            <button
              onClick={() => setDeleteOpen(true)}
              style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: 6,
      }}>
        {[
          { key: 'personal', label: 'Personal Info' },
          { key: 'employment', label: 'Employment Details' },
          { key: 'emergency', label: 'Emergency Contact' },
          { key: 'leave', label: 'Leave Balances' },
        ].map((tab) => (
          <TabBtn key={tab.key} label={tab.label} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px',
      }}>
        {activeTab === 'personal' && (
          <div>
            <InfoRow label="Full Name" value={fullName} />
            <InfoRow label="Date of Birth" value={fmtDate(employee.date_of_birth)} />
            <InfoRow label="Gender" value={toLabel(employee.gender)} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Address" value={employee.address} />
          </div>
        )}

        {activeTab === 'employment' && (
          <div>
            <InfoRow label="Employee ID" value={employee.employee_id} />
            <InfoRow label="Department" value={employee.department_name} />
            <InfoRow label="Job Title" value={employee.job_title} />
            <InfoRow label="Role" value={toLabel(employee.role)} />
            <InfoRow label="Employment Type" value={toLabel(employee.employment_type)} />
            <InfoRow label="Employment Status" value={toLabel(employee.employment_status)} />
            <InfoRow label="Join Date" value={fmtDate(employee.join_date)} />
            {isAdmin() && (
              <InfoRow label="Base Salary" value={fmtCurrency(employee.base_salary)} />
            )}
          </div>
        )}

        {activeTab === 'emergency' && (
          <div>
            <InfoRow label="Contact Name" value={employee.emergency_contact_name} />
            <InfoRow label="Contact Phone" value={employee.emergency_contact_phone} />
          </div>
        )}

        {activeTab === 'leave' && (
          <LeaveBalancesTab employeeId={id} />
        )}
      </div>

      {/* Edit Modal */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={handleEditSuccess}
        departments={departments}
        employee={employee}
        isAdmin={isAdmin()}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        message={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </div>
  );
}
