import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt } from '@/lib/studio';

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 4, fontFamily: '"DM Mono", monospace' }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, marginTop: 28 }}>{title}</div>
  );
}

export default function DashboardHome({ projects = [], contacts = [], onOpenDetail }) {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const active = useMemo(() => projects.filter(p => !p.archived), [projects]);

  const todayShoots = useMemo(() =>
    active.filter(p => p.date === today || (p.date <= today && p.end_date >= today)),
    [active, today]
  );

  const upcomingShoots = useMemo(() =>
    active.filter(p => p.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    [active, today]
  );

  const unpaidInvoices = useMemo(() =>
    active.filter(p => !p.paid && p.status === 'Invoiced').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [active]
  );

  const pendingDeliverables = useMemo(() =>
    active.filter(p => (p.deliverables || []).some(d => !d.done))
      .map(p => ({ project: p, count: (p.deliverables || []).filter(d => !d.done).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
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

  const inEdit = active.filter(p => p.status === 'In Edit').length;
  const inProduction = active.filter(p => p.status === 'In Production').length;

  const openProject = (p) => {
    if (onOpenDetail) onOpenDetail(p);
    else navigate(`/projects/${p.id}`);
  };

  return (
    <div style={{ maxWidth: 900, paddingBottom: 40 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'} 👋
        </div>
        <div style={{ fontSize: 13, color: '#555', fontFamily: '"DM Mono", monospace' }}>
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        <StatCard label="This Month Revenue" value={fmt(monthRevenue)} color="#fff" />
        <StatCard label="This Month Net" value={fmt(monthNet)} color={monthNet >= 0 ? '#7BC853' : '#E81A1A'} />
        <StatCard label="Crew Owed" value={fmt(crewOwedTotal)} color={crewOwedTotal > 0 ? '#F59E0B' : '#7BC853'} />
        <StatCard label="Unpaid Invoices" value={unpaidInvoices.length} color={unpaidInvoices.length > 0 ? '#E81A1A' : '#7BC853'} />
        <StatCard label="In Production" value={inProduction} />
        <StatCard label="In Edit" value={inEdit} />
      </div>

      {/* Today's shoots */}
      {todayShoots.length > 0 && (
        <>
          <SectionTitle title="Today's Shoots 🎬" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayShoots.map(p => (
              <div key={p.id} onClick={() => openProject(p)} style={{ background: 'rgba(232,26,26,0.07)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#888', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>
                    {p.client}{p.start_time ? ' · ' + p.start_time : ''}{p.address ? ' · ' + p.address : ''}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#E81A1A', fontWeight: 700 }}>TODAY →</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upcoming shoots */}
      {upcomingShoots.length > 0 && (
        <>
          <SectionTitle title="Upcoming Shoots" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcomingShoots.map(p => (
              <div key={p.id} onClick={() => openProject(p)} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>{p.client} · {p.date}</div>
                </div>
                <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace' }}>
                  {Math.ceil((new Date(p.date) - new Date()) / 86400000)}d away
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Unpaid invoices */}
      {unpaidInvoices.length > 0 && (
        <>
          <SectionTitle title="Outstanding Invoices 💸" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unpaidInvoices.slice(0, 5).map(p => (
              <div key={p.id} onClick={() => openProject(p)} style={{ background: '#1A1A1A', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>{p.client}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E81A1A' }}>{fmt(p.revenue)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pending deliverables */}
      {pendingDeliverables.length > 0 && (
        <>
          <SectionTitle title="Pending Deliverables" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingDeliverables.map(({ project: p, count }) => (
              <div key={p.id} onClick={() => openProject(p)} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>{p.client}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#F59E0B', fontWeight: 700 }}>{count} pending</div>
              </div>
            ))}
          </div>
        </>
      )}

      {active.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 80, color: '#444' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, color: '#666' }}>No active projects yet.</div>
          <button onClick={() => navigate('/projects')} style={{ marginTop: 16, padding: '12px 28px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Go to Projects
          </button>
        </div>
      )}
    </div>
  );
}