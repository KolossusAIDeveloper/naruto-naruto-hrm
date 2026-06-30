import React, { useState, useEffect, useCallback } from 'react';
import { payrollAPI } from '../services/api';
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

const Modal = ({ title, onClose, children, width = 420 }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: width,
      border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>×</button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

const inputStyle = {
  padding: '10px 14px', background: 'var(--bg-secondary)',
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

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const fmtCurrency = n => {
  const num = parseFloat(n) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
};

const StatusBadge = ({ processed }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 12,
    fontSize: 12, fontWeight: 600,
    background: processed ? 'var(--success)22' : '#f59e0b22',
    color: processed ? 'var(--success)' : '#f59e0b'
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: processed ? 'var(--success)' : '#f59e0b', display: 'inline-block' }} />
    {processed ? 'Processed' : 'Pending'}
  </span>
);

export default function Payroll() {
  const { isAdmin } = useAuth();

  const today = new Date();
  const [payrollMonth, setPayrollMonth] = useState(today.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(today.getFullYear());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [editValues, setEditValues] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [generating, setGenerating] = useState(false);

  const [processTarget, setProcessTarget] = useState(null);
  const [paymentDate, setPaymentDate] = useState(today.toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.list({ month: payrollMonth, year: payrollYear, page_size: 100 });
      const data = res.data.results || res.data || [];
      setRecords(data);
      const initEdit = {};
      data.forEach(r => { initEdit[r.id] = { bonus: r.bonus ?? 0, deductions: r.deductions ?? 0 }; });
      setEditValues(initEdit);
    } catch {
      showToast('Failed to load payroll records', 'error');
    } finally {
      setLoading(false);
    }
  }, [payrollMonth, payrollYear]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const getNetPay = rec => {
    const ev = editValues[rec.id] || {};
    const base = parseFloat(rec.base_salary) || 0;
    const bonus = parseFloat(ev.bonus ?? rec.bonus) || 0;
    const deductions = parseFloat(ev.deductions ?? rec.deductions) || 0;
    return base + bonus - deductions;
  };

  const handleEditChange = (id, field, value) => {
    setEditValues(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const saveRow = async rec => {
    const ev = editValues[rec.id] || {};
    setSavingRows(prev => ({ ...prev, [rec.id]: true }));
    try {
      await payrollAPI.update(rec.id, {
        bonus: parseFloat(ev.bonus) || 0,
        deductions: parseFloat(ev.deductions) || 0,
      });
      showToast('Payroll updated');
      fetchPayroll();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setSavingRows(prev => ({ ...prev, [rec.id]: false }));
    }
  };

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      await payrollAPI.generate({ month: payrollMonth, year: payrollYear });
      showToast('Payroll generated for all active employees');
      fetchPayroll();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkProcessed = async () => {
    if (!processTarget) return;
    if (!paymentDate) return showToast('Please select a payment date', 'error');
    setProcessing(true);
    try {
      await payrollAPI.markProcessed(processTarget.id, { payment_date: paymentDate });
      showToast('Marked as processed');
      setProcessTarget(null);
      fetchPayroll();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to mark as processed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await payrollAPI.exportCSV({ month: payrollMonth, year: payrollYear });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${MONTHS[payrollMonth - 1]}_${payrollYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const empName = rec => rec.employee_name || (rec.employee ? `${rec.employee.first_name || ''} ${rec.employee.last_name || ''}`.trim() : '—');
  const deptName = rec => rec.department_name || rec.employee?.department_name || '—';
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)', fontWeight: 700 }}>Payroll</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Manage monthly payroll records</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isAdmin() && (
            <button onClick={generatePayroll} disabled={generating} style={{ ...btnPrimary, background: 'var(--success)', opacity: generating ? 0.7 : 1 }}>
              {generating ? 'Generating...' : '⚡ Generate Payroll'}
            </button>
          )}
          <button onClick={exportCSV} disabled={exporting || records.length === 0} style={{ ...btnSecondary, opacity: exporting || records.length === 0 ? 0.6 : 1 }}>
            {exporting ? 'Exporting...' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 20px', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Month:</label>
          <select style={inputStyle} value={payrollMonth} onChange={e => setPayrollMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Year:</label>
          <select style={inputStyle} value={payrollYear} onChange={e => setPayrollYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
          {records.length} record{records.length !== 1 ? 's' : ''} — {MONTHS[payrollMonth - 1]} {payrollYear}
        </span>
      </div>

      {/* Summary Cards */}
      {!loading && records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Base Salary', value: fmtCurrency(records.reduce((s, r) => s + (parseFloat(r.base_salary) || 0), 0)), color: 'var(--accent)' },
            { label: 'Total Bonuses', value: fmtCurrency(records.reduce((s, r) => s + (parseFloat(editValues[r.id]?.bonus ?? r.bonus) || 0), 0)), color: 'var(--success)' },
            { label: 'Total Deductions', value: fmtCurrency(records.reduce((s, r) => s + (parseFloat(editValues[r.id]?.deductions ?? r.deductions) || 0), 0)), color: 'var(--danger)' },
            { label: 'Total Net Pay', value: fmtCurrency(records.reduce((s, r) => s + getNetPay(r), 0)), color: '#f59e0b' },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Payroll Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
              <p style={{ margin: 0, fontSize: 15 }}>No payroll records for {MONTHS[payrollMonth - 1]} {payrollYear}.</p>
              {isAdmin() && <p style={{ margin: '8px 0 0', fontSize: 13 }}>Click "Generate Payroll" to create records for all active employees.</p>}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Employee', 'Department', 'Base Salary', 'Bonus', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => {
                  const ev = editValues[rec.id] || { bonus: rec.bonus ?? 0, deductions: rec.deductions ?? 0 };
                  const isProcessed = rec.is_processed || rec.status === 'processed';
                  const netPay = getNetPay(rec);
                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)08' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>{empName(rec)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{deptName(rec)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{fmtCurrency(rec.base_salary)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isAdmin() && !isProcessed ? (
                          <input
                            type="number" min="0" step="0.01"
                            style={{ ...inputStyle, width: 110 }}
                            value={ev.bonus ?? ''}
                            onChange={e => handleEditChange(rec.id, 'bonus', e.target.value)}
                          />
                        ) : (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtCurrency(ev.bonus ?? rec.bonus)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isAdmin() && !isProcessed ? (
                          <input
                            type="number" min="0" step="0.01"
                            style={{ ...inputStyle, width: 110 }}
                            value={ev.deductions ?? ''}
                            onChange={e => handleEditChange(rec.id, 'deductions', e.target.value)}
                          />
                        ) : (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{fmtCurrency(ev.deductions ?? rec.deductions)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 700, fontSize: 15 }}>
                        {fmtCurrency(netPay)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge processed={isProcessed} />
                        {rec.payment_date && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Paid: {new Date(rec.payment_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {isAdmin() && !isProcessed && (
                            <button
                              onClick={() => saveRow(rec)}
                              disabled={savingRows[rec.id]}
                              style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: savingRows[rec.id] ? 0.6 : 1 }}
                            >
                              {savingRows[rec.id] ? 'Saving...' : 'Save'}
                            </button>
                          )}
                          {isAdmin() && !isProcessed && (
                            <button
                              onClick={() => { setProcessTarget(rec); setPaymentDate(today.toISOString().split('T')[0]); }}
                              style={{ padding: '6px 14px', background: 'var(--success)22', color: 'var(--success)', border: '1px solid var(--success)44', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            >
                              ✓ Processed
                            </button>
                          )}
                          {isProcessed && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Finalized</span>}
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

      {/* Mark Processed Modal */}
      {processTarget && (
        <Modal title="Mark Payroll as Processed" onClose={() => setProcessTarget(null)}>
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Mark payroll as processed for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{empName(processTarget)}</strong>?
            Net pay: <strong style={{ color: '#f59e0b' }}>{fmtCurrency(getNetPay(processTarget))}</strong>
          </p>
          <div style={fieldStyle}>
            <label style={labelStyle}>Payment Date *</label>
            <input
              type="date"
              style={{ ...inputStyle, width: '100%' }}
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setProcessTarget(null)} style={btnSecondary}>Cancel</button>
            <button onClick={handleMarkProcessed} disabled={processing} style={{ ...btnPrimary, background: 'var(--success)' }}>
              {processing ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
