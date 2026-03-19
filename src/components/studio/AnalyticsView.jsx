import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { fmt, margin, marginColor } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

const STATUS_COLORS = {
  Booked: '#4A9EFF', 'In Production': '#F59E0B', 'In Edit': '#A78BFA', Delivered: '#7BC853', Invoiced: '#E81A1A',
};

const TT = {
  contentStyle: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11, fontFamily: MONO },
  labelStyle: { color: '#777' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

const C = { background: '#1a1a1a', border: '1px solid #252525', borderRadius: 12, padding: '14px 16px' };

export default function AnalyticsView({ projects }) {
  const [yr, setYr] = useState('all');

  const allYears = [...new Set(projects.map(p => p.date ? new Date(p.date).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);
  const f = yr === 'all' ? projects.filter(p => !p.archived) : projects.filter(p => !p.archived && p.date && new Date(p.date).getFullYear() === parseInt(yr));

  const totalRev = f.reduce((s, p) => s + (p.revenue || 0), 0);
  const totalNet = f.reduce((s, p) => s + (p.net || 0), 0);
  const totalCrew = f.reduce((s, p) => s + (p.crew_cost || 0), 0);
  const totalRental = f.reduce((s, p) => s + (p.rental_cost || 0), 0);
  const collected = f.filter(p => p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
  const outstanding = f.filter(p => !p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
  const avgMargin = f.length ? Math.round(f.reduce((s, p) => s + margin(p), 0) / f.length) : 0;
  const paidCount = f.filter(p => p.paid).length;
  const collRate = f.length ? Math.round(paidCount / f.length * 100) : 0;
  const allDels = f.flatMap(p => p.deliverables || []);
  const delRate = allDels.length ? Math.round(allDels.filter(d => d.done).length / allDels.length * 100) : 0;

  // Monthly
  const monthMap = {};
  f.forEach(p => {
    if (!p.date) return;
    const d = new Date(p.date + 'T12:00:00');
    const key = d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
    const sk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { month: key, sk, Rev: 0, Net: 0 };
    monthMap[key].Rev += (p.revenue || 0);
    monthMap[key].Net += (p.net || 0);
  });
  const monthly = Object.values(monthMap).sort((a, b) => a.sk.localeCompare(b.sk));

  // Status
  const statusMap = {};
  f.forEach(p => {
    const s = p.status || 'Booked';
    if (!statusMap[s]) statusMap[s] = { name: s, n: 0, rev: 0 };
    statusMap[s].n++; statusMap[s].rev += (p.revenue || 0);
  });
  const statusData = Object.values(statusMap).sort((a, b) => b.n - a.n);

  // Clients
  const clientMap = {};
  f.forEach(p => {
    if (!clientMap[p.client]) clientMap[p.client] = { name: p.client, rev: 0, net: 0, count: 0, paid: 0 };
    clientMap[p.client].rev += (p.revenue || 0);
    clientMap[p.client].net += (p.net || 0);
    clientMap[p.client].count++;
    if (p.paid) clientMap[p.client].paid++;
  });
  const clientData = Object.values(clientMap).sort((a, b) => b.rev - a.rev).slice(0, 8);

  // Crew
  const crewMap = {};
  f.forEach(p => (p.crew || []).forEach(c => {
    if (!crewMap[c.name]) crewMap[c.name] = { name: c.name, total: 0, paid: 0, n: 0 };
    crewMap[c.name].total += (c.cost || 0);
    if (c.paid) crewMap[c.name].paid += (c.cost || 0);
    crewMap[c.name].n++;
  }));
  const crewData = Object.values(crewMap).sort((a, b) => b.total - a.total).slice(0, 8);

  const costPie = [
    { name: 'Net', value: Math.max(totalNet, 0), color: '#7BC853' },
    { name: 'Crew', value: totalCrew, color: '#E81A1A' },
    { name: 'Rental', value: totalRental, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const lbl = (t) => (
    <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{t}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Analytics</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 1 }}>{f.length} projects · {fmt(totalRev)}</div>
        </div>
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', gap: 4, background: '#111', border: '1px solid #222', borderRadius: 8, padding: 3, width: 'fit-content' }}>
            {['all', ...allYears.map(String)].map(y => (
              <button key={y} onClick={() => setYr(y)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: 'none', fontFamily: MONO, whiteSpace: 'nowrap',
                background: yr === y ? '#E81A1A' : 'transparent',
                color: yr === y ? '#fff' : '#555',
              }}>{y === 'all' ? 'All' : y}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip — 2×4 grid, compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[
          { l: 'Revenue', v: fmt(totalRev), c: '#fff' },
          { l: 'Net Profit', v: fmt(totalNet), c: '#7BC853' },
          { l: 'Collected', v: fmt(collected), c: '#7BC853', s: `${collRate}%` },
          { l: 'Outstanding', v: fmt(outstanding), c: outstanding > 0 ? '#E81A1A' : '#7BC853' },
          { l: 'Avg Margin', v: `${avgMargin}%`, c: marginColor(avgMargin) },
          { l: 'Avg Project', v: fmt(f.length ? Math.round(totalRev / f.length) : 0), c: '#4A9EFF' },
          { l: 'Projects', v: f.length, c: '#fff', s: `${paidCount} paid` },
          { l: 'Delivery', v: `${delRate}%`, c: '#A78BFA', s: `${allDels.filter(d=>d.done).length}/${allDels.length}` },
        ].map(k => (
          <div key={k.l} style={{ background: '#141414', border: '1px solid #222', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: '#444', textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: k.c, letterSpacing: '-0.5px' }}>{k.v}</div>
            {k.s && <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginTop: 2 }}>{k.s}</div>}
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div style={C}>
        {lbl('Monthly Revenue')}
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E81A1A" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#E81A1A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7BC853" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#7BC853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={36} />
              <Tooltip {...TT} formatter={(v, n) => [fmt(v), n]} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: MONO, color: '#555' }} />
              <Area type="monotone" dataKey="Rev" name="Revenue" stroke="#E81A1A" strokeWidth={2} fill="url(#rg)" dot={false} />
              <Area type="monotone" dataKey="Net" stroke="#7BC853" strokeWidth={2} fill="url(#ng)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status + Cost pie — side by side on desktop, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {/* Status */}
        <div style={C}>
          {lbl('Pipeline')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusData.length === 0 ? <div style={{ color: '#444', fontSize: 12 }}>No data</div> :
              statusData.map(s => {
                const pct = f.length ? Math.round(s.n / f.length * 100) : 0;
                const col = STATUS_COLORS[s.name] || '#666';
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{s.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{s.n} · {fmt(s.rev)}</span>
                    </div>
                    <div style={{ height: 5, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: col, width: `${pct}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Cost donut */}
        <div style={{ ...C, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {costPie.length === 0 ? <div style={{ color: '#444', fontSize: 12 }}>No data</div> : (
            <>
              <PieChart width={120} height={120}>
                <Pie data={costPie} cx={55} cy={55} innerRadius={34} outerRadius={54} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {costPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...TT} formatter={v => [fmt(v)]} />
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {costPie.map(d => {
                  const pct = totalRev > 0 ? Math.round(d.value / totalRev * 100) : 0;
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#666', flex: 1 }}>{d.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{fmt(d.value)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clients table */}
      {clientData.length > 0 && (
        <div style={C}>
          {lbl('Top Clients')}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 380 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Client', 'Rev', 'Net', 'Avg', 'Paid'].map(h => (
                    <th key={h} style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', padding: '5px 8px', textAlign: h === 'Client' ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientData.map(c => (
                  <tr key={c.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 700, fontSize: 12 }}>{c.name}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO }}>{fmt(c.rev)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO, color: '#7BC853' }}>{fmt(c.net)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO, color: '#4A9EFF' }}>{fmt(Math.round(c.rev / c.count))}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.paid === c.count ? '#7BC853' : '#F59E0B' }}>{c.paid}/{c.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Crew spend */}
      {crewData.length > 0 && (
        <div style={C}>
          {lbl('Crew Spend')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {crewData.map(c => {
              const pct = c.total > 0 ? Math.round(c.paid / c.total * 100) : 0;
              const ok = c.paid >= c.total;
              return (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{c.n} shoot{c.n !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853' }}>{fmt(c.paid)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{fmt(c.total)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: ok ? '#7BC853' : '#E81A1A' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: ok ? '#7BC853' : '#E81A1A', width: `${pct}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}