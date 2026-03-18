import React from 'react';
import { fmt, crewOwed, margin } from '@/lib/studio';

export default function StatsBar({ projects }) {
  const active = projects.filter(p => !p.archived);
  const tRev = active.reduce((s, p) => s + (p.revenue || 0), 0);
  const tNet = active.reduce((s, p) => s + (p.net || 0), 0);
  const tColl = active.filter(p => p.paid).reduce((s, p) => s + (p.net || 0), 0);
  const tOut = active.filter(p => !p.paid).reduce((s, p) => s + (p.net || 0), 0);
  const tCrew = active.reduce((s, p) => s + crewOwed(p), 0);

  const yr = new Date().getFullYear();
  const ytd = projects.filter(p => p.date && new Date(p.date).getFullYear() === yr);
  const yRev = ytd.reduce((s, p) => s + (p.revenue || 0), 0);
  const yNet = ytd.reduce((s, p) => s + (p.net || 0), 0);
  const yMar = yRev > 0 ? Math.round(yNet / yRev * 100) : 0;

  const stats = [
    { label: 'Total Revenue', value: fmt(tRev), color: '' },
    { label: 'Total Net', value: fmt(tNet), color: '#7BC853' },
    { label: 'Collected', value: fmt(tColl), color: '#7BC853' },
    { label: 'Outstanding', value: fmt(tOut), color: '#E81A1A' },
    { label: 'Crew Owed', value: fmt(tCrew), color: '#E81A1A' },
  ];

  const ytdStats = [
    { label: 'YTD Revenue', value: fmt(yRev), color: '', accent: '#E81A1A' },
    { label: 'YTD Net', value: fmt(yNet), color: '#7BC853', accent: '#7BC853' },
    { label: 'YTD Margin', value: yMar + '%', color: '#4A9EFF', accent: '#4A9EFF' },
    { label: 'YTD Projects', value: ytd.length + ' projects', color: '#F59E0B', accent: '#F59E0B' },
  ];

  const allStats = [...stats, ...ytdStats];

  return (
    <div style={{ marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div style={{ display: 'flex', gap: 8, paddingBottom: 4, minWidth: 'max-content' }}>
        {allStats.map((s, i) => (
          <div key={s.label} style={{
            background: '#1E1E1E',
            border: '1px solid #2A2A2A',
            borderLeft: s.accent ? `3px solid ${s.accent}` : '1px solid #2A2A2A',
            borderRadius: 8,
            padding: '8px 14px',
            flexShrink: 0,
            minWidth: 110,
          }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, whiteSpace: 'nowrap' }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.5px', color: s.color || '#fff', whiteSpace: 'nowrap' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}