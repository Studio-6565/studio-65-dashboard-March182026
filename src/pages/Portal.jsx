import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange, STATUS_STYLE } from '@/lib/studio';
import CrewContractsTab from '@/components/portal/CrewContractsTab';
import EditorSection from '@/components/portal/EditorSection';
import { Mail, Key, Files, ChevronDown, ChevronUp, CheckSquare, Package, Fingerprint } from 'lucide-react';

const MONO = '"DM Mono", monospace';

// ── Login ──────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const urlCode = new URLSearchParams(window.location.search).get('code') || '';
  const [mode, setMode]         = useState(urlCode ? 'code' : 'email');
  const [password, setPassword] = useState(urlCode);
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [otpSent, setOtpSent]   = useState(false);
  const [pendingContact, setPendingContact] = useState(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [otpStore, setOtpStore] = useState(null); // { code, expires }
  const [bioSupported, setBioSupported] = useState(false);
  const [bioChecking, setBioChecking] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBioSupported(available))
        .catch(() => setBioSupported(false));
    }
  }, []);

  const loadContactProjects = async (c) => {
    const allProjects = await base44.entities.Project.list('-date', 200);
    const isEditor = (c.types || []).includes('Editor');
    const myProjects  = allProjects.filter(p => {
      const inCrew    = (p.crew || []).some(m => m.name.toLowerCase() === c.name.toLowerCase());
      const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === c.name.toLowerCase());
      // Editors see all projects they are assigned to as crew, OR all active projects if editor type
      return inCrew || inRentals || isEditor;
    });
    return myProjects;
  };

  // Biometric login handler
  const handleBiometricLogin = async () => {
    setBioChecking(true); setError('');
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'preferred',
        },
        mediation: 'optional',
      });
      
      if (assertion) {
        // Decode biometric identifier as email from the response
        // In a real app, this would validate against your server
        const userId = new TextDecoder().decode(assertion.id);
        const contacts = await base44.entities.Contact.filter({ email: userId });
        if (contacts.length) {
          const c = contacts[0];
          const myProjects = await loadContactProjects(c);
          onLogin(c, myProjects);
        } else {
          setError('Biometric recognized but no account found. Try email or access code.');
        }
      }
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Biometric verification cancelled.' : 'Biometric login failed. Try email or access code.');
    }
    setBioChecking(false);
  };

  // ── Code login ──
  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError('');
    try {
      const contacts = await base44.entities.Contact.filter({ portal_password: password.trim() });
      if (!contacts.length) {
        setError('Invalid code. Please check with Studio 65.');
        setLoading(false); return;
      }
      // Accept any contact regardless of type — crew, vendor, or multi-role
      const c = contacts[0];
      const myProjects = await loadContactProjects(c);
      onLogin(c, myProjects);
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  // ── Email login: step 1 — send OTP ──
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError('');
    try {
      const contacts = await base44.entities.Contact.filter({ email: email.trim().toLowerCase() });
      if (!contacts.length) {
        setError('No account found with that email. Please check with Studio 65.');
        setLoading(false); return;
      }
      const c = contacts[0];
      // Generate a 6-digit OTP
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Date.now() + 10 * 60 * 1000; // 10 min
      setOtpStore({ code, expires });
      setPendingContact(c);
      // Send OTP via email integration
      await base44.integrations.Core.SendEmail({
        to: email.trim().toLowerCase(),
        subject: 'Your Studio 65 Portal Code',
        body: `Hi ${c.name},\n\nYour one-time login code for the Studio 65 Crew Portal is:\n\n${code}\n\nThis code expires in 10 minutes.\n\n— Studio 65`,
      });
      setOtpSent(true);
    } catch (err) {
      setError('Failed to send code. Please try again.');
    }
    setLoading(false);
  };

  // ── Email login: step 2 — verify OTP ──
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
      const myProjects = await loadContactProjects(pendingContact);
      onLogin(pendingContact, myProjects);
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  const IS = { background: '#2A2A2A', border: '1px solid #444', borderRadius: 10, padding: '14px 16px', color: '#fff', fontSize: 16, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', marginBottom: 16 };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 64, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Crew Portal</div>
          <div style={{ fontSize: 16, color: '#555' }}>Your shoots, schedule & pay — all in one place</div>
        </div>

        {/* Mode toggle */}
         <div style={{ display: 'flex', gap: 0, background: '#1A1A1A', borderRadius: 10, padding: 4, marginBottom: 16 }}>
           {[...(bioSupported ? [{ key: 'bio', label: 'Thumbprint', Icon: Fingerprint }] : []), { key: 'email', label: 'Email', Icon: Mail }, { key: 'code', label: 'Access Code', Icon: Key }].map(m => (
             <button key={m.key} onClick={() => { setMode(m.key); setError(''); setOtpSent(false); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: mode === m.key ? '#E81A1A' : 'transparent', color: mode === m.key ? '#fff' : '#555', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
               <m.Icon size={14} strokeWidth={1.5} />
               {m.label}
             </button>
           ))}
         </div>

        <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 16, padding: 32 }}>
           {/* ── Biometric ── */}
           {mode === 'bio' && (
             <div style={{ textAlign: 'center' }}>
               <Fingerprint size={64} color="#E81A1A" style={{ margin: '0 auto 20px', display: 'block' }} />
               <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Use Your Thumbprint</div>
               <div style={{ fontSize: 12, color: '#555', marginBottom: 24 }}>Place your finger on the sensor to login</div>
               {error && <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
               <button onClick={handleBiometricLogin} disabled={bioChecking} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: bioChecking ? 'default' : 'pointer', opacity: bioChecking ? 0.7 : 1 }}>
                 {bioChecking ? 'Scanning...' : 'Verify Thumbprint →'}
               </button>
             </div>
           )}

           {/* ── Access Code ── */}
           {mode === 'code' && (
            <form onSubmit={handleCodeSubmit}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 10, display: 'block' }}>Access Code</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your personal code" autoFocus style={{ ...IS, letterSpacing: '0.08em' }} />
              {error && <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Loading...' : 'Enter Portal →'}
              </button>
            </form>
          )}

          {/* ── Email OTP ── */}
          {mode === 'email' && !otpSent && (
            <form onSubmit={handleEmailSubmit}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 10, display: 'block' }}>Your Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoFocus style={IS} />
              {error && <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending code...' : 'Send Login Code →'}
              </button>
            </form>
          )}

          {/* ── OTP verify ── */}
          {mode === 'email' && otpSent && (
            <form onSubmit={handleOtpVerify}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
               <Mail size={40} color="#E81A1A" style={{ margin: '0 auto 8px', display: 'block' }} />
               <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Check your email</div>
                <div style={{ fontSize: 12, color: '#555' }}>We sent a 6-digit code to <span style={{ color: '#4A9EFF' }}>{email}</span></div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 10, display: 'block' }}>6-Digit Code</label>
              <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus style={{ ...IS, letterSpacing: '0.3em', textAlign: 'center', fontSize: 22 }} />
              {error && <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>{error}</div>}
              <button type="submit" disabled={loading || otp.length < 6} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (loading || otp.length < 6) ? 0.7 : 1 }}>
                {loading ? 'Verifying...' : 'Verify & Enter Portal →'}
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} style={{ width: '100%', marginTop: 10, padding: '10px 0', background: 'transparent', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>← Back</button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#444' }}>
          No access? Contact Studio 65.
        </div>
      </div>
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────

// ── Crew Chat ─────────────────────────────────────────────────────────────

function CrewProjectChat({ project, contact }) {
  const MONO = '"DM Mono", monospace';
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    const msgs = await base44.entities.DirectMessage.filter({ project_id: project.id });
    setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    setLoaded(true);
    // mark read
    msgs.filter(m => m.from_role === 'studio' && !m.read_by_crew)
        .forEach(m => base44.entities.DirectMessage.update(m.id, { ...m, read_by_crew: true }));
  };

  useEffect(() => { load(); }, [project.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // real-time
  useEffect(() => {
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.project_id !== project.id) return;
      if (event.type === 'create') setMessages(prev => [...prev, event.data]);
    });
    return unsub;
  }, [project.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = await base44.entities.DirectMessage.create({
      project_id: project.id,
      project_name: project.name,
      from_name: contact.name,
      from_role: 'crew',
      body: input.trim(),
      read_by_crew: true,
    });
    setMessages(prev => [...prev, msg]);
    setInput('');
    setSending(false);
  };

  const unread = messages.filter(m => m.from_role === 'studio' && !m.read_by_crew).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 340, background: '#111', border: '1px solid #252525', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1E1E1E', background: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7BC853' }} />
        <div style={{ fontSize: 12, fontWeight: 700 }}>Chat with Studio 65</div>
        {unread > 0 && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,158,255,0.15)', color: '#4A9EFF' }}>{unread} new</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!loaded ? <div style={{ color: '#444', fontFamily: MONO, fontSize: 11, textAlign: 'center', paddingTop: 20 }}>Loading...</div>
        : messages.length === 0 ? <div style={{ color: '#333', fontFamily: MONO, fontSize: 11, textAlign: 'center', paddingTop: 20 }}>No messages yet. Say hi!</div>
        : messages.map(msg => {
          const isMe = msg.from_role === 'crew';
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginBottom: 2, textAlign: isMe ? 'right' : 'left' }}>
                  {msg.from_name} · {new Date(msg.created_date).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.6, background: isMe ? '#E81A1A' : '#1E1E1E', color: isMe ? '#fff' : '#ddd', border: isMe ? 'none' : '1px solid #2A2A2A' }}>
                  {msg.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1E1E1E', background: '#1A1A1A', display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          style={{ flex: 1, background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
        />
        <button onClick={handleSend} disabled={sending || !input.trim()} style={{ padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!input.trim() || sending) ? 0.5 : 1 }}>Send</button>
      </div>
    </div>
  );
}

