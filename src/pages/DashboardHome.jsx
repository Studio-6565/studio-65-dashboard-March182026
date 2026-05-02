import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt } from '@/lib/studio';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MorningTaskList from '@/components/studio/MorningTaskList';
import AISmartNudges from '@/components/studio/AISmartNudges';
import RevenueGoal from '@/components/studio/RevenueGoal';
import UpcomingReminders from '@/components/studio/UpcomingReminders';
import PaymentDeadlines from '@/components/studio/PaymentDeadlines';
import OverdueInvoices from '@/components/studio/OverdueInvoices';
import MonthlyStatsDashboard from '@/components/studio/MonthlyStatsDashboard';

const MONO = '"DM Mono", monospace';

const STATUS_COLOR = {
  'Booked':        '#4A9EFF',
  'In Production': '#F59E0B',
  'In Edit':       '#A78BFA',
  'Delivered':     '#7BC853',
  'Invoiced':      '#E81A1A',
};

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#1A1A1A', border: '1px solid #222', borderRadius: 12,
        padding: '16px 18px', cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = '#333')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = '#222')}
    >
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 5, fontFamily: MONO }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ title }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, marginTop: 28 }}>{title}</div>
  );
}

function ProjectRow({ project, onClick, right }) {
  return (
    <div onClick={onClick} style={{ background: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
      onMouseEnter={e => e.currentTarget.style.background = '#222'}
      onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
        <div style={{ fontSize: 11, color: '#666', fontFamily: MONO, marginTop: 2 }}>{project.client}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

const LAST_6_MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (5 - i));
  return d.toISOString().slice(0, 7);
});

const SHORT_MONTH = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleString('en', { month: 'short' });
};

