import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const TYPE_BADGE = {
  script:           { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Script' },
  approval_request: { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: 'For Approval' },
  file:             { bg: 'rgba(74,158,255,0.12)',   color: '#4A9EFF', label: 'File' },
  idea:             { bg: 'rgba(123,200,83,0.12)',   color: '#7BC853', label: 'Idea' },
  message:          { bg: 'rgba(100,100,100,0.1)',   color: '#777',    label: 'Message' },
};

const APPROVAL_STYLE = {
  pending:            { bg: 'rgba(245,158,11,0.08)',  color: '#F59E0B', label: '⏳ Awaiting Response' },
  approved:           { bg: 'rgba(123,200,83,0.1)',   color: '#7BC853', label: '✓ Approved' },
  rejected:           { bg: 'rgba(232,26,26,0.08)',   color: '#E81A1A', label: '✗ Rejected' },
  revision_requested: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', label: '🔄 Revision Requested' },
};

function ApprovalPanel({ msg, onApproval }) {
  const [approvalNote, setApprovalNote] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const doApproval = async (status) => {
    setSaving(true);
    await onApproval(msg, status, approvalNote.trim());
    setOpen(false); setApprovalNote(''); setSaving(false);
  };

  return (
    <div style={{ marginTop: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 8 }}>Your response is needed</div>
      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            rows={3} value={approvalNote} onChange={e => setApprovalNote(e.target.value)}
            placeholder="Add a note (optional for approve, helpful for revision requests)..."
            autoFocus
            style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif', width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => doApproval('approved')} disabled={saving} style={{ flex: 1, minWidth: 80, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#7BC853', color: '#000' }}>✓ Approve</button>
            <button onClick={() => doApproval('revision_requested')} disabled={saving} style={{ flex: 1, minWidth: 110, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)', background: 'transparent', color: '#F59E0B' }}>🔄 Request Revision</button>
            <button onClick={() => doApproval('rejected')} disabled={saving} style={{ flex: 1, minWidth: 80, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(232,26,26,0.3)', background: 'transparent', color: '#E81A1A' }}>✗ Reject</button>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0 }}>← Cancel</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '12px 0', background: '#F59E0B', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Respond →
        </button>
      )}
    </div>
  );
}

