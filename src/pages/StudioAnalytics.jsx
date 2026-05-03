import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, RefreshCw, TrendingUp, DollarSign, Briefcase, Users } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const fmt = (n) => '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0 });
const COLORS = ['#E81A1A', '#F59E0B', '#7BC853', '#4A9EFF', '#A78BFA'];

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function StudioAnalytics() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [period, setPeriod] = useState('12'); // months

  useEffect(() => {
    base44.entities.Project.list('-date', 500)
      .then(p => { setProjects(p.filter(x => !x.archived && !x.is_test)); })
      .finally(() => setLoading(false));
  }, []);

  const periodMonths = parseInt(period);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - periodMonths);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return projects.filter(p => p.date && p.date >= cutoffStr);
  }, [projects, periodMonths]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((s, p) => s + (p.revenue || 0), 0);
    const totalNet = filtered.reduce((s, p) => s + (p.net || 0), 0);
    const totalCrew = filtered.reduce((s, p) => s + (p.crew_cost || 0), 0);
    const paidCount = filtered.filter(p => p.paid).length;
    const avgMargin = filtered.length > 0
      ? Math.round(filtered.filter(p => p.revenue > 0).reduce((s, p) => s + ((p.net || 0) / p.revenue * 100), 0) / (filtered.filter(p => p.revenue > 0).length || 1))
      : 0;
    const unpaidRevenue = filtered.filter(p => !p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
    return { totalRevenue, totalNet, totalCrew, paidCount, avgMargin, unpaidRevenue };
  }, [filtered]);

  // Monthly revenue chart
  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      if (!p.date) return;
      const key = p.date.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { month: key, revenue: 0, net: 0, count: 0 };
      map[key].revenue += p.revenue || 0;
      map[key].net += p.net || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(d => ({
      ...d,
      label: new Date(d.month + '-01').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' }),
    }));
  }, [filtered]);

  // Revenue by client
  const clientData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const name = p.client || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += p.revenue || 0;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filtered]);

  // Status breakdown
  const statusData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      map[p.status] = (map[p.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const handleMonthlyReport = async () => {
    setReportLoading(true);
    setReportMsg('');
    try {
      const res = await base44.functions.invoke('monthlyRevenueReport', {});
      setReportMsg(`Report sent for ${res.data?.month || 'last month'} (${res.data?.projects || 0} projects, ${fmt(res.data?.revenue || 0)})`);
    } catch (e) {
      setReportMsg('Failed to send report: ' + e.message);
    }
    setReportLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40, color: '#555', fontFamily: MONO, fontSize: 12 }}>Loading analytics...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>Studio Analytics</div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>Revenue & project performance overview</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, overflow: 'hidden' }}>
            {[['3', '3M'], ['6', '6M'], ['12', '1Y'], ['24', '2Y']].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} style={{ padding: '7px 14px', border: 'none', fontFamily: MONO, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: period === v ? '#E81A1A' : 'transparent', color: period === v ? '#fff' : '#555' }}>{l}</button>
            ))}
          </div>
          <button
            onClick={handleMonthlyReport}
            disabled={reportLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, opacity: reportLoading ? 0.6 : 1 }}
          >
            {reportLoading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
            Email Monthly Report
          </button>
        </div>
      </div>

      {reportMsg && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 10, fontFamily: MONO, fontSize: 12, color: '#7BC853' }}>
          ✓ {reportMsg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 28 }}>
        <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} sub={`${filtered.length} projects`} color="#fff" />
        <StatCard label="Total Net" value={fmt(stats.totalNet)} sub={`after crew & rentals`} color="#7BC853" />
        <StatCard label="Avg Margin" value={`${stats.avgMargin}%`} sub="net / revenue" color={stats.avgMargin >= 50 ? '#7BC853' : stats.avgMargin >= 30 ? '#F59E0B' : '#E81A1A'} />
        <StatCard label="Unpaid Revenue" value={fmt(stats.unpaidRevenue)} sub={`${filtered.length - stats.paidCount} unpaid`} color={stats.unpaidRevenue > 0 ? '#F59E0B' : '#7BC853'} />
        <StatCard label="Crew Costs" value={fmt(stats.totalCrew)} color="#E81A1A" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Monthly Revenue */}
        {monthlyData.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '18px 16px', gridColumn: 'span 2' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Revenue vs Net</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} />
                <YAxis tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, fontFamily: MONO, fontSize: 11 }} formatter={(v) => fmt(v)} />
                <Bar dataKey="revenue" fill="#E81A1A" radius={[3, 3, 0, 0]} name="Revenue" />
                <Bar dataKey="net" fill="#7BC853" radius={[3, 3, 0, 0]} name="Net" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue by Client */}
        {clientData.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '18px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue by Client</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 9, fontFamily: MONO }} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 10, fontFamily: MONO }} width={80} />
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, fontFamily: MONO, fontSize: 11 }} formatter={(v) => fmt(v)} />
                <Bar dataKey="revenue" fill="#4A9EFF" radius={[0, 3, 3, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Project Status Breakdown */}
        {statusData.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '18px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects by Status</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, fontFamily: MONO, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top projects table */}
      {filtered.length > 0 && (
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Projects by Revenue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...filtered].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 10).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#111', borderRadius: 10, border: '1px solid #1A1A1A' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.paid ? '#7BC853' : '#F59E0B', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>{p.client} · {p.date} · {p.status}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0, textAlign: 'right' }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>Revenue</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(p.revenue)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>Net</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{fmt(p.net)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>Margin</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.revenue > 0 ? (p.net / p.revenue > 0.5 ? '#7BC853' : p.net / p.revenue > 0.3 ? '#F59E0B' : '#E81A1A') : '#555' }}>
                      {p.revenue > 0 ? Math.round((p.net || 0) / p.revenue * 100) + '%' : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 14 }}>No project data for this period.</div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}