import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import StatsBar from '@/components/studio/StatsBar';
import ProjectCard from '@/components/studio/ProjectCard';
import AnalyticsView from '@/components/studio/AnalyticsView';
import CrewSpendView from '@/components/studio/CrewSpendView';
import TimelineView from '@/components/studio/TimelineView';
import CalendarView from '@/components/studio/CalendarView';
import ContactsView from '@/components/studio/ContactsView';
import ProjectModal from '@/components/studio/ProjectModal';
import ProjectDetailPage from './ProjectDetailPage';
import StudioToast, { showToast } from '@/components/studio/StudioToast';
import StudioAIChat from '@/components/studio/StudioAIChat';
import BottomTabBar from '@/components/studio/BottomTabBar';
import BottomSheet from '@/components/studio/BottomSheet';
import PullRefreshIndicator from '@/components/studio/PullRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { nextProjectId, addLog } from '@/lib/studio';

const STATUS_FILTERS = ['All', 'Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'rev_high', label: 'Highest Revenue' },
  { value: 'rev_low', label: 'Lowest Revenue' },
  { value: 'margin', label: 'Highest Margin' },
];

const chipStyle = (active) => ({
  padding: '9px 14px',
  borderRadius: 20, fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
  border: active ? '1px solid rgba(232,26,26,0.5)' : '1px solid #2A2A2A',
  background: active ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
  color: active ? '#E81A1A' : '#888',
  fontFamily: '"DM Mono", monospace',
  minHeight: 36, whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
});

// ── Tab label for the mobile header ──────────────────────────────────────────
const TAB_LABELS = {
  '/projects': 'Projects',
  '/analytics': 'Analytics',
  '/calendar': 'Calendar',
  '/crew': 'Crew',
  '/timeline': 'Timeline',
  '/contacts': 'Contacts',
};

function useTabLabel() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/projects/')) return null; // detail page shows back button
  return TAB_LABELS[pathname] || 'Projects';
}

