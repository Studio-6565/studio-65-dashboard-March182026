import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const MONO = '"DM Mono", monospace';

function fmtTime(secs) {
  if (secs == null || isNaN(secs)) return null;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function DeliverableCommentThread({ comments, onSeek, onResolve, isStudio = false }) {
  if (!comments.length) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#333' }}>
        No comments yet. Leave the first piece of feedback below.
      </div>
    );
  }

  const sorted = [...comments].sort((a, b) => {
    if (a.timecode_seconds != null && b.timecode_seconds != null) return a.timecode_seconds - b.timecode_seconds;
    if (a.timecode_seconds != null) return -1;
    if (b.timecode_seconds != null) return 1;
    return new Date(a.created_date || 0) - new Date(b.created_date || 0);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(c => {
        const fromColor = c.from_role === 'studio' ? '#E81A1A' : '#4A9EFF';
        const isApproval = c.approval_status === 'approved';
        const isChange = c.approval_status === 'changes_requested';

        return (
          <div
            key={c.id}
            style={{
              borderLeft: `2px solid ${c.resolved ? '#2A2A2A' : fromColor}`,
              paddingLeft: 12,
              opacity: c.resolved ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: fromColor }}>{c.client_name || 'Studio'}</span>
              {c.timecode && (
                <button
                  onClick={() => c.timecode_seconds != null && onSeek?.(c.timecode_seconds)}
                  style={{ fontFamily: MONO, fontSize: 10, padding: '1px 7px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                >
                  ⏱ {c.timecode}
                </button>
              )}
              {isApproval && (
                <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(123,200,83,0.15)', color: '#7BC853', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle2 size={9} /> Approved
                </span>
              )}
              {isChange && (
                <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <XCircle size={9} /> Changes Requested
                </span>
              )}
              {c.resolved && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', padding: '1px 5px', background: '#1A1A1A', borderRadius: 3 }}>resolved</span>
              )}
              <span style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginLeft: 'auto' }}>
                {c.created_date && new Date(c.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, marginBottom: 6 }}>{c.body}</div>
            {isStudio && onResolve && !c.resolved && (
              <button
                onClick={() => onResolve(c.id)}
                style={{ fontSize: 10, fontFamily: MONO, color: '#7BC853', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ✓ Mark resolved
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}