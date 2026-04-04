import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange, STATUS_STYLE } from '@/lib/studio';
import BookingRequestForm from '@/components/portal/BookingRequestForm';
import ClientContractsTab from '@/components/portal/ClientContractsTab';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };

const TYPE_BADGE = {
  script:           { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', label: '📝 Script' },
  approval_request: { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', label: '✅ For Approval' },
  file:             { bg: 'rgba(74,158,255,0.15)',   color: '#4A9EFF', label: '📎 File' },
  idea:             { bg: 'rgba(123,200,83,0.15)',   color: '#7BC853', label: '💡 Idea' },
  message:          { bg: 'rgba(150,150,150,0.1)',   color: '#888',    label: '💬 Message' },
};

const APPROVAL_STYLE = {
  pending:            { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: '⏳ Awaiting Your Response' },
  approved:           { bg: 'rgba(123,200,83,0.15)',  color: '#7BC853', label: '✓ Approved' },
  rejected:           { bg: 'rgba(232,26,26,0.12)',   color: '#E81A1A', label: '✗ Rejected' },
  revision_requested: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Revision Requested' },
};

// ── Login ──────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const urlCode = new URLSearchParams(window.location.search).get('code') || '';
  const [password, setPassword] = useState(urlCode);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError('');
    const contacts = await base44.entities.Contact.filter({ portal_password: password.trim() });
    if (!contacts.length) {
      setError('Invalid access code. Please check with Studio 65.');
      setLoading(false); return;
    }
    const c = contacts[0];
    const [allProjects, allMsgs] = await Promise.all([
      base44.entities.Project.list('-date', 200),
      base44.entities.ClientMessage.filter({ client_name: c.name }),
    ]);
    const myProjects = allProjects.filter(p => (p.client || '').toLowerCase() === c.name.toLowerCase());
    const sorted     = allMsgs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    // mark as read silently
    sorted.filter(m => m.from === 'studio' && !m.read_by_client)
          .forEach(m => base44.entities.ClientMessage.update(m.id, { ...m, read_by_client: true }));
    // load contracts for this client
    const allContracts = await base44.entities.Contract.filter({ contact_name: c.name });
    onLogin(c, myProjects, sorted, allContracts);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 64, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Client Portal</div>
          <div style={{ fontSize: 13, color: '#555' }}>Your private space to collaborate with Studio 65</div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 16, padding: 32 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 10, display: 'block' }}>
            Access Code
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your personal code"
            autoFocus
            style={{ ...IS, marginBottom: 16, fontSize: 16, letterSpacing: '0.1em' }}
          />
          {error && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            {loading ? 'Loading your portal...' : 'Enter Portal →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#444' }}>
          No access code? Contact Studio 65 to get set up.
        </div>
      </div>
    </div>
  );
}

// ── Approval Banner ────────────────────────────────────────────────────────

function ApprovalBanner({ count, onClick }) {
  if (!count) return null;
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, cursor: 'pointer', marginBottom: 24, textAlign: 'left' }}>
      <span style={{ fontSize: 24 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', marginBottom: 2 }}>
          {count} item{count !== 1 ? 's' : ''} waiting for your approval
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>Tap to review — your input is needed</div>
      </div>
      <span style={{ color: '#F59E0B', fontSize: 16 }}>→</span>
    </button>
  );
}

// ── Message Card ───────────────────────────────────────────────────────────

