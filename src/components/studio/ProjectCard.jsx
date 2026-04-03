import React from 'react';
import { fmt, crewOwed, margin, marginColor, marginBg, STATUS_STYLE, fmtDateRange } from '@/lib/studio';
import ProjectStatusNudge from './ProjectStatusNudge';

const StatusTag = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Booked'];
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 4,
      fontFamily: '"DM Mono", monospace', fontWeight: 600,
      background: s.bg, color: s.clr, whiteSpace: 'nowrap'
    }}>{status}</span>
  );
};

export default function ProjectCard({ project: p, onClick }) {
  const del = p.deliverables || [];
  const done = del.filter(d => d.done).length;
  const pct = del.length ? (done / del.length * 100) : 0;
  const owed = crewOwed(p);
  const totalHrs = (p.hours || []).reduce((s, h) => s + h.hours, 0);
  const m = margin(p);

  return (
    <div
      onClick={onClick}
      className="group"
      style={{
        background: '#1E1E1E', border: '1px solid #333', borderRadius: 12,
        padding: 18, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Red accent top bar on hover */}
      <div className="group-hover:opacity-100" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: '#E81A1A', opacity: 0, transition: 'opacity 0.2s'
      }} />

      {/* Card top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666' }}>{p.project_id} · {fmtDateRange(p)}{p.start_time ? ' · ' + p.start_time : ''}{p.end_time ? '–' + p.end_time : ''}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{p.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: '#2A2A2A', borderRadius: 4, color: '#D9D9D9', fontFamily: '"DM Mono", monospace' }}>{p.client}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: marginBg(m), color: marginColor(m) }}>{m}% margin</span>
            <StatusTag status={p.status || 'Booked'} />
            {p.track_hours && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontFamily: '"DM Mono", monospace' }}>⏱ {(totalHrs).toFixed(1)} hrs</span>}
            {p.notes && <span style={{ fontSize: 10, color: '#666' }}>📝</span>}
          </div>
          {/* Shoot logistics */}
          {(p.address || p.poc_name) && (
            <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {p.address && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {p.address}</div>}
              {p.poc_name && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#888' }}>👤 {p.poc_name}{p.poc_phone ? ' · ' + p.poc_phone : ''}</div>}
            </div>
          )}
        </div>
        <span style={{
          fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px',
          borderRadius: 20, fontWeight: 500, flexShrink: 0,
          background: p.paid ? 'rgba(123,200,83,0.1)' : 'rgba(232,26,26,0.1)',
          color: p.paid ? '#7BC853' : '#E81A1A',
        }}>{p.paid ? 'Paid' : 'Not Paid'}</span>
      </div>

      {/* Financials */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, padding: '10px 0', borderTop: '1px solid #333', borderBottom: '1px solid #333', marginBottom: 10 }}>
        {[['Revenue', fmt(p.revenue), ''], ['Crew', fmt(p.crew_cost), ''], ['Rental', fmt(p.rental_cost), ''], ['Net', fmt(p.net), '#7BC853']].map(([label, val, color]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: color || '#fff' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginBottom: 4 }}>Deliverables — {done}/{del.length} done</div>
          <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#7BC853', width: `${pct}%` }} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginBottom: 2 }}>Crew Owed</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: owed > 0 ? '#E81A1A' : '#7BC853' }}>{fmt(owed)}</div>
        </div>
      </div>

      {/* Status nudge */}
      <ProjectStatusNudge project={p} onClick={onClick} />
    </div>
  );
}