export default function DashboardHome({ projects = [], contacts = [], onOpenDetail }) {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const active = useMemo(() => projects.filter(p => !p.archived), [projects]);

  const todayShoots = useMemo(() =>
    active.filter(p => p.date === today || (p.date && p.end_date && p.date <= today && p.end_date >= today)),
    [active, today]
  );

  const upcomingShoots = useMemo(() =>
    active.filter(p => p.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    [active, today]
  );

  const unpaidInvoices = useMemo(() =>
    active.filter(p => !p.paid && p.status === 'Invoiced').sort((a, b) => (b.revenue || 0) - (a.revenue || 0)),
    [active]
  );

  const pendingDeliverables = useMemo(() =>
    active.filter(p => (p.deliverables || []).some(d => !d.done))
      .map(p => ({ project: p, count: (p.deliverables || []).filter(d => !d.done).length }))
      .sort((a, b) => b.count - a.count).slice(0, 5),
    [active]
  );

  const monthRevenue = useMemo(() =>
    active.filter(p => (p.date || '').startsWith(thisMonth)).reduce((s, p) => s + (p.revenue || 0), 0),
    [active, thisMonth]
  );

  const monthNet = useMemo(() =>
    active.filter(p => (p.date || '').startsWith(thisMonth)).reduce((s, p) => s + (p.net || 0), 0),
    [active, thisMonth]
  );

  const crewOwedTotal = useMemo(() =>
    active.reduce((s, p) => s + (p.crew || []).filter(c => !c.paid).reduce((ss, c) => {
      const total = c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0);
      return ss + total;
    }, 0), 0),
    [active]
  );

  // Status pipeline counts
  const statusCounts = useMemo(() => {
    const counts = {};
    ['Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'].forEach(s => {
      counts[s] = active.filter(p => p.status === s).length;
    });
    return counts;
  }, [active]);

  // Revenue chart data (last 6 months)
  const chartData = useMemo(() =>
    LAST_6_MONTHS.map(ym => ({
      month: SHORT_MONTH(ym),
      revenue: active.filter(p => (p.date || '').startsWith(ym)).reduce((s, p) => s + (p.revenue || 0), 0),
      net: active.filter(p => (p.date || '').startsWith(ym)).reduce((s, p) => s + (p.net || 0), 0),
    })),
    [active]
  );

  const openProject = (p) => {
    if (onOpenDetail) onOpenDetail(p);
    else navigate(`/projects/${p.id}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ maxWidth: 960, paddingBottom: 60 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{greeting} 👋</div>
        <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* TODAY alert banner */}
      {todayShoots.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {todayShoots.map(p => (
            <div key={p.id} onClick={() => openProject(p)} style={{ background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: MONO, color: '#E81A1A', fontWeight: 700, marginBottom: 3 }}>🎬 SHOOTING TODAY</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: MONO, marginTop: 2 }}>
                  {p.client}{p.start_time ? ' · ' + p.start_time : ''}{p.address ? ' · ' + p.address : ''}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#E81A1A', fontFamily: MONO, fontWeight: 700 }}>→</div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly stats */}
      <MonthlyStatsDashboard projects={active} />

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <StatCard label="Month Revenue" value={fmt(monthRevenue)} />
        <StatCard label="Month Net" value={fmt(monthNet)} color={monthNet >= 0 ? '#7BC853' : '#E81A1A'} />
        <StatCard label="Crew Owed" value={fmt(crewOwedTotal)} color={crewOwedTotal > 0 ? '#F59E0B' : '#7BC853'} />
        <StatCard label="Unpaid Invoices" value={unpaidInvoices.length} color={unpaidInvoices.length > 0 ? '#E81A1A' : '#7BC853'} onClick={unpaidInvoices.length > 0 ? () => navigate('/projects') : null} />
        <StatCard label="Active Projects" value={active.filter(p => !['Delivered','Invoiced'].includes(p.status)).length} />
        <StatCard label="Total Contacts" value={contacts.length} onClick={() => navigate('/contacts')} />
      </div>

      {/* Pipeline status bar */}
      <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Pipeline</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} onClick={() => navigate('/projects')} style={{ flex: 1, minWidth: 80, textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: '#111', border: `1px solid ${STATUS_COLOR[status]}22`, cursor: 'pointer' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_COLOR[status] }}>{count}</div>
              <div style={{ fontSize: 9, fontFamily: MONO, color: '#555', marginTop: 3, lineHeight: 1.3 }}>{status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue chart */}
      <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Revenue — Last 6 Months</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} barGap={3}>
            <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, fontFamily: MONO, fontSize: 11 }}
              formatter={(val, name) => [fmt(val), name === 'revenue' ? 'Revenue' : 'Net']}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="revenue" fill="#333" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={i === chartData.length - 1 ? '#E81A1A' : '#2A2A2A'} />
              ))}
            </Bar>
            <Bar dataKey="net" fill="#7BC853" radius={[4, 4, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#2A2A2A' }} /><span style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Revenue</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#7BC853', opacity: 0.7 }} /><span style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Net</span></div>
        </div>
      </div>

      {/* Two column layout for lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 12, marginBottom: 16 }}>

        {/* Upcoming shoots */}
        {upcomingShoots.length > 0 && (
          <div>
            <SectionLabel title="Upcoming Shoots" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcomingShoots.map(p => {
                const daysAway = Math.ceil((new Date(p.date) - new Date()) / 86400000);
                return (
                  <ProjectRow key={p.id} project={p} onClick={() => openProject(p)}
                    right={<span style={{ fontSize: 10, fontFamily: MONO, color: daysAway <= 3 ? '#F59E0B' : '#555' }}>{daysAway}d</span>}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Unpaid invoices */}
        {unpaidInvoices.length > 0 && (
          <div>
            <SectionLabel title="Outstanding Invoices 💸" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unpaidInvoices.slice(0, 5).map(p => (
                <ProjectRow key={p.id} project={p} onClick={() => openProject(p)}
                  right={<span style={{ fontSize: 13, fontWeight: 700, color: '#E81A1A' }}>{fmt(p.revenue)}</span>}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pending deliverables */}
        {pendingDeliverables.length > 0 && (
          <div>
            <SectionLabel title="Pending Deliverables" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingDeliverables.map(({ project: p, count }) => (
                <ProjectRow key={p.id} project={p} onClick={() => openProject(p)}
                  right={<span style={{ fontSize: 10, fontFamily: MONO, color: '#A78BFA', fontWeight: 700 }}>{count} left</span>}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Task list + reminders */}
      <MorningTaskList />
      <UpcomingReminders projects={active} />
      <PaymentDeadlines projects={active} />
      <OverdueInvoices projects={active} onOpenDetail={openProject} />
      <AISmartNudges projects={active} />
      <RevenueGoal projects={active} />

      {active.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 80, color: '#444' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, color: '#555' }}>No active projects yet.</div>
          <button onClick={() => navigate('/projects')} style={{ marginTop: 16, padding: '12px 28px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Create First Project
          </button>
        </div>
      )}
    </div>
  );
}