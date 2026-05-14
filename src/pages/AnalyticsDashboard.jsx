import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt } from '@/lib/studio';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const RED = '#E81A1A';
const GREEN = '#7BC853';
const AMBER = '#F59E0B';
const BLUE = '#4A9EFF';
const PURPLE = '#A78BFA';

// Build last N months array
const lastNMonths = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (n - 1 - i));
  return d.toISOString().slice(0, 7);
});

const shortMonth = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleString('en', { month: 'short' });
};

const CHART_TOOLTIP = {
  contentStyle: { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, fontFamily: MONO, fontSize: 11, color: '#ccc' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

const PIE_COLORS = [BLUE, PURPLE, GREEN, AMBER, RED, '#EC4899', '#14B8A6'];

function ChartCard({ title, sub, children, span = 1 }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1A1A1A', borderRadius: 14,
      padding: '18px 20px', gridColumn: `span ${span}`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginBottom: 14 }}>{sub}</div>}
      {!sub && <div style={{ marginBottom: 14 }} />}
      {children}
    </div>
  );
}

function KpiCard({ label, value, trend, trendLabel, color }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? GREEN : trend === 'down' ? RED : '#555';
  return (
    <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#fff', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      {trendLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendIcon size={11} color={trendColor} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: trendColor }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function RangeSelector({ value, onChange }) {
  const options = [
    { k: '3', label: '3M' },
    { k: '6', label: '6M' },
    { k: '12', label: '12M' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{
          padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
          fontFamily: MONO, border: `1px solid ${value === o.k ? RED : '#1E1E1E'}`,
          background: value === o.k ? 'rgba(232,26,26,0.1)' : 'transparent',
          color: value === o.k ? RED : '#444',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('6');

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-date', 500),
      base44.entities.CaptureTask.list('-created_date', 500),
      base44.entities.ClientLead.list('-created_date', 300),
    ]).then(([p, t, l]) => {
      setProjects(p.filter(x => !x.is_test));
      setTasks(t);
      setLeads(l);
    }).finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => lastNMonths(+range), [range]);
  const active = useMemo(() => projects.filter(p => !p.archived), [projects]);

  // ── Revenue & Net ──────────────────────────────────────────────────────────
  const revenueData = useMemo(() =>
    months.map(ym => {
      const ps = active.filter(p => (p.date || '').startsWith(ym));
      const revenue = ps.reduce((s, p) => s + (p.revenue || 0), 0);
      const net = ps.reduce((s, p) => s + (p.net || 0), 0);
      const shoots = ps.length;
      return { month: shortMonth(ym), revenue, net, shoots };
    }),
    [active, months]
  );

  // ── Revenue trend (this month vs prev month) ───────────────────────────────
  const revTrend = useMemo(() => {
    const thisM = new Date().toISOString().slice(0, 7);
    const prevM = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
    const thisRev = active.filter(p => (p.date || '').startsWith(thisM)).reduce((s, p) => s + (p.revenue || 0), 0);
    const prevRev = active.filter(p => (p.date || '').startsWith(prevM)).reduce((s, p) => s + (p.revenue || 0), 0);
    const pct = prevRev > 0 ? Math.round(((thisRev - prevRev) / prevRev) * 100) : null;
    return { thisRev, prevRev, pct };
  }, [active]);

  // ── Projects per month ────────────────────────────────────────────────────
  const shootsData = useMemo(() =>
    months.map(ym => ({
      month: shortMonth(ym),
      count: active.filter(p => (p.date || '').startsWith(ym)).length,
    })),
    [active, months]
  );

  // ── Project status breakdown (pie) ────────────────────────────────────────
  const statusData = useMemo(() => {
    const counts = {};
    active.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [active]);

  // ── Margin % per month ────────────────────────────────────────────────────
  const marginData = useMemo(() =>
    months.map(ym => {
      const ps = active.filter(p => (p.date || '').startsWith(ym));
      const rev = ps.reduce((s, p) => s + (p.revenue || 0), 0);
      const net = ps.reduce((s, p) => s + (p.net || 0), 0);
      const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;
      return { month: shortMonth(ym), margin };
    }),
    [active, months]
  );

  // ── Capture tasks by type ─────────────────────────────────────────────────
  const taskTypeData = useMemo(() => {
    const counts = {};
    tasks.forEach(t => { const k = t.type || 'note'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // ── Task captures over time (week buckets) ────────────────────────────────
  const taskTrendData = useMemo(() => {
    const weeks = Array.from({ length: +range === 3 ? 12 : +range === 6 ? 26 : 52 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (( (+range === 3 ? 12 : +range === 6 ? 26 : 52) - 1 - i) * 7));
      return d.toISOString().split('T')[0].slice(0, 8) + '00'; // week start approx
    });
    // Group by week
    const bucketed = {};
    tasks.forEach(t => {
      if (!t.created_date) return;
      const d = new Date(t.created_date);
      // Find nearest week start
      d.setDate(d.getDate() - d.getDay());
      const k = d.toISOString().slice(0, 10);
      bucketed[k] = (bucketed[k] || 0) + 1;
    });
    // Return last N weeks
    const allWeeks = Object.entries(bucketed)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-(+range === 3 ? 12 : +range === 6 ? 26 : 52));
    return allWeeks.map(([week, count]) => ({
      week: new Date(week).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      tasks: count,
    }));
  }, [tasks, range]);

  // ── Lead funnel ───────────────────────────────────────────────────────────
  const leadFunnelData = useMemo(() => {
    const stages = ['prospect', 'proposal_sent', 'negotiating', 'won', 'lost'];
    const labels = { prospect: 'Prospect', proposal_sent: 'Proposal', negotiating: 'Negotiating', won: 'Won', lost: 'Lost' };
    const colors = { prospect: BLUE, proposal_sent: PURPLE, negotiating: AMBER, won: GREEN, lost: '#444' };
    return stages.map(s => ({
      stage: labels[s], count: leads.filter(l => l.status === s).length,
      fill: colors[s],
    }));
  }, [leads]);

  // ── Leads over time ───────────────────────────────────────────────────────
  const leadsOverTime = useMemo(() =>
    months.map(ym => ({
      month: shortMonth(ym),
      new: leads.filter(l => (l.first_contact_date || l.created_date || '').startsWith(ym)).length,
      won: leads.filter(l => l.status === 'won' && (l.closed_date || '').startsWith(ym)).length,
    })),
    [leads, months]
  );

  // ── Top clients by revenue ─────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map = {};
    active.forEach(p => {
      if (!p.client) return;
      map[p.client] = (map[p.client] || 0) + (p.revenue || 0);
    });
    return Object.entries(map)
      .map(([client, revenue]) => ({ client, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [active]);

  const totalRevenue = useMemo(() => active.reduce((s, p) => s + (p.revenue || 0), 0), [active]);
  const totalNet = useMemo(() => active.reduce((s, p) => s + (p.net || 0), 0), [active]);
  const avgMargin = totalRevenue > 0 ? Math.round((totalNet / totalRevenue) * 100) : 0;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const totalLeads = leads.length;
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#333', fontFamily: MONO, fontSize: 12 }}>
      Loading analytics...
    </div>
  );

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', maxWidth: 1100, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <BarChart2 size={20} color={RED} />
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Analytics</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>
            Revenue · Margins · Captures · Leads — all-time + trend view
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          trend={revTrend.pct != null ? (revTrend.pct >= 0 ? 'up' : 'down') : 'flat'}
          trendLabel={revTrend.pct != null ? `${revTrend.pct > 0 ? '+' : ''}${revTrend.pct}% vs last month` : 'No data'}
          color="#fff"
        />
        <KpiCard
          label="Net Profit"
          value={fmt(totalNet)}
          color={totalNet >= 0 ? GREEN : RED}
          trendLabel={`${avgMargin}% avg margin`}
          trend={avgMargin >= 30 ? 'up' : avgMargin >= 10 ? 'flat' : 'down'}
        />
        <KpiCard label="Active Projects" value={active.filter(p => !['Delivered', 'Invoiced'].includes(p.status)).length} color={BLUE} />
        <KpiCard label="Shoots (period)" value={shootsData.reduce((s, d) => s + d.count, 0)} />
        <KpiCard label="Tasks Captured" value={tasks.length} color={PURPLE} />
        <KpiCard label="Lead Win Rate" value={`${winRate}%`} color={winRate >= 50 ? GREEN : AMBER} trendLabel={`${wonLeads} won / ${totalLeads} leads`} trend={winRate >= 50 ? 'up' : 'flat'} />
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

        {/* Revenue + Net — area chart */}
        <ChartCard title="Revenue & Net" sub="Monthly · hover for details" span={2}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RED} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={RED} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip {...CHART_TOOLTIP} formatter={(v, n) => [fmt(v), n === 'revenue' ? 'Revenue' : 'Net']} />
              <Area type="monotone" dataKey="revenue" stroke={RED} strokeWidth={2} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="net" stroke={GREEN} strokeWidth={2} fill="url(#netGrad)" dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 20, height: 2, background: RED, borderRadius: 1 }} /><span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>Revenue</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 20, height: 2, background: GREEN, borderRadius: 1, opacity: 0.8 }} /><span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>Net Profit</span></div>
          </div>
        </ChartCard>

        {/* Margin % line chart */}
        <ChartCard title="Profit Margin %" sub="Monthly margin trend">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={marginData}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Margin']} />
              <Line type="monotone" dataKey="margin" stroke={AMBER} strokeWidth={2} dot={{ fill: AMBER, r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Shoots per month bar chart */}
        <ChartCard title="Shoots Per Month" sub="Project volume trend">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={shootsData} barSize={22}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} formatter={(v) => [v, 'Shoots']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {shootsData.map((_, i) => (
                  <Cell key={i} fill={i === shootsData.length - 1 ? BLUE : '#2A2A2A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Project status pie */}
        <ChartCard title="Project Status Breakdown" sub="Current pipeline distribution">
          {statusData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: MONO, fontSize: 10, color: '#333' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Capture tasks over time */}
        <ChartCard title="Capture Activity" sub="Tasks captured per week">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={taskTrendData}>
              <defs>
                <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURPLE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} formatter={(v) => [v, 'Tasks']} />
              <Area type="monotone" dataKey="tasks" stroke={PURPLE} strokeWidth={2} fill="url(#taskGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Task type breakdown */}
        <ChartCard title="Capture Task Types" sub="What you're capturing most">
          {taskTypeData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: MONO, fontSize: 10, color: '#333' }}>No captures yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {taskTypeData.sort((a, b) => b.value - a.value).map((item, i) => {
                const max = Math.max(...taskTypeData.map(t => t.value));
                return (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', width: 80, flexShrink: 0 }}>{item.name}</div>
                    <div style={{ flex: 1, height: 8, background: '#1A1A1A', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(item.value / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', width: 28, textAlign: 'right' }}>{item.value}</div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Lead funnel bar chart */}
        <ChartCard title="Lead Pipeline Funnel" sub="Current leads by stage">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={leadFunnelData} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fill: '#777', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...CHART_TOOLTIP} formatter={(v) => [v, 'Leads']} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {leadFunnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Leads over time */}
        <ChartCard title="Lead Activity Over Time" sub="New leads vs wins per month">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={leadsOverTime} barGap={3}>
              <CartesianGrid stroke="#1A1A1A" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="new" name="New Leads" fill={BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="won" name="Won" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: BLUE }} /><span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>New Leads</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: GREEN }} /><span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>Won</span></div>
          </div>
        </ChartCard>

        {/* Top clients by revenue */}
        <ChartCard title="Top Clients by Revenue" sub="All-time gross revenue per client" span={2}>
          {topClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', fontFamily: MONO, fontSize: 10, color: '#333' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topClients} barSize={28}>
                <CartesianGrid stroke="#1A1A1A" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="client" tick={{ fill: '#666', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [fmt(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {topClients.map((_, i) => <Cell key={i} fill={i === 0 ? RED : '#2A2A2A'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>
    </div>
  );
}