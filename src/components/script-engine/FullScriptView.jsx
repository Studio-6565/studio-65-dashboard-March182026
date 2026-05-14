import React, { useState } from 'react';
import { RotateCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

const BEAT_CONFIG = {
  hook:       { color: '#E81A1A', label: 'HOOK', emoji: '🎣' },
  body:       { color: '#4A9EFF', label: 'BODY', emoji: '📝' },
  transition: { color: '#F59E0B', label: 'TRANSITION', emoji: '↗️' },
  cta:        { color: '#7BC853', label: 'CTA', emoji: '🎯' },
};

function BeatBlock({ beat, index, onRegenerate }) {
  const [regenLoading, setRegenLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const bc = BEAT_CONFIG[beat.beat_type] || { color: '#666', label: beat.beat_type?.toUpperCase(), emoji: '📍' };

  const handleRegen = async (e) => {
    e.stopPropagation();
    setRegenLoading(true);
    await onRegenerate(index);
    setRegenLoading(false);
  };

  return (
    <div style={{
      border: `1px solid ${bc.color}20`,
      borderLeft: `3px solid ${bc.color}`,
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Beat header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: `${bc.color}06` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{bc.emoji}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: bc.color }}>{bc.label}</span>
          {beat.timing && <span style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{beat.timing}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleRegen}
            disabled={regenLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'transparent', border: `1px solid ${bc.color}30`, borderRadius: 6, color: bc.color, fontSize: 10, cursor: 'pointer', fontFamily: MONO }}
            title="Regenerate this beat"
          >
            {regenLoading
              ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              : <RotateCcw size={10} />
            }
            Regen
          </button>
          {expanded ? <ChevronUp size={13} color="#444" /> : <ChevronDown size={13} color="#444" />}
        </div>
      </div>

      {/* Beat body */}
      {expanded && (
        <div style={{ padding: '12px 14px', background: '#0A0A0A' }}>
          <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.8, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
            {beat.spoken}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {beat.broll && (
              <div style={{ padding: '8px 10px', background: '#111', borderRadius: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: '#555', marginBottom: 4 }}>B-ROLL</div>
                <div style={{ fontSize: 11, color: '#888' }}>{beat.broll}</div>
              </div>
            )}
            {beat.on_screen_text && (
              <div style={{ padding: '8px 10px', background: '#111', borderRadius: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: '#555', marginBottom: 4 }}>ON SCREEN</div>
                <div style={{ fontSize: 11, color: '#888' }}>{beat.on_screen_text}</div>
              </div>
            )}
          </div>
          {beat.director_note && (
            <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: '#F59E0B', marginBottom: 3 }}>DIRECTOR NOTE</div>
              <div style={{ fontSize: 11, color: '#888' }}>{beat.director_note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FullScriptView({ scriptData, onRegenerateBeat }) {
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const copyFull = () => {
    const text = [
      `HOOK: ${scriptData.hook_text}`,
      '',
      ...(scriptData.beats || []).map(b =>
        `[${b.timing || b.beat_type.toUpperCase()}]\n${b.spoken}\nB-ROLL: ${b.broll || '—'}\nON SCREEN: ${b.on_screen_text || '—'}`
      ),
      '',
      `CAPTION:\n${scriptData.caption}`,
      '',
      `HASHTAGS: ${(scriptData.hashtags || []).join(' ')}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    showToast('Full script copied!', 'green');
  };

  return (
    <div>
      {/* Hook callout */}
      <div style={{ padding: '14px 16px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', marginBottom: 6 }}>🎣 HOOK (0:00–0:03)</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.5, fontStyle: 'italic' }}>
          "{scriptData.hook_text}"
        </div>
      </div>

      {/* Beat-by-beat */}
      <div style={{ marginBottom: 16 }}>
        {(scriptData.beats || []).map((beat, i) => (
          <BeatBlock key={i} beat={beat} index={i} onRegenerate={onRegenerateBeat} />
        ))}
      </div>

      {/* Caption + hashtags */}
      <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div onClick={() => setCaptionExpanded(v => !v)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', fontWeight: 700 }}>CAPTION & HASHTAGS</span>
          {captionExpanded ? <ChevronUp size={13} color="#444" /> : <ChevronDown size={13} color="#444" />}
        </div>
        {captionExpanded && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.8, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
              {scriptData.caption}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(scriptData.hashtags || []).map((h, i) => (
                <span key={i} style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 6, padding: '3px 8px' }}>
                  #{h.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Copy full */}
      <button
        onClick={copyFull}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 10, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
      >
        <Copy size={12} /> Copy Full Script
      </button>
    </div>
  );
}