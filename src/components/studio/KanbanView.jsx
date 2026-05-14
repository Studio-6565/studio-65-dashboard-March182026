import React, { useState } from 'react';
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fmt } from '@/lib/studio';
import { base44 } from '@/api/base44Client';
import { ChevronUp, ChevronDown } from 'lucide-react';

const STATUSES = ['Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'];

const STATUS_STYLE = {
  'Booked':        { color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)',  border: 'rgba(74,158,255,0.25)' },
  'In Production': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  'In Edit':       { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  'Delivered':     { color: '#7BC853', bg: 'rgba(123,200,83,0.1)',  border: 'rgba(123,200,83,0.25)' },
  'Invoiced':      { color: '#E81A1A', bg: 'rgba(232,26,26,0.1)',   border: 'rgba(232,26,26,0.25)' },
};

function KanbanCard({ project, onClick, dragHandleProps, draggableProps, innerRef, isDragging }) {
  const st = STATUS_STYLE[project.status] || STATUS_STYLE['Booked'];
  const margin = project.revenue > 0 ? Math.round((project.net / project.revenue) * 100) : 0;

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      onClick={onClick}
      style={{
        background: isDragging ? '#2A2A2A' : '#1A1A1A',
        border: '1px solid #252525',
        borderTop: `2px solid ${st.color}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'grab',
        marginBottom: 8,
        boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
        opacity: isDragging ? 0.95 : 1,
        transition: 'background 0.15s, box-shadow 0.15s',
        userSelect: 'none',
        ...draggableProps?.style,
      }}
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

function KanbanColumn({ status, projects, onOpenDetail, isDragOver }) {
  const st = STATUS_STYLE[status];
  const totalRev = projects.reduce((s, p) => s + (p.revenue || 0), 0);

  return (
    <div style={{
      minWidth: 240,
      maxWidth: 280,
      flex: '0 0 240px',
      background: isDragOver ? '#161616' : '#111',
      borderRadius: 12,
      padding: '14px 12px',
      border: isDragOver ? `1px solid ${st.border}` : '1px solid #1A1A1A',
      transition: 'background 0.15s, border-color 0.15s',
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

      {/* Droppable cards area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{ minHeight: 60 }}
          >
            {projects.length === 0 && !snapshot.isDraggingOver ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#333', fontSize: 12, fontFamily: '"DM Mono", monospace' }}>
                empty
              </div>
            ) : (
              projects.map((p, index) => (
                <Draggable key={p.id} draggableId={p.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <KanbanCard
                      project={p}
                      onClick={() => onOpenDetail(p)}
                      innerRef={dragProvided.innerRef}
                      draggableProps={dragProvided.draggableProps}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={dragSnapshot.isDragging}
                    />
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

const MONO = '"DM Mono", monospace';

function DeliveredMarginTable({ projects, onOpenDetail }) {
  const [sortKey, setSortKey] = useState('margin');
  const [sortDir, setSortDir] = useState(-1); // -1 = desc

  const rows = projects
    .filter(p => ['Delivered', 'Invoiced'].includes(p.status))
    .map(p => ({
      ...p,
      margin: p.revenue > 0 ? Math.round(((p.net || 0) / p.revenue) * 100) : 0,
    }))
    .sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === 'string') return sortDir * va.localeCompare(vb);
      return sortDir * (va - vb);
    });

  if (!rows.length) return null;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(-1); }
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === -1 ? <ChevronDown size={11} /> : <ChevronUp size={11} />)
    : null;

  const colStyle = (k) => ({
    padding: '8px 12px', fontFamily: MONO, fontSize: 9, color: sortKey === k ? '#fff' : '#444',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: '1px solid #141414', cursor: 'pointer', userSelect: 'none',
    whiteSpace: 'nowrap', textAlign: k === 'name' || k === 'client' ? 'left' : 'right',
  });

  return (
    <div style={{ marginTop: 24, background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Delivered Projects — Margin %</div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{rows.length} projects · click column to sort</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#141414' }}>
              {[['name', 'Project'], ['client', 'Client'], ['date', 'Date'], ['revenue', 'Revenue'], ['net', 'Net'], ['margin', 'Margin %']].map(([k, label]) => (
                <th key={k} style={colStyle(k)} onClick={() => toggleSort(k)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{label} <SortIcon k={k} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const mc = p.margin >= 60 ? '#7BC853' : p.margin >= 35 ? '#F59E0B' : '#E81A1A';
              return (
                <tr key={p.id} onClick={() => onOpenDetail(p)}
                  style={{ borderBottom: '1px solid #0D0D0D', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#111'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>{p.name}</td>
                  <td style={{ padding: '10px 12px', fontFamily: MONO, fontSize: 11, color: '#666' }}>{p.client}</td>
                  <td style={{ padding: '10px 12px', fontFamily: MONO, fontSize: 11, color: '#555', textAlign: 'right' }}>{p.date || '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: MONO, fontSize: 11, color: '#fff', textAlign: 'right' }}>{fmt(p.revenue)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: MONO, fontSize: 11, color: p.net >= 0 ? '#7BC853' : '#E81A1A', fontWeight: 700, textAlign: 'right' }}>{fmt(p.net)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <div style={{ width: 50, height: 4, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, p.margin))}%`, background: mc, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: mc, minWidth: 36, textAlign: 'right' }}>{p.margin}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KanbanView({ projects, onOpenDetail, onProjectUpdate }) {
  const [localProjects, setLocalProjects] = useState(null);

  const active = (localProjects ?? projects).filter(p => !p.archived);

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = active.filter(p => (p.status || 'Booked') === s).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId;
    const allProjects = localProjects ?? projects;

    // Optimistic update
    const updated = allProjects.map(p => p.id === draggableId ? { ...p, status: newStatus } : p);
    setLocalProjects(updated);

    // Persist to backend
    await base44.entities.Project.update(draggableId, { status: newStatus });

    // Notify parent so other views stay in sync
    if (onProjectUpdate) onProjectUpdate(draggableId, { status: newStatus });
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
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
      </DragDropContext>
      <DeliveredMarginTable projects={active} onOpenDetail={onOpenDetail} />
    </>
  );
}