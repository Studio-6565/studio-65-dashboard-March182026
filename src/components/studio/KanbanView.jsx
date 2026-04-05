import React from 'react';
import { fmt } from '@/lib/studio';

const STATUSES = ['Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'];

const STATUS_STYLE = {
  'Booked':        { color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)',  border: 'rgba(74,158,255,0.25)' },
  'In Production': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  'In Edit':       { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  'Delivered':     { color: '#7BC853', bg: 'rgba(123,200,83,0.1)',  border: 'rgba(123,200,83,0.25)' },
  'Invoiced':      { color: '#E81A1A', bg: 'rgba(232,26,26,0.1)',   border: 'rgba(232,26,26,0.25)' },
};

function KanbanCard({ project, onClick }) {
  const st = STATUS_STYLE[project.status] || STATUS_STYLE['Booked'];
  const margin = project.revenue > 0 ? Math.round((project.net / project.revenue) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#1A1A1A',
        border: '1px solid #252525',
        borderTop: `2px solid ${st.color}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        marginBottom: 8,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#222'}
      onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{project.name}</div>
      <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace', marginBottom: 8 }}>
        {project.client}
      </div>

      {project.date && (
        <div style={{ fontSize: 10, color: '#555', fontFamily: '"DM Mono", monospace', marginBottom: 6 }}>
          📅 {project.date}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{fmt(project.revenue)}</span>
        <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: margin >= 50 ? '#7BC853' : margin >= 25 ? '#F59E0B' : '#E81A1A' }}>
          {margin}% margin
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {!project.paid && project.status === 'Invoiced' && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(232,26,26,0.12)', color: '#E81A1A', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>UNPAID</span>
        )}
        {project.paid && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(123,200,83,0.12)', color: '#7BC853', fontFamily: '"DM Mono", monospace', fontWeight: 700 }}>PAID ✓</span>
        )}
        {(project.deliverables || []).some(d => !d.done) && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(167,139,250,0.1)', color: '#A78BFA', fontFamily: '"DM Mono", monospace' }}>
            {(project.deliverables || []).filter(d => !d.done).length} deliverable{(project.deliverables || []).filter(d => !d.done).length > 1 ? 's' : ''}
          </span>
        )}
        {(project.crew || []).some(c => c.avail === 'pending' || !c.avail) && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontFamily: '"DM Mono", monospace' }}>⏳ crew</span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, projects, onOpenDetail }) {
  const st = STATUS_STYLE[status];
  const totalRev = projects.reduce((s, p) => s + (p.revenue || 0), 0);

  return (
    <div style={{
      minWidth: 240,
      maxWidth: 280,
      flex: '0 0 240px',
      background: '#111',
      borderRadius: 12,
      padding: '14px 12px',
      border: '1px solid #1A1A1A',
    }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{status}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {totalRev > 0 && <span style={{ fontSize: 10, color: '#555', fontFamily: '"DM Mono", monospace' }}>{fmt(totalRev)}</span>}
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: st.bg, color: st.color, fontFamily: '"DM Mono", monospace' }}>{projects.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#333', fontSize: 12, fontFamily: '"DM Mono", monospace' }}>
            empty
          </div>
        ) : (
          projects.map(p => (
            <KanbanCard key={p.id} project={p} onClick={() => onOpenDetail(p)} />
          ))
        )}
      </div>
    </div>
  );
}

export default function KanbanView({ projects, onOpenDetail }) {
  const active = projects.filter(p => !p.archived);

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = active.filter(p => (p.status || 'Booked') === s).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return acc;
  }, {});

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      paddingBottom: 20,
      scrollbarWidth: 'thin',
      scrollbarColor: '#333 transparent',
    }}>
      {STATUSES.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          projects={byStatus[status]}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}