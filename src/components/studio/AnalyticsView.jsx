import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { fmt, margin, marginColor } from '@/lib/studio';

const MONO = '"DM Mono", monospace';
const SYNE = 'Syne, sans-serif';

const card = {
  background: 'linear-gradient(135deg, #1E1E1E 0%, #1a1a1a 100%)',
  border: '1px solid #2a2a2a',
  borderRadius: 16,
  padding: 24,
};

const STATUS_COLORS = {
  Booked: '#4A9EFF',
  'In Production': '#F59E0B',
  'In Edit': '#A78BFA',
  Delivered: '#7BC853',
  Invoiced: '#E81A1A',
};

const tooltipStyle = {
  contentStyle: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 10,
    fontSize: 11,
    fontFamily: MONO,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: '#888', marginBottom: 4 },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase',
      letterSpacing: '0.12em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1, height: 1, background: '#222' }} />
      {children}
      <div style={{ flex: 1, height: 1, background: '#222' }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color, accent, icon }) {
  return (
    <div style={{
      background: '#141414',
      border: '1px solid #252525',
      borderRadius: 14,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accent || '#333'}, transparent)`,
      }} />
      {icon && <div style={{ fontSize: 18, marginBottom: 10, opacity: 0.7 }}>{icon}</div>}
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || '#fff', letterSpacing: '-0.8px', fontFamily: SYNE }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsView({ projects }) {
  const [yearFilter, setYearFilter] = useState('all');

  const allYears = [...new Set(
    projects.map(p => p.date ? new Date(p.date).getFullYear() : null).filter(Boolean)
  )].sort((a, b) => b - a);

  const filtered = yearFilter === 'all'
    ? projects.filter(p => !p.archived)
    : projects.filter(p => !p.archived && p.date && new Date(p.date).getFullYear() === parseInt(yearFilter));

  // KPIs
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
  const allDels = filtered.flatMap(p => p.deliverables || []);
  const delRate = allDels.length ? Math.round(allDels.filter(d => d.done).length / allDels.length * 100) : 0;

  // Monthly
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

  // Status
  const statusMap = {};
  filtered.forEach(p => {
    const s = p.status || 'Booked';
    if (!statusMap[s]) statusMap[s] = { name: s, value: 0, rev: 0 };
    statusMap[s].value++;
    statusMap[s].rev += (p.revenue || 0);
  });
  const statusData = Object.values(statusMap).sort((a, b) => b.value - a.value);

  // Clients
  const clientMap = {};
  filtered.forEach(p => {
    if (!clientMap[p.client]) clientMap[p.client] = { name: p.client, rev: 0, net: 0, count: 0, paid: 0 };
    clientMap[p.client].rev += (p.revenue || 0);
    clientMap[p.client].net += (p.net || 0);
    clientMap[p.client].count++;
    if (p.paid) clientMap[p.client].paid++;
  });
  const clientData = Object.values(clientMap).sort((a, b) => b.rev - a.rev).slice(0, 8);

  // Crew
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

  // Cost pie
  const costPie = [
    { name: 'Net Profit', value: Math.max(totalNet, 0), color: '#7BC853' },
    { name: 'Crew Cost', value: totalCrewCost, color: '#E81A1A' },
    { name: 'Rental Cost', value: totalRentalCost, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>

      {/* Header + Year filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Analytics</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>
            {filtered.length} projects · {fmt(totalRev)} revenue
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111', border: '1px solid #222', borderRadius: 10, padding: '4px 6px' }}>
          {['all', ...allYears.map(String)].map(y => (
            <button key={y} onClick={() => setYearFilter(y)} style={{
              padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: 'none', fontFamily: MONO, transition: 'all 0.15s',
              background: yearFilter === y ? '#E81A1A' : 'transparent',
              color: yearFilter === y ? '#fff' : '#555',
            }}>{y === 'all' ? 'All Time' : y}</button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <SectionLabel>Key Metrics</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <KpiCard label="Total Revenue" value={fmt(totalRev)} accent="#E81A1A" icon="💰" />
          <KpiCard label="Total Net Profit" value={fmt(totalNet)} color="#7BC853" accent="#7BC853" icon="📈" />
          <KpiCard label="Collected" value={fmt(collected)} sub={`${collectionRate}% collection rate`} color="#7BC853" accent="#7BC853" icon="✅" />
          <KpiCard label="Outstanding" value={fmt(outstanding)} color={outstanding > 0 ? '#E81A1A' : '#7BC853'} accent={outstanding > 0 ? '#E81A1A' : '#7BC853'} icon="⏳" />
          <KpiCard label="Avg Margin" value={`${avgMargin}%`} color={marginColor(avgMargin)} accent={marginColor(avgMargin)} icon="📊" />
          <KpiCard label="Avg Project Value" value={fmt(avgProjectValue)} accent="#4A9EFF" icon="🎬" />
          <KpiCard label="Total Projects" value={filtered.length} sub={`${paidCount} paid`} accent="#F59E0B" icon="📁" />
          <KpiCard label="Delivery Rate" value={`${delRate}%`} sub={`${allDels.filter(d => d.done).length}/${allDels.length} deliverables`} accent="#A78BFA" icon="🎯" />
        </div>
      </div>

      {/* Monthly Chart — full width */}
      <div>
        <SectionLabel>Monthly Revenue & Volume</SectionLabel>
        <div style={{ ...card, padding: '24px 24px 16px' }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Peak Month', value: monthlyData.length ? fmt(Math.max(...monthlyData.map(m => m.Revenue))) : '—', color: '#E81A1A' },
              { label: 'Avg/Month', value: monthlyData.length ? fmt(Math.round(totalRev / monthlyData.length)) : '—', color: '#fff' },
              { label: 'Best Net Month', value: monthlyData.length ? fmt(Math.max(...monthlyData.map(m => m.Net))) : '—', color: '#7BC853' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111', borderRadius: 10, padding: '10px 16px' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} barSize={14} barGap={4}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E81A1A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#E81A1A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7BC853" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7BC853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [n === 'Projects' ? v : fmt(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: MONO, color: '#555', paddingTop: 12 }} />
                <Area type="monotone" dataKey="Revenue" stroke="#E81A1A" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#E81A1A', r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Net" stroke="#7BC853" strokeWidth={2} fill="url(#netGrad)" dot={{ fill: '#7BC853', r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2-col: Status + Cost Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Status */}
        <div>
          <SectionLabel>Pipeline by Status</SectionLabel>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {statusData.length === 0 ? <div style={{ color: '#444', fontSize: 13 }}>No data</div> :
              statusData.map(s => {
                const pct = filtered.length ? Math.round(s.value / filtered.length * 100) : 0;
                const col = STATUS_COLORS[s.name] || '#666';
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>
                          {s.value} project{s.value !== 1 ? 's' : ''} · {fmt(s.rev)}
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: `linear-gradient(90deg, ${col}, ${col}88)`,
                          width: `${pct}%`, transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: col, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Cost donut */}
        <div>
          <SectionLabel>Revenue Split</SectionLabel>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {costPie.length === 0 ? <div style={{ color: '#444', fontSize: 13 }}>No data</div> : (
              <>
                <PieChart width={160} height={160}>
                  <Pie data={costPie} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {costPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => [fmt(v)]} />
                </PieChart>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {costPie.map(d => {
                    const pct = totalRev > 0 ? Math.round(d.value / totalRev * 100) : 0;
                    return (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{d.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(d.value)}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Client section */}
      <div>
        <SectionLabel>Top Clients</SectionLabel>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {/* Chart */}
          <div style={{ padding: '24px 24px 0', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData} layout="vertical" barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#444', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11, fontFamily: SYNE }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: MONO, color: '#555' }} />
                <Bar dataKey="rev" name="Revenue" fill="rgba(232,26,26,0.65)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="net" name="Net" fill="rgba(123,200,83,0.7)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Table */}
          <div style={{ padding: '0 24px 24px', marginTop: 20, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Client', 'Projects', 'Revenue', 'Net', 'Avg/Project', 'Paid'].map(h => (
                    <th key={h} style={{
                      fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase',
                      padding: '8px 12px', textAlign: h === 'Client' ? 'left' : 'right',
                      letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientData.map((c, idx) => (
                  <tr key={c.name}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, color: '#555' }}>{c.count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, fontWeight: 600 }}>{fmt(c.rev)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, color: '#7BC853', fontWeight: 600 }}>{fmt(c.net)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, color: '#4A9EFF' }}>{fmt(Math.round(c.rev / c.count))}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                        background: c.paid === c.count ? 'rgba(123,200,83,0.12)' : 'rgba(245,158,11,0.12)',
                        color: c.paid === c.count ? '#7BC853' : '#F59E0B',
                      }}>{c.paid}/{c.count}</span>
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
          <SectionLabel>Crew Spend</SectionLabel>
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {crewData.map(c => {
                const pct = c.total > 0 ? Math.round(c.paid / c.total * 100) : 0;
                const fullPaid = c.paid >= c.total;
                return (
                  <div key={c.name} style={{ background: '#111', borderRadius: 12, padding: '14px 16px', border: '1px solid #1e1e1e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>
                          {c.projects} shoot{c.projects !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                        background: fullPaid ? 'rgba(123,200,83,0.12)' : 'rgba(232,26,26,0.1)',
                        color: fullPaid ? '#7BC853' : '#E81A1A',
                      }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: fullPaid ? 'linear-gradient(90deg, #7BC853, #5aa33e)' : 'linear-gradient(90deg, #E81A1A, #c01515)',
                        width: `${pct}%`, transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853' }}>{fmt(c.paid)} paid</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{fmt(c.total - c.paid)} owed · {fmt(c.total)} total</span>
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