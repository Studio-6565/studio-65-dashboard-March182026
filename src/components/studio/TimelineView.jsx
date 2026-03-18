import React from 'react';
import { fmt, margin, marginColor, STATUS_STYLE } from '@/lib/studio';

const STATUS_DOT = {
  'Booked': '#4A9EFF', 'In Production': '#F59E0B', 'In Edit': '#A78BFA',
  'Delivered': '#7BC853', 'Invoiced': '#E81A1A'
};

export default function TimelineView({ projects, onOpenDetail }) {
  const all = projects.filter(p => p.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!all.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📅</div>
      <div>No projects with dates yet.</div>
    </div>
  );

  const months = {};
  all.forEach(p => {
    const key = new Date(p.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' });
    if (!months[key]) months[key] = [];
    months[key].push(p);
  });

  return (
    <div>
      {Object.keys(months).map(month => (
        <div key={month} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #333' }}>{month}</div>
          {months[month].map(p => {
            const st = p.status || 'Booked';
            const del = p.deliverables || [];
            const done = del.filter(d => d.done).length;
            const pct = del.length ? Math.round(done / del.length * 100) : 0;
            const m = margin(p);
            const ss = STATUS_STYLE[st] || STATUS_STYLE['Booked'];
            return (
              <div key={p.id} onClick={() => onOpenDetail(p)} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 18, marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#555'} onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT[st] || '#666', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>{p.date}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: '#2A2A2A', borderRadius: 4, color: '#D9D9D9', fontFamily: '"DM Mono", monospace' }}>{p.client}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: ss.bg, color: ss.clr }}>{st}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>Net</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{fmt(p.net)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>Margin</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: marginColor(m) }}>{m}%</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666', marginBottom: 4 }}>Deliverables {done}/{del.length}</div>
                      <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#7BC853', borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px', borderRadius: 20, fontWeight: 500, background: p.paid ? 'rgba(123,200,83,0.1)' : 'rgba(232,26,26,0.1)', color: p.paid ? '#7BC853' : '#E81A1A', flexShrink: 0 }}>{p.paid ? 'Paid' : 'Not Paid'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}