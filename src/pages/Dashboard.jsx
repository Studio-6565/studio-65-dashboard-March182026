import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import TabPanels from '@/components/studio/TabPanels';
import AIAgents from './AIAgents';
import ProjectModal from '@/components/studio/ProjectModal';
import ProjectWizard from '@/components/studio/ProjectWizard';
import ProjectDetailPage from './ProjectDetailPage';
import StudioToast, { showToast } from '@/components/studio/StudioToast';
import StudioAIChat from '@/components/studio/StudioAIChat';
import BottomTabBar from '@/components/studio/BottomTabBar';
import SideNav from '@/components/studio/SideNav';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { nextProjectId, addLog } from '@/lib/studio';



// ── Tab label for the mobile header ──────────────────────────────────────────
const TAB_LABELS = {
  '/projects': 'Projects',
  '/analytics': 'Analytics',
  '/calendar': 'Calendar',
  '/crew': 'Crew',
  '/timeline': 'Timeline',
  '/contacts': 'Contacts',
  '/inbox': 'Inbox',
  '/gear': 'Gear',
  '/operations': 'Operations',
  '/agents': 'AI Agents',
  '/contracts': 'Contracts',
  '/settings': 'Settings',
};

function useTabLabel() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/projects/')) return null; // detail page shows back button
  return TAB_LABELS[pathname] || 'Projects';
}

// ── Main Dashboard shell ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const tabLabel = useTabLabel();
  const isDetailPage = location.pathname.startsWith('/projects/');

  const loadData = useCallback(async () => {
    const [ps, cs, ts] = await Promise.all([
      base44.entities.Project.list('-date', 200),
      base44.entities.Contact.list('name', 200),
      base44.entities.Template.list('name', 50),
    ]);
    setProjects(ps);
    setContacts(cs);
    setTemplates(ts);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh(loadData);

  // ── Project CRUD ────────────────────────────────────────────────────────────
  const handleCreateProject = async (form) => {
    const optimistic = {
      ...form,
      id: '__optimistic__' + Date.now(),
    };
    setProjects(prev => [optimistic, ...prev]);
    setProjectModalOpen(false);
    showToast(form.name + ' created!');
    const { id: _ignore, ...rest } = optimistic;
    const created = await base44.entities.Project.create(rest);
    setProjects(prev => prev.map(p => p.id === optimistic.id ? created : p));
  };

  const handleEditProject = async (form) => {
    const updated = { ...editingProject, ...form, activity: addLog(editingProject, 'Project details updated') };
    setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p));
    setProjectModalOpen(false);
    setEditingProject(null);
    showToast('Project updated', 'blue');
    await base44.entities.Project.update(editingProject.id, updated);
  };

  const handleProjectUpdate = (updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleProjectDelete = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleDuplicate = async (project) => {
    const id = nextProjectId(projects);
    const copy = {
      ...project, id: undefined, project_id: id,
      name: project.name + ' (Copy)', paid: false,
      crew: (project.crew || []).map(c => ({ ...c, paid: false })),
      rentals: (project.rentals || []).map(r => ({ ...r, paid: false })),
      deliverables: (project.deliverables || []).map(d => ({ ...d, done: false })),
      hours: [],
      activity: [{ msg: 'Duplicated from ' + project.name, ts: new Date().toISOString() }],
    };
    navigate('/projects');
    showToast(copy.name + ' created!');
    const created = await base44.entities.Project.create(copy);
    setProjects(prev => [created, ...prev]);
  };

  const handleSaveAsTemplate = async (project) => {
    const name = prompt('Template name:', project.name);
    if (!name) return;
    const tpl = await base44.entities.Template.create({
      name,
      crew: (project.crew || []).map(c => ({ name: c.name, role: c.role, cost: c.cost, phone: c.phone })),
      deliverables: (project.deliverables || []).map(d => ({ name: d.name, due: '' })),
    });
    setTemplates(prev => [...prev, tpl]);
    showToast('Template saved!', 'blue');
  };

  const handleDeleteAccount = () => {
    if (!confirm('Delete your account? This is permanent and cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All your data will be lost.')) return;
    showToast('Account deletion requested — contact support to complete.', 'red');
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 60, marginBottom: 16 }} />
        <div style={{ width: 32, height: 32, border: '3px solid #333', borderTopColor: '#E81A1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif', overflow: 'hidden' }}>
      <StudioToast />

      {/* ── Left sidebar (desktop only) ── */}
      <div className="desktop-sidebar">
        <SideNav onNewProject={() => { setEditingProject(null); setProjectModalOpen(true); }} />
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Mobile top bar */}
        <header className="mobile-header" style={{
          borderBottom: '1px solid #1E1E1E',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'env(safe-area-inset-top)',
          userSelect: 'none',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 52, padding: '0 16px' }}>
            {isDetailPage ? (
              <button
                onClick={() => navigate('/projects')}
                style={{
                  background: 'none', border: 'none', color: '#E81A1A',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 0', minHeight: 44, fontFamily: 'Syne, sans-serif',
                }}
              >← Back</button>
            ) : (
              <img
                src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png"
                alt="Studio 65" style={{ height: 26 }} draggable="false"
              />
            )}
            <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {!isDetailPage && tabLabel}
            </div>
            {(location.pathname === '/projects' || location.pathname === '/') && (
              <button
                onClick={() => { setEditingProject(null); setProjectModalOpen(true); }}
                style={{
                  minWidth: 44, minHeight: 44, padding: '0 16px',
                  background: '#E81A1A', border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >+ New</button>
            )}
          </div>
        </header>

        {/* ── Scrollable main content ── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px 24px',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        }}>
          <Routes>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects/:id" element={
              <ProjectDetailPage
                projects={projects}
                contacts={contacts}
                templates={templates}
                onUpdate={handleProjectUpdate}
                onDelete={handleProjectDelete}
                onDuplicate={handleDuplicate}
                onSaveAsTemplate={handleSaveAsTemplate}
                onContactsChange={setContacts}
                onProjectsChange={setProjects}
                onEdit={openEdit}
              />
            } />
            <Route path="*" element={
              <TabPanels
                projects={projects}
                contacts={contacts}
                templates={templates}
                containerRef={containerRef}
                isRefreshing={isRefreshing}
                pullProgress={pullProgress}
                onOpenDetail={(p) => navigate(`/projects/${p.id}`)}
                onNewProject={() => setProjectModalOpen(true)}
                onContactsChange={setContacts}
                onProjectsChange={setProjects}
                onDeleteAccount={handleDeleteAccount}
                loadData={loadData}
              />
            } />
          </Routes>
        </main>
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <BottomTabBar />

      {/* ── Modals ── */}
      <ProjectWizard
        open={projectModalOpen && !editingProject}
        onClose={() => setProjectModalOpen(false)}
        projects={projects}
        contacts={contacts}
        onSave={handleCreateProject}
      />
      <ProjectModal
        open={projectModalOpen && !!editingProject}
        onClose={() => { setProjectModalOpen(false); setEditingProject(null); }}
        editingProject={editingProject}
        templates={templates}
        projects={projects}
        onSave={handleEditProject}
      />

      <StudioAIChat projects={projects} contacts={contacts} />

      <style>{`
        @keyframes fadeTab {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .desktop-sidebar { display: none; }
        .mobile-header { display: block; }
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          .mobile-header { display: none !important; }
          nav[data-bottom-tab] { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: block !important; }
        }
        button:active { opacity: 0.72; transform: scale(0.97); }
      `}</style>
    </div>
  );
}