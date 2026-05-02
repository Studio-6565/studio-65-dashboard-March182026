import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, CheckSquare, Square, ExternalLink, ChevronDown, ChevronUp, MessageSquare, CreditCard, LayoutDashboard, FileText, X, Layers } from 'lucide-react';
import ProjectAssetsTab from '@/components/editor-portal/ProjectAssetsTab';

const MONO = '"DM Mono", monospace';

const STATUS_STYLE = {
  'Assigned':              { bg: 'rgba(74,158,255,0.12)',   clr: '#4A9EFF',  label: 'Assigned' },
  'In Progress':           { bg: 'rgba(245,158,11,0.12)',   clr: '#F59E0B',  label: 'In Progress' },
  'Submitted for Review':  { bg: 'rgba(167,139,250,0.12)',  clr: '#A78BFA',  label: 'Submitted' },
  'Revision Requested':    { bg: 'rgba(232,26,26,0.12)',    clr: '#E81A1A',  label: 'Revision Needed' },
  'Approved':              { bg: 'rgba(123,200,83,0.12)',   clr: '#7BC853',  label: 'Approved ✓' },
  'Final Delivered':       { bg: 'rgba(123,200,83,0.2)',    clr: '#7BC853',  label: 'Delivered ✓' },
  'Cancelled':             { bg: 'rgba(100,100,100,0.12)',  clr: '#666',     label: 'Cancelled' },
};

const PRIORITY_STYLE = {
  'Low':    { clr: '#555' },
  'Normal': { clr: '#888' },
  'High':   { clr: '#F59E0B' },
  'Urgent': { clr: '#E81A1A' },
};

// ── Login ─────────────────────────────────────────────────────────────────────
function EditorLogin({ onLogin }) {
  const [mode, setMode] = useState('otp'); // 'otp' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const IS = { background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };

  const handleSendOtp = async () => {
    if (!email.trim()) { setError('Enter your email'); return; }
    setLoading(true); setError('');
    const res = await base44.functions.invoke('portalAuth', { action: 'send_otp', email: email.trim().toLowerCase(), portal: 'editor' });
    if (res.data?.success) { setOtpSent(true); } else { setError('Email not found. Contact Studio 65 to get access.'); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!code.trim()) { setError('Enter the code'); return; }
    setLoading(true); setError('');
    const res = await base44.functions.invoke('portalAuth', { action: 'verify_otp', email: email.trim().toLowerCase(), otp: code.trim(), portal: 'editor' });
    if (res.data?.success) { onLogin(res.data.contact); } else { setError('Invalid code. Try again.'); }
    setLoading(false);
  };

  const handleAccessCode = async () => {
    if (!code.trim()) { setError('Enter your access code'); return; }
    setLoading(true); setError('');
    const res = await base44.functions.invoke('portalAuth', { action: 'verify_code', code: code.trim(), portal: 'editor' });
    if (res.data?.success) { onLogin(res.data.contact); } else { setError('Invalid access code.'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 40, marginBottom: 20 }} />
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Editor Portal</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginTop: 6 }}>Studio 65 · Editing Workspace</div>
        </div>

        <div style={{ background: '#0A0A0A', border: '1px solid #111', borderRadius: 20, padding: 28 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: '#111', borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {[['otp', 'Email OTP'], ['code', 'Access Code']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setOtpSent(false); setCode(''); }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: mode === m ? '#E81A1A' : 'transparent', color: mode === m ? '#fff' : '#555', fontFamily: MONO }}>
                {l}
              </button>
            ))}
          </div>

          {mode === 'otp' && !otpSent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={IS} type="email" onKeyDown={e => e.key === 'Enter' && handleSendOtp()} />
              <button onClick={handleSendOtp} disabled={loading} style={{ padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading ? 'Sending...' : 'Send OTP →'}
              </button>
            </div>
          )}

          {mode === 'otp' && otpSent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#7BC853', textAlign: 'center', marginBottom: 4 }}>Code sent to {email}</div>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter 6-digit code" style={{ ...IS, textAlign: 'center', letterSpacing: '0.15em', fontSize: 20 }} onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} />
              <button onClick={handleVerifyOtp} disabled={loading} style={{ padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Verifying...' : 'Verify & Enter →'}
              </button>
              <button onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: MONO }}>← Back</button>
            </div>
          )}

          {mode === 'code' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter access code" style={{ ...IS, textAlign: 'center', letterSpacing: '0.1em' }} onKeyDown={e => e.key === 'Enter' && handleAccessCode()} />
              <button onClick={handleAccessCode} disabled={loading} style={{ padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Checking...' : 'Enter Portal →'}
              </button>
            </div>
          )}

          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, fontFamily: MONO, fontSize: 12, color: '#E81A1A', textAlign: 'center' }}>{error}</div>}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Assignment Card ────────────────────────────────────────────────────────────
