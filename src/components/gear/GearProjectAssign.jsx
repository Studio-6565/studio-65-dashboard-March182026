import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { Link2, X } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function GearProjectAssign({ item, projects, onGearUpdate }) {
  const [open, setOpen] = useState(false);

  const assignedIds = item.assigned_project_ids || [];
  const assignedProjects = projects.filter(p => assignedIds.includes(p.id));
  const availableProjects = projects.filter(p => !p.archived && !assignedIds.includes(p.id));

  const assign = async (project) => {
    const updated = [...assignedIds, project.id];
    await base44.entities.GearItem.update(item.id, { assigned_project_ids: updated });
    onGearUpdate({ ...item, assigned_project_ids: updated });
    showToast(`Assigned to ${project.name}`, 'blue');
    setOpen(false);
  };

  const unassign = async (projectId) => {
    const updated = assignedIds.filter(id => id !== projectId);
    await base44.entities.GearItem.update(item.id, { assigned_project_ids: updated });
    onGearUpdate({ ...item, assigned_project_ids: updated });
    showToast('Removed from project', 'amber');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: assignedIds.length > 0 ? 'rgba(74,158,255,0.18)' : 'rgba(74,158,255,0.08)', color: '#4A9EFF', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Link2 size={11} />
        {assignedIds.length > 0 ? `${assignedIds.length} project${assignedIds.length > 1 ? 's' : ''}` : 'Assign'}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
          <div style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 99,
            background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10,
            padding: 12, minWidth: 220, maxWidth: 280, maxHeight: 300, overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {assignedProjects.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 6 }}>Assigned</div>
                {assignedProjects.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#111', borderRadius: 6, marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{p.client} · {p.date}</div>
                    </div>
                    <button onClick={() => unassign(p.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 4px' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {availableProjects.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 6 }}>Assign to Project</div>
                {availableProjects.slice(0, 10).map(p => (
                  <button key={p.id} onClick={() => assign(p)} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
                    background: 'transparent', border: 'none',
                    marginBottom: 2,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#222'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>{p.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{p.client} · {p.date}</div>
                  </button>
                ))}
              </div>
            )}
            {availableProjects.length === 0 && assignedProjects.length === 0 && (
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textAlign: 'center', padding: '12px 0' }}>No active projects</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}