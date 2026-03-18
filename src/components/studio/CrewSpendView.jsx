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
    <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Crew Member', 'Projects', 'Total Earned', 'Paid', 'Owed'].map((h, i) => (
              <th key={h} style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: i === 3 ? '#7BC853' : i === 4 ? '#E81A1A' : '#666', textTransform: 'uppercase', padding: '6px 8px', textAlign: i > 1 ? 'right' : 'left', borderBottom: '1px solid #333' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map(name => {
            const d = map[name];
            const total = d.paid + d.owed;
            const pct = total > 0 ? Math.round(d.paid / total * 100) : 0;
            return (
              <React.Fragment key={name}>
                <tr>
                  <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 600 }}>{name}</td>
                  <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>{d.projects.size}</td>
                  <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: '"DM Mono", monospace' }}>{fmt(total)}</td>
                  <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: '"DM Mono", monospace', color: '#7BC853' }}>{fmt(d.paid)}</td>
                  <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: '"DM Mono", monospace', color: d.owed > 0 ? '#E81A1A' : '#666' }}>{fmt(d.owed)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ padding: '0 8px 8px' }}>
                    <div style={{ height: 4, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#7BC853', borderRadius: 2 }} />
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}