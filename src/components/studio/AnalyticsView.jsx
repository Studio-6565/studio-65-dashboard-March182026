import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line, Legend } from 'recharts';
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

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const lbl = (t) => (
  <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{t}</div>
);

const TabBtn = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: 'none', fontFamily: MONO, whiteSpace: 'nowrap',
    background: active ? '#E81A1A' : 'transparent',
    color: active ? '#fff' : '#555',
  }}>{label}</button>
);

export default function AnalyticsView({ projects }) {
  const [yr, setYr] = useState('all');
  const [tab, setTab] = useState('overview');

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

  // Monthly revenue
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

  // Seasonal trends — by month number (0-11)
  const seasonMap = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], idx: i, shoots: 0, rev: 0 }));
  projects.filter(p => !p.archived && p.date).forEach(p => {
    const mo = new Date(p.date + 'T12:00:00').getMonth();
    seasonMap[mo].shoots++;
    seasonMap[mo].rev += (p.revenue || 0);
  });
  const maxShoots = Math.max(...seasonMap.map(m => m.shoots), 1);

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
    if (!p.client) return;
    if (!clientMap[p.client]) clientMap[p.client] = { name: p.client, rev: 0, net: 0, count: 0, paid: 0 };
    clientMap[p.client].rev += (p.revenue || 0);
    clientMap[p.client].net += (p.net || 0);
    clientMap[p.client].count++;
    if (p.paid) clientMap[p.client].paid++;
  });
  const clientData = Object.values(clientMap).sort((a, b) => b.rev - a.rev);

  // Crew utilization
  const crewMap = {};
  f.forEach(p => (p.crew || []).forEach(c => {
    if (!crewMap[c.name]) crewMap[c.name] = { name: c.name, total: 0, paid: 0, shoots: 0 };
    const cost = c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0);
    crewMap[c.name].total += cost;
    if (c.paid) crewMap[c.name].paid += cost;
    crewMap[c.name].shoots++;
  }));
  const crewData = Object.values(crewMap).sort((a, b) => b.shoots - a.shoots);

  const costPie = [
    { name: 'Net', value: Math.max(totalNet, 0), color: '#7BC853' },
    { name: 'Crew', value: totalCrew, color: '#E81A1A' },
    { name: 'Rental', value: totalRental, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const kpis = [
    { l: 'Revenue', v: fmt(totalRev), c: '#fff' },
    { l: 'Net Profit', v: fmt(totalNet), c: '#7BC853' },
    { l: 'Collected', v: fmt(collected), c: '#7BC853', s: `${collRate}%` },
    { l: 'Outstanding', v: fmt(outstanding), c: outstanding > 0 ? '#E81A1A' : '#7BC853' },
    { l: 'Avg Margin', v: `${avgMargin}%`, c: marginColor(avgMargin) },
    { l: 'Avg Project', v: fmt(f.length ? Math.round(totalRev / f.length) : 0), c: '#4A9EFF' },
    { l: 'Projects', v: f.length, c: '#fff', s: `${paidCount} paid` },
    { l: 'Delivery', v: `${delRate}%`, c: '#A78BFA', s: `${allDels.filter(d=>d.done).length}/${allDels.length}` },
  ];

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

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 3, background: '#111', border: '1px solid #222', borderRadius: 8, padding: 3, width: 'fit-content', flexWrap: 'wrap' }}>
        {['Overview', 'Clients', 'Seasonal', 'Crew'].map(t => (
          <TabBtn key={t} label={t} active={tab === t.toLowerCase()} onClick={() => setTab(t.toLowerCase())} />
        ))}
      </div>

      {/* KPI strip — always visible */}
      <>
        <div className="md-hidden" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4, minWidth: 'max-content' }}>
            {kpis.map(k => (
              <div key={k.l} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 14px', flexShrink: 0, minWidth: 110 }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, whiteSpace: 'nowrap' }}>{k.l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.5px', color: k.c, whiteSpace: 'nowrap' }}>{k.v}</div>
                {k.s && <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginTop: 2 }}>{k.s}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="md-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {kpis.map(k => (
            <div key={k.l} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{k.l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: k.c }}>{k.v}</div>
              {k.s && <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginTop: 2 }}>{k.s}</div>}
            </div>
          ))}
        </div>
      </>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          <div style={C}>
            {lbl('Monthly Revenue')}
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={36} />
                  <Tooltip {...TT} formatter={(v, n) => [fmt(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: MONO, color: '#555' }} />
                  <Line type="monotone" dataKey="Rev" name="Revenue" stroke="#E81A1A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Net" stroke="#7BC853" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
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
        </>
      )}

      {/* ── CLIENTS TAB ── */}
      {tab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clientData.length === 0 ? (
            <div style={{ color: '#444', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>No client data yet.</div>
          ) : (
            <>
              {/* Best by Revenue */}
              <div style={C}>
                {lbl('Best Clients by Revenue')}
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientData.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <XAxis type="number" tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip {...TT} formatter={v => [fmt(v)]} />
                      <Bar dataKey="rev" name="Revenue" fill="#E81A1A" radius={[0,4,4,0]} />
                      <Bar dataKey="net" name="Net" fill="#7BC853" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div style={C}>
                {lbl('Client Breakdown')}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 420 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #222' }}>
                        {['Client', 'Shoots', 'Revenue', 'Net', 'Margin', 'Avg/Shoot', 'Paid'].map(h => (
                          <th key={h} style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', padding: '5px 8px', textAlign: h === 'Client' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientData.map(c => {
                        const mg = c.rev > 0 ? Math.round(c.net / c.rev * 100) : 0;
                        return (
                          <tr key={c.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '8px 8px', fontWeight: 700 }}>{c.name}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: MONO, color: '#4A9EFF' }}>{c.count}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: MONO }}>{fmt(c.rev)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: MONO, color: '#7BC853' }}>{fmt(c.net)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: MONO, color: marginColor(mg) }}>{mg}%</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: MONO, color: '#4A9EFF' }}>{fmt(Math.round(c.rev / c.count))}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: MONO }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: c.paid === c.count ? '#7BC853' : '#F59E0B' }}>{c.paid}/{c.count}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SEASONAL TAB ── */}
      {tab === 'seasonal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={C}>
            {lbl('Shoots per Month (All Time)')}
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonMap}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...TT} formatter={(v, n) => [n === 'shoots' ? v + ' shoots' : fmt(v), n]} />
                  <Bar dataKey="shoots" name="shoots" fill="#4A9EFF" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={C}>
            {lbl('Revenue per Month (All Time)')}
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonMap}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} width={36} />
                  <Tooltip {...TT} formatter={v => [fmt(v)]} />
                  <Bar dataKey="rev" name="Revenue" fill="#E81A1A" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={C}>
            {lbl('Busiest Months Ranked')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...seasonMap].sort((a, b) => b.shoots - a.shoots).map((m, i) => (
                <div key={m.month}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: i < 3 ? 700 : 400, color: i === 0 ? '#F59E0B' : '#fff' }}>
                      {i === 0 ? '🏆 ' : i < 3 ? '⭐ ' : ''}{m.month}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#666' }}>{m.shoots} shoot{m.shoots !== 1 ? 's' : ''} · {fmt(m.rev)}</span>
                  </div>
                  <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: i === 0 ? '#F59E0B' : '#4A9EFF', width: `${(m.shoots / maxShoots) * 100}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CREW TAB ── */}
      {tab === 'crew' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {crewData.length === 0 ? (
            <div style={{ color: '#444', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>No crew data yet.</div>
          ) : (
            <>
              <div style={C}>
                {lbl('Crew Utilization (shoots)')}
                <div style={{ height: Math.max(180, crewData.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crewData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <XAxis type="number" tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip {...TT} formatter={v => [v + ' shoots', 'Shoots']} />
                      <Bar dataKey="shoots" name="Shoots" fill="#4A9EFF" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={C}>
                {lbl('Crew Pay Summary')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {crewData.map(c => {
                    const pct = c.total > 0 ? Math.round(c.paid / c.total * 100) : 0;
                    const ok = c.paid >= c.total;
                    return (
                      <div key={c.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
                            <span style={{ fontFamily: MONO, fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>{c.shoots} shoot{c.shoots !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853' }}>{fmt(c.paid)} paid</span>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>of {fmt(c.total)}</span>
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
            </>
          )}
        </div>
      )}

    </div>
  );
}