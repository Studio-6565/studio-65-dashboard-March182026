import React from 'react';
import { fmt } from '@/lib/studio';

export default function CrewSpendView({ projects }) {
  const map = {};
  projects.forEach(p => {
    (p.crew || []).forEach(c => {
      if (!map[c.name]) map[c.name] = { paid: 0, owed: 0, projects: new Set() };
      if (c.paid) map[c.name].paid += c.cost;
      else map[c.name].owed += c.cost;
      map[c.name].projects.add(p.id);
    });
  });
  const members = Object.keys(map).sort((a, b) => (map[b].paid + map[b].owed) - (map[a].paid + map[a].owed));

  if (!members.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>👥</div>
      <div>No crew data yet.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {members.map(name => {
        const d = map[name];
        const total = d.paid + d.owed;
        const pct = total > 0 ? Math.round(d.paid / total * 100) : 0;
        const allPaid = d.owed === 0;
        return (
          <div key={name} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555' }}>{d.projects.size} shoot{d.projects.size !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#7BC853' }}>{fmt(d.paid)} paid</span>
                {d.owed > 0 && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#E81A1A' }}>{fmt(d.owed)} owed</span>}
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>{fmt(total)} total</span>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: allPaid ? 'rgba(123,200,83,0.12)' : 'rgba(232,26,26,0.08)', color: allPaid ? '#7BC853' : '#E81A1A' }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height: 4, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: allPaid ? '#7BC853' : '#E81A1A', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}