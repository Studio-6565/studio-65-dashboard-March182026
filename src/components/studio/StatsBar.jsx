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

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 8 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: s.color || '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        {ytdStats.map(s => (
          <div key={s.label} style={{ background: '#1E1E1E', border: '1px solid #333', borderLeft: `3px solid ${s.accent}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: s.color || '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}