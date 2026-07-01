import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Roboto', -apple-system, sans-serif" }}>
      {/* Left panel */}
      <div style={{
        flex: '0 0 55%',
        background: 'linear-gradient(145deg, #BF360C 0%, #E64A19 35%, #FF6D00 70%, #FF8F00 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: '30%', right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '25%', left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.3)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div style={{ color: 'white' }}>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>HRM System</div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Human Resource Management</div>
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div style={{ zIndex: 1, marginBottom: 40 }}>
          <svg width="320" height="220" viewBox="0 0 320 220" fill="none">
            {/* Desk */}
            <rect x="30" y="170" width="260" height="12" rx="6" fill="rgba(255,255,255,0.25)" />
            {/* Monitor */}
            <rect x="110" y="90" width="100" height="70" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
            <rect x="120" y="100" width="80" height="50" rx="4" fill="rgba(255,255,255,0.12)"/>
            {/* Screen content lines */}
            <rect x="128" y="108" width="50" height="4" rx="2" fill="rgba(255,255,255,0.4)"/>
            <rect x="128" y="116" width="38" height="3" rx="1.5" fill="rgba(255,255,255,0.25)"/>
            <rect x="128" y="122" width="44" height="3" rx="1.5" fill="rgba(255,255,255,0.25)"/>
            <rect x="128" y="128" width="32" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
            {/* Monitor stand */}
            <rect x="153" y="160" width="14" height="10" rx="2" fill="rgba(255,255,255,0.2)"/>
            <rect x="144" y="170" width="32" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
            {/* Person left - sitting */}
            <circle cx="70" cy="100" r="18" fill="rgba(255,255,255,0.3)"/>
            <rect x="55" y="118" width="30" height="36" rx="10" fill="rgba(255,255,255,0.2)"/>
            <rect x="42" y="130" width="20" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>
            <rect x="73" y="130" width="20" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>
            {/* Person right - standing */}
            <circle cx="250" cy="92" r="18" fill="rgba(255,255,255,0.3)"/>
            <rect x="235" y="110" width="30" height="40" rx="10" fill="rgba(255,255,255,0.2)"/>
            <rect x="220" y="122" width="18" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>
            <rect x="262" y="118" width="18" height="10" rx="4" fill="rgba(255,255,255,0.2)"/>
            {/* Chart bars in background */}
            <rect x="30" y="130" width="18" height="40" rx="4" fill="rgba(255,255,255,0.12)"/>
            <rect x="53" y="120" width="18" height="50" rx="4" fill="rgba(255,255,255,0.08)"/>
            <rect x="270" y="125" width="18" height="45" rx="4" fill="rgba(255,255,255,0.12)"/>
            <rect x="292" y="115" width="18" height="55" rx="4" fill="rgba(255,255,255,0.08)"/>
          </svg>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Manage your workforce efficiently
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 320 }}>
            Track attendance, manage leaves, run payroll — all from one platform.
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{
        flex: 1,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 56px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1D2025', marginBottom: 6 }}>Welcome Back</h2>
            <p style={{ color: '#9FA8B3', fontSize: 14 }}>Please sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5A6475', marginBottom: 7, letterSpacing: '0.01em' }}>
                Username
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: '1.5px solid #E9ECEF',
                  borderRadius: 7,
                  fontSize: 14,
                  color: '#1D2025',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                  background: '#FAFBFC',
                }}
                placeholder="Enter your username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                onFocus={e => { e.target.style.borderColor = '#EF6C00'; e.target.style.boxShadow = '0 0 0 3px rgba(239,108,0,0.12)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#E9ECEF'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFBFC'; }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#5A6475', letterSpacing: '0.01em' }}>
                  Password
                </label>
                <span style={{ fontSize: 12, color: '#EF6C00', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot Password?
                </span>
              </div>
              <input
                type="password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: '1.5px solid #E9ECEF',
                  borderRadius: 7,
                  fontSize: 14,
                  color: '#1D2025',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                  background: '#FAFBFC',
                }}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={e => { e.target.style.borderColor = '#EF6C00'; e.target.style.boxShadow = '0 0 0 3px rgba(239,108,0,0.12)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#E9ECEF'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFBFC'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#FFB74D' : '#EF6C00',
                color: 'white',
                border: 'none',
                borderRadius: 7,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                transition: 'background 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
                boxShadow: loading ? 'none' : '0 2px 10px rgba(239,108,0,0.35)',
              }}
              onMouseOver={e => { if (!loading) e.target.style.background = '#D35F00'; }}
              onMouseOut={e => { if (!loading) e.target.style.background = '#EF6C00'; }}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#C0C7D0', fontSize: 12, marginTop: 40 }}>
            © {new Date().getFullYear()} HRM System. All rights reserved.
          </p>
        </div>
      </div>

      {/* Responsive style */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="flex: 0 0 55%"] { display: none !important; }
          div[style*="flex: 1"][style*="padding: 48px 56px"] { padding: 40px 28px !important; }
        }
      `}</style>
    </div>
  );
}
