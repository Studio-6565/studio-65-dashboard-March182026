import React from 'react';
import { Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const TYPE_CONFIG = {
  'pain-point':   { color: '#E81A1A', emoji: '😤', label: 'Pain Point' },
  'contrarian':   { color: '#F59E0B', emoji: '🔀', label: 'Contrarian' },
  'educational':  { color: '#4A9EFF', emoji: '🎓', label: 'Educational' },
  'trend-tie-in': { color: '#7BC853', emoji: '📈', label: 'Trend Tie-in' },
  'story':        { color: '#A78BFA', emoji: '📖', label: 'Story' },
};

const DRIVER_CONFIG = {
  saves:       { icon: '🔖', color: '#A78BFA' },
  shares:      { icon: '🔁', color: '#4A9EFF' },
  comments:    { icon: '💬', color: '#F59E0B' },
  'watch-time': { icon: '⏱', color: '#7BC853' },
};

export default function AngleCard({ angle, index, selected, loading, onSelect }) {
  const tc = TYPE_CONFIG[angle.angle_type] || { color: '#666', emoji: '✨', label: angle.angle_type };
  const dc = DRIVER_CONFIG[angle.predicted_driver] || { icon: '📊', color: '#666' };

  return (
    <div
      onClick={!loading ? onSelect : undefined}
      style={{
        background: selected ? `${tc.color}08` : '#0D0D0D',
        border: `1px solid ${selected ? tc.color + '40' : '#1A1A1A'}`,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: loading ? 'default' : 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!selected && !loading) e.currentTarget.style.borderColor = tc.color + '30'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#1A1A1A'; }}
    >
      {/* Type badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{tc.emoji}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: tc.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tc.label}</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#333' }}>#{index + 1}</span>
      </div>

      {/* Hook */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>
        "{angle.hook}"
      </div>

      {/* Why this client */}
      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>
        {angle.why_this_client}
      </div>

      {/* Driver + brain tags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: dc.color + '12', border: `1px solid ${dc.color}25`, borderRadius: 6 }}>
          <span>{dc.icon}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: dc.color, fontWeight: 700 }}>{angle.predicted_driver}</span>
        </div>
        {(angle.risk_flags || []).length > 0 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 6, padding: '3px 7px' }}>
            ⚠ {angle.risk_flags[0]}
          </div>
        )}
      </div>

      {/* Brain elements used */}
      {(angle.brain_elements_used || []).length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {angle.brain_elements_used.slice(0, 3).map((el, i) => (
            <span key={i} style={{ fontFamily: MONO, fontSize: 8, color: '#A78BFA', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 4, padding: '2px 6px' }}>
              🧠 {el}
            </span>
          ))}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
          <Loader2 size={18} color={tc.color} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Selected indicator */}
      {selected && !loading && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: tc.color }} />
      )}
    </div>
  );
}