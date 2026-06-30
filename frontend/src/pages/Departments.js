import React, { useState, useEffect, useCallback } from 'react';
import { departmentsAPI, employeesAPI } from '../services/api';
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
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    active: { label: 'Active', color: 'var(--success)' },
    on_leave: { label: 'On Leave', color: 'var(--warning)' },
    resigned: { label: 'Resigned', color: 'var(--text-muted)' },
    terminated: { label: 'Terminated', color: 'var(--danger)' },
  };
  const cfg = map[status] || { label: status, color: 'var(--text-muted)' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
      background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44`
    }}>{cfg.label}</span>
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>{title}</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4
        }}>×</button>
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

export default function Departments() {
  const { isAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [deptEmpLoading, setDeptEmpLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', head: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await departmentsAPI.list();
      setDepartments(res.data.results || res.data || []);
    } catch {
      showToast('Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeesAPI.list({ limit: 500 });
      setEmployees(res.data.results || res.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, [fetchDepartments, fetchEmployees]);

  const openAdd = () => {
    setEditDept(null);
    setForm({ name: '', description: '', head: '' });
    setShowForm(true);
  };

  const openEdit = (dept, e) => {
    e.stopPropagation();
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || '', head: dept.head ? String(dept.head) : '' });
    setShowForm(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Department name is required', 'error');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), head: form.head || null };
      if (editDept) {
        await departmentsAPI.update(editDept.id, payload);
        showToast('Department updated successfully');
      } else {
        await departmentsAPI.create(payload);
        showToast('Department created successfully');
      }
      setShowForm(false);
      fetchDepartments();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to save department', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await departmentsAPI.delete(deleteTarget.id);
      showToast('Department deleted');
      setDeleteTarget(null);
      fetchDepartments();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to delete department', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openDeptEmployees = async (dept, e) => {
    e.stopPropagation();
    setSelectedDept(dept);
    setDeptEmpLoading(true);
    setDeptEmployees([]);
    try {
      const res = await departmentsAPI.employees(dept.id);
      setDeptEmployees(res.data.results || res.data || []);
    } catch {
      showToast('Failed to load department employees', 'error');
    } finally {
      setDeptEmpLoading(false);
    }
  };

  const getHeadName = dept => {
    if (dept.head_name) return dept.head_name;
    if (dept.head) {
      const emp = employees.find(e => e.id === dept.head || String(e.id) === String(dept.head));
      if (emp) return `${emp.first_name} ${emp.last_name}`;
    }
    return 'Not assigned';
  };

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)', fontWeight: 700 }}>Departments</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {departments.length} department{departments.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {isAdmin() && (
          <button onClick={openAdd} style={btnPrimary}>
            + Add Department
          </button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div style={{
            width: 40, height: 40, border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
        </div>
      ) : departments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 80, color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <p style={{ fontSize: 16, margin: 0 }}>No departments yet. Add your first department to get started.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20
        }}>
          {departments.map(dept => (
            <div
              key={dept.id}
              onClick={e => openDeptEmployees(dept, e)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 24, cursor: 'pointer', transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: 'var(--accent)22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0
                }}>🏢</div>
                {isAdmin() && (
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => openEdit(dept, e)}
                      style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}
                    >Edit</button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(dept); }}
                      style={{ ...btnDanger, padding: '6px 12px', fontSize: 12 }}
                    >Delete</button>
                  </div>
                )}
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--text-primary)', fontWeight: 700 }}>
                {dept.name}
              </h3>
              {dept.description && (
                <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                  {dept.description}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Head:</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{getHeadName(dept)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Employees:</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                    background: 'var(--accent)22', borderRadius: 20, padding: '2px 10px'
                  }}>
                    {dept.employee_count ?? dept.headcount ?? '—'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                Click to view employees →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Department Form Modal */}
      {showForm && (
        <Modal title={editDept ? 'Edit Department' : 'Add Department'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Department Name *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering"
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this department..."
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Department Head</label>
              <select
                style={inputStyle}
                value={form.head}
                onChange={e => setForm(f => ({ ...f, head: e.target.value }))}
              >
                <option value="">-- Not assigned --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.job_title ? `— ${emp.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
              <button type="submit" style={btnPrimary} disabled={saving}>
                {saving ? 'Saving...' : editDept ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal title="Delete Department" onClose={() => setDeleteTarget(null)} width={420}>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>?
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteTarget(null)} style={btnSecondary}>Cancel</button>
            <button onClick={handleDelete} style={btnDanger} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Department'}
            </button>
          </div>
        </Modal>
      )}

      {/* Employees Side Modal */}
      {selectedDept && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end'
        }} onClick={e => e.target === e.currentTarget && setSelectedDept(null)}>
          <div style={{
            background: 'var(--bg-card)', width: '100%', maxWidth: 480, height: '100%',
            overflowY: 'auto', border: '1px solid var(--border)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>{selectedDept.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Department Employees</p>
              </div>
              <button onClick={() => setSelectedDept(null)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 22, lineHeight: 1
              }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              {deptEmpLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{
                    width: 32, height: 32, border: '3px solid var(--border)',
                    borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
              ) : deptEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No employees in this department.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {deptEmployees.map(emp => (
                    <div key={emp.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: 14, background: 'var(--bg-secondary)', borderRadius: 10,
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
                        background: 'var(--accent)22', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, color: 'var(--accent)'
                      }}>
                        {emp.profile_photo
                          ? <img src={emp.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : `${(emp.first_name || '?')[0]}${(emp.last_name || '?')[0]}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {emp.job_title || emp.role || '—'}
                        </div>
                      </div>
                      <StatusBadge status={emp.employment_status || emp.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
