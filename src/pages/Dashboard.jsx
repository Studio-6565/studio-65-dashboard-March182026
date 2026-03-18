import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatsBar from '@/components/studio/StatsBar';
import ProjectCard from '@/components/studio/ProjectCard';
import MonthlyChart from '@/components/studio/MonthlyChart';
import ClientTable from '@/components/studio/ClientTable';
import CrewSpendView from '@/components/studio/CrewSpendView';
import TimelineView from '@/components/studio/TimelineView';
import ContactsView from '@/components/studio/ContactsView';
import ProjectModal from '@/components/studio/ProjectModal';
import ProjectDetailModal from '@/components/studio/ProjectDetailModal';
import StudioToast, { showToast } from '@/components/studio/StudioToast';
import { nextProjectId, addLog } from '@/lib/studio';

const TABS = ['Projects', 'Analytics', 'Crew', 'Timeline', 'Contacts'];
const STATUS_FILTERS = ['All', 'Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('Projects');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [detailProject, setDetailProject] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [ps, cs, ts] = await Promise.all([
        base44.entities.Project.list('-date', 200),
        base44.entities.Contact.list('name', 200),
        base44.entities.Template.list('name', 50),
      ]);
      setProjects(ps);
      setContacts(cs);
      setTemplates(ts);
      setLoading(false);
    };
    load();
  }, []);

  // Filtered projects for the grid
  const filtered = projects.filter(p => {
    if (!showArchived && p.archived) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) || (p.client || '').toLowerCase().includes(q) || (p.project_id || '').toLowerCase().includes(q);
    }
    return true;
  });

  // --- Project CRUD ---
  const handleCreateProject = async (form) => {
    const id = nextProjectId(projects);
    const data = {
      ...form,
      project_id: id,
      crew: [],
      rentals: [],
      deliverables: form.deliverables || [],
      hours: [],
      activity: [{ msg: 'Project created', ts: new Date().toISOString() }],
    };
    const created = await base44.entities.Project.create(data);
    setProjects(prev => [created, ...prev]);
    setProjectModalOpen(false);
    showToast(created.name + ' created!');
  };

  const handleEditProject = async (form) => {
    const updated = { ...editingProject, ...form, activity: addLog(editingProject, 'Project details updated') };
    await base44.entities.Project.update(editingProject.id, updated);
    setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p));
    if (detailProject?.id === editingProject.id) setDetailProject(updated);
    setProjectModalOpen(false);
    setEditingProject(null);
    showToast('Project updated', 'blue');
  };

  const handleDeleteProject = async () => {
    if (!detailProject || !confirm('Delete "' + detailProject.name + '"? This cannot be undone.')) return;
    await base44.entities.Project.delete(detailProject.id);
    setProjects(prev => prev.filter(p => p.id !== detailProject.id));
    setDetailProject(null);
    showToast('Project deleted', 'red');
  };

  const handleDuplicate = async () => {
    if (!detailProject) return;
    const id = nextProjectId(projects);
    const copy = {
      ...detailProject,
      id: undefined,
      project_id: id,
      name: detailProject.name + ' (Copy)',
      paid: false,
      crew: (detailProject.crew || []).map(c => ({ ...c, paid: false })),
      rentals: (detailProject.rentals || []).map(r => ({ ...r, paid: false })),
      deliverables: (detailProject.deliverables || []).map(d => ({ ...d, done: false })),
      hours: [],
      activity: [{ msg: 'Duplicated from ' + detailProject.name, ts: new Date().toISOString() }],
    };
    const created = await base44.entities.Project.create(copy);
    setProjects(prev => [created, ...prev]);
    setDetailProject(null);
    showToast(copy.name + ' created!');
  };

  const handleSaveAsTemplate = async () => {
    if (!detailProject) return;
    const name = prompt('Template name:', detailProject.name);
    if (!name) return;
    const tpl = await base44.entities.Template.create({
      name,
      crew: (detailProject.crew || []).map(c => ({ name: c.name, role: c.role, cost: c.cost, phone: c.phone })),
      deliverables: (detailProject.deliverables || []).map(d => ({ name: d.name, due: '' })),
    });
    setTemplates(prev => [...prev, tpl]);
    showToast('Template saved!', 'blue');
  };

  const handleProjectUpdate = (updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setDetailProject(updated);
  };

  const openDetail = (p) => setDetailProject(p);

  const openEdit = () => {
    if (!detailProject) return;
    setEditingProject(detailProject);
    setDetailProject(null);
    setProjectModalOpen(true);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Studio <span style={{ color: '#E81A1A' }}>65</span></div>
        <div style={{ width: 32, height: 32, border: '3px solid #333', borderTopColor: '#E81A1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      <StudioToast />

      {/* Header */}
      <header style={{ borderBottom: '1px solid #1E1E1E', padding: '0 16px', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, height: 52 }}>
          <div style={{ fontSize: 18, fontWeight: 800, flexShrink: 0 }}>Studio <span style={{ color: '#E81A1A' }}>65</span></div>
          <nav style={{ display: 'flex', gap: 1, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', background: tab === t ? '#1E1E1E' : 'transparent',
                color: tab === t ? '#fff' : '#666', border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}>{t}</button>
            ))}
          </nav>
          {tab === 'Projects' && (
            <button onClick={() => { setEditingProject(null); setProjectModalOpen(true); }} style={{
              padding: '7px 14px', background: '#E81A1A', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}>+ New</button>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '16px' }}>

        {/* Projects Tab */}
        {tab === 'Projects' && (
          <div>
            <StatsBar projects={projects} />

            {/* Filters row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 12, outline: 'none', width: 200 }}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace',
                    background: statusFilter === s ? '#E81A1A' : '#1E1E1E',
                    color: statusFilter === s ? '#fff' : '#666', transition: 'all 0.15s',
                  }}>{s}</button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', cursor: 'pointer', marginLeft: 'auto' }}>
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ accentColor: '#E81A1A' }} />
                Show Archived
              </label>
            </div>

            {!filtered.length ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎬</div>
                <div style={{ fontSize: 15, marginBottom: 8 }}>
                  {projects.length === 0 ? 'No projects yet.' : 'No projects match your filters.'}
                </div>
                {projects.length === 0 && (
                  <button onClick={() => setProjectModalOpen(true)} style={{ marginTop: 12, padding: '9px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    + Create First Project
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
                {filtered.map(p => (
                  <ProjectCard key={p.id} project={p} onClick={() => openDetail(p)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'Analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatsBar projects={projects} />
            <MonthlyChart projects={projects.filter(p => !p.archived)} />
            <ClientTable projects={projects} />
          </div>
        )}

        {/* Crew Tab */}
        {tab === 'Crew' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Crew Spend Tracker</div>
            <CrewSpendView projects={projects} />
          </div>
        )}

        {/* Timeline Tab */}
        {tab === 'Timeline' && (
          <TimelineView projects={projects.filter(p => !p.archived)} onOpenDetail={openDetail} />
        )}

        {/* Contacts Tab */}
        {tab === 'Contacts' && (
          <ContactsView contacts={contacts} onContactsChange={setContacts} projects={projects} onProjectsChange={setProjects} />
        )}
      </main>

      {/* Modals */}
      <ProjectModal
        open={projectModalOpen}
        onClose={() => { setProjectModalOpen(false); setEditingProject(null); }}
        editingProject={editingProject}
        templates={templates}
        projects={projects}
        onSave={editingProject ? handleEditProject : handleCreateProject}
      />

      <ProjectDetailModal
        open={!!detailProject}
        onClose={() => setDetailProject(null)}
        project={detailProject}
        contacts={contacts}
        onUpdate={handleProjectUpdate}
        onDelete={handleDeleteProject}
        onEdit={openEdit}
        onDuplicate={handleDuplicate}
        onSaveAsTemplate={handleSaveAsTemplate}
        onContactsChange={setContacts}
      />
    </div>
  );
}