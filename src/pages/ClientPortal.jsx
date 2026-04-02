import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange, STATUS_STYLE } from '@/lib/studio';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };

const TYPE_BADGE = {
  script: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', label: '📝 Script' },
  approval_request: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: '✅ Approval' },
  file: { bg: 'rgba(74,158,255,0.15)', color: '#4A9EFF', label: '📎 File' },
  idea: { bg: 'rgba(123,200,83,0.15)', color: '#7BC853', label: '💡 Idea' },
  message: { bg: 'rgba(150,150,150,0.1)', color: '#888', label: '💬 Message' },
};

const APPROVAL_STYLE = {
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '⏳ Awaiting Review' },
  approved: { bg: 'rgba(123,200,83,0.15)', color: '#7BC853', label: '✓ Approved' },
  rejected: { bg: 'rgba(232,26,26,0.12)', color: '#E81A1A', label: '✗ Rejected' },
  revision_requested: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Revision Requested' },
};

export default function ClientPortal() {
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState(null);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [tab, setTab] = useState('inbox');

  // New message form
  const [msgType, setMsgType] = useState('message');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgFile, setMsgFile] = useState(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    const contacts = await base44.entities.Contact.filter({ portal_password: password.trim() });
    const clientContacts = contacts.filter(c => (c.types || []).includes('Client'));
    if (!clientContacts.length) {
      setError('Invalid access code. Please check with Studio 65.');
      setLoading(false);
      return;
    }
    const c = clientContacts[0];
    setContact(c);
    const [allProjects, allMsgs] = await Promise.all([
      base44.entities.Project.list('-date', 200),
      base44.entities.ClientMessage.filter({ client_name: c.name }),
    ]);
    const myProjects = allProjects.filter(p => (p.client || '').toLowerCase() === c.name.toLowerCase());
    setProjects(myProjects);
    setMessages(allMsgs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    // Mark studio messages as read
    const unread = allMsgs.filter(m => m.from === 'studio' && !m.read_by_client);
    unread.forEach(m => base44.entities.ClientMessage.update(m.id, { ...m, read_by_client: true }));
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!msgBody.trim() && !msgFile) return;
    setSending(true);
    let file_url = '';
    let file_name = '';
    if (msgFile) {
      const res = await base44.integrations.Core.UploadFile({ file: msgFile });
      file_url = res.file_url;
      file_name = msgFile.name;
    }
    const projectId = activeProjectId || (projects[0]?.id || '');
    const projectName = projects.find(p => p.id === projectId)?.name || '';
    const created = await base44.entities.ClientMessage.create({
      project_id: projectId,
      project_name: projectName,
      client_name: contact.name,
      from: 'client',
      type: msgType,
      title: msgTitle.trim() || (msgType === 'idea' ? 'New Idea' : msgType === 'file' ? file_name : 'Message'),
      body: msgBody.trim(),
      file_url,
      file_name,
      read_by_studio: false,
      read_by_client: true,
    });
    setMessages(prev => [created, ...prev]);
    setMsgTitle(''); setMsgBody(''); setMsgFile(null); setMsgType('message');
    if (fileRef.current) fileRef.current.value = '';
    setSending(false);
  };

  const handleApproval = async (msg, status, note = '') => {
    const updated = { ...msg, approval_status: status, approval_note: note };
    await base44.entities.ClientMessage.update(msg.id, updated);
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
  };

  const handleSignOut = () => {
    setContact(null); setProjects([]); setMessages([]);
    setPassword(''); setActiveProjectId(null); setTab('inbox');
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!contact) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 60, marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#666', fontFamily: MONO }}>Client Portal</div>
          </div>
          <form onSubmit={handleLogin} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 14, padding: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 8, display: 'block' }}>
                Enter your access code
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your personal code"
                autoFocus
                style={{ background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' }}
              />
            </div>
            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 8, fontSize: 12, color: '#E81A1A' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Checking...' : 'Access My Portal'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#444' }}>
            Contact Studio 65 if you don't have an access code.
          </div>
        </div>
      </div>
    );
  }

  const projectMessages = (pid) => messages.filter(m => m.project_id === pid);
  const unreadFromStudio = messages.filter(m => m.from === 'studio' && !m.read_by_client).length;
  const pendingApprovals = messages.filter(m => m.from === 'studio' && (m.type === 'script' || m.type === 'approval_request') && m.approval_status === 'pending').length;

  const displayProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;
  const activeMessages = activeProjectId ? projectMessages(activeProjectId) : messages;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1E1E1E', background: 'rgba(10,10,10,0.97)', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50, paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 28 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{contact.name}</div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: MONO }}>Client</div>
            </div>
            <button onClick={handleSignOut} style={{ padding: '5px 12px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 6, color: '#666', fontSize: 11, cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Hey {contact.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 13, color: '#666' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
            {pendingApprovals > 0 && <span style={{ marginLeft: 12, padding: '2px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 12, fontWeight: 700 }}>⚠ {pendingApprovals} awaiting your approval</span>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, background: '#1A1A1A', border: '1px solid #222', borderRadius: 8, padding: 3, marginBottom: 24, width: 'fit-content' }}>
          {[
            { key: 'inbox', label: '💬 Messages' },
            { key: 'projects', label: '🎬 Projects' },
            { key: 'send', label: '📤 Send to Studio' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: tab === t.key ? '#E81A1A' : 'transparent',
              color: tab === t.key ? '#fff' : '#666',
              fontFamily: 'Syne, sans-serif',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── INBOX TAB ── */}
        {tab === 'inbox' && (
          <div>
            {/* Project filter */}
            {projects.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button onClick={() => setActiveProjectId(null)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: !activeProjectId ? '#E81A1A' : 'transparent', color: !activeProjectId ? '#fff' : '#666' }}>All</button>
                {projects.map(p => (
                  <button key={p.id} onClick={() => setActiveProjectId(p.id)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: activeProjectId === p.id ? '#E81A1A' : 'transparent', color: activeProjectId === p.id ? '#fff' : '#666' }}>{p.name}</button>
                ))}
              </div>
            )}

            {activeMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: 13 }}>No messages yet. Studio 65 will send you scripts, files, and updates here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeMessages.map(msg => (
                  <MessageCard key={msg.id} msg={msg} onApproval={handleApproval} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROJECTS TAB ── */}
        {tab === 'projects' && (
          <div>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🎬</div>
                <div>No projects yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.map(p => {
                  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
                  const del = p.deliverables || [];
                  const doneDel = del.filter(d => d.done).length;
                  const unreadMsgs = projectMessages(p.id).filter(m => m.from === 'studio').length;
                  return (
                    <div key={p.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: st.bg, color: st.clr }}>{p.status}</span>
                            {unreadMsgs > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>{unreadMsgs} message{unreadMsgs !== 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                        {p.paid && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 4, fontFamily: MONO, fontWeight: 700, background: 'rgba(123,200,83,0.12)', color: '#7BC853' }}>✓ Paid</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                        {p.date && <div style={{ fontSize: 12, color: '#888' }}>📅 {fmtDateRange(p)}</div>}
                        {p.address && <div style={{ fontSize: 12, color: '#888' }}>📍 {p.address}</div>}
                      </div>
                      {del.length > 0 && (
                        <div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Deliverables — {doneDel}/{del.length}</div>
                          <div style={{ height: 4, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${del.length ? (doneDel / del.length) * 100 : 0}%`, background: '#7BC853', borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {del.map((d, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.done ? '#7BC853' : '#444', flexShrink: 0 }} />
                                <span style={{ textDecoration: d.done ? 'line-through' : 'none', color: d.done ? '#555' : '#ddd' }}>{d.name}</span>
                                {d.due && <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginLeft: 'auto' }}>{d.due}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {p.notes && (
                        <div style={{ marginTop: 12, padding: '10px 12px', background: '#2A2A2A', borderRadius: 8, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Notes from Studio</div>
                          {p.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SEND TAB ── */}
        {tab === 'send' && (
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 16 }}>Send to Studio 65</div>

            {projects.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Regarding Project</label>
                <select style={IS} value={activeProjectId || ''} onChange={e => setActiveProjectId(e.target.value || null)}>
                  <option value="">— General (not project-specific) —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { v: 'message', label: '💬 Message' },
                  { v: 'idea', label: '💡 Idea / Brief' },
                  { v: 'file', label: '📎 File' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setMsgType(opt.v)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: msgType === opt.v ? '#E81A1A' : '#1E1E1E', color: msgType === opt.v ? '#fff' : '#666' }}>{opt.label}</button>
                ))}
              </div>
            </div>

            {(msgType === 'idea' || msgType === 'file') && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Title</label>
                <input style={IS} placeholder={msgType === 'idea' ? 'e.g. Concept for spring campaign...' : 'File description...'} value={msgTitle} onChange={e => setMsgTitle(e.target.value)} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                {msgType === 'idea' ? 'Describe your idea' : msgType === 'file' ? 'Notes (optional)' : 'Message'}
              </label>
              <textarea
                rows={4}
                style={{ ...IS, resize: 'vertical', lineHeight: 1.6 }}
                placeholder={
                  msgType === 'idea' ? 'Tell us what you have in mind — mood, style, references, goals...' :
                  msgType === 'file' ? 'Any context about this file...' :
                  'Your message to Studio 65...'
                }
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
              />
            </div>

            {(msgType === 'file' || msgType === 'idea') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Attach File (optional)</label>
                <input ref={fileRef} type="file" onChange={e => setMsgFile(e.target.files[0])} style={{ color: '#888', fontSize: 12, fontFamily: MONO }} />
              </div>
            )}

            <button
              onClick={handleSendMessage}
              disabled={sending || (!msgBody.trim() && !msgFile)}
              style={{ width: '100%', padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (sending || (!msgBody.trim() && !msgFile)) ? 0.6 : 1 }}
            >
              {sending ? 'Sending...' : '📤 Send to Studio 65'}
            </button>

            {/* Past sends */}
            {messages.filter(m => m.from === 'client').length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Your Previous Sends</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.filter(m => m.from === 'client').map(msg => {
                    const tb = TYPE_BADGE[msg.type] || TYPE_BADGE.message;
                    return (
                      <div key={msg.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: msg.body ? 6 : 0 }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: tb.bg, color: tb.color }}>{tb.label}</span>
                          {msg.title && <span style={{ fontSize: 13, fontWeight: 600 }}>{msg.title}</span>}
                          <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginLeft: 'auto' }}>{new Date(msg.created_date).toLocaleDateString('en-CA')}</span>
                        </div>
                        {msg.body && <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>{msg.body}</div>}
                        {msg.file_url && <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: '#4A9EFF', display: 'block', marginTop: 6 }}>📎 {msg.file_name || 'Download file'}</a>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MessageCard({ msg, onApproval }) {
  const [showApprovalInput, setShowApprovalInput] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [saving, setSaving] = useState(false);

  const isFromStudio = msg.from === 'studio';
  const tb = TYPE_BADGE[msg.type] || TYPE_BADGE.message;
  const needsApproval = isFromStudio && (msg.type === 'script' || msg.type === 'approval_request');
  const ap = msg.approval_status ? APPROVAL_STYLE[msg.approval_status] : null;

  const doApproval = async (status) => {
    setSaving(true);
    await onApproval(msg, status, approvalNote.trim());
    setShowApprovalInput(false);
    setApprovalNote('');
    setSaving(false);
  };

  return (
    <div style={{
      background: isFromStudio ? '#1E1E1E' : 'rgba(74,158,255,0.05)',
      border: `1px solid ${isFromStudio ? '#2A2A2A' : 'rgba(74,158,255,0.15)'}`,
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: isFromStudio ? 'rgba(232,26,26,0.12)' : 'rgba(74,158,255,0.12)', color: isFromStudio ? '#E81A1A' : '#4A9EFF' }}>
          {isFromStudio ? '📩 Studio 65' : '👤 You'}
        </span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: tb.bg, color: tb.color }}>{tb.label}</span>
        {msg.project_name && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555' }}>{msg.project_name}</span>}
        {ap && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: ap.bg, color: ap.color }}>{ap.label}</span>}
        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#444', marginLeft: 'auto' }}>{new Date(msg.created_date).toLocaleDateString('en-CA')}</span>
      </div>

      {msg.title && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{msg.title}</div>}
      {msg.body && <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: msg.file_url ? 8 : 0 }}>{msg.body}</div>}
      {msg.file_url && (
        <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, fontSize: 12, color: '#4A9EFF', fontFamily: '"DM Mono", monospace', textDecoration: 'none', marginTop: 6 }}>
          📎 {msg.file_name || 'View / Download'}
        </a>
      )}

      {/* Approval actions */}
      {needsApproval && (!msg.approval_status || msg.approval_status === 'pending') && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {showApprovalInput ? (
            <>
              <textarea
                rows={2}
                value={approvalNote}
                onChange={e => setApprovalNote(e.target.value)}
                placeholder="Add a note (optional for approve, explain for revision/reject)..."
                style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif', width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => doApproval('approved')} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(123,200,83,0.2)', color: '#7BC853' }}>✓ Approve</button>
                <button onClick={() => doApproval('revision_requested')} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>🔄 Request Revision</button>
                <button onClick={() => doApproval('rejected')} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>✗ Reject</button>
                <button onClick={() => setShowApprovalInput(false)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: 'transparent', color: '#666' }}>Cancel</button>
              </div>
            </>
          ) : (
            <button onClick={() => setShowApprovalInput(true)} style={{ alignSelf: 'flex-start', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
              ✅ Review & Respond
            </button>
          )}
        </div>
      )}

      {/* Show approval note if set */}
      {msg.approval_note && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', display: 'block', marginBottom: 3 }}>YOUR NOTE</span>
          {msg.approval_note}
        </div>
      )}
    </div>
  );
}