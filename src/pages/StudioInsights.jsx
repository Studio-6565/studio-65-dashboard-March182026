import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, Clock, DollarSign, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

function fmt(n) {
  return '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({ label, value, sub, color = '#fff' }) {
  return (
    <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#444', marginTop: 6, fontFamily: MONO }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: MONO }}>
      <div style={{ color: '#888', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{p.dataKey.includes('hours') ? `${p.value}h` : fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function StudioInsights() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(12); // months

  useEffect(() => {
    base44.entities.Project.list('-date', 500).then(ps => {
      setProjects(ps.filter(p => !p.is_test));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <Loader2 size={24} color="#E81A1A" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - timeRange);
  const inRange = projects.filter(p => p.date && new Date(p.date) >= cutoff);

  // ── 1. Monthly revenue: billed vs paid ──────────────────────────────────────
  const monthMap = {};
  inRange.forEach(p => {
    if (!p.date) return;
    const key = p.date.slice(0, 7); // YYYY-MM
    if (!monthMap[key]) monthMap[key] = { month: key, billed: 0, paid: 0 };
    const rev = p.revenue || 0;
    if (rev > 0) {
      monthMap[key].billed += rev;
      if (p.paid) monthMap[key].paid += rev;
    }
  });
  const revenueData = Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      ...m,
      month: new Date(m.month + '-01').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' }),
    }));

  // ── 2. Hours by project type (Shoot vs Edit) ────────────────────────────────
  const typeMap = {};
  inRange.forEach(p => {
    const type = ['In Edit', 'Delivered'].includes(p.status) ? 'Edit' : 'Shoot';
    if (!typeMap[type]) typeMap[type] = { type, hours: 0, projects: 0 };
    const hrs = (p.hours || []).reduce((s, h) => s + (h.hours || 0), 0);
    typeMap[type].hours += hrs;
    typeMap[type].projects += 1;
  });

  // Also break down by status
  const statusHours = {};
  inRange.forEach(p => {
    const st = p.status || 'Unknown';
    if (!statusHours[st]) statusHours[st] = { status: st, hours: 0, projects: 0 };
    const hrs = (p.hours || []).reduce((s, h) => s + (h.hours || 0), 0);
    statusHours[st].hours += hrs;
    statusHours[st].projects += 1;
  });
  const hoursData = Object.values(statusHours).sort((a, b) => b.hours - a.hours);

  // ── 3. Clients by lifetime value ────────────────────────────────────────────
  const clientMap = {};
  projects.forEach(p => {
    const name = p.client || 'Unknown';
    if (!clientMap[name]) clientMap[name] = { name, total: 0, paid: 0, projects: 0 };
    clientMap[name].total += p.revenue || 0;
    if (p.paid) clientMap[name].paid += p.revenue || 0;
    clientMap[name].projects += 1;
  });
  const clientRanking = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // ── 4. Profitability by content/shoot type ──────────────────────────────────
  const shootTypeMap = {};
  inRange.forEach(p => {
    const nameLower = (p.name || '').toLowerCase();
    let type = 'Other';
    if (nameLower.includes('reel') || nameLower.includes('instagram')) type = 'Reel';
    else if (nameLower.includes('wedding')) type = 'Wedding';
    else if (nameLower.includes('corporate') || nameLower.includes('corp')) type = 'Corporate';
    else if (nameLower.includes('real estate') || nameLower.includes('realty') || nameLower.includes('listing')) type = 'Real Estate';
    else if (nameLower.includes('restaurant') || nameLower.includes('food')) type = 'Restaurant';
    else if (nameLower.includes('event')) type = 'Event';
    else if (nameLower.includes('product')) type = 'Product';
    else if (nameLower.includes('podcast')) type = 'Podcast';
    if (!shootTypeMap[type]) shootTypeMap[type] = { type, revenue: 0, net: 0, projects: 0, margins: [] };
    shootTypeMap[type].revenue += p.revenue || 0;
    shootTypeMap[type].net += p.net || 0;
    shootTypeMap[type].projects += 1;
    if ((p.revenue || 0) > 0) {
      shootTypeMap[type].margins.push(Math.round(((p.net || 0) / p.revenue) * 100));
    }
  });
  const shootTypeData = Object.values(shootTypeMap)
    .filter(d => d.revenue > 0)
    .map(d => ({
      ...d,
      margin: d.revenue > 0 ? Math.round((d.net / d.revenue) * 100) : 0,
      avgMargin: d.margins.length > 0 ? Math.round(d.margins.reduce((s, m) => s + m, 0) / d.margins.length) : 0,
    }))
    .sort((a, b) => b.net - a.net);

  // ── 5. Margin by shoot type (avg margin %) ──────────────────────────────────
  const marginByTypeData = [...shootTypeData]
    .filter(d => d.projects >= 1)
    .sort((a, b) => b.avgMargin - a.avgMargin);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalBilled = inRange.reduce((s, p) => s + (p.revenue || 0), 0);
  const totalPaid = inRange.filter(p => p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
  const totalHours = inRange.reduce((s, p) => s + (p.hours || []).reduce((a, h) => a + (h.hours || 0), 0), 0);
  const activeClients = new Set(inRange.map(p => p.client).filter(Boolean)).size;

  const RANGES = [3, 6, 12, 24];

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Studio Insights</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginTop: 4 }}>Performance analytics & client intelligence</div>
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#111', border: '1px solid #1A1A1A', borderRadius: 10, padding: 4 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: MONO,
              background: timeRange === r ? '#E81A1A' : 'transparent',
              color: timeRange === r ? '#fff' : '#555',
              transition: 'all 0.15s',
            }}>{r}mo</button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 32 }}>
        <StatCard label="Total Billed" value={fmt(totalBilled)} sub={`Last ${timeRange} months`} color="#fff" />
        <StatCard label="Total Collected" value={fmt(totalPaid)} sub={`${totalBilled > 0 ? Math.round((totalPaid/totalBilled)*100) : 0}% collected`} color="#7BC853" />
        <StatCard label="Outstanding" value={fmt(totalBilled - totalPaid)} sub="Unpaid invoices" color={totalBilled - totalPaid > 0 ? '#F59E0B' : '#7BC853'} />
        <StatCard label="Active Clients" value={activeClients} sub="Unique clients" color="#4A9EFF" />
        <StatCard label="Total Hours Logged" value={`${totalHours}h`} sub={`${inRange.length} projects`} color="#A78BFA" />
      </div>

      {/* Chart 1: Monthly Revenue */}
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, padding: '22px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TrendingUp size={16} color="#E81A1A" />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Monthly Revenue — Billed vs. Collected</div>
        </div>
        {revenueData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333', fontFamily: MONO, fontSize: 12 }}>No revenue data in this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: MONO, color: '#666' }} />
              <Bar dataKey="billed" name="Billed" fill="#E81A1A" radius={[4, 4, 0, 0]} opacity={0.7} />
              <Bar dataKey="paid" name="Collected" fill="#7BC853" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 2: Hours by project type */}
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, padding: '22px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Clock size={16} color="#A78BFA" />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Hours Logged by Project Status</div>
        </div>
        {hoursData.length === 0 || hoursData.every(d => d.hours === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333', fontFamily: MONO, fontSize: 12 }}>No hours logged yet — start tracking time on projects</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hoursData} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#444', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
              <YAxis type="category" dataKey="status" tick={{ fill: '#888', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="hours" name="Hours" fill="#A78BFA" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          {hoursData.map(d => (
            <div key={d.status} style={{ padding: '6px 12px', background: '#111', border: '1px solid #1A1A1A', borderRadius: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{d.status}: </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', fontWeight: 700 }}>{d.hours}h</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}> ({d.projects})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 3: Profitability by Shoot Type */}
      {shootTypeData.length > 0 && (
        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, padding: '22px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <DollarSign size={16} color="#7BC853" />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Profitability by Shoot Type</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Type', 'Projects', 'Revenue', 'Net Profit', 'Margin'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Projects' ? 'center' : 'left', fontFamily: MONO, fontSize: 9, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #141414', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shootTypeData.map((d, i) => (
                  <tr key={d.type} style={{ borderBottom: '1px solid #0D0D0D' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#111'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#fff' }}>{d.type}</td>
                    <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 11, color: '#555', textAlign: 'center' }}>{d.projects}</td>
                    <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 12, color: '#fff' }}>{fmt(d.revenue)}</td>
                    <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 12, color: d.net >= 0 ? '#7BC853' : '#E81A1A', fontWeight: 700 }}>{fmt(d.net)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', minWidth: 50 }}>
                          <div style={{ height: '100%', width: `${Math.max(0, d.margin)}%`, background: d.margin >= 50 ? '#7BC853' : d.margin >= 25 ? '#F59E0B' : '#E81A1A', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: d.margin >= 50 ? '#7BC853' : d.margin >= 25 ? '#F59E0B' : '#E81A1A', fontWeight: 700, flexShrink: 0 }}>{d.margin}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#111', border: '1px solid #1A1A1A', borderRadius: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>
              💡 Shoot types are detected from project names. Include keywords like "Reel", "Wedding", "Corporate", "Real Estate", "Event", "Product", "Restaurant" in project names for accurate categorisation.
            </div>
          </div>
        </div>
      )}

      {/* Chart 4: Margin % by Shoot Type */}
      {marginByTypeData.length > 0 && (
        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, padding: '22px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <TrendingUp size={16} color="#F59E0B" />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Margin % by Shoot Type</div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginLeft: 4 }}>avg across all projects per type</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {marginByTypeData.map(d => {
              const color = d.avgMargin >= 60 ? '#7BC853' : d.avgMargin >= 35 ? '#F59E0B' : '#E81A1A';
              return (
                <div key={d.type}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
                    <div style={{ width: 110, fontFamily: MONO, fontSize: 11, color: '#888', flexShrink: 0 }}>{d.type}</div>
                    <div style={{ flex: 1, height: 20, background: '#111', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, d.avgMargin))}%`, background: color, borderRadius: 4, transition: 'width 0.4s', opacity: 0.85 }} />
                      {/* 50% target */}
                      <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: '#222' }} />
                    </div>
                    <div style={{ width: 44, textAlign: 'right', fontFamily: MONO, fontSize: 12, fontWeight: 800, color, flexShrink: 0 }}>{d.avgMargin}%</div>
                    <div style={{ width: 60, fontFamily: MONO, fontSize: 10, color: '#444', textAlign: 'right', flexShrink: 0 }}>{d.projects} proj</div>
                  </div>
                  {/* Per-project margin dots */}
                  <div style={{ paddingLeft: 122, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {d.margins.map((m, i) => (
                      <div key={i} title={`${m}%`} style={{ width: 8, height: 8, borderRadius: '50%', background: m >= 60 ? '#7BC853' : m >= 35 ? '#F59E0B' : '#E81A1A', opacity: 0.7 }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
            {[['≥60%', '#7BC853', 'High margin'], ['35-59%', '#F59E0B', 'Mid'], ['<35%', '#E81A1A', 'Low / Loss']].map(([label, color, sub]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{label} {sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table 5: Client Lifetime Value */}
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, padding: '22px 20px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Users size={16} color="#4A9EFF" />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Client Lifetime Value Ranking</div>
        </div>
        {clientRanking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333', fontFamily: MONO, fontSize: 12 }}>No client data yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
              <thead>
                <tr>
                  {['#', 'Client', 'Total Billed', 'Total Paid', 'Collect Rate', 'Projects'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: h === '#' ? 'center' : 'left', fontFamily: MONO, fontSize: 9, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #141414', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientRanking.map((c, i) => {
                  const rate = c.total > 0 ? Math.round((c.paid / c.total) * 100) : 0;
                  return (
                    <tr key={c.name} style={{ borderBottom: '1px solid #0D0D0D' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#111'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: i < 3 ? ['#F59E0B', '#888', '#7B5A3A'][i] : '#333', fontWeight: 700 }}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff' }}>{c.name}</td>
                      <td style={{ padding: '12px 14px', fontFamily: MONO, fontSize: 12, color: '#fff' }}>{fmt(c.total)}</td>
                      <td style={{ padding: '12px 14px', fontFamily: MONO, fontSize: 12, color: '#7BC853' }}>{fmt(c.paid)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', minWidth: 50 }}>
                            <div style={{ height: '100%', width: `${rate}%`, background: rate >= 80 ? '#7BC853' : rate >= 50 ? '#F59E0B' : '#E81A1A', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: '#666', flexShrink: 0 }}>{rate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: MONO, fontSize: 11, color: '#555', textAlign: 'center' }}>{c.projects}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}