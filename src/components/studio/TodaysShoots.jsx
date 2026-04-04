import React from 'react';
import { fmtDateRange } from '@/lib/studio';
import { Camera, MapPin, Clock, Users } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function TodaysShoots({ projects, onOpenDetail }) {
  const today = new Date().toISOString().split('T')[0];

  const todayProjects = projects.filter(p => {
    if (p.archived) return false;
    if (p.date === today) return true;
    if (p.end_date && p.date && p.date <= today && p.end_date >= today) return true;
    if ((p.extra_dates || []).includes(today)) return true;
    return false;
  });

  if (!todayProjects.length) return null;

  return (
    <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Camera size={14} color="#E81A1A" />
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Today's Shoots — {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {todayProjects.map(p => (
          <div
            key={p.id}
            onClick={() => onOpenDetail(p)}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.15)'}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {p.client && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#888' }}>{p.client}</span>
              )}
              {p.start_time && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>
                  <Clock size={10} />
                  {p.start_time}{p.end_time ? ' – ' + p.end_time : ''}
                </span>
              )}
              {p.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 10, color: '#888' }}>
                  <MapPin size={10} />
                  {p.address}
                </span>
              )}
              {(p.crew || []).length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: MONO, fontSize: 10, color: '#888' }}>
                  <Users size={10} />
                  {p.crew.length} crew
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}