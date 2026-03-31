import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MONO = '"DM Mono", monospace';

export default function UpcomingReminders({ projects }) {
  const [dismissed, setDismissed] = useState(new Set());
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = projects
    .filter(p => !p.archived && p.date)
    .map(p => {
      const d = new Date(p.date + 'T12:00:00');
      const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
      return { ...p, diffDays };
    })
    .filter(p => p.diffDays >= 0 && p.diffDays <= 7)
    .filter(p => !dismissed.has(p.id))
    .sort((a, b) => a.diffDays - b.diffDays);

  if (!upcoming.length) return null;

  const urgencyColor = (days) => {
    if (days === 0) return '#E81A1A';
    if (days === 1) return '#F59E0B';
    if (days <= 3) return '#4A9EFF';
    return '#7BC853';
  };

  const dayLabel = (days) => {
    if (days === 0) return 'TODAY';
    if (days === 1) return 'TOMORROW';
    return `IN ${days} DAYS`;
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        🔔 Upcoming Shoots ({upcoming.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.map(p => {
          const col = urgencyColor(p.diffDays);
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: `${col}08`,
                border: `1px solid ${col}30`,
                borderLeft: `3px solid ${col}`,
                borderRadius: 8, padding: '10px 12px',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: col, padding: '1px 6px', borderRadius: 3, background: `${col}18`, flexShrink: 0 }}>{dayLabel(p.diffDays)}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginTop: 2 }}>
                  {p.client}{p.start_time ? ` · ${p.start_time}` : ''}{p.address ? ` · ${p.address}` : ''}
                </div>
                {/* Crew readiness */}
                {(p.crew || []).length > 0 && (() => {
                  const confirmed = (p.crew || []).filter(c => c.avail === 'yes').length;
                  const total = (p.crew || []).length;
                  const allGood = confirmed === total;
                  return (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: allGood ? '#7BC853' : '#F59E0B', marginTop: 3 }}>
                      👥 {confirmed}/{total} crew confirmed
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, p.id])); }}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '2px 5px', flexShrink: 0 }}
              >×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}