// ── Shot List Section ──────────────────────────────────────────────────────

function ShotListSection({ project: p }) {
  const [shots, setShots] = useState(p.shot_list || []);
  const [saving, setSaving] = useState(null);

  const toggle = async (i) => {
    const updated = shots.map((s, j) => j === i ? { ...s, done: !s.done } : s);
    setShots(updated);
    setSaving(i);
    await base44.entities.Project.update(p.id, { ...p, shot_list: updated });
    setSaving(null);
  };

  const done = shots.filter(s => s.done).length;

  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A1A' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckSquare size={13} color="#555" />
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shot List</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: done === shots.length ? '#7BC853' : '#3A3A3A' }}>{done}/{shots.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shots.map((s, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            disabled={saving === i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: s.done ? 'rgba(123,200,83,0.04)' : '#111',
              border: `1px solid ${s.done ? 'rgba(123,200,83,0.12)' : '#1A1A1A'}`,
              borderRadius: 8, padding: '10px 12px',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${s.done ? '#7BC853' : '#252525'}`,
              background: s.done ? '#7BC853' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.done && <span style={{ fontSize: 9, color: '#000', fontWeight: 800 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: s.done ? '#3A3A3A' : '#bbb', textDecoration: s.done ? 'line-through' : 'none', flex: 1 }}>{s.shot}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Equipment Checklist Section ────────────────────────────────────────────

function EquipmentChecklistSection({ project: p }) {
  const [items, setItems] = useState(p.equipment_checklist || []);
  const [saving, setSaving] = useState(null);

  const toggle = async (i) => {
    const updated = items.map((it, j) => j === i ? { ...it, checked: !it.checked } : it);
    setItems(updated);
    setSaving(i);
    await base44.entities.Project.update(p.id, { ...p, equipment_checklist: updated });
    setSaving(null);
  };

  const checked = items.filter(it => it.checked).length;

  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A1A' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={13} color="#555" />
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gear Checklist</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: checked === items.length ? '#7BC853' : '#3A3A3A' }}>{checked}/{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            disabled={saving === i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: it.checked ? 'rgba(74,158,255,0.04)' : '#111',
              border: `1px solid ${it.checked ? 'rgba(74,158,255,0.12)' : '#1A1A1A'}`,
              borderRadius: 8, padding: '10px 12px',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${it.checked ? '#4A9EFF' : '#252525'}`,
              background: it.checked ? '#4A9EFF' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {it.checked && <span style={{ fontSize: 9, color: '#fff', fontWeight: 800 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: it.checked ? '#3A3A3A' : '#bbb', textDecoration: it.checked ? 'line-through' : 'none', flex: 1 }}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}



// ── Project Card ───────────────────────────────────────────────────────────

function ProjectCard({ project: p, contact }) {
  const [expanded, setExpanded]   = useState(false);
  const [savingIdx, setSavingIdx] = useState(null);
  const [noteText, setNoteText]   = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [delLinks, setDelLinks]   = useState({});
  const [delLinkSaving, setDelLinkSaving] = useState({});
  const [localCrew, setLocalCrew] = useState(p.crew || []);

  const crewRoles = (localCrew).map((m, i) => m.name.toLowerCase() === contact.name.toLowerCase() ? { entry: m, index: i } : null).filter(Boolean);
  const rentalRoles = (p.rentals || []).map((r, i) => (r.vendor || '').toLowerCase() === contact.name.toLowerCase() ? { entry: r, index: i } : null).filter(Boolean);
  const isCrew = crewRoles.length > 0;

  if (!crewRoles.length && !rentalRoles.length) return null;

  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
  const del = p.deliverables || [];

  const totalEarnings = crewRoles.reduce((s, r) => {
    return s + (r.entry.rate_type === 'hourly' ? (r.entry.cost || 0) * (r.entry.hours || 0) : (r.entry.cost || 0));
  }, 0);

  const myAvail = crewRoles[0]?.entry?.avail;
  const confirmed = myAvail === 'yes';
  const declined  = myAvail === 'no';
  const pending   = !myAvail || myAvail === 'pending';

  const handleAvail = async (crewIndex, status) => {
    setSavingIdx(crewIndex);
    const newCrew = localCrew.map((c, i) => i === crewIndex ? { ...c, avail: status } : c);
    const logMsg = status === 'yes' ? `${contact.name} confirmed via portal` : `${contact.name} declined via portal`;
    await base44.entities.Project.update(p.id, { ...p, crew: newCrew, activity: [...(p.activity || []), { msg: logMsg, ts: new Date().toISOString() }] });
    setLocalCrew(newCrew);
    setSavingIdx(null);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    const firstIdx = crewRoles[0]?.index;
    const newCrew  = localCrew.map((c, i) => i === firstIdx ? { ...c, portal_note: noteText.trim() } : c);
    await base44.entities.Project.update(p.id, { ...p, crew: newCrew });
    setLocalCrew(newCrew);
    setNoteSaving(false); setNoteText('');
  };

  const handleSaveDelLink = async (i, link) => {
    setDelLinkSaving(s => ({ ...s, [i]: true }));
    const deliverables = del.map((d, j) => j === i ? { ...d, link } : d);
    await base44.entities.Project.update(p.id, { ...p, deliverables });
    setDelLinkSaving(s => ({ ...s, [i]: false }));
  };

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: '#3A3A3A', width: 64, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#bbb', lineHeight: 1.5 }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      background: '#111',
      border: `1px solid ${expanded ? '#252525' : '#1A1A1A'}`,
      borderRadius: 14,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>

      {/* ── Collapsed header ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '15px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}
      >
        {/* RSVP dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: confirmed ? '#7BC853' : declined ? '#E81A1A' : '#333',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e8e8', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {p.date && <span style={{ fontSize: 11, color: '#3D3D3D', fontFamily: MONO }}>{fmtDateRange(p)}</span>}
            {p.start_time && <span style={{ fontSize: 11, color: '#3D3D3D', fontFamily: MONO }}>{p.start_time}{p.end_time ? '–' + p.end_time : ''}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isCrew && totalEarnings > 0 && (
            <span style={{ fontSize: 11, color: '#F59E0B', fontFamily: MONO, fontWeight: 700 }}>{fmt(totalEarnings)}</span>
          )}
          {confirmed && <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: '#7BC853' }}>Confirmed</span>}
          {declined  && <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: '#E81A1A' }}>Declined</span>}
          {expanded ? <ChevronUp size={16} color="#555" /> : <ChevronDown size={16} color="#555" />}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1A1A1A' }}>

          {/* 1. RSVP — first thing crew sees, most urgent */}
          {crewRoles.map((r, ri) => {
            const computedCost = r.entry.rate_type === 'hourly'
              ? (r.entry.cost || 0) * (r.entry.hours || 0)
              : (r.entry.cost || 0);
            const myStatus = r.entry.avail;
            const isPending = !myStatus || myStatus === 'pending';

            return (
              <div key={ri} style={{ padding: '16px 16px 0' }}>
                {/* Role + pay */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.entry.role || 'Crew'}</span>
                    {r.entry.cost > 0 && (
                      <span style={{ marginLeft: 10, fontSize: 12, color: '#F59E0B', fontFamily: MONO }}>
                        {r.entry.rate_type === 'hourly' ? `${fmt(r.entry.cost)}/hr × ${r.entry.hours || 0}h` : fmt(computedCost)}
                      </span>
                    )}
                  </div>
                  {r.entry.cost > 0 && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 700,
                      background: r.entry.paid ? 'rgba(123,200,83,0.12)' : 'rgba(255,255,255,0.04)',
                      color: r.entry.paid ? '#7BC853' : '#444',
                    }}>
                      {r.entry.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  )}
                </div>

                {/* RSVP buttons or status */}
                {isPending ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        disabled={savingIdx === r.index}
                        onClick={() => handleAvail(r.index, 'yes')}
                        style={{ flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#7BC853', color: '#000', letterSpacing: '0.01em' }}
                      >{savingIdx === r.index ? '…' : "I'm In"}</button>
                      <button
                        disabled={savingIdx === r.index}
                        onClick={() => handleAvail(r.index, 'no')}
                        style={{ flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #222', background: 'transparent', color: '#444' }}
                      >{savingIdx === r.index ? '…' : "Can't Make It"}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: myStatus === 'yes' ? '#7BC853' : '#E81A1A' }}>
                      {myStatus === 'yes' ? '✓ You\'re confirmed' : '✗ Declined'}
                    </span>
                    <button
                      onClick={() => handleAvail(r.index, 'pending')}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'none', border: '1px solid #222', color: '#3A3A3A', cursor: 'pointer', fontFamily: MONO }}
                    >Change</button>
                  </div>
                )}

                {r.entry.portal_note && (
                  <div style={{ marginBottom: 14, padding: '9px 12px', background: 'rgba(74,158,255,0.04)', borderLeft: '2px solid rgba(74,158,255,0.25)', borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note on file</div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{r.entry.portal_note}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Shoot details — only what exists */}
          {(p.address || p.poc_name || p.start_time || p.notes) && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.address   && <Row label="Location" value={p.address} />}
              {p.start_time && <Row label="Call time" value={`${p.start_time}${p.end_time ? ' — ' + p.end_time : ''}`} />}
              {p.poc_name  && <Row label="POC" value={`${p.poc_name}${p.poc_phone ? '  ·  ' + p.poc_phone : ''}`} />}
              {p.notes     && <div style={{ marginTop: 2, fontSize: 12, color: '#444', lineHeight: 1.7, fontStyle: 'italic' }}>{p.notes}</div>}
            </div>
          )}

          {/* 3. Camera setup — only if set */}
          {p.setup && (p.setup.camera_orientation || p.setup.frame_rate || p.setup.resolution || p.setup.codec || p.setup.gear || p.setup.color_profile) && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['Orient.', p.setup.camera_orientation], ['FPS', p.setup.frame_rate], ['Res.', p.setup.resolution], ['Codec', p.setup.codec], ['Color', p.setup.color_profile]].filter(([, v]) => v).map(([label, value]) => (
                <Row key={label} label={label} value={value} />
              ))}
              {p.setup.gear && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#3A3A3A', width: 64, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>Gear</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {p.setup.gear.split('\n').filter(g => g.trim()).map((g, i) => (
                      <span key={i} style={{ fontSize: 12, color: '#777' }}>· {g.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Deliverables — only if any */}
          {del.length > 0 && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A1A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deliverables</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: del.filter(d => d.done).length === del.length ? '#7BC853' : '#3A3A3A' }}>
                  {del.filter(d => d.done).length}/{del.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {del.map((d, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${d.done ? '#7BC853' : '#252525'}`,
                        background: d.done ? '#7BC853' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {d.done && <span style={{ fontSize: 8, color: '#000', fontWeight: 800 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, flex: 1, color: d.done ? '#3A3A3A' : '#bbb', textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</span>
                      {d.due && <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>{d.due}</span>}
                    </div>
                    {d.link && (
                      <a href={d.link} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 4, marginLeft: 25, fontFamily: MONO, fontSize: 11, color: '#4A9EFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.link}</a>
                    )}
                    {isCrew && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 25 }}>
                        <input
                          value={delLinks[i] !== undefined ? delLinks[i] : (d.link || '')}
                          onChange={e => setDelLinks(l => ({ ...l, [i]: e.target.value }))}
                          placeholder="Paste delivery link…"
                          style={{ flex: 1, background: '#181818', border: '1px solid #222', borderRadius: 7, padding: '7px 10px', color: '#ccc', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif' }}
                        />
                        <button
                          onClick={() => handleSaveDelLink(i, delLinks[i] !== undefined ? delLinks[i] : (d.link || ''))}
                          disabled={delLinkSaving[i]}
                          style={{ padding: '7px 12px', background: '#E81A1A', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >{delLinkSaving[i] ? '…' : d.link ? 'Update' : 'Submit'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Shot List */}
          {(p.shot_list || []).length > 0 && (
            <ShotListSection project={p} />
          )}

          {/* 6. Equipment Checklist */}
          {(p.equipment_checklist || []).length > 0 && (
            <EquipmentChecklistSection project={p} />
          )}

          {/* 7. Chat */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #1A1A1A' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Messages</div>
            <CrewProjectChat project={p} contact={contact} />
          </div>

          {/* 6. Call sheet — quiet, at the bottom */}
          <div style={{ padding: '10px 16px 16px' }}>
            <button
              onClick={() => downloadCallSheet(p, crewRoles[0] || rentalRoles[0], contact)}
              style={{ width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 8, color: '#333', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO, letterSpacing: '0.04em' }}
            >Download Call Sheet</button>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────

export default function Portal() {
  const [contact, setContact]   = useState(null);
  const [projects, setProjects] = useState([]);
  const [crewTab, setCrewTab]   = useState('projects');
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogin = (c, projs) => { setContact(c); setProjects(projs); };
  const handleSignOut = () => { setContact(null); setProjects([]); setCrewTab('projects'); setUnreadCount(0); };

  // Count unread messages from studio across all projects
  useEffect(() => {
    if (!contact) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.from_role === 'studio' && !event.data?.read_by_crew) {
        setUnreadCount(c => c + 1);
      }
    });
    // Initial load of unread count
    base44.entities.DirectMessage.list('-created_date', 200).then(msgs => {
      const unread = msgs.filter(m => m.from_role === 'studio' && !m.read_by_crew).length;
      setUnreadCount(unread);
    });
    return unsub;
  }, [contact]);

  if (!contact) return <LoginScreen onLogin={handleLogin} />;

  const today            = new Date().toISOString().split('T')[0];
  const isEditor         = (contact.types || []).includes('Editor');
  const upcomingProjects = projects.filter(p => !p.archived && (p.date || '') >= today);
  const pastProjects     = projects.filter(p =>  p.archived || (p.date || '') <  today);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1A1A1A', background: '#0A0A0A', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 26 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{contact.name}</div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>{contact.role || 'Crew'}</div>
            </div>
            <button onClick={handleSignOut} style={{ padding: '6px 12px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>Hey {contact.name.split(' ')[0]}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} on your account</div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, background: '#1A1A1A', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[{ key: 'projects', label: 'Projects', Icon: Files }, { key: 'contracts', label: 'Contracts', Icon: Files }].map(t => (
            <button key={t.key} onClick={() => setCrewTab(t.key)} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: crewTab === t.key ? '#E81A1A' : 'transparent', color: crewTab === t.key ? '#fff' : '#666', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
              <t.Icon size={14} color={crewTab === t.key ? '#fff' : '#666'} strokeWidth={2} />
              {t.label}
              {t.key === 'projects' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#4A9EFF', color: '#fff',
                  fontSize: 9, fontWeight: 800, fontFamily: MONO,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {crewTab === 'contracts' && <CrewContractsTab contact={contact} />}

        {crewTab === 'projects' && (projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444' }}>
            <Files size={56} color="#666" style={{ margin: '0 auto 14px', display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#666', marginBottom: 6 }}>No projects yet</div>
            <div style={{ fontSize: 13 }}>Studio 65 will add you to projects soon. Check back later!</div>
          </div>
        ) : (
          <>
            {/* Editor view: show brief + uploads per project */}
            {isEditor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {projects.filter(p => !p.archived).map(p => (
                  <div key={p.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #1A1A1A' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{p.client}{p.date ? ' · ' + p.date : ''}</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <EditorSection project={p} contact={contact} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Crew / Vendor view: existing project cards */}
            {!isEditor && upcomingProjects.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Upcoming</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcomingProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} />)}
                </div>
              </div>
            )}
            {!isEditor && pastProjects.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Past</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pastProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} />)}
                </div>
              </div>
            )}
          </>
        ))}
      </main>
    </div>
  );
}

// ── Call Sheet PDF ─────────────────────────────────────────────────────────

function downloadCallSheet(p, role, contact) {
  import('jspdf').then(({ jsPDF }) => {
    const doc  = new jsPDF();
    const MONO = 'courier';
    const SANS = 'helvetica';
    let y = 20;

    const line = (text, size = 11, style = 'normal', font = SANS, color = [255,255,255]) => {
      doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...color);
      doc.text(text, 20, y); y += size * 0.5 + 3;
    };
    const divider = () => { doc.setDrawColor(60,60,60); doc.line(20, y, 190, y); y += 6; };
    const section = (text) => {
      y += 2;
      doc.setFillColor(30,30,30); doc.roundedRect(18, y - 5, 174, 10, 2, 2, 'F');
      doc.setFont(MONO,'bold'); doc.setFontSize(8); doc.setTextColor(150,150,150);
      doc.text(text.toUpperCase(), 20, y + 1); y += 10;
    };

    doc.setFillColor(10,10,10); doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(232,26,26); doc.rect(0, 0, 210, 18, 'F');
    doc.setFont(SANS,'bold'); doc.setFontSize(13); doc.setTextColor(255,255,255);
    doc.text('STUDIO 65 — CALL SHEET', 20, 12);
    doc.setFont(MONO,'normal'); doc.setFontSize(8); doc.setTextColor(255,180,180);
    doc.text(new Date().toLocaleDateString('en-CA'), 170, 12);
    y = 28;

    section('Project');
    line(p.name, 16, 'bold', SANS, [255,255,255]);
    line(`Client: ${p.client || '—'}`, 10, 'normal', MONO, [180,180,180]);
    if (p.date) line(`Date: ${p.date}${p.end_date && p.end_date !== p.date ? ' – ' + p.end_date : ''}`, 10, 'normal', MONO, [180,180,180]);
    if (p.start_time) line(`Call Time: ${p.start_time}${p.end_time ? '  |  Wrap: ' + p.end_time : ''}`, 10, 'normal', MONO, [245,158,11]);
    if (p.address) line(`Location: ${p.address}`, 10, 'normal', MONO, [180,180,180]);
    if (p.poc_name) line(`POC: ${p.poc_name}${p.poc_phone ? ' · ' + p.poc_phone : ''}`, 10, 'normal', MONO, [180,180,180]);
    y += 2; divider();

    if (role) {
      section('Your Details');
      line(`Name: ${contact.name}`, 11, 'bold', SANS, [255,255,255]);
      if (role.entry?.role) line(`Role: ${role.entry.role}`, 10, 'normal', MONO, [180,180,180]);
      if (role.entry?.cost) line(`Rate: $${role.entry.cost}`, 10, 'normal', MONO, [123,200,83]);
      y += 2; divider();
    }

    const s = p.setup || {};
    if (s.camera_orientation || s.frame_rate || s.resolution || s.codec || s.gear) {
      section('Camera Setup');
      if (s.camera_orientation) line(`Orientation: ${s.camera_orientation}`, 10, 'normal', MONO, [180,180,180]);
      if (s.frame_rate)         line(`Frame Rate: ${s.frame_rate}`, 10, 'normal', MONO, [180,180,180]);
      if (s.resolution)         line(`Resolution: ${s.resolution}`, 10, 'normal', MONO, [180,180,180]);
      if (s.codec)              line(`Codec: ${s.codec}`, 10, 'normal', MONO, [180,180,180]);
      if (s.color_profile)      line(`Color Profile: ${s.color_profile}`, 10, 'normal', MONO, [180,180,180]);
      if (s.gear) { y += 2; line('Gear:', 10, 'bold', SANS, [255,255,255]); s.gear.split('\n').forEach(g => g.trim() && line(`  · ${g.trim()}`, 9, 'normal', MONO, [180,180,180])); }
      y += 2; divider();
    }

    if (p.notes) {
      section('Notes');
      const wrapped = doc.splitTextToSize(p.notes, 170);
      doc.setFont(MONO,'normal'); doc.setFontSize(9); doc.setTextColor(180,180,180);
      wrapped.forEach(ln => { doc.text(ln, 20, y); y += 5; });
      y += 2; divider();
    }

    section("Director's Contact");
    line('Rathan — Studio 65', 11, 'bold', SANS, [255,255,255]);
    line('studio65production@gmail.com', 9, 'normal', MONO, [74,158,255]);
    doc.setFillColor(30,30,30); doc.rect(0, 285, 210, 12, 'F');
    doc.setFont(MONO,'normal'); doc.setFontSize(7); doc.setTextColor(80,80,80);
    doc.text('STUDIO 65 — CONFIDENTIAL — FOR CREW USE ONLY', 20, 292);
    doc.save(`CallSheet_${p.name.replace(/\s+/g, '_')}.pdf`);
  });
}