// ── Projects list view ────────────────────────────────────────────────────────
function ProjectsView({ projects, onOpenDetail, onNewProject, containerRef, isRefreshing, pullProgress }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [clientFilter, setClientFilter] = useState('All');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [clientSheetOpen, setClientSheetOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);

  const clientList = ['All', ...Array.from(new Set(projects.map(p => p.client).filter(Boolean))).sort()];
  const clientOptions = clientList.map(c => ({ value: c, label: c === 'All' ? 'All Clients' : c }));
  const statusOptions = STATUS_FILTERS.map(s => ({ value: s, label: s }));

  const filtered = projects
    .filter(p => {
      if (!showArchived && p.archived) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (clientFilter !== 'All' && p.client !== clientFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) ||
          (p.client || '').toLowerCase().includes(q) ||
          (p.project_id || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date || 0) - new Date(a.date || 0);
      if (sortBy === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
      if (sortBy === 'rev_high') return (b.revenue || 0) - (a.revenue || 0);
      if (sortBy === 'rev_low') return (a.revenue || 0) - (b.revenue || 0);
      if (sortBy === 'margin') {
        const ma = (a.revenue || 0) > 0 ? (a.net || 0) / a.revenue : 0;
        const mb = (b.revenue || 0) > 0 ? (b.net || 0) / b.revenue : 0;
        return mb - ma;
      }
      return 0;
    });

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort';
  const clientLabel = clientFilter === 'All' ? 'All Clients' : clientFilter;
  const statusLabel = statusFilter === 'All' ? 'All Status' : statusFilter;

  return (
    <div ref={containerRef}>
      <PullRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <StatsBar projects={projects} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          style={{
            background: '#1E1E1E', border: '1px solid #2A2A2A',
            borderRadius: 10, padding: '12px 14px',
            color: '#fff', fontSize: 14, outline: 'none', width: '100%',
            fontFamily: 'Syne, sans-serif',
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSortSheetOpen(true)} style={chipStyle(sortBy !== 'newest')}>↕ {sortLabel}</button>
          <button onClick={() => setClientSheetOpen(true)} style={chipStyle(clientFilter !== 'All')}>🏢 {clientLabel}</button>
          <button onClick={() => setStatusSheetOpen(true)} style={chipStyle(statusFilter !== 'All')}>● {statusLabel}</button>
          <button onClick={() => setShowArchived(v => !v)} style={chipStyle(showArchived)}>
            {showArchived ? '✓ ' : ''}Archived
          </button>
        </div>
      </div>

      {!filtered.length ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎬</div>
          <div style={{ fontSize: 15, marginBottom: 8, color: '#888' }}>
            {projects.length === 0 ? 'No projects yet.' : 'No projects match your filters.'}
          </div>
          {projects.length === 0 && (
            <button
              onClick={onNewProject}
              style={{ marginTop: 12, padding: '14px 28px', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 48 }}
            >+ Create First Project</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => onOpenDetail(p)} />
          ))}
        </div>
      )}

      <BottomSheet open={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort By" options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      <BottomSheet open={clientSheetOpen} onClose={() => setClientSheetOpen(false)} title="Filter by Client" options={clientOptions} value={clientFilter} onChange={setClientFilter} />
      <BottomSheet open={statusSheetOpen} onClose={() => setStatusSheetOpen(false)} title="Filter by Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
    </div>
  );
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
    const id = nextProjectId(projects);
    const optimistic = {
      ...form, project_id: id, crew: [], rentals: [],
      deliverables: form.deliverables || [], hours: [],
      activity: [{ msg: 'Project created', ts: new Date().toISOString() }],
      id: '__optimistic__' + Date.now(),
    };
    setProjects(prev => [optimistic, ...prev]);
    setProjectModalOpen(false);
    showToast(form.name + ' created!');
    const created = await base44.entities.Project.create({ ...optimistic, id: undefined });
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
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      <StudioToast />

      {/* ── Sticky top header ── */}
      <header style={{
        borderBottom: '1px solid #1E1E1E',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        paddingTop: 'env(safe-area-inset-top)',
        userSelect: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          height: 52, padding: '0 16px',
          maxWidth: 1400, margin: '0 auto',
        }}>
          {/* Back button on detail page (mobile) */}
          {isDetailPage ? (
            <button
              onClick={() => navigate('/projects')}
              className="mobile-only"
              style={{
                background: 'none', border: 'none', color: '#E81A1A',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 0', minHeight: 44,
                fontFamily: 'Syne, sans-serif',
              }}
            >
              ← Back
            </button>
          ) : (
            <img
              src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png"
              alt="Studio 65" style={{ height: 28, flexShrink: 0 }}
              draggable="false"
            />
          )}

          {/* Desktop nav */}
          <nav className="desktop-nav" style={{ flex: 1, display: 'flex', gap: 2 }}>
            {[
              { label: 'Projects', path: '/projects' },
              { label: 'Analytics', path: '/analytics' },
              { label: 'Calendar', path: '/calendar' },
              { label: 'Crew', path: '/crew' },
              { label: 'Timeline', path: '/timeline' },
              { label: 'Contacts', path: '/contacts' },
            ].map(({ label, path }) => {
              const active = location.pathname === path || (path === '/projects' && location.pathname.startsWith('/projects/'));
              return (
                <Link key={path} to={path} style={{ textDecoration: 'none' }}>
                  <button style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    background: active ? '#1E1E1E' : 'transparent',
                    color: active ? '#fff' : '#555',
                    border: active ? '1px solid #333' : '1px solid transparent',
                    minHeight: 36, whiteSpace: 'nowrap',
                  }}>{label}</button>
                </Link>
              );
            })}
          </nav>

          {/* Mobile: current tab title */}
          {!isDetailPage && (
            <div className="mobile-tab-title" style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {tabLabel}
            </div>
          )}
          {isDetailPage && (
            <div className="mobile-tab-title" style={{ flex: 1 }} />
          )}

          {/* Right actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
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
            <button className="desktop-nav" onClick={() => base44.auth.logout()} style={{
              padding: '6px 12px', background: 'transparent',
              border: '1px solid #333', borderRadius: 6,
              color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
            }}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* ── Scrollable main content ── */}
      <main style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '16px 16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        <Routes>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={
            <ProjectsView
              projects={projects}
              onOpenDetail={(p) => navigate(`/projects/${p.id}`)}
              onNewProject={() => setProjectModalOpen(true)}
              containerRef={containerRef}
              isRefreshing={isRefreshing}
              pullProgress={pullProgress}
            />
          } />
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
          <Route path="analytics" element={<AnalyticsView projects={projects} />} />
          <Route path="calendar" element={<CalendarView projects={projects} onOpenDetail={(p) => navigate(`/projects/${p.id}`)} />} />
          <Route path="crew" element={
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Crew Spend Tracker</div>
              <CrewSpendView projects={projects.filter(p => !p.archived)} />
            </div>
          } />
          <Route path="timeline" element={<TimelineView projects={projects.filter(p => !p.archived)} onOpenDetail={(p) => navigate(`/projects/${p.id}`)} />} />
          <Route path="contacts" element={
            <div>
              <ContactsView contacts={contacts} onContactsChange={setContacts} projects={projects} onProjectsChange={setProjects} />
              {/* Account panel */}
              <div style={{ marginTop: 32, padding: 16, border: '1px solid #1E1E1E', borderRadius: 12, background: '#111' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '"DM Mono", monospace', marginBottom: 12 }}>Account</div>
                <button
                  onClick={() => base44.auth.logout()}
                  style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, textAlign: 'left', minHeight: 48 }}
                >Sign Out</button>
                <button
                  onClick={handleDeleteAccount}
                  style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 10, color: '#E81A1A', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', minHeight: 48 }}
                >Delete Account</button>
              </div>
            </div>
          } />
        </Routes>
      </main>

      {/* ── Bottom tab bar (mobile) ── */}
      <BottomTabBar />

      {/* ── Create / Edit project modal ── */}
      <ProjectModal
        open={projectModalOpen}
        onClose={() => { setProjectModalOpen(false); setEditingProject(null); }}
        editingProject={editingProject}
        templates={templates}
        projects={projects}
        onSave={editingProject ? handleEditProject : handleCreateProject}
      />

      <StudioAIChat projects={projects} contacts={contacts} />

      <style>{`
        @keyframes fadeTab {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-tab-title { display: none !important; }
          .mobile-only { display: none !important; }
          nav[data-bottom-tab] { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-tab-title { display: block !important; }
          .mobile-only { display: flex !important; }
        }
        button:active { opacity: 0.72; transform: scale(0.97); }
      `}</style>
    </div>
  );
}