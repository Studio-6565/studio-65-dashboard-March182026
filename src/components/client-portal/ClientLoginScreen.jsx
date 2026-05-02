import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Key, ArrowRight, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function ClientLoginScreen({ onLogin }) {
  const urlCode = new URLSearchParams(window.location.search).get('code') || '';
  const [mode, setMode] = useState(urlCode ? 'code' : 'email');
  const [password, setPassword] = useState(urlCode);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpStore, setOtpStore] = useState(null);
  const [pendingContact, setPendingContact] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-submit if code is in URL
  useEffect(() => {
    if (urlCode) handleCodeSubmit(null, urlCode);
  }, []);

  const handleCodeSubmit = async (e, code) => {
    if (e) e.preventDefault();
    const val = code || password.trim();
    if (!val) return;
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('portalAuth', { action: 'client_login_by_code', portal_password: val });
      onLogin(res.data.contact, res.data.projects || [], res.data.messages || [], res.data.contracts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid access code. Contact Studio 65.');
    }
    setLoading(false);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('portalAuth', { action: 'client_check_email', email: email.trim().toLowerCase() });
      const c = res.data.contact;
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Date.now() + 10 * 60 * 1000;
      setOtpStore({ code, expires });
      setPendingContact(c);
      await base44.integrations.Core.SendEmail({
        to: email.trim().toLowerCase(),
        subject: 'Your Studio 65 Client Portal Code',
        body: `Hi ${c.name},\n\nYour one-time login code for the Studio 65 Client Portal is:\n\n${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\n— Studio 65 Production`,
      });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Email not found. Contact Studio 65 to get portal access.');
    }
    setLoading(false);
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setError('');
    if (!otpStore || Date.now() > otpStore.expires) {
      setError('Code expired. Please request a new one.');
      setOtpSent(false); setOtpStore(null); setOtp('');
      return;
    }
    if (otp.trim() !== otpStore.code) {
      setError('Incorrect code. Please try again.');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('portalAuth', { action: 'client_login_by_otp', email: pendingContact.email });
      onLogin(res.data.contact, res.data.projects || [], res.data.messages || [], res.data.contracts || []);
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  const inputStyle = {
    background: '#111', border: '1px solid #252525', borderRadius: 12,
    padding: '14px 16px', color: '#fff', fontSize: 15, outline: 'none',
    width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const btnPrimary = {
    width: '100%', padding: '15px 0', background: '#E81A1A', border: 'none',
    borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <img
            src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png"
            alt="Studio 65"
            style={{ height: 56, display: 'block', margin: '0 auto 16px' }}
          />
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Client Portal</div>
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>Your private workspace with Studio 65</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#111', borderRadius: 12, padding: 4, marginBottom: 24, border: '1px solid #1A1A1A' }}>
          {[{ key: 'email', label: 'Email Login', Icon: Mail }, { key: 'code', label: 'Access Code', Icon: Key }].map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setError(''); setOtpSent(false); }} style={{
              flex: 1, padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: 'none',
              background: mode === m.key ? '#E81A1A' : 'transparent',
              color: mode === m.key ? '#fff' : '#444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}>
              <m.Icon size={14} strokeWidth={2} />
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 20, padding: 28 }}>

          {/* Email mode: step 1 */}
          {mode === 'email' && !otpSent && (
            <form onSubmit={handleEmailSubmit}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Email Address</div>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoFocus
                style={{ ...inputStyle, marginBottom: 16 }}
              />
              {error && <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
              <button type="submit" disabled={loading || !email.trim()} style={{ ...btnPrimary, opacity: (loading || !email.trim()) ? 0.6 : 1 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Sending code...' : 'Send Login Code'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          {/* Email mode: step 2 — verify OTP */}
          {mode === 'email' && otpSent && (
            <form onSubmit={handleOtpVerify}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Mail size={24} color="#E81A1A" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Check your inbox</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                  We sent a 6-digit code to<br />
                  <span style={{ color: '#4A9EFF' }}>{email}</span>
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>6-Digit Code</div>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" autoFocus
                style={{ ...inputStyle, letterSpacing: '0.4em', textAlign: 'center', fontSize: 22, marginBottom: 16 }}
              />
              {error && <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
              <button type="submit" disabled={loading || otp.length < 6} style={{ ...btnPrimary, opacity: (loading || otp.length < 6) ? 0.6 : 1 }}>
                {loading ? 'Verifying...' : 'Enter Portal'}
                {!loading && <ArrowRight size={16} />}
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} style={{ width: '100%', marginTop: 12, padding: '10px 0', background: 'transparent', border: 'none', color: '#444', fontSize: 13, cursor: 'pointer' }}>
                ← Back
              </button>
            </form>
          )}

          {/* Code mode */}
          {mode === 'code' && (
            <form onSubmit={handleCodeSubmit}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Access Code</div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your personal access code" autoFocus
                style={{ ...inputStyle, letterSpacing: '0.1em', marginBottom: 16 }}
              />
              {error && <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
              <button type="submit" disabled={loading || !password.trim()} style={{ ...btnPrimary, opacity: (loading || !password.trim()) ? 0.6 : 1 }}>
                {loading ? <Loader2 size={18} /> : null}
                {loading ? 'Loading...' : 'Enter Portal'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#2A2A2A', lineHeight: 1.6 }}>
          No access? Reach out to Studio 65 to get set up.
        </div>
      </div>
    </div>
  );
}