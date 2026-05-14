import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const STATUS_STYLE = {
  pending:            { bg: 'rgba(245,158,11,0.08)',  color: '#F59E0B', label: '⏳ Awaiting Your Response' },
  approved:           { bg: 'rgba(123,200,83,0.08)',  color: '#7BC853', label: '✓ Approved' },
  rejected:           { bg: 'rgba(232,26,26,0.08)',   color: '#E81A1A', label: '✗ Rejected' },
  revision_requested: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', label: '🔄 Revision Requested' },
};

const TYPE_LABEL = {
  script:           { icon: '📝', label: 'Script' },
  approval_request: { icon: '✅', label: 'Approval Request' },
  file:             { icon: '📎', label: 'Document' },
  change_order:     { icon: '📋', label: 'Change Order' },
};

function ApprovalCard({ msg, onApproval }) {
  const [expanded, setExpanded] = useState(!msg.approval_status || msg.approval_status === 'pending');
  const [note, setNote] = useState('');
  const [responding, setResponding] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPending = !msg.approval_status || msg.approval_status === 'pending';
  const st = STATUS_STYLE[msg.approval_status || 'pending'];
  const tl = TYPE_LABEL[msg.type] || TYPE_LABEL.approval_request;

  const doApproval = async (status) => {
    setSaving(true);
    await onApproval(msg, status, note.trim());
    setResponding(false);
    setNote('');
    setSaving(false);
  };

  return (
    <div style={{
      background: '#0D0D0D',
      border: `1px solid ${isPending ? 'rgba(245,158,11,0.25)' : '#1A1A1A'}`,
      borderRadius: 18,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '18px 20px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {tl.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{msg.title || tl.label}</span>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6, fontFamily: MONO, fontWeight: 700,
                background: tl === TYPE_LABEL.script ? 'rgba(167,139,250,0.1)' : 'rgba(74,158,255,0.1)',
                color: tl === TYPE_LABEL.script ? '#A78BFA' : '#4A9EFF',
              }}>{tl.label}</span>
            </div>
            {msg.project_name && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginBottom: 4 }}>{msg.project_name}</div>
            )}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 10px',
              borderRadius: 20, fontFamily: MONO, fontWeight: 700,
              background: st.bg, color: st.color,
            }}>
              {st.label}
            </div>
          </div>
          <div style={{ flexShrink: 0, color: '#333' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid #141414', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Content */}
          {msg.body && (
            <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.9, whiteSpace: 'pre-wrap', background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 12, padding: '14px 16px' }}>
              {msg.body}
            </div>
          )}

          {/* File attachment */}
          {msg.file_url && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', background: 'rgba(74,158,255,0.06)',
                border: '1px solid rgba(74,158,255,0.2)', borderRadius: 12,
                fontSize: 13, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} />
              {msg.file_name || 'View / Download Document'}
            </a>
          )}

          {/* Date */}
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>
            Sent {new Date(msg.created_date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          {/* Response section */}
          {isPending && (
            responding ? (
              <div style={{ background: '#070707', border: '1px solid #1A1A1A', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase' }}>Add a note (optional)</div>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Share any comments, feedback, or revision details..."
                  autoFocus
                  style={{
                    background: '#0D0D0D', border: '1px solid #252525', borderRadius: 10,
                    padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none',
                    resize: 'none', fontFamily: 'Syne, sans-serif', width: '100%', boxSizing: 'border-box',
                    lineHeight: 1.7,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => doApproval('approved')}
                    disabled={saving}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#7BC853', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    onClick={() => doApproval('revision_requested')}
                    disabled={saving}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)', background: 'transparent', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <RotateCcw size={14} /> Revise
                  </button>
                  <button
                    onClick={() => doApproval('rejected')}
                    disabled={saving}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(232,26,26,0.3)', background: 'transparent', color: '#E81A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
                <button onClick={() => setResponding(false)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: 0 }}>
                  ← Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setResponding(true)}
                style={{ width: '100%', padding: '14px 0', background: '#F59E0B', border: 'none', borderRadius: 14, color: '#000', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
              >
                Respond Now →
              </button>
            )
          )}

          {/* Already responded */}
          {!isPending && msg.approval_status && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: STATUS_STYLE[msg.approval_status]?.bg,
              border: `1px solid ${STATUS_STYLE[msg.approval_status]?.color}30`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: STATUS_STYLE[msg.approval_status]?.color }}>
                {STATUS_STYLE[msg.approval_status]?.label}
              </div>
              {msg.approval_note && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.6 }}>
                  "{msg.approval_note}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientApprovalsTab({ messages, onApproval }) {
  const approvalItems = messages.filter(m =>
    m.from === 'studio' && (m.type === 'script' || m.type === 'approval_request' || m.type === 'change_order')
  ).sort((a, b) => {
    // Pending first, then by date desc
    const aP = !a.approval_status || a.approval_status === 'pending';
    const bP = !b.approval_status || b.approval_status === 'pending';
    if (aP !== bP) return aP ? -1 : 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const pending = approvalItems.filter(m => !m.approval_status || m.approval_status === 'pending');
  const resolved = approvalItems.filter(m => m.approval_status && m.approval_status !== 'pending');

  if (approvalItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>✅</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#666', marginBottom: 8 }}>Nothing to approve</div>
        <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
          When Studio 65 sends you scripts or documents for approval, they'll appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
              ⚡ Action Required
            </div>
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: 'rgba(232,26,26,0.12)', color: '#E81A1A', fontFamily: MONO, fontWeight: 700 }}>
              {pending.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(m => <ApprovalCard key={m.id} msg={m} onApproval={onApproval} />)}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 12 }}>Past Responses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resolved.map(m => <ApprovalCard key={m.id} msg={m} onApproval={onApproval} />)}
          </div>
        </div>
      )}
    </div>
  );
}