function MessageCard({ msg, onApproval }) {
  const [expanded, setExpanded]           = useState(!!(msg.type === 'approval_request' || msg.type === 'script') && msg.approval_status === 'pending');
  const [showApprovalInput, setShow]      = useState(false);
  const [approvalNote, setApprovalNote]   = useState('');
  const [saving, setSaving]               = useState(false);

  const isFromStudio = msg.from === 'studio';
  const tb           = TYPE_BADGE[msg.type] || TYPE_BADGE.message;
  const needsApproval = isFromStudio && (msg.type === 'script' || msg.type === 'approval_request') && (!msg.approval_status || msg.approval_status === 'pending');
  const ap            = msg.approval_status ? APPROVAL_STYLE[msg.approval_status] : null;
  const responded     = msg.approval_status && msg.approval_status !== 'pending';

  const doApproval = async (status) => {
    setSaving(true);
    await onApproval(msg, status, approvalNote.trim());
    setShow(false); setApprovalNote(''); setSaving(false);
  };

  return (
    <div style={{
      background: needsApproval ? 'rgba(245,158,11,0.04)' : isFromStudio ? '#1A1A1A' : 'rgba(74,158,255,0.04)',
      border: `1px solid ${needsApproval ? 'rgba(245,158,11,0.25)' : isFromStudio ? '#252525' : 'rgba(74,158,255,0.15)'}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Card header — always visible */}
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: tb.bg, color: tb.color }}>{tb.label}</span>
            {ap && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: ap.bg, color: ap.color }}>{ap.label}</span>}
            {!isFromStudio && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: 'rgba(74,158,255,0.12)', color: '#4A9EFF' }}>Sent by you</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {msg.title || (isFromStudio ? 'Message from Studio 65' : 'Your message')}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2, fontFamily: MONO }}>
            {new Date(msg.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
            {msg.project_name && ` · ${msg.project_name}`}
          </div>
        </div>
        <span style={{ color: '#444', fontSize: 14, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid #222', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msg.body && (
            <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px' }}>
              {msg.body}
            </div>
          )}

          {msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 10, fontSize: 13, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none', alignSelf: 'flex-start' }}>
              📎 {msg.file_name || 'View / Download File'}
            </a>
          )}

          {/* Approval panel */}
          {needsApproval && (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 10 }}>⚠️ Your response is needed</div>
              {showApprovalInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    rows={3}
                    value={approvalNote}
                    onChange={e => setApprovalNote(e.target.value)}
                    placeholder="Add a note (optional for Approve, helpful for Revision/Reject)..."
                    style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif', width: '100%' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => doApproval('approved')} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#7BC853', color: '#000', minWidth: 80 }}>✓ Approve</button>
                    <button onClick={() => doApproval('revision_requested')} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', minWidth: 100 }}>🔄 Request Revision</button>
                    <button onClick={() => doApproval('rejected')} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(232,26,26,0.15)', color: '#E81A1A', minWidth: 80 }}>✗ Reject</button>
                  </div>
                  <button onClick={() => setShow(false)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: 0 }}>← Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShow(true)} style={{ width: '100%', padding: '12px 0', background: '#F59E0B', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Tap to Respond →
                </button>
              )}
            </div>
          )}

          {/* Show response that was already given */}
          {responded && ap && (
            <div style={{ background: ap.bg, border: `1px solid ${ap.color}30`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ap.color, marginBottom: msg.approval_note ? 4 : 0 }}>{ap.label}</div>
              {msg.approval_note && <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>{msg.approval_note}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compose form ───────────────────────────────────────────────────────────

function ComposeForm({ projects, contact, onSent, onClose }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [msgType, setMsgType]     = useState('message');
  const [msgTitle, setMsgTitle]   = useState('');
  const [msgBody, setMsgBody]     = useState('');
  const [msgFile, setMsgFile]     = useState(null);
  const [sending, setSending]     = useState(false);
  const fileRef                   = useRef(null);

  const handleSend = async () => {
    if (!msgBody.trim() && !msgFile) return;
    setSending(true);
    let file_url = '', file_name = '';
    if (msgFile) {
      const res = await base44.integrations.Core.UploadFile({ file: msgFile });
      file_url = res.file_url; file_name = msgFile.name;
    }
    const project = projects.find(p => p.id === projectId);
    const created = await base44.entities.ClientMessage.create({
      project_id: projectId || '',
      project_name: project?.name || '',
      client_name: contact.name,
      from: 'client',
      type: msgType,
      title: msgTitle.trim() || (msgType === 'idea' ? 'New Idea' : file_name || 'Message'),
      body: msgBody.trim(),
      file_url, file_name,
      read_by_studio: false,
      read_by_client: true,
    });
    onSent(created);
    setSending(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom)' }}>
      <div style={{ width: '100%', maxWidth: 600, background: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Message Studio 65</div>
          <button onClick={onClose} style={{ background: '#2A2A2A', border: 'none', color: '#aaa', fontSize: 18, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {projects.length > 1 && (
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>About Which Project?</label>
            <select style={IS} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">General</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>What are you sending?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ v: 'message', label: '💬 Message' }, { v: 'idea', label: '💡 Idea / Brief' }, { v: 'file', label: '📎 File' }].map(opt => (
              <button key={opt.v} onClick={() => setMsgType(opt.v)} style={{ padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: msgType === opt.v ? '#E81A1A' : '#2A2A2A', color: msgType === opt.v ? '#fff' : '#777' }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {(msgType === 'idea' || msgType === 'file') && (
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Title</label>
            <input style={IS} placeholder={msgType === 'idea' ? 'e.g. Spring campaign concept' : 'File description'} value={msgTitle} onChange={e => setMsgTitle(e.target.value)} />
          </div>
        )}

        <div>
          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
            {msgType === 'idea' ? 'Describe your idea' : msgType === 'file' ? 'Notes (optional)' : 'Your message'}
          </label>
          <textarea
            rows={5}
            style={{ ...IS, resize: 'vertical', lineHeight: 1.7 }}
            placeholder={msgType === 'idea' ? 'Tell us what you have in mind — mood, style, references, goals...' : msgType === 'file' ? 'Any context about this file...' : 'Write your message to Studio 65...'}
            value={msgBody}
            onChange={e => setMsgBody(e.target.value)}
            autoFocus
          />
        </div>

        {(msgType === 'file' || msgType === 'idea') && (
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Attach File (optional)</label>
            <input ref={fileRef} type="file" onChange={e => setMsgFile(e.target.files[0])} style={{ color: '#888', fontSize: 13, fontFamily: MONO }} />
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || (!msgBody.trim() && !msgFile)}
          style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (sending || (!msgBody.trim() && !msgFile)) ? 0.5 : 1, marginTop: 4 }}
        >
          {sending ? 'Sending...' : '📤 Send to Studio 65'}
        </button>
      </div>
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────

export default function ClientPortal() {
  const [contact, setContact]           = useState(null);
  const [projects, setProjects]         = useState([]);
  const [messages, setMessages]         = useState([]);
  const [contracts, setContracts]       = useState([]);
  const [tab, setTab]                   = useState('inbox');
  const [showCompose, setShowCompose]   = useState(false);
  const [showBooking, setShowBooking]   = useState(false);
  const [projectFilter, setProjectFilter] = useState(null);

  const handleLogin = (c, projs, msgs, contracts) => { setContact(c); setProjects(projs); setMessages(msgs); setContracts(contracts || []); };

  const handleApproval = async (msg, status, note = '') => {
    const updated = { ...msg, approval_status: status, approval_note: note };
    await base44.entities.ClientMessage.update(msg.id, updated);
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
  };

  const handleSent = (msg) => {
    setMessages(prev => [msg, ...prev]);
    setShowCompose(false);
  };

  const [bookingSent, setBookingSent] = useState(false);

  const handleSignOut = () => { setContact(null); setProjects([]); setMessages([]); setTab('inbox'); setBookingSent(false); };

  if (!contact) return <LoginScreen onLogin={handleLogin} />;

  const pendingApprovals = messages.filter(m => m.from === 'studio' && (m.type === 'script' || m.type === 'approval_request') && m.approval_status === 'pending').length;
  const displayMessages  = projectFilter ? messages.filter(m => m.project_id === projectFilter) : messages;

  const unreadCount = messages.filter(m => m.from === 'studio' && !m.read_by_client).length;

  const TABS = [
    { key: 'inbox',     label: 'Inbox', badge: unreadCount },
    { key: 'projects',  label: 'Projects' },
    { key: 'contracts', label: '📝 Contracts' },
    { key: 'book',      label: '📅 Book a Shoot' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1A1A1A', background: '#0A0A0A', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 26 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{contact.name}</div>
            <button onClick={handleSignOut} style={{ padding: '6px 12px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 100px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>Hey {contact.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 13, color: '#555' }}>{projects.length} active project{projects.length !== 1 ? 's' : ''} with Studio 65</div>
        </div>

        {/* Pending approvals banner */}
        <ApprovalBanner count={pendingApprovals} onClick={() => { setTab('inbox'); setProjectFilter(null); }} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#1A1A1A', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ position: 'relative', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.key ? '#E81A1A' : 'transparent', color: tab === t.key ? '#fff' : '#666' }}>
              {t.label}
              {t.badge > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#4A9EFF', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge > 9 ? '9+' : t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── INBOX ── */}
        {tab === 'inbox' && (
          <div>
            {/* Project filter chips */}
            {projects.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button onClick={() => setProjectFilter(null)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #2A2A2A', background: !projectFilter ? '#E81A1A' : 'transparent', color: !projectFilter ? '#fff' : '#555' }}>All</button>
                {projects.map(p => (
                  <button key={p.id} onClick={() => setProjectFilter(p.id === projectFilter ? null : p.id)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #2A2A2A', background: projectFilter === p.id ? '#E81A1A' : 'transparent', color: projectFilter === p.id ? '#fff' : '#555' }}>{p.name}</button>
                ))}
              </div>
            )}

            {displayMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#666' }}>Your inbox is empty</div>
                <div style={{ fontSize: 13 }}>Studio 65 will send you updates, files, and items for approval right here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayMessages.map(msg => (
                  <MessageCard key={msg.id} msg={msg} onApproval={handleApproval} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROJECTS ── */}
        {tab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🎬</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#666' }}>No projects yet</div>
              </div>
            ) : projects.map(p => {
              const st      = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
              const del     = p.deliverables || [];
              const doneDel = del.filter(d => d.done).length;
              return (
                <div key={p.id} style={{ background: '#1A1A1A', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden' }}>
                  {/* Project header */}
                  <div style={{ padding: '18px 20px', borderBottom: del.length || p.notes ? '1px solid #222' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.name}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, fontFamily: MONO, fontWeight: 600, background: st.bg, color: st.clr }}>{p.status}</span>
                          {p.date && <span style={{ fontSize: 12, color: '#666' }}>📅 {fmtDateRange(p)}</span>}
                        </div>
                      </div>
                      {p.paid && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, fontFamily: MONO, fontWeight: 700, background: 'rgba(123,200,83,0.12)', color: '#7BC853', flexShrink: 0 }}>✓ Paid</span>}
                    </div>
                    {p.address && <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>📍 {p.address}</div>}
                  </div>

                  {/* Deliverables */}
                  {del.length > 0 && (
                    <div style={{ padding: '14px 20px', borderBottom: p.notes ? '1px solid #222' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase' }}>Deliverables</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: doneDel === del.length ? '#7BC853' : '#666' }}>{doneDel}/{del.length} done</div>
                      </div>
                      <div style={{ height: 5, background: '#2A2A2A', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ height: '100%', width: `${del.length ? (doneDel / del.length) * 100 : 0}%`, background: '#7BC853', borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {del.map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${d.done ? '#7BC853' : '#333'}`, background: d.done ? '#7BC853' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {d.done && <span style={{ fontSize: 10, color: '#000' }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 13, textDecoration: d.done ? 'line-through' : 'none', color: d.done ? '#444' : '#ddd', flex: 1 }}>{d.name}</span>
                            {d.due && <span style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>{d.due}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {p.notes && (
                    <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Notes from Studio 65</div>
                      <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.7 }}>{p.notes}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* ── CONTRACTS ── */}
        {tab === 'contracts' && (
          <ClientContractsTab contracts={contracts} contact={contact} onContractsChange={setContracts} />
        )}

        {/* ── BOOK ── */}
        {tab === 'book' && (
          <div style={{ paddingTop: 8 }}>
            {bookingSent ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#7BC853' }}>Booking Request Sent!</div>
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 28 }}>
                  Studio 65 has received your request and will be in touch shortly to confirm availability and next steps.
                </div>
                <button
                  onClick={() => setBookingSent(false)}
                  style={{ padding: '12px 28px', background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, color: '#ccc', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Book a Shoot</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                    Submit a booking request and Studio 65 will get back to you to confirm availability and details.
                  </div>
                </div>
                <button
                  onClick={() => setShowBooking(true)}
                  style={{ width: '100%', padding: '16px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                >
                  📅 Submit a Booking Request →
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {showBooking && <BookingRequestForm contact={contact} onSent={() => { setShowBooking(false); setBookingSent(true); }} onClose={() => setShowBooking(false)} />}

      {/* Floating compose button — only on inbox */}
      {tab !== 'book' && (
        <button
          onClick={() => setShowCompose(true)}
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 150, width: 56, height: 56, borderRadius: '50%', background: '#E81A1A', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(232,26,26,0.4)' }}
          title="Message Studio 65"
        >✏</button>
      )}

      {showCompose && <ComposeForm projects={projects} contact={contact} onSent={handleSent} onClose={() => setShowCompose(false)} />}
    </div>
  );
}