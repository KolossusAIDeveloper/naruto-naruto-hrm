import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI } from '../services/api';

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
const SORT_OPTIONS = [
  { value: 'first_name', label: 'Name (A-Z)' },
  { value: '-first_name', label: 'Name (Z-A)' },
  { value: '-join_date', label: 'Joined (Newest)' },
  { value: 'join_date', label: 'Joined (Oldest)' },
  { value: '-base_salary', label: 'Salary (High-Low)' },
  { value: 'base_salary', label: 'Salary (Low-High)' },
];

function toLabel(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_COLORS = {
  active: 'var(--success)',
  on_leave: 'var(--warning)',
  resigned: 'var(--text-muted)',
  terminated: 'var(--danger)',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ employee, size = 52 }) {
  const API_URL = process.env.REACT_APP_API_URL || '';
  if (employee.profile_photo) {
    return (
      <img
        src={`${API_URL}${employee.profile_photo}`}
        alt={employee.full_name || `${employee.first_name} ${employee.last_name}`}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }
  const initials = [employee.first_name?.[0], employee.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#6c63ff33',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, color: '#6c63ff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeCard({ employee, onClick }) {
  return (
    <div
      className="emp-card"
      onClick={() => onClick(employee.id)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        transition: 'border-color 0.18s, transform 0.12s',
        textAlign: 'center',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <Avatar employee={employee} size={60} />
      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
        {employee.full_name || `${employee.first_name} ${employee.last_name}`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{employee.job_title || '—'}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {employee.department_name && (
          <span style={{
            background: '#6c63ff22', color: '#a5b4fc', border: '1px solid #6c63ff55',
            borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
          }}>
            {employee.department_name}
          </span>
        )}
        <span style={{
          background: STATUS_COLORS[employee.employment_status] + '22',
          color: STATUS_COLORS[employee.employment_status],
          border: `1px solid ${STATUS_COLORS[employee.employment_status]}55`,
          borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
        }}>
          {toLabel(employee.employment_status)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{employee.employee_id}</div>
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

// ─── Employee Form Modal ──────────────────────────────────────────────────────
function EmployeeModal({ open, onClose, onSuccess, departments, initial }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          first_name: initial.first_name || '',
          last_name: initial.last_name || '',
          email: initial.email || '',
          phone: initial.phone || '',
          date_of_birth: initial.date_of_birth || '',
          gender: initial.gender || '',
          address: initial.address || '',
          department: initial.department || '',
          job_title: initial.job_title || '',
          role: initial.role || 'employee',
          employment_type: initial.employment_type || 'full_time',
          employment_status: initial.employment_status || 'active',
          join_date: initial.join_date || '',
          base_salary: initial.base_salary || '',
          emergency_contact_name: initial.emergency_contact_name || '',
          emergency_contact_phone: initial.emergency_contact_phone || '',
        });
      } else {
        setForm({
          first_name: '', last_name: '', email: '', phone: '',
          date_of_birth: '', gender: '', address: '',
          department: '', job_title: '', role: 'employee',
          employment_type: 'full_time', employment_status: 'active',
          join_date: '', base_salary: '',
          emergency_contact_name: '', emergency_contact_phone: '',
        });
      }
      setPhoto(null);
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      if (photo) fd.append('profile_photo', photo);
      if (isEdit) await employeesAPI.update(initial.id, fd);
      else await employeesAPI.create(fd);
      onSuccess(isEdit ? 'Employee updated successfully' : 'Employee added successfully');
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save employee';
      onSuccess(null, msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        width: '100%', maxWidth: 720,
        maxHeight: '90vh', overflowY: 'auto',
        padding: '28px 30px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Employee' : 'Add Employee'}
          </h2>
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
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="email@company.com" />
            </Field>
            <Field label="Phone" half>
              <input style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 99999 99999" />
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
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full address" />
            </Field>

            <Field label="Department" half>
              <select style={inputStyle} value={form.department} onChange={(e) => set('department', e.target.value)}>
                <option value="">— Select Department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Job Title" half>
              <input style={inputStyle} value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="e.g. Software Engineer" />
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

            <Field label="Base Salary (₹)" half>
              <input style={inputStyle} type="number" value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </Field>

            <Field label="Emergency Contact Name" half>
              <input style={inputStyle} value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Emergency Contact Phone" half>
              <input style={inputStyle} value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} placeholder="+91 99999 99999" />
            </Field>

            <Field label="Profile Photo">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ ...inputStyle, padding: '7px 10px' }}
                onChange={(e) => setPhoto(e.target.files[0] || null)}
              />
              {isEdit && initial?.profile_photo && !photo && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Current photo will be kept if no new file chosen.</span>
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
              {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employees Page ───────────────────────────────────────────────────────────
export default function Employees() {
  const navigate = useNavigate();
  const { toasts, add: addToast, remove } = useToast();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sort, setSort] = useState('first_name');

  const [modalOpen, setModalOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        ordering: sort,
      };
      if (search) params.search = search;
      if (filterDept) params.department = filterDept;
      if (filterStatus) params.employment_status = filterStatus;
      if (filterType) params.employment_type = filterType;

      const res = await employeesAPI.list(params);
      const data = res.data;
      if (data.results !== undefined) {
        setEmployees(data.results);
        setTotal(data.count || 0);
      } else {
        setEmployees(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      addToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, filterDept, filterStatus, filterType, addToast]);

  useEffect(() => {
    departmentsAPI.list({ page_size: 100 }).then((res) => {
      const data = res.data;
      setDepartments(data.results ?? (Array.isArray(data) ? data : []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterDept, filterStatus, filterType, sort]);

  const handleModalSuccess = (successMsg, errorMsg) => {
    if (errorMsg) { addToast(errorMsg, 'error'); return; }
    addToast(successMsg, 'success');
    setModalOpen(false);
    fetchEmployees();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>
      <Toast toasts={toasts} remove={remove} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Employees <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>({total})</span>
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
            fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + Add Employee
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
      }}>
        <input
          style={{ ...inputStyle, maxWidth: 220, flex: '1 1 160px' }}
          placeholder="Search name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, maxWidth: 180, flex: '1 1 130px' }}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          style={{ ...inputStyle, maxWidth: 160, flex: '1 1 120px' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {EMP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{toLabel(s)}</option>)}
        </select>
        <select
          style={{ ...inputStyle, maxWidth: 160, flex: '1 1 120px' }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {EMP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{toLabel(t)}</option>)}
        </select>
        <select
          style={{ ...inputStyle, maxWidth: 180, flex: '1 1 130px' }}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 16 }}>Loading employees…</div>
      ) : employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 16 }}>No employees found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {employees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} onClick={(id) => navigate(`/employees/${id}`)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.4 : 1, fontWeight: 500,
            }}
          >
            ← Prev
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.4 : 1, fontWeight: 500,
            }}
          >
            Next →
          </button>
        </div>
      )}

      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        departments={departments}
        initial={null}
      />
    </div>
  );
}

// Export inputStyle so EmployeeProfile can share styles
export { inputStyle };
