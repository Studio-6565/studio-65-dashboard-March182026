import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { AlertTriangle, ChevronDown, ChevronUp, MessageSquare, Clock, Volume2 } from 'lucide-react';
import ClarificationChat from './ClarificationChat';

const MONO = '"DM Mono", monospace';
const MAX_TRAY = 10;

export default function NeedsInputTray({ tasks, contacts, projects, onUpdate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [clarifyTask, setClarifyTask] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Mark stale if > 7 days in needs_input
  const staleCheck = tasks.filter(t => {
    if (t.stale_flagged) return false;
    const created = t.created_date?.split('T')[0];
    if (!created) return false;
    const days = Math.floor((new Date(today) - new Date(created)) / 86400000);
    return days >= 7;
  });

  if (staleCheck.length > 0) {
    staleCheck.forEach(t => {
      base44.entities.CaptureTask.update(t.id, { stale_flagged: true });
    });
  }

  const atCap = tasks.length >= MAX_TRAY;

  return (
    <div style={{
      background: '#0D0D0D',
      border: `1px solid ${atCap ? 'rgba(232,26,26,0.5)' : 'rgba(245,158,11,0.3)'}`,
      borderRadius: 12, marginBottom: 20, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          background: atCap ? 'rgba(232,26,26,0.06)' : 'rgba(245,158,11,0.05)',
        }}
      >
        <AlertTriangle size={14} color={atCap ? '#E81A1A' : '#F59E0B'} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: atCap ? '#E81A1A' : '#F59E0B' }}>
            Needs Input ({tasks.length}{atCap ? ' — CAP REACHED' : `/${MAX_TRAY}`})
          </div>
          {atCap && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', marginTop: 2 }}>
              Clear items before new voice captures can land here
            </div>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {tasks.map(t => {
            const daysOld = t.created_date
              ? Math.floor((new Date(today) - new Date(t.created_date.split('T')[0])) / 86400000)
              : 0;
            const isStale = daysOld >= 7;

            return (
              <div
                key={t.id}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #111',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: isStale ? 'rgba(232,26,26,0.03)' : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>
                      {t.parse_flag === 'unparsed' ? '📝' : '🎙️'} {t.title}
                    </span>
                    {isStale && (
                      <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(232,26,26,0.1)', color: '#E81A1A', fontWeight: 700 }}>
                        STALE {daysOld}d
                      </span>
                    )}
                    {t.confidence != null && (
                      <span style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>
                        {t.confidence}% confident
                      </span>
                    )}
                  </div>
                  {t.transcript_snippet && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{t.transcript_snippet.slice(0, 120)}{t.transcript_snippet.length > 120 ? '...' : ''}"
                    </div>
                  )}
                  {t.audio_url && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Volume2 size={10} color="#555" />
                      <audio controls src={t.audio_url} style={{ height: 24, opacity: 0.6 }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setClarifyTask(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', background: 'rgba(74,158,255,0.1)',
                      border: '1px solid rgba(74,158,255,0.25)', borderRadius: 7,
                      color: '#4A9EFF', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      fontFamily: MONO, whiteSpace: 'nowrap',
                    }}
                  >
                    <MessageSquare size={10} /> Clarify
                  </button>
                  <button
                    onClick={async () => {
                      await base44.entities.CaptureTask.update(t.id, { status: 'done' });
                      onUpdate();
                    }}
                    style={{
                      padding: '6px 10px', background: 'transparent',
                      border: '1px solid #1E1E1E', borderRadius: 7,
                      color: '#444', fontSize: 10, cursor: 'pointer', fontFamily: MONO,
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {clarifyTask && (
        <ClarificationChat
          task={clarifyTask}
          contacts={contacts}
          projects={projects}
          onClose={() => setClarifyTask(null)}
          onResolved={() => { setClarifyTask(null); onUpdate(); }}
        />
      )}
    </div>
  );
}