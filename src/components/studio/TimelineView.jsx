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
              <div
                key={p.id}
                onClick={() => onOpenDetail(p)}
                style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
              >
                {/* Top row: dot + name + client + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[st] || '#666', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666' }}>{p.date}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: '#2A2A2A', borderRadius: 4, color: '#D9D9D9', fontFamily: '"DM Mono", monospace' }}>{p.client}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: ss.bg, color: ss.clr }}>{st}</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '2px 9px', borderRadius: 20, fontWeight: 500, background: p.paid ? 'rgba(123,200,83,0.1)' : 'rgba(232,26,26,0.1)', color: p.paid ? '#7BC853' : '#E81A1A', marginLeft: 'auto' }}>{p.paid ? 'Paid' : 'Unpaid'}</span>
                </div>
                {/* Bottom row: financials + deliverables */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 1 }}>Net</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{fmt(p.net)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 1 }}>Margin</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: marginColor(m) }}>{m}%</div>
                  </div>
                  {del.length > 0 && (
                    <div style={{ flex: 1, minWidth: 80, maxWidth: 160 }}>
                      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Deliverables {done}/{del.length}</div>
                      <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#7BC853', borderRadius: 2 }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}