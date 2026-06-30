import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { employeesAPI, leavesAPI, announcementsAPI } from '../services/api';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEAVE_TYPE_LABELS = {
  sick_leave: 'Sick Leave',
  casual_leave: 'Casual Leave',
  annual_leave: 'Annual Leave',
  maternity_leave: 'Maternity Leave',
  paternity_leave: 'Paternity Leave',
  unpaid_leave: 'Unpaid Leave',
};

const EMP_TYPE_LABELS = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
};

const PIE_COLORS = ['#6c63ff', '#38bdf8', '#4ade80', '#fb923c', '#f472b6', '#facc15'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmtMonthLabel(m) {
  // m = "2024-01"
  const [y, mo] = m.split('-');
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '22px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 22px',
      ...style,
    }}>
      {title && <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>}
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || 'var(--accent)', fontWeight: 600 }}>{p.value}</div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toasts, add: addToast, remove } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, annRes] = await Promise.all([
        employeesAPI.stats(),
        announcementsAPI.list({ ordering: '-created_at', limit: 5 }),
      ]);
      setStats(statsRes.data);
      const annData = annRes.data?.results ?? annRes.data ?? [];
      setAnnouncements(Array.isArray(annData) ? annData : []);
    } catch (err) {
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLeaveAction = useCallback(async (id, action) => {
    try {
      if (action === 'approve') await leavesAPI.approve(id, {});
      else await leavesAPI.reject(id, {});
      addToast(`Leave request ${action}d successfully`, 'success');
      loadData();
    } catch {
      addToast(`Failed to ${action} leave request`, 'error');
    }
  }, [addToast, loadData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 18 }}>
        Loading dashboard…
      </div>
    );
  }

  const departmentData = (stats?.department_headcount || []).map((d) => ({ name: d.name, count: d.count }));
  const pieData = (stats?.employment_type_breakdown || []).map((d) => ({
    name: EMP_TYPE_LABELS[d.employment_type] || d.employment_type,
    value: d.count,
  }));
  const trendData = (stats?.monthly_joining_trend || []).map((d) => ({
    month: fmtMonthLabel(d.month),
    count: d.count,
  }));
  const pendingLeaves = stats?.recent_pending_leaves || [];
  const birthdays = stats?.upcoming_birthdays || [];

  // Latest non-archived announcement
  const latestAnn = announcements.find((a) => !a.is_archived) || null;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>
      <Toast toasts={toasts} remove={remove} />

      <h1 style={{ margin: '0 0 24px 0', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard</h1>

      {/* Announcement Banner */}
      {latestAnn && (
        <div style={{
          marginBottom: 24,
          borderRadius: 10,
          padding: '14px 20px',
          background: latestAnn.priority === 'urgent' ? '#7f1d1d44' : latestAnn.priority === 'important' ? '#78350f44' : 'var(--bg-card)',
          border: `1px solid ${latestAnn.priority === 'urgent' ? 'var(--danger)' : latestAnn.priority === 'important' ? 'var(--warning)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>
            {latestAnn.priority === 'urgent' ? '🚨' : latestAnn.priority === 'important' ? '⚠️' : '📢'}
          </span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{latestAnn.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{latestAnn.body}</div>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            color: latestAnn.priority === 'urgent' ? 'var(--danger)' : latestAnn.priority === 'important' ? 'var(--warning)' : 'var(--text-muted)',
            whiteSpace: 'nowrap', paddingTop: 2,
          }}>
            {latestAnn.priority}
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Employees" value={stats?.total_employees} icon="👥" color="#6c63ff" />
        <StatCard label="Active Employees" value={stats?.active_employees} icon="✅" color="#4ade80" />
        <StatCard label="On Leave" value={stats?.on_leave} icon="🏖️" color="#fb923c" />
        <StatCard label="New Joiners This Month" value={stats?.new_joiners_this_month} icon="🆕" color="#38bdf8" />
      </div>

      {/* Birthdays */}
      {birthdays.length > 0 && (
        <SectionCard title="🎂 Upcoming Birthdays (Next 7 Days)" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {birthdays.map((b) => (
              <div key={b.id} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minWidth: 180,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#6c63ff33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15, color: '#6c63ff', flexShrink: 0,
                }}>
                  {b.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{b.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {b.department_name} · {fmtDate(b.date_of_birth)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Department Headcount Bar Chart */}
        <SectionCard title="Department Headcount">
          {departmentData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentData} margin={{ top: 4, right: 8, bottom: 32, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  stroke="var(--border)"
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6c63ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Employment Type Pie Chart */}
        <SectionCard title="Employment Type Breakdown">
          {pieData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Monthly Joining Trend */}
      <SectionCard title="Monthly Joining Trend (Last 12 Months)" style={{ marginBottom: 24 }}>
        {trendData.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: '#38bdf8', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Pending Leave Requests */}
      <SectionCard title="Recent Pending Leave Requests">
        {pendingLeaves.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No pending leave requests</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingLeaves.map((leave) => (
              <div key={leave.id} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#6c63ff33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, color: '#6c63ff', flexShrink: 0,
                }}>
                  {leave.employee_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{leave.employee_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type} · {fmtDate(leave.start_date)} – {fmtDate(leave.end_date)} · {leave.total_days} day{leave.total_days !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleLeaveAction(leave.id, 'approve')}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'var(--success)', color: '#fff', fontWeight: 600, fontSize: 13,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleLeaveAction(leave.id, 'reject')}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'var(--danger)', color: '#fff', fontWeight: 600, fontSize: 13,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
