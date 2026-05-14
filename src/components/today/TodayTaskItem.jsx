import React from 'react';
import { CheckCircle2, CalendarClock, User, AlertTriangle, RotateCcw } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const PRIORITY_COLOR = { P1: '#E81A1A', P2: '#F59E0B', P3: '#555' };
const TYPE_EMOJI = { deliverable: '📦', decision: '🧠', 'follow-up': '📞', errand: '🏃', admin: '📋', shoot: '🎬', invoice: '💸', contract: '✍️', crew_pay: '💰', school: '🎓' };
const EFFORT_LABEL = { '15min': '15m', '30min': '30m', '1hr': '1h', 'half-day': '4h', 'full-day': '8h' };

export default function TodayTaskItem({ item, onDone, onSnooze, compact = false }) {
  const color = PRIORITY_COLOR[item.priority] || '#555';
  const isStale = (item.roll_count || 0) >= 3;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: compact ? '10px 12px' : '12px 14px',
      background: isStale ? 'rgba(232,26,26,0.04)' : '#0D0D0D',
      border: `1px solid ${isStale ? 'rgba(232,26,26,0.2)' : '#1A1A1A'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
    }}>
      <button onClick={() => onDone?.(item)} style={{ flexShrink: 0, marginTop: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#333', padding: 0 }}>
        <CheckCircle2 size={15} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {TYPE_EMOJI[item.itemType] || '📋'} {item.title}
          </span>
          {item.priority && (
            <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: color + '18', color }}>{item.priority}</span>
          )}
          {item.effort && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{EFFORT_LABEL[item.effort] || item.effort}</span>
          )}
          {isStale && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', display: 'flex', alignItems: 'center', gap: 3 }}>
              <RotateCcw size={9} /> rolled {item.roll_count}×
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {item.sub && <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{item.sub}</span>}
          {item.due_date && <span style={{ fontFamily: MONO, fontSize: 9, color: '#666', display: 'flex', alignItems: 'center', gap: 3 }}><CalendarClock size={9} /> {item.due_date}</span>}
        </div>
        {isStale && (
          <div style={{ marginTop: 6, padding: '5px 9px', background: 'rgba(232,26,26,0.06)', borderRadius: 6, fontFamily: MONO, fontSize: 9, color: '#E81A1A' }}>
            ⚠ Rolled 3+ times — kill it or schedule for real
          </div>
        )}
      </div>

      {onSnooze && (
        <button onClick={() => onSnooze?.(item)} style={{ flexShrink: 0, padding: '4px 8px', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 6, color: '#444', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap' }}>
          +1d
        </button>
      )}
    </div>
  );
}