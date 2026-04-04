import React, { useRef, useState, memo } from 'react';
import { fmt, crewOwed, margin, marginColor, marginBg, STATUS_STYLE, fmtDateRange } from '@/lib/studio';
import ProjectStatusNudge from './ProjectStatusNudge';
import { base44 } from '@/api/base44Client';

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

const STATUS_ORDER = ['Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'];

function ProjectCard({ project: p, onClick, onMarkPaid, onProjectUpdate }) {
  const del = p.deliverables || [];
  const done = del.filter(d => d.done).length;
  const pct = del.length ? (done / del.length * 100) : 0;
  const owed = crewOwed(p);
  const totalHrs = (p.hours || []).reduce((s, h) => s + h.hours, 0);
  const m = margin(p);

  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    if (newStatus === p.status) { setShowStatusPicker(false); return; }
    setUpdatingStatus(true);
    const updated = { ...p, status: newStatus };
    await base44.entities.Project.update(p.id, updated);
    onProjectUpdate && onProjectUpdate(updated);
    setUpdatingStatus(false);
    setShowStatusPicker(false);
  };

  // Swipe state
  const touchStartX = useRef(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const SWIPE_THRESHOLD = 80;

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };
  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    setSwipeX(Math.max(-120, Math.min(0, dx)));
  };
  const onTouchEnd = () => {
    if (swipeX < -SWIPE_THRESHOLD && onMarkPaid) {
      onMarkPaid(p);
    }
    setSwipeX(0);
    setSwiping(false);
    touchStartX.current = null;
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* Swipe action reveal */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
        background: p.paid ? 'rgba(232,26,26,0.8)' : 'rgba(123,200,83,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0 12px 12px 0',
        flexDirection: 'column', gap: 4,
      }}>
        <span style={{ fontSize: 20 }}>{p.paid ? '✗' : '✓'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: '"DM Mono", monospace' }}>{p.paid ? 'Unpaid' : 'Mark Paid'}</span>
      </div>

    <div
      onClick={() => { if (Math.abs(swipeX) < 10) onClick(); }}
      className="group"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        background: '#1E1E1E', border: '1px solid #333', borderRadius: 12,
        padding: 18, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transform: `translateX(${swipeX}px)`,
        transition: swiping ? 'none' : 'transform 0.25s ease, border-color 0.2s',
      }}
      onMouseEnter={e => { if (!swiping) { e.currentTarget.style.borderColor = '#555'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; }}
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
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={e => { e.stopPropagation(); setShowStatusPicker(v => !v); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <StatusTag status={p.status || 'Booked'} />
              </button>
              {showStatusPicker && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4, background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, overflow: 'hidden', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {STATUS_ORDER.map(s => (
                    <button key={s} onClick={e => handleStatusChange(e, s)} disabled={updatingStatus} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: s === p.status ? 'rgba(232,26,26,0.12)' : 'transparent', border: 'none', color: s === p.status ? '#E81A1A' : '#ccc', fontSize: 12, fontWeight: s === p.status ? 700 : 400, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>
                      {s === p.status ? '● ' : '○ '}{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
    </div>
  );
}

export default memo(ProjectCard);