import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import BookingRequestsInbox from './BookingRequestsInbox';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };

const TYPE_BADGE = {
  script: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', label: '📝 Script' },
  approval_request: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: '✅ Approval Req' },
  file: { bg: 'rgba(74,158,255,0.15)', color: '#4A9EFF', label: '📎 File' },
  idea: { bg: 'rgba(123,200,83,0.15)', color: '#7BC853', label: '💡 Idea' },
  message: { bg: 'rgba(150,150,150,0.1)', color: '#888', label: '💬 Message' },
};

const APPROVAL_STYLE = {
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '⏳ Pending' },
  approved: { bg: 'rgba(123,200,83,0.15)', color: '#7BC853', label: '✓ Approved' },
  rejected: { bg: 'rgba(232,26,26,0.12)', color: '#E81A1A', label: '✗ Rejected' },
  revision_requested: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Revision Req' },
};

// Studio sends to a specific client / project
function SendToClientForm({ projects, contacts, onSent }) {
  const [clientName, setClientName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [msgType, setMsgType] = useState('message');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const clientContacts = contacts.filter(c => (c.types || []).includes('Client'));
  const clientProjects = projectId ? [] : projects.filter(p => p.client?.toLowerCase() === clientName.toLowerCase());

  const handleSend = async () => {
    if (!clientName) { showToast('Select a client', 'red'); return; }
    if (!body.trim() && !file) { showToast('Add a message or file', 'red'); return; }
    setSending(true);
    let file_url = '', file_name = '';
    if (file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
      file_name = file.name;
    }
    const project = projects.find(p => p.id === projectId);
    const needsApproval = msgType === 'script' || msgType === 'approval_request';
    const created = await base44.entities.ClientMessage.create({
      project_id: projectId || '',
      project_name: project?.name || '',
      client_name: clientName,
      from: 'studio',
      type: msgType,
      title: title.trim() || (needsApproval ? 'Please review and approve' : file_name || 'Message from Studio 65'),
      body: body.trim(),
      file_url,
      file_name,
      approval_status: needsApproval ? 'pending' : undefined,
      read_by_client: false,
      read_by_studio: true,
    });
    showToast('Sent to ' + clientName, 'green');
    setBody(''); setTitle(''); setFile(null); setMsgType('message');
    if (fileRef.current) fileRef.current.value = '';
    onSent(created);
    setSending(false);
  };

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 14 }}>Send to Client</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Client</label>
          <select style={IS} value={clientName} onChange={e => { setClientName(e.target.value); setProjectId(''); }}>
            <option value="">— select client —</option>
            {clientContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Project (optional)</label>
          <select style={IS} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">— general —</option>
            {projects.filter(p => !clientName || p.client?.toLowerCase() === clientName.toLowerCase()).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { v: 'message', label: '💬 Message' },
            { v: 'script', label: '📝 Script' },
            { v: 'approval_request', label: '✅ Approval Request' },
            { v: 'file', label: '📎 File' },
          ].map(opt => (
            <button key={opt.v} onClick={() => setMsgType(opt.v)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: msgType === opt.v ? '#E81A1A' : 'transparent', color: msgType === opt.v ? '#fff' : '#666' }}>{opt.label}</button>
          ))}
        </div>
      </div>

      {(msgType === 'script' || msgType === 'approval_request' || msgType === 'file') && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Title</label>
          <input style={IS} placeholder="e.g. Brand Video Script Draft 1" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>
          {msgType === 'script' ? 'Script Content' : 'Message / Notes'}
        </label>
        <textarea
          rows={msgType === 'script' ? 6 : 3}
          style={{ ...IS, resize: 'vertical', lineHeight: 1.6 }}
          placeholder={msgType === 'script' ? 'Paste the script here...' : msgType === 'approval_request' ? 'Describe what needs approval...' : 'Write your message...'}
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Attach File (optional)</label>
          <input ref={fileRef} type="file" onChange={e => setFile(e.target.files[0])} style={{ color: '#666', fontSize: 11, fontFamily: MONO }} />
        </div>
        <button onClick={handleSend} disabled={sending} style={{ padding: '10px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: sending ? 0.7 : 1 }}>
          {sending ? 'Sending...' : '📤 Send'}
        </button>
      </div>
    </div>
  );
}

export default function ClientInbox({ projects, contacts }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [showSendForm, setShowSendForm] = useState(false);

  const clientContacts = contacts.filter(c => (c.types || []).includes('Client'));

  useEffect(() => {
    base44.entities.ClientMessage.list('-created_date', 200).then(msgs => {
      setMessages(msgs);
      setLoading(false);
      // Mark client messages as read by studio
      msgs.filter(m => m.from === 'client' && !m.read_by_studio).forEach(m =>
        base44.entities.ClientMessage.update(m.id, { ...m, read_by_studio: true })
      );
    });
  }, []);

  const handleSent = (msg) => {
    setMessages(prev => [msg, ...prev]);
    setShowSendForm(false);
  };

  const handleDelete = async (msg) => {
    if (!confirm('Delete this message?')) return;
    await base44.entities.ClientMessage.delete(msg.id);
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    showToast('Deleted', 'red');
  };

  const filtered = messages.filter(m => {
    if (filterClient !== 'All' && m.client_name !== filterClient) return false;
    if (filterType !== 'All' && m.type !== filterType) return false;
    return true;
  });

  const unreadFromClients = messages.filter(m => m.from === 'client' && !m.read_by_studio).length;
  const pendingApprovals = messages.filter(m => m.from === 'studio' && m.approval_status === 'pending').length;

  if (loading) return <div style={{ color: '#444', fontFamily: MONO, fontSize: 11, padding: 20 }}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Client Inbox</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadFromClients > 0 && <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 9px', borderRadius: 4, background: 'rgba(74,158,255,0.12)', color: '#4A9EFF' }}>{unreadFromClients} new from clients</span>}
            {pendingApprovals > 0 && <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 9px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>{pendingApprovals} awaiting approval</span>}
          </div>
        </div>
        <button
          onClick={() => setShowSendForm(s => !s)}
          style={{ padding: '8px 16px', background: showSendForm ? '#2A2A2A' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {showSendForm ? '✕ Cancel' : '+ Send to Client'}
        </button>
      </div>

      {showSendForm && (
        <SendToClientForm projects={projects} contacts={contacts} onSent={handleSent} />
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={{ ...IS, width: 'auto', color: filterClient !== 'All' ? '#fff' : '#555' }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="All">All Clients</option>
          {clientContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select style={{ ...IS, width: 'auto', color: filterType !== 'All' ? '#fff' : '#555' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          {Object.entries(TYPE_BADGE).map(([v, tb]) => <option key={v} value={v}>{tb.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#444' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.25 }}>💬</div>
          <div style={{ fontSize: 13 }}>{messages.length ? 'No messages match filters.' : 'No client messages yet. Send your first one above.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(msg => {

            const isFromClient = msg.from === 'client';
            const tb = TYPE_BADGE[msg.type] || TYPE_BADGE.message;
            const ap = msg.approval_status ? APPROVAL_STYLE[msg.approval_status] : null;
            return (
              <div key={msg.id} style={{
                background: isFromClient ? 'rgba(74,158,255,0.04)' : '#1A1A1A',
                border: `1px solid ${isFromClient ? 'rgba(74,158,255,0.15)' : '#222'}`,
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: isFromClient ? 'rgba(74,158,255,0.12)' : 'rgba(232,26,26,0.1)', color: isFromClient ? '#4A9EFF' : '#E81A1A' }}>
                    {isFromClient ? `👤 ${msg.client_name}` : '📩 You → ' + msg.client_name}
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: tb.bg, color: tb.color }}>{tb.label}</span>
                  {msg.project_name && <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{msg.project_name}</span>}
                  {ap && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: ap.bg, color: ap.color }}>{ap.label}</span>}
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginLeft: 'auto' }}>{new Date(msg.created_date).toLocaleDateString('en-CA')}</span>
                  <button onClick={() => handleDelete(msg)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 15, padding: '0 4px', lineHeight: 1 }}>×</button>
                </div>
                {msg.title && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{msg.title}</div>}
                {msg.body && <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.body}</div>}
                {msg.file_url && (
                  <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 6, fontSize: 11, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none', marginTop: 6 }}>
                    📎 {msg.file_name || 'Download file'}
                  </a>
                )}
                {msg.approval_note && (
                  <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', display: 'block', marginBottom: 2 }}>CLIENT NOTE</span>
                    {msg.approval_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Requests */}
      <div style={{ marginTop: 32, borderTop: '1px solid #1E1E1E', paddingTop: 24 }}>
        <BookingRequestsInbox />
      </div>
    </div>
  );
}