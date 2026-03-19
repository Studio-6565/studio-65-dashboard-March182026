import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { fmt, margin, marginColor, crewOwed } from '@/lib/studio';

const MONO = '"DM Mono", monospace';
const card = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20 };
const label = { fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
const STATUS_COLORS = {
  Booked: '#4A9EFF',
  'In Production': '#F59E0B',
  'In Edit': '#A78BFA',
  Delivered: '#7BC853',
  Invoiced: '#E81A1A',
};

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function StatCard({ label: lbl, value, sub, color, accent }) {
  return (
    <div style={{ ...card, padding: '14px 16px', borderLeft: accent ? `3px solid ${accent}` : '1px solid #333' }}>
      <div style={label}>{lbl}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#fff', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsView({ projects }) {
  const [yearFilter, setYearFilter] = useState('all');

  const allYears = [...new Set(projects.map(p => p.date ? new Date(p.date).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);
  const thisYear = new Date().getFullYear();

  const filtered = yearFilter === 'all' ? projects.filter(p => !p.archived) : projects.filter(p => !p.archived && p.date && new Date(p.date).getFullYear() === parseInt(yearFilter));

  // --- Core KPIs ---
  const totalRev = filtered.reduce((s, p) => s + (p.revenue || 0), 0);
  const totalNet = filtered.reduce((s, p) => s + (p.net || 0), 0);
  const totalCrewCost = filtered.reduce((s, p) => s + (p.crew_cost || 0), 0);
  const totalRentalCost = filtered.reduce((s, p) => s + (p.rental_cost || 0), 0);
  const collected = filtered.filter(p => p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
  const outstanding = filtered.filter(p => !p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
  const avgMargin = filtered.length ? Math.round(filtered.reduce((s, p) => s + margin(p), 0) / filtered.length) : 0;
  const avgProjectValue = filtered.length ? Math.round(totalRev / filtered.length) : 0;
  const paidCount = filtered.filter(p => p.paid).length;
  const collectionRate = filtered.length ? Math.round(paidCount / filtered.length * 100) : 0;

  // deliverable completion rate
  const allDels = filtered.flatMap(p => p.deliverables || []);
  const delRate = allDels.length ? Math.round(allDels.filter(d => d.done).length / allDels.length * 100) : 0;

  // --- Monthly chart ---
  const monthMap = {};
  filtered.forEach(p => {
    if (!p.date) return;
    const d = new Date(p.date + 'T12:00:00');
    const key = d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { month: key, sortKey, Revenue: 0, Net: 0, Projects: 0 };
    monthMap[key].Revenue += (p.revenue || 0);
    monthMap[key].Net += (p.net || 0);
    monthMap[key].Projects++;
  });
  const monthlyData = Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // --- Status breakdown ---
  const statusMap = {};
  filtered.forEach(p => {
    const s = p.status || 'Booked';
    if (!statusMap[s]) statusMap[s] = { name: s, value: 0, rev: 0 };
    statusMap[s].value++;
    statusMap[s].rev += (p.revenue || 0);
  });
  const statusData = Object.values(statusMap).sort((a, b) => b.value - a.value);

  // --- Client breakdown ---
  const clientMap = {};
  filtered.forEach(p => {
    if (!clientMap[p.client]) clientMap[p.client] = { name: p.client, rev: 0, net: 0, count: 0, paid: 0 };
    clientMap[p.client].rev += (p.revenue || 0);
    clientMap[p.client].net += (p.net || 0);
    clientMap[p.client].count++;
    if (p.paid) clientMap[p.client].paid++;
  });
  const clientData = Object.values(clientMap).sort((a, b) => b.rev - a.rev).slice(0, 8);

  // --- Crew spend ---
  const crewMap = {};
  filtered.forEach(p => {
    (p.crew || []).forEach(c => {
      if (!crewMap[c.name]) crewMap[c.name] = { name: c.name, total: 0, paid: 0, projects: 0 };
      crewMap[c.name].total += (c.cost || 0);
      if (c.paid) crewMap[c.name].paid += (c.cost || 0);
      crewMap[c.name].projects++;
    });
  });
  const crewData = Object.values(crewMap).sort((a, b) => b.total - a.total).slice(0, 8);

  // --- Cost breakdown pie ---
  const costPie = [
    { name: 'Net Profit', value: Math.max(totalNet, 0), color: '#7BC853' },
    { name: 'Crew Cost', value: totalCrewCost, color: '#E81A1A' },
    { name: 'Rental Cost', value: totalRentalCost, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const tooltipStyle = { contentStyle: { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, fontSize: 11, fontFamily: MONO }, labelStyle: { color: '#888' } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Year filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase' }}>Period:</span>
        {['all', ...allYears.map(String)].map(y => (
          <button key={y} onClick={() => setYearFilter(y)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: 'none', fontFamily: MONO,
            background: yearFilter === y ? '#E81A1A' : '#1E1E1E',
            color: yearFilter === y ? '#fff' : '#555',
          }}>{y === 'all' ? 'All Time' : y}</button>
        ))}
      </div>

      {/* KPI grid */}
      <div>
        <SectionTitle>Overview</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          <StatCard label="Total Revenue" value={fmt(totalRev)} accent="#E81A1A" />
          <StatCard label="Total Net Profit" value={fmt(totalNet)} color="#7BC853" accent="#7BC853" />
          <StatCard label="Collected" value={fmt(collected)} sub={`${collectionRate}% collection rate`} color="#7BC853" accent="#7BC853" />
          <StatCard label="Outstanding" value={fmt(outstanding)} color={outstanding > 0 ? '#E81A1A' : '#7BC853'} accent={outstanding > 0 ? '#E81A1A' : '#7BC853'} />
          <StatCard label="Avg Margin" value={`${avgMargin}%`} color={marginColor(avgMargin)} accent={marginColor(avgMargin)} />
          <StatCard label="Avg Project Value" value={fmt(avgProjectValue)} accent="#4A9EFF" />
          <StatCard label="Total Projects" value={filtered.length} sub={`${paidCount} paid`} accent="#F59E0B" />
          <StatCard label="Delivery Rate" value={`${delRate}%`} sub={`${allDels.filter(d => d.done).length}/${allDels.length} deliverables`} accent="#A78BFA" />
        </div>
      </div>

      {/* Monthly Revenue + Project Count */}
      <div>
        <SectionTitle>Monthly Revenue & Volume</SectionTitle>
        <div style={card}>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [n === 'Projects' ? v : fmt(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: MONO, color: '#777' }} />
                <Bar yAxisId="left" dataKey="Revenue" fill="rgba(232,26,26,0.65)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="Net" fill="rgba(123,200,83,0.7)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Projects" fill="rgba(74,158,255,0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status breakdown + Cost pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Status distribution */}
        <div>
          <SectionTitle>Pipeline by Status</SectionTitle>
          <div style={{ ...card, height: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusData.length === 0 ? <div style={{ color: '#555', fontSize: 13 }}>No data</div> :
              statusData.map(s => {
                const pct = filtered.length ? Math.round(s.value / filtered.length * 100) : 0;
                const col = STATUS_COLORS[s.name] || '#666';
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: col }}>{s.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#666' }}>{s.value} · {fmt(s.rev)}</span>
                    </div>
                    <div style={{ height: 6, background: '#2A2A2A', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: col, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Cost breakdown pie */}
        <div>
          <SectionTitle>Revenue Breakdown</SectionTitle>
          <div style={{ ...card, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {costPie.length === 0 ? <div style={{ color: '#555', fontSize: 13 }}>No data</div> : (
              <>
                <PieChart width={130} height={130}>
                  <Pie data={costPie} cx={60} cy={60} innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {costPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => [fmt(v)]} />
                </PieChart>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {costPie.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(d.value)}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{d.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Client breakdown */}
      <div>
        <SectionTitle>Top Clients by Revenue</SectionTitle>
        <div style={card}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#ccc', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
                <Bar dataKey="rev" name="Revenue" fill="rgba(232,26,26,0.6)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="net" name="Net" fill="rgba(123,200,83,0.7)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Client table */}
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Client', 'Projects', 'Revenue', 'Net', 'Avg/Project', 'Paid'].map(h => (
                    <th key={h} style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', padding: '6px 10px', textAlign: h === 'Client' ? 'left' : 'right', borderBottom: '1px solid #2A2A2A' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientData.map(c => (
                  <tr key={c.name} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: '#2A2A2A', borderRadius: 4, color: '#D9D9D9', fontFamily: MONO }}>{c.name}</span>
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right', fontFamily: MONO, color: '#666' }}>{c.count}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right', fontFamily: MONO }}>{fmt(c.rev)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right', fontFamily: MONO, color: '#7BC853' }}>{fmt(c.net)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right', fontFamily: MONO, color: '#4A9EFF' }}>{fmt(Math.round(c.rev / c.count))}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right', fontFamily: MONO }}>
                      <span style={{ color: c.paid === c.count ? '#7BC853' : '#F59E0B' }}>{c.paid}/{c.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Crew spend */}
      {crewData.length > 0 && (
        <div>
          <SectionTitle>Crew Spend</SectionTitle>
          <div style={card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {crewData.map(c => {
                const pct = c.total > 0 ? Math.round(c.paid / c.total * 100) : 0;
                return (
                  <div key={c.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{c.projects} shoot{c.projects !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#7BC853' }}>{fmt(c.paid)} paid</span>
                        <span style={{ fontFamily: MONO, fontSize: 11 }}>{fmt(c.total)} total</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: c.paid === c.total ? 'rgba(123,200,83,0.12)' : 'rgba(232,26,26,0.1)', color: c.paid === c.total ? '#7BC853' : '#E81A1A' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: '#2A2A2A', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: c.paid === c.total ? '#7BC853' : '#E81A1A', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}