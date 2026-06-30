import React, { useState, useEffect, useCallback } from 'react';
import { attendanceAPI, employeesAPI } from '../services/api';
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

const STATUS_COLORS = {
  present: { label: 'Present', color: 'var(--success)', bg: 'var(--success)22' },
  absent: { label: 'Absent', color: 'var(--danger)', bg: 'var(--danger)22' },
  half_day: { label: 'Half Day', color: '#f59e0b', bg: '#f59e0b22' },
  work_from_home: { label: 'WFH', color: 'var(--accent)', bg: 'var(--accent)22' },
};

const StatusDot = ({ status }) => {
  const cfg = STATUS_COLORS[status];
  if (!cfg) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
};

const todayStr = () => new Date().toISOString().split('T')[0];
const monthStr = () => {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
};

const inputStyle = {
  padding: '10px 14px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box'
};
const btnPrimary = {
  padding: '10px 20px', background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600
};
const btnSecondary = {
  padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 14
};

export default function Attendance() {
  const { isAdmin, isManager } = useAuth();
  const canEdit = isAdmin() || isManager();

  const [activeTab, setActiveTab] = useState('daily');
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // Daily View state
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState({}); // { empId: { status, note, id } }
  const [savingRows, setSavingRows] = useState({});
  const [dailyLoading, setDailyLoading] = useState(false);
  const [bulkMarking, setBulkMarking] = useState(false);

  // Monthly Report state
  const [reportMonth, setReportMonth] = useState(monthStr().month);
  const [reportYear, setReportYear] = useState(monthStr().year);
  const [report, setReport] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeesAPI.list({ limit: 500, employment_status: 'active' });
      setEmployees(res.data.results || res.data || []);
    } catch {}
  }, []);

  const fetchDailyAttendance = useCallback(async () => {
    setDailyLoading(true);
    try {
      const res = await attendanceAPI.daily({ date: selectedDate });
      const data = res.data.results || res.data || [];
      const map = {};
      data.forEach(r => {
        const empId = r.employee?.id || r.employee;
        map[empId] = { status: r.status, note: r.note || '', id: r.id };
      });
      setRecords(map);
    } catch {
      showToast('Failed to load attendance records', 'error');
    } finally {
      setDailyLoading(false);
    }
  }, [selectedDate]);

  const fetchMonthlyReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await attendanceAPI.monthlyReport({ month: reportMonth, year: reportYear });
      setReport(res.data.results || res.data || []);
    } catch {
      showToast('Failed to load monthly report', 'error');
    } finally {
      setReportLoading(false);
    }
  }, [reportMonth, reportYear]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { if (activeTab === 'daily') fetchDailyAttendance(); }, [activeTab, fetchDailyAttendance]);
  useEffect(() => { if (activeTab === 'monthly') fetchMonthlyReport(); }, [activeTab, fetchMonthlyReport]);

  const updateRecord = (empId, field, value) => {
    setRecords(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || { status: '', note: '', id: null }), [field]: value }
    }));
  };

  const saveRow = async empId => {
    const rec = records[empId] || {};
    if (!rec.status) return showToast('Please select a status', 'error');
    setSavingRows(prev => ({ ...prev, [empId]: true }));
    try {
      await attendanceAPI.mark({
        employee: empId,
        date: selectedDate,
        status: rec.status,
        note: rec.note || '',
      });
      showToast('Attendance saved');
      fetchDailyAttendance();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to save attendance', 'error');
    } finally {
      setSavingRows(prev => ({ ...prev, [empId]: false }));
    }
  };

  const bulkMarkPresent = async () => {
    setBulkMarking(true);
    try {
      await attendanceAPI.bulkMark({
        date: selectedDate,
        status: 'present',
        employee_ids: employees.map(e => e.id),
      });
      showToast(`Marked ${employees.length} employees as Present`);
      fetchDailyAttendance();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Bulk mark failed', 'error');
    } finally {
      setBulkMarking(false);
    }
  };

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)', fontWeight: 700 }}>Attendance</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Track and manage employee attendance</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[{ key: 'daily', label: 'Daily View' }, { key: 'monthly', label: 'Monthly Report' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Daily View */}
      {activeTab === 'daily' && (
        <div>
          {/* Controls */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Date:</label>
              <input
                type="date"
                style={inputStyle}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            {canEdit && (
              <button onClick={bulkMarkPresent} disabled={bulkMarking || employees.length === 0} style={{ ...btnPrimary, background: 'var(--success)', opacity: bulkMarking ? 0.7 : 1 }}>
                {bulkMarking ? 'Marking...' : '✓ Bulk Mark Present'}
              </button>
            )}
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
              {employees.length} active employees
            </span>
          </div>

          {/* Daily Table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              {dailyLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : employees.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active employees found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Employee</th>
                      <th style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Department</th>
                      <th style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', minWidth: 340 }}>Status</th>
                      <th style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', minWidth: 180 }}>Note</th>
                      {canEdit && <th style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => {
                      const rec = records[emp.id] || { status: '', note: '' };
                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)08' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)22',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, overflow: 'hidden'
                              }}>
                                {emp.profile_photo
                                  ? <img src={emp.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : `${(emp.first_name || '?')[0]}${(emp.last_name || '?')[0]}`}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.first_name} {emp.last_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.employee_id || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                            {emp.department_name || emp.department || '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {canEdit ? (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
                                  <label key={key} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                                    padding: '5px 11px', borderRadius: 8,
                                    border: `1px solid ${rec.status === key ? cfg.color : 'var(--border)'}`,
                                    background: rec.status === key ? cfg.bg : 'transparent',
                                    color: rec.status === key ? cfg.color : 'var(--text-muted)',
                                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s'
                                  }}>
                                    <input
                                      type="radio"
                                      name={`status-${emp.id}`}
                                      value={key}
                                      checked={rec.status === key}
                                      onChange={() => updateRecord(emp.id, 'status', key)}
                                      style={{ display: 'none' }}
                                    />
                                    {cfg.label}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <StatusDot status={rec.status} />
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {canEdit ? (
                              <input
                                style={{ ...inputStyle, width: 170 }}
                                placeholder="Add note..."
                                value={rec.note || ''}
                                onChange={e => updateRecord(emp.id, 'note', e.target.value)}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{rec.note || '—'}</span>
                            )}
                          </td>
                          {canEdit && (
                            <td style={{ padding: '12px 16px' }}>
                              <button
                                onClick={() => saveRow(emp.id)}
                                disabled={savingRows[emp.id] || !rec.status}
                                style={{
                                  ...btnPrimary, padding: '7px 16px', fontSize: 13,
                                  opacity: savingRows[emp.id] || !rec.status ? 0.6 : 1
                                }}
                              >
                                {savingRows[emp.id] ? 'Saving...' : 'Save'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report */}
      {activeTab === 'monthly' && (
        <div>
          {/* Month/Year Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Month:</label>
              <select style={inputStyle} value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Year:</label>
              <select style={inputStyle} value={reportYear} onChange={e => setReportYear(parseInt(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>
              Employees below 80% attendance highlighted in red
            </span>
          </div>

          {/* Monthly Table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              {reportLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : report.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No attendance data for {months[reportMonth - 1]} {reportYear}.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      {['Employee', 'Department', 'Present', 'Absent', 'Half Day', 'WFH', 'Total Days', 'Attendance %'].map(h => (
                        <th key={h} style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((row, i) => {
                      const pct = row.attendance_percentage ?? (row.total_days > 0 ? Math.round((row.present_days / row.total_days) * 100) : 0);
                      const isLow = pct < 80;
                      return (
                        <tr key={row.employee_id || i} style={{
                          borderBottom: '1px solid var(--border)',
                          background: isLow ? 'var(--danger)0e' : (i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)08')
                        }}>
                          <td style={{ padding: '12px 16px', color: isLow ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 600 }}>
                            {row.employee_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                            {row.department_name || row.department || '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{row.present_days ?? 0}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{row.absent_days ?? 0}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{row.half_days ?? 0}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{row.wfh_days ?? row.work_from_home_days ?? 0}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {row.total_days ?? 0}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', width: `${Math.min(pct, 100)}%`,
                                  background: isLow ? 'var(--danger)' : pct >= 95 ? 'var(--success)' : 'var(--accent)',
                                  borderRadius: 3, transition: 'width 0.3s'
                                }} />
                              </div>
                              <span style={{ fontWeight: 700, color: isLow ? 'var(--danger)' : 'var(--text-primary)', minWidth: 40 }}>
                                {pct}%
                              </span>
                              {isLow && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>⚠</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
