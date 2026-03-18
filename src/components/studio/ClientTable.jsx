import React from 'react';
import { fmt } from '@/lib/studio';

export default function ClientTable({ projects }) {
  const active = projects.filter(p => !p.archived);
  const map = {};
  active.forEach(p => {
    if (!map[p.client]) map[p.client] = { rev: 0, net: 0, coll: 0, count: 0 };
    map[p.client].rev += (p.revenue || 0);
    map[p.client].net += (p.net || 0);
    if (p.paid) map[p.client].coll += (p.net || 0);
    map[p.client].count++;
  });
  const clients = Object.keys(map).sort((a, b) => map[b].rev - map[a].rev);

  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Per-Client Breakdown</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Client', 'Projects', 'Revenue', 'Net', 'Collected'].map(h => (
                <th key={h} style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', padding: '6px 8px', textAlign: h === 'Client' || h === 'Projects' ? 'left' : 'right', borderBottom: '1px solid #333' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!clients.length ? (
              <tr><td colSpan={5} style={{ color: '#666', padding: '16px 8px', textAlign: 'center' }}>No active projects</td></tr>
            ) : clients.map(c => (
              <tr key={c}>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: '#2A2A2A', borderRadius: 4, color: '#D9D9D9', fontFamily: '"DM Mono", monospace' }}>{c}</span>
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#666' }}>{map[c].count}</td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: '"DM Mono", monospace' }}>{fmt(map[c].rev)}</td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: '"DM Mono", monospace', color: '#7BC853' }}>{fmt(map[c].net)}</td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: '"DM Mono", monospace', color: map[c].coll > 0 ? '#7BC853' : '#666' }}>{fmt(map[c].coll)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}