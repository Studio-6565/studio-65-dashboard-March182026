import React, { useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmt } from '@/lib/studio';

export default function MonthlyChart({ projects }) {
  const monthMap = {};
  projects.forEach(p => {
    if (!p.date) return;
    const d = new Date(p.date);
    const key = d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
    if (!monthMap[key]) monthMap[key] = { month: key, Revenue: 0, Net: 0 };
    monthMap[key].Revenue += (p.revenue || 0);
    monthMap[key].Net += (p.net || 0);
  });
  const data = Object.values(monthMap).sort((a, b) => new Date('1 ' + a.month) - new Date('1 ' + b.month));

  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Monthly Revenue</div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={12}>
            <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10, fontFamily: '"DM Mono", monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#666', fontSize: 10, fontFamily: '"DM Mono", monospace' }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v / 1000 | 0) + 'k'} />
            <Tooltip
              contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, fontSize: 12, fontFamily: '"DM Mono", monospace' }}
              formatter={(v) => [fmt(v)]}
              labelStyle={{ color: '#888' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#888' }} />
            <Bar dataKey="Revenue" fill="rgba(232,26,26,0.6)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Net" fill="rgba(123,200,83,0.7)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}