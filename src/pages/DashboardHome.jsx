import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { fmt } from '@/lib/studio';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MorningTaskList from '@/components/studio/MorningTaskList';
import AISmartNudges from '@/components/studio/AISmartNudges';
import RevenueGoal from '@/components/studio/RevenueGoal';
import UpcomingReminders from '@/components/studio/UpcomingReminders';
import PaymentDeadlines from '@/components/studio/PaymentDeadlines';
import OverdueInvoices from '@/components/studio/OverdueInvoices';
import MonthlyStatsDashboard from '@/components/studio/MonthlyStatsDashboard';
import ProjectProfitChart from '@/components/studio/ProjectProfitChart';
import TopReferrers from '@/components/dashboard/TopReferrers';

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
        background: '#fff', border: '1px solid #E8E8E8', borderRadius: 10,
        padding: '20px', cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = '#D0D0D0')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = '#E8E8E8')}
    >
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#1A1A1A', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 6, fontFamily: MONO }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ title }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, marginTop: 32, fontWeight: 600 }}>{title}</div>
  );
}

function ProjectRow({ project, onClick, right }) {
  return (
    <div onClick={onClick} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#D0D0D0'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#E8E8E8'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1A1A1A' }}>{project.name}</div>
        <div style={{ fontSize: 11, color: '#999', fontFamily: MONO, marginTop: 2 }}>{project.client}</div>
      </div>
      <div style={{ flexShrink: 0, color: '#1A1A1A' }}>{right}</div>
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
  const [leads, setLeads] = useState([]);
  useEffect(() => {
    base44.entities.ClientLead.list('-created_date', 200).then(setLeads).catch(() => {});
  }, []);

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
    <div style={{ paddingBottom: 60, background: '#0A0A0A', minHeight: '100vh' }}>

      {/* Hero Section - Greeting + Today Shoots */}
      <div style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%)', borderBottom: '1px solid #1E1E1E', padding: '32px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{greeting} 👋</div>
            <div style={{ fontSize: 12, color: '#666', fontFamily: MONO }}>
              {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          
          {todayShoots.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayShoots.map(p => (
                <div key={p.id} onClick={() => openProject(p)} style={{ background: 'rgba(232,26,26,0.15)', border: '1px solid rgba(232,26,26,0.4)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.7)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.4)'}
                >
                  <div>
                    <div style={{ fontSize: 10, fontFamily: MONO, color: '#E81A1A', fontWeight: 700, marginBottom: 4, letterSpacing: '0.1em' }}>🎬 SHOOTING TODAY</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#777', fontFamily: MONO, marginTop: 3 }}>
                      {p.client}{p.start_time ? ' · ' + p.start_time : ''}{p.address ? ' · ' + p.address : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#E81A1A', fontFamily: MONO, fontWeight: 700 }}>→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>

        {/* Key Metrics - Horizontal Scroll */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Key Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <StatCard label="Month Revenue" value={fmt(monthRevenue)} />
            <StatCard label="Month Net" value={fmt(monthNet)} color={monthNet >= 0 ? '#7BC853' : '#E81A1A'} />
            <StatCard label="Crew Owed" value={fmt(crewOwedTotal)} color={crewOwedTotal > 0 ? '#F59E0B' : '#7BC853'} />
            <StatCard label="Unpaid" value={unpaidInvoices.length} color={unpaidInvoices.length > 0 ? '#E81A1A' : '#7BC853'} onClick={unpaidInvoices.length > 0 ? () => navigate('/projects') : null} />
            <StatCard label="Active Projects" value={active.filter(p => !['Delivered','Invoiced'].includes(p.status)).length} />
            <StatCard label="Contacts" value={contacts.length} onClick={() => navigate('/contacts')} />
          </div>
        </div>

        {/* Pipeline Status */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Pipeline</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} onClick={() => navigate('/projects')} style={{ padding: '14px 18px', borderRadius: 10, background: '#1A1A1A', border: `1px solid ${STATUS_COLOR[status]}30`, cursor: 'pointer', flex: '1', minWidth: 100, textAlign: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = STATUS_COLOR[status] + '70'}
                onMouseLeave={e => e.currentTarget.style.borderColor = STATUS_COLOR[status] + '30'}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: STATUS_COLOR[status] }}>{count}</div>
                <div style={{ fontSize: 9, fontFamily: MONO, color: '#666', marginTop: 5, lineHeight: 1.3 }}>{status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trend */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Revenue — Last 6 Months</div>
          <div style={{ background: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: 12, padding: '20px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barGap={3}>
                <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
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
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#2A2A2A' }} /><span style={{ fontSize: 10, color: '#666', fontFamily: MONO }}>Revenue</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#7BC853', opacity: 0.7 }} /><span style={{ fontSize: 10, color: '#666', fontFamily: MONO }}>Net</span></div>
            </div>
          </div>
        </div>

        {/* Project Insights */}
        <ProjectProfitChart projects={active} />

        {/* Scrollable Card Sections */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Upcoming</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollBehavior: 'smooth' }}>
            {upcomingShoots.map(p => {
              const daysAway = Math.ceil((new Date(p.date) - new Date()) / 86400000);
              return (
                <div key={p.id} onClick={() => openProject(p)} style={{ 
                  background: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', 
                  minWidth: 280, transition: 'all 0.15s', flexShrink: 0 
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#777', fontFamily: MONO, marginBottom: 10 }}>{p.client}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #222' }}>
                    <span style={{ fontSize: 11, color: '#777', fontFamily: MONO }}>{p.date}</span>
                    <span style={{ fontSize: 10, fontFamily: MONO, color: daysAway <= 3 ? '#F59E0B' : '#777', fontWeight: 700 }}>{daysAway}d away</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outstanding Invoices */}
        {unpaidInvoices.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Outstanding Invoices</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollBehavior: 'smooth' }}>
              {unpaidInvoices.slice(0, 8).map(p => (
                <div key={p.id} onClick={() => openProject(p)} style={{ 
                  background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', 
                  minWidth: 280, transition: 'all 0.15s', flexShrink: 0 
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.2)'}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#777', fontFamily: MONO, marginBottom: 10 }}>{p.client}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(232,26,26,0.2)' }}>
                    <span style={{ fontSize: 11, color: '#777', fontFamily: MONO }}>{p.status}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#E81A1A' }}>{fmt(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Deliverables */}
        {pendingDeliverables.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, fontWeight: 600 }}>Pending Deliverables</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollBehavior: 'smooth' }}>
              {pendingDeliverables.map(({ project: p, count }) => (
                <div key={p.id} onClick={() => openProject(p)} style={{ 
                  background: '#1A1A1A', border: '1px solid #1E1E1E', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', 
                  minWidth: 280, transition: 'all 0.15s', flexShrink: 0 
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#777', fontFamily: MONO, marginBottom: 10 }}>{p.client}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #222' }}>
                    <span style={{ fontSize: 11, color: '#777', fontFamily: MONO }}>Status: {p.status}</span>
                    <span style={{ fontSize: 10, fontFamily: MONO, color: '#A78BFA', fontWeight: 700 }}>{count} left</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Sections */}
        <MorningTaskList />
        <UpcomingReminders projects={active} />
        <PaymentDeadlines projects={active} />
        <OverdueInvoices projects={active} onOpenDetail={openProject} />
        <AISmartNudges projects={active} />
        <RevenueGoal projects={active} />
        <TopReferrers contacts={contacts} leads={leads} projects={active} />

        {active.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 80, color: '#555' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 15 }}>No active projects yet.</div>
            <button onClick={() => navigate('/projects')} style={{ marginTop: 16, padding: '12px 28px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Create First Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}