function MessageBubble({ msg, onApproval }) {
  const [expanded, setExpanded] = useState(
    !!(msg.type === 'approval_request' || msg.type === 'script') && msg.approval_status === 'pending'
  );
  const isFromStudio = msg.from === 'studio';
  const tb = TYPE_BADGE[msg.type] || TYPE_BADGE.message;
  const needsApproval = isFromStudio && (msg.type === 'script' || msg.type === 'approval_request') && (!msg.approval_status || msg.approval_status === 'pending');
  const ap = msg.approval_status ? APPROVAL_STYLE[msg.approval_status] : null;
  const responded = msg.approval_status && msg.approval_status !== 'pending';

  return (
    <div style={{
      background: needsApproval ? 'rgba(245,158,11,0.03)' : isFromStudio ? '#0D0D0D' : 'rgba(74,158,255,0.04)',
      border: `1px solid ${needsApproval ? 'rgba(245,158,11,0.2)' : isFromStudio ? '#1A1A1A' : 'rgba(74,158,255,0.12)'}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '16px 18px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: isFromStudio ? 'rgba(232,26,26,0.12)' : 'rgba(74,158,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            color: isFromStudio ? '#E81A1A' : '#4A9EFF',
          }}>
            {isFromStudio ? 'S' : 'You'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isFromStudio ? '#fff' : '#4A9EFF' }}>
                {isFromStudio ? 'Studio 65' : 'You'}
              </span>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: tb.bg, color: tb.color }}>{tb.label}</span>
              {ap && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: ap.bg, color: ap.color }}>{ap.label}</span>}
            </div>
            {(msg.title && msg.type !== 'message') && (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{msg.title}</div>
            )}
            {msg.body && (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>
                {msg.body}
              </div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginTop: 5 }}>
              {new Date(msg.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
              {msg.project_name && ` · ${msg.project_name}`}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #141414', padding: '14px 18px' }}>
          {msg.body && (
            <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{msg.body}</div>
          )}
          {msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 10, fontSize: 12, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none', marginBottom: 12 }}>
              📎 {msg.file_name || 'View / Download'}
            </a>
          )}
          {needsApproval && <ApprovalPanel msg={msg} onApproval={onApproval} />}
          {responded && ap && (
            <div style={{ padding: '10px 12px', background: ap.bg, border: `1px solid ${ap.color}30`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ap.color }}>{ap.label}</div>
              {msg.approval_note && <div style={{ fontSize: 12, color: '#888', marginTop: 3, lineHeight: 1.5 }}>{msg.approval_note}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientMessagesTab({ messages, projects, contact, onApproval, onMessageSent }) {
  const [showCompose, setShowCompose] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [msgType, setMsgType] = useState('message');
  const [msgBody, setMsgBody] = useState('');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgFile, setMsgFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [projectFilter, setProjectFilter] = useState(null);
  const fileRef = useRef(null);

  const IS = { background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };

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
    onMessageSent(created);
    setMsgBody(''); setMsgTitle(''); setMsgFile(null); setSending(false); setShowCompose(false);
  };

  const displayed = projectFilter ? messages.filter(m => m.project_id === projectFilter) : messages;
  const pendingApprovals = messages.filter(m => m.from === 'studio' && (m.type === 'script' || m.type === 'approval_request') && (!m.approval_status || m.approval_status === 'pending')).length;

  return (
    <div>
      {/* Pending approvals banner */}
      {pendingApprovals > 0 && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{pendingApprovals} item{pendingApprovals > 1 ? 's' : ''} waiting for your response</div>
            <div style={{ fontSize: 12, color: '#666' }}>Scroll down to review and approve</div>
          </div>
        </div>
      )}

      {/* Project filter */}
      {projects.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => setProjectFilter(null)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #1E1E1E', background: !projectFilter ? '#E81A1A' : 'transparent', color: !projectFilter ? '#fff' : '#555' }}>All</button>
          {projects.map(p => (
            <button key={p.id} onClick={() => setProjectFilter(p.id === projectFilter ? null : p.id)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #1E1E1E', background: projectFilter === p.id ? '#E81A1A' : 'transparent', color: projectFilter === p.id ? '#fff' : '#555' }}>{p.name}</button>
          ))}
        </div>
      )}

      {/* Compose button */}
      <button onClick={() => setShowCompose(v => !v)} style={{ width: '100%', padding: '14px 0', marginBottom: 20, background: showCompose ? '#1A1A1A' : 'transparent', border: `1px solid ${showCompose ? '#333' : '#1E1E1E'}`, borderRadius: 14, color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {showCompose ? <X size={16} /> : <Send size={16} />}
        {showCompose ? 'Cancel' : 'Message Studio 65'}
      </button>

      {/* Compose form */}
      {showCompose && (
        <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {projects.length > 1 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>About which project?</div>
              <select style={IS} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>Type</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'message', label: '💬 Message' }, { v: 'idea', label: '💡 Idea' }, { v: 'file', label: '📎 File' }].map(opt => (
                <button key={opt.v} onClick={() => setMsgType(opt.v)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${msgType === opt.v ? '#E81A1A' : '#1E1E1E'}`, background: msgType === opt.v ? 'rgba(232,26,26,0.1)' : 'transparent', color: msgType === opt.v ? '#E81A1A' : '#555' }}>{opt.label}</button>
              ))}
            </div>
          </div>
          {(msgType === 'idea' || msgType === 'file') && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>Title</div>
              <input style={IS} placeholder={msgType === 'idea' ? 'e.g. Spring campaign concept' : 'File description'} value={msgTitle} onChange={e => setMsgTitle(e.target.value)} />
            </div>
          )}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>
              {msgType === 'idea' ? 'Describe your idea' : msgType === 'file' ? 'Notes (optional)' : 'Your message'}
            </div>
            <textarea rows={4} style={{ ...IS, resize: 'vertical', lineHeight: 1.7 }}
              placeholder={msgType === 'idea' ? 'Mood, style, references, goals...' : 'Write your message...'}
              value={msgBody} onChange={e => setMsgBody(e.target.value)} autoFocus />
          </div>
          {(msgType === 'file' || msgType === 'idea') && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>Attach File (optional)</div>
              <input ref={fileRef} type="file" onChange={e => setMsgFile(e.target.files[0])} style={{ color: '#666', fontSize: 13, fontFamily: MONO }} />
            </div>
          )}
          <button onClick={handleSend} disabled={sending || (!msgBody.trim() && !msgFile)} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (sending || (!msgBody.trim() && !msgFile)) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {sending ? <Loader2 size={16} /> : <Send size={16} />}
            {sending ? 'Sending...' : 'Send to Studio 65'}
          </button>
        </div>
      )}

      {/* Messages list */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>📬</div>
          <div style={{ fontSize: 14, color: '#444' }}>No messages yet. Studio 65 will send you updates right here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onApproval={onApproval} />
          ))}
        </div>
      )}
    </div>
  );
}