function AssignmentCard({ assignment, onClick }) {
  const st = STATUS_STYLE[assignment.status] || STATUS_STYLE['Assigned'];
  const pr = PRIORITY_STYLE[assignment.priority] || PRIORITY_STYLE['Normal'];
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = assignment.deadline && assignment.deadline < today && !['Approved', 'Final Delivered', 'Cancelled'].includes(assignment.status);
  const daysUntil = assignment.deadline ? Math.ceil((new Date(assignment.deadline) - new Date()) / 86400000) : null;
  const unread = (assignment.messages || []).filter(m => m.from_role === 'studio' && !m.read_by_editor).length;

  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: '#080808', border: `1px solid ${assignment.status === 'Revision Requested' ? 'rgba(232,26,26,0.3)' : '#111'}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.clr, fontWeight: 700 }}>{st.label}</span>
            {assignment.priority !== 'Normal' && (
              <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 4, background: 'rgba(100,100,100,0.1)', color: pr.clr, fontWeight: 700 }}>{assignment.priority}</span>
            )}
            {unread > 0 && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 4, background: 'rgba(74,158,255,0.12)', color: '#4A9EFF', fontWeight: 700 }}>{unread} new msg</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{assignment.deliverable_name}</div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>{assignment.project_name}{assignment.show_client_to_editor && assignment.client_name ? ` · ${assignment.client_name}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {assignment.deadline && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: isOverdue ? '#E81A1A' : daysUntil !== null && daysUntil <= 3 ? '#F59E0B' : '#444' }}>
              {isOverdue ? '⚠ OVERDUE' : daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due ${assignment.deadline}`}
            </div>
          )}
          {assignment.content_type && <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginTop: 3 }}>{assignment.content_type}</div>}
        </div>
      </div>
      {assignment.status === 'Revision Requested' && assignment.revision_notes && (
        <div style={{ padding: '8px 12px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 10, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A' }}>REVISION: </span>{assignment.revision_notes.substring(0, 120)}{assignment.revision_notes.length > 120 ? '...' : ''}
        </div>
      )}
    </button>
  );
}

// ── Link Row ──────────────────────────────────────────────────────────────────
function LinkRow({ link, color = '#4A9EFF', icon = '🔗' }) {
  return (
    <a href={link.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0D0D0D', border: `1px solid ${color}20`, borderRadius: 10, textDecoration: 'none', marginBottom: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label || link.url}</div>
        {link.notes && <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>{link.notes}</div>}
      </div>
      <ExternalLink size={12} color="#333" />
    </a>
  );
}

// ── Section Block ─────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #0F0F0F', paddingBottom: 20, marginBottom: 20 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: open ? 14 : 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{title}</div>
        {open ? <ChevronUp size={14} color="#444" /> : <ChevronDown size={14} color="#444" />}
      </button>
      {open && children}
    </div>
  );
}

function InfoRow({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', flexShrink: 0, width: 130 }}>{label}</div>
      <div style={{ fontSize: 13, color: color || '#ccc', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

// ── Assignment Detail ─────────────────────────────────────────────────────────
function AssignmentDetail({ assignment, editorName, onUpdate, onBack }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitLink, setSubmitLink] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [activeTab, setActiveTab] = useState('brief');
  const st = STATUS_STYLE[assignment.status] || STATUS_STYLE['Assigned'];

  const addLog = (a, msg) => ({ ...a, activity: [...(a.activity || []), { msg, ts: new Date().toISOString() }] });

  const handleSubmit = async () => {
    if (!submitLink.trim()) return;
    setSubmitting(true);
    const version = `v${(assignment.submissions || []).length + 1}`;
    const submission = { version, link: submitLink.trim(), notes: submitNotes.trim(), submitted_at: new Date().toISOString(), status: 'pending_review' };
    let updated = addLog(assignment, `${editorName} submitted ${version}`);
    updated = {
      ...updated,
      status: 'Submitted for Review',
      version: (assignment.version || 1) + (assignment.submissions?.length || 0),
      submissions: [...(assignment.submissions || []), submission],
    };
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
    setSubmitLink(''); setSubmitNotes(''); setSubmitting(false);
  };

  const handleChecklistToggle = async (idx) => {
    const checklist = [...(assignment.checklist || [])];
    checklist[idx] = { ...checklist[idx], done: !checklist[idx].done };
    const updated = { ...assignment, checklist };
    await base44.entities.EditAssignment.update(assignment.id, { checklist });
    onUpdate(updated);
  };

  const handleStatusUpdate = async (status) => {
    const updated = addLog({ ...assignment, status }, `Status changed to ${status} by editor`);
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim()) return;
    setMsgSending(true);
    const msg = { from: editorName, from_role: 'editor', body: msgInput.trim(), ts: new Date().toISOString(), read_by_editor: true, read_by_studio: false };
    const updated = addLog({ ...assignment, messages: [...(assignment.messages || []), msg] }, `${editorName} sent a message`);
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
    setMsgInput(''); setMsgSending(false);
  };

  // Mark studio messages read
  useEffect(() => {
    const unread = (assignment.messages || []).filter(m => m.from_role === 'studio' && !m.read_by_editor);
    if (unread.length > 0) {
      const msgs = (assignment.messages || []).map(m => m.from_role === 'studio' ? { ...m, read_by_editor: true } : m);
      base44.entities.EditAssignment.update(assignment.id, { messages: msgs });
      onUpdate({ ...assignment, messages: msgs });
    }
  }, [assignment.id]);

  const hasAssets = (assignment.attached_assets || []).length > 0;
  const TABS = [
    { key: 'brief', label: 'Brief' },
    { key: 'assets', label: `Assets${hasAssets ? ` (${assignment.attached_assets.length})` : ''}` },
    { key: 'materials', label: 'Materials' },
    { key: 'submit', label: 'Submit' },
    { key: 'revisions', label: 'Revisions' },
    { key: 'messages', label: `Messages${(assignment.messages || []).filter(m => m.from_role === 'studio' && !m.read_by_editor).length > 0 ? ' 🔵' : ''}` },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: MONO }}>← Assignments</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 10px', borderRadius: 6, background: st.bg, color: st.clr, fontWeight: 700 }}>{st.label}</span>
          {assignment.priority !== 'Normal' && <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 10px', borderRadius: 6, background: 'rgba(100,100,100,0.1)', color: PRIORITY_STYLE[assignment.priority]?.clr || '#888', fontWeight: 700 }}>{assignment.priority}</span>}
          {assignment.content_type && <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#0D0D0D', color: '#555' }}>{assignment.content_type}</span>}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>{assignment.deliverable_name}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>
          {assignment.project_name}
          {assignment.show_client_to_editor && assignment.client_name ? ` · ${assignment.client_name}` : ''}
          {assignment.deadline ? ` · Due ${assignment.deadline}` : ''}
        </div>
      </div>

      {/* Quick status update */}
      {assignment.status === 'Assigned' && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => handleStatusUpdate('In Progress')} style={{ padding: '11px 20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, color: '#F59E0B', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
            ▶ Start Editing
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', marginBottom: 20, borderBottom: '1px solid #0F0F0F', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.key ? '#E81A1A' : 'transparent'}`, color: activeTab === t.key ? '#fff' : '#555', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: MONO, paddingBottom: 10, marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* BRIEF */}
      {activeTab === 'brief' && (
        <div>
          <Section title="Assignment Snapshot">
            <InfoRow label="Deliverable" value={assignment.deliverable_name} />
            <InfoRow label="Project" value={assignment.project_name} />
            {assignment.show_client_to_editor && <InfoRow label="Client" value={assignment.client_name} />}
            <InfoRow label="Content Type" value={assignment.content_type} />
            <InfoRow label="Platform" value={assignment.platform} />
            <InfoRow label="Aspect Ratio" value={assignment.aspect_ratio} />
            <InfoRow label="Duration" value={assignment.duration_target} />
            <InfoRow label="Deadline" value={assignment.deadline} color={assignment.deadline && assignment.deadline < new Date().toISOString().split('T')[0] ? '#E81A1A' : '#ccc'} />
          </Section>

          <Section title="What To Make">
            {assignment.hook && <div style={{ marginBottom: 12 }}><div style={{ fontFamily: MONO, fontSize: 9, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 5 }}>Hook</div><div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, background: '#0D0D0D', borderRadius: 10, padding: '10px 14px' }}>{assignment.hook}</div></div>}
            {assignment.script && <div style={{ marginBottom: 12 }}><div style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA', textTransform: 'uppercase', marginBottom: 5 }}>Script</div><div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, background: '#0D0D0D', borderRadius: 10, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>{assignment.script}</div></div>}
            {assignment.cta && <div style={{ marginBottom: 12 }}><div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', textTransform: 'uppercase', marginBottom: 5 }}>CTA</div><div style={{ fontSize: 13, color: '#ccc', background: '#0D0D0D', borderRadius: 10, padding: '10px 14px' }}>{assignment.cta}</div></div>}
          </Section>

          <Section title="Creative Direction">
            <InfoRow label="Editing Style" value={assignment.editing_style} />
            <InfoRow label="Music Direction" value={assignment.music_direction} />
            <InfoRow label="Colour Direction" value={assignment.colour_direction} />
            <InfoRow label="Caption Style" value={assignment.caption_style} />
            {assignment.director_notes && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: '#0D0D0D', borderLeft: '3px solid #E81A1A', borderRadius: '0 10px 10px 0' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', marginBottom: 5 }}>DIRECTOR NOTES</div>
                <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{assignment.director_notes}</div>
              </div>
            )}
            {(assignment.inspo_links || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 8 }}>Inspiration / References</div>
                {(assignment.inspo_links || []).map((l, i) => <LinkRow key={i} link={l} color="#F59E0B" icon="🎬" />)}
              </div>
            )}
          </Section>

          <Section title="Technical Specs">
            <InfoRow label="Resolution" value={assignment.export_resolution} />
            <InfoRow label="Format" value={assignment.export_format} />
            <InfoRow label="Frame Rate" value={assignment.frame_rate} />
            <InfoRow label="Codec" value={assignment.codec} />
            <InfoRow label="Naming Convention" value={assignment.naming_convention} />
            <InfoRow label="Audio Notes" value={assignment.audio_notes} />
          </Section>

          {(assignment.checklist || []).length > 0 && (
            <Section title="Checklist">
              {(assignment.checklist || []).map((item, idx) => (
                <button key={idx} onClick={() => handleChecklistToggle(idx)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: item.done ? 'rgba(123,200,83,0.05)' : '#0D0D0D', border: `1px solid ${item.done ? 'rgba(123,200,83,0.15)' : '#111'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 6 }}>
                  {item.done ? <CheckSquare size={16} color="#7BC853" /> : <Square size={16} color="#444" />}
                  <span style={{ fontSize: 13, color: item.done ? '#7BC853' : '#ccc', textDecoration: item.done ? 'line-through' : 'none', textDecorationColor: '#7BC853' }}>{item.label}</span>
                </button>
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ASSETS */}
      {activeTab === 'assets' && (
        <ProjectAssetsTab attachedAssets={assignment.attached_assets || []} />
      )}

      {/* MATERIALS */}
      {activeTab === 'materials' && (
        <div>
          {(assignment.raw_links || []).length > 0 ? (
            <Section title="Raw Footage & Assets">
              {(assignment.raw_links || []).map((l, i) => {
                const icon = l.type === 'audio' ? '🎵' : l.type === 'photo' ? '📷' : l.type === 'brand' ? '🎨' : '📁';
                return <LinkRow key={i} link={l} color="#7BC853" icon={icon} />;
              })}
            </Section>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 14, color: '#444' }}>No materials added yet.</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', marginTop: 6 }}>Studio 65 will add raw footage and asset links here.</div>
            </div>
          )}
        </div>
      )}

      {/* SUBMIT */}
      {activeTab === 'submit' && (
        <div>
          {/* Submission form */}
          {!['Approved', 'Final Delivered', 'Cancelled'].includes(assignment.status) && (
            <Section title="Submit Your Edit">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Frame.io / Review Link *</div>
                <input value={submitLink} onChange={e => setSubmitLink(e.target.value)} placeholder="https://app.frame.io/..." style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Notes to Studio 65 (optional)</div>
                <textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} rows={3} placeholder="Any notes about this version..." style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleSubmit} disabled={submitting || !submitLink.trim()} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!submitLink.trim() || submitting) ? 0.6 : 1 }}>
                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {submitting ? 'Submitting...' : `Submit Edit v${(assignment.submissions?.length || 0) + 1}`}
              </button>
            </Section>
          )}

          {/* Version history */}
          {(assignment.submissions || []).length > 0 && (
            <Section title="Submission History">
              {[...(assignment.submissions || [])].reverse().map((s, i) => {
                const ss = STATUS_STYLE[s.status === 'pending_review' ? 'Submitted for Review' : s.status === 'approved' ? 'Approved' : s.status === 'revision_requested' ? 'Revision Requested' : 'Submitted for Review'];
                return (
                  <div key={i} style={{ background: '#0D0D0D', border: '1px solid #111', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#E81A1A' }}>{s.version}</div>
                      <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 4, background: ss?.bg || 'rgba(100,100,100,0.1)', color: ss?.clr || '#666' }}>{s.status?.replace('_', ' ') || 'Submitted'}</span>
                    </div>
                    {s.link && <a href={s.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, fontFamily: MONO, fontSize: 11, color: '#4A9EFF', textDecoration: 'none', marginBottom: 6 }}>▶ View Edit <ExternalLink size={10} /></a>}
                    {s.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.notes}</div>}
                    {s.review_notes && <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(232,26,26,0.06)', borderLeft: '2px solid #E81A1A', borderRadius: '0 8px 8px 0', fontSize: 12, color: '#aaa' }}><span style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A' }}>FEEDBACK: </span>{s.review_notes}</div>}
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginTop: 6 }}>Submitted {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                  </div>
                );
              })}
            </Section>
          )}

          {!(assignment.submissions || []).length && ['Approved', 'Final Delivered'].includes(assignment.status) && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7BC853', fontFamily: MONO, fontSize: 13 }}>✓ This assignment has been approved.</div>
          )}
        </div>
      )}

      {/* REVISIONS */}
      {activeTab === 'revisions' && (
        <div>
          {assignment.status === 'Revision Requested' ? (
            <div>
              <div style={{ padding: '16px 18px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 14, marginBottom: 20 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', marginBottom: 8 }}>Revision Requested</div>
                <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{assignment.revision_notes || 'No specific notes added. Check messages for details.'}</div>
                {assignment.revision_deadline && <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', marginTop: 10 }}>Revision due: {assignment.revision_deadline}</div>}
              </div>
              <button onClick={() => setActiveTab('submit')} style={{ width: '100%', padding: '13px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Submit New Version →
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 12 }}>✏️</div>
              <div style={{ fontSize: 14, color: '#444' }}>No revisions requested.</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', marginTop: 6 }}>Revision notes from Studio 65 will appear here.</div>
            </div>
          )}

          {/* Previous submission feedback */}
          {(assignment.submissions || []).some(s => s.review_notes) && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 12 }}>Past Feedback</div>
              {(assignment.submissions || []).filter(s => s.review_notes).map((s, i) => (
                <div key={i} style={{ background: '#0D0D0D', border: '1px solid #111', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', marginBottom: 4 }}>{s.version}</div>
                  <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{s.review_notes}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MESSAGES */}
      {activeTab === 'messages' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
            {!(assignment.messages || []).length ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#444', fontFamily: MONO, fontSize: 12 }}>No messages yet. Ask Studio 65 anything about this assignment.</div>
            ) : (
              (assignment.messages || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from_role === 'editor' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '10px 14px', background: m.from_role === 'editor' ? 'rgba(232,26,26,0.1)' : '#0D0D0D', border: `1px solid ${m.from_role === 'editor' ? 'rgba(232,26,26,0.2)' : '#111'}`, borderRadius: 12, fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>
                    {m.body}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#2A2A2A', marginTop: 3 }}>
                    {m.from_role === 'studio' ? 'Studio 65' : 'You'} · {m.ts ? new Date(m.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} placeholder="Ask Studio 65 something..." style={{ flex: 1, background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }} />
            <button onClick={handleSendMessage} disabled={msgSending || !msgInput.trim()} style={{ padding: '12px 16px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: !msgInput.trim() ? 0.5 : 1 }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function EditorDashboard({ assignments, editorName, onOpenAssignment }) {
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const active = assignments.filter(a => !['Approved', 'Final Delivered', 'Cancelled'].includes(a.status));
  const dueSoon = active.filter(a => a.deadline && a.deadline >= today && a.deadline <= weekEnd);
  const overdue = active.filter(a => a.deadline && a.deadline < today);
  const revisions = assignments.filter(a => a.status === 'Revision Requested');
  const approved = assignments.filter(a => ['Approved', 'Final Delivered'].includes(a.status));
  const unreadMsgs = assignments.reduce((n, a) => n + (a.messages || []).filter(m => m.from_role === 'studio' && !m.read_by_editor).length, 0);

  const firstName = editorName.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Priority queue: overdue → revisions → due soon → everything else
  const priorityQueue = [
    ...overdue,
    ...revisions.filter(a => !overdue.find(o => o.id === a.id)),
    ...dueSoon.filter(a => !overdue.find(o => o.id === a.id) && !revisions.find(r => r.id === a.id)),
    ...active.filter(a => !overdue.find(o => o.id === a.id) && !revisions.find(r => r.id === a.id) && !dueSoon.find(d => d.id === a.id)),
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Studio 65 Editor Portal</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{greeting},<br />{firstName}.</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Active Edits', val: active.length, color: '#fff' },
          { label: 'Due This Week', val: dueSoon.length, color: dueSoon.length > 0 ? '#F59E0B' : '#fff' },
          { label: 'Revisions', val: revisions.length, color: revisions.length > 0 ? '#E81A1A' : '#fff' },
          { label: 'New Messages', val: unreadMsgs, color: unreadMsgs > 0 ? '#4A9EFF' : '#fff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#080808', border: '1px solid #0F0F0F', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#2A2A2A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Priority queue */}
      {priorityQueue.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 12 }}>⚡ Up Next</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priorityQueue.slice(0, 5).map(a => <AssignmentCard key={a.id} assignment={a} onClick={() => onOpenAssignment(a)} />)}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7BC853', marginBottom: 10 }}>✓ Approved ({approved.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {approved.slice(0, 3).map(a => <AssignmentCard key={a.id} assignment={a} onClick={() => onOpenAssignment(a)} />)}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, opacity: 0.15, marginBottom: 14 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#444', marginBottom: 8 }}>No edits assigned right now.</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', lineHeight: 1.7 }}>New editing briefs from Studio 65 will appear here.</div>
        </div>
      )}
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
export default function EditorPortal() {
  const [editor, setEditor] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [tab, setTab] = useState('dashboard');

  const handleLogin = async (contact) => {
    setEditor(contact);
    setLoading(true);
    const all = await base44.entities.EditAssignment.filter({ editor_name: contact.name }, '-created_date', 100);
    // Only show published assignments
    setAssignments(all.filter(a => a.published !== false));
    setLoading(false);
  };

  const handleSignOut = () => { setEditor(null); setAssignments([]); setActiveAssignment(null); setTab('dashboard'); };

  const handleUpdate = (updated) => {
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
    if (activeAssignment?.id === updated.id) setActiveAssignment(updated);
  };

  // Real-time
  useEffect(() => {
    if (!editor) return;
    const unsub = base44.entities.EditAssignment.subscribe((event) => {
      if (event.data?.editor_name !== editor.name) return;
      if (event.type === 'create' && event.data?.published !== false) setAssignments(prev => [event.data, ...prev]);
      if (event.type === 'update') handleUpdate(event.data);
      if (event.type === 'delete') setAssignments(prev => prev.filter(a => a.id !== event.id));
    });
    return unsub;
  }, [editor?.name]);

  if (!editor) return <EditorLogin onLogin={handleLogin} />;

  const unreadTotal = assignments.reduce((n, a) => n + (a.messages || []).filter(m => m.from_role === 'studio' && !m.read_by_editor).length, 0);
  const revisionCount = assignments.filter(a => a.status === 'Revision Requested').length;

  const TABS = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { key: 'assignments', icon: FileText, label: 'Edits' },
    { key: 'messages', icon: MessageSquare, label: 'Msgs', badge: unreadTotal },
    { key: 'payments', icon: CreditCard, label: 'Pay' },
  ];

  const allMessages = assignments.flatMap(a => (a.messages || []).map(m => ({ ...m, assignmentId: a.id, assignmentName: a.deliverable_name, assignment: a })));

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #0A0A0A', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54, padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 22 }} />
            <div style={{ width: 1, height: 14, background: '#1A1A1A' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>Editor Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>{editor.name}</div>
            <button onClick={handleSignOut} style={{ width: 30, height: 30, borderRadius: 8, background: '#0D0D0D', border: '1px solid #111', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sign out"><X size={13} /></button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 120px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={24} color="#333" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : activeAssignment ? (
          <AssignmentDetail assignment={activeAssignment} editorName={editor.name} onUpdate={handleUpdate} onBack={() => setActiveAssignment(null)} />
        ) : (
          <>
            {tab === 'dashboard' && <EditorDashboard assignments={assignments} editorName={editor.name} onOpenAssignment={(a) => { setActiveAssignment(a); }} />}

            {tab === 'assignments' && (
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>All Assignments</div>
                {assignments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444', fontFamily: MONO, fontSize: 12 }}>No edits assigned right now.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assignments.map(a => <AssignmentCard key={a.id} assignment={a} onClick={() => setActiveAssignment(a)} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'messages' && (
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Messages</div>
                {allMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444', fontFamily: MONO, fontSize: 12 }}>No messages yet. Questions about an assignment will appear here.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {assignments.filter(a => (a.messages || []).length > 0).map(a => {
                      const unread = (a.messages || []).filter(m => m.from_role === 'studio' && !m.read_by_editor).length;
                      const lastMsg = (a.messages || []).slice(-1)[0];
                      return (
                        <button key={a.id} onClick={() => { setActiveAssignment(a); }} style={{ textAlign: 'left', background: '#080808', border: `1px solid ${unread > 0 ? 'rgba(74,158,255,0.2)' : '#111'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💬</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{a.deliverable_name}</div>
                            {lastMsg && <div style={{ fontSize: 12, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastMsg.from_role === 'studio' ? 'Studio 65: ' : 'You: '}{lastMsg.body}</div>}
                          </div>
                          {unread > 0 && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4A9EFF', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{unread}</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'payments' && (
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Payments</div>
                {assignments.filter(a => a.rate_amount > 0).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444', fontFamily: MONO, fontSize: 12 }}>Your editor payment records will appear here once assignments are completed or marked for payment.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {assignments.filter(a => a.rate_amount > 0).map(a => {
                      const ps = { Unpaid: { bg: 'rgba(232,26,26,0.08)', clr: '#E81A1A' }, Pending: { bg: 'rgba(245,158,11,0.08)', clr: '#F59E0B' }, Paid: { bg: 'rgba(123,200,83,0.08)', clr: '#7BC853' } }[a.payment_status] || { bg: 'rgba(100,100,100,0.08)', clr: '#666' };
                      return (
                        <div key={a.id} style={{ background: '#080808', border: '1px solid #0F0F0F', borderRadius: 14, padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{a.deliverable_name}</div>
                              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>{a.project_name}</div>
                            </div>
                            <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 10px', borderRadius: 6, background: ps.bg, color: ps.clr, fontWeight: 700 }}>{a.payment_status}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div><div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginBottom: 3 }}>RATE</div><div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>${a.rate_amount} <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{a.rate_type}</span></div></div>
                            {a.payment_due_date && <div><div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginBottom: 3 }}>DUE</div><div style={{ fontSize: 13, color: '#888' }}>{a.payment_due_date}</div></div>}
                          </div>
                          {a.payment_notes && <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, color: '#444' }}>{a.payment_notes}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Nav */}
      {!activeAssignment && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid #0A0A0A', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 4px', cursor: 'pointer', position: 'relative', minHeight: 60 }}>
                {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, borderRadius: '0 0 2px 2px', background: '#E81A1A' }} />}
                {t.badge > 0 && <div style={{ position: 'absolute', top: 8, right: '50%', transform: 'translateX(10px)', minWidth: 16, height: 16, borderRadius: 8, background: '#E81A1A', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontFamily: MONO }}>{t.badge > 9 ? '9+' : t.badge}</div>}
                <t.icon size={18} color={active ? '#fff' : '#333'} strokeWidth={active ? 2 : 1.5} />
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? '#fff' : '#333', fontFamily: MONO }}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}