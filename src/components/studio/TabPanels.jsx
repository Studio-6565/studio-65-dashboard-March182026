import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AnalyticsView from './AnalyticsView';
import CalendarView from './CalendarView';
import CrewSpendView from './CrewSpendView';
import TimelineView from './TimelineView';
import ContactsView from './ContactsView';
import PullRefreshIndicator from './PullRefreshIndicator';
import StatsBar from './StatsBar';
import UpcomingReminders from './UpcomingReminders';
import ProjectCard from './ProjectCard';
import BottomSheet from './BottomSheet';
import PaymentDeadlines from './PaymentDeadlines';
import GearPage from '@/pages/GearPage';
import OperationsPage from '@/pages/OperationsPage';
import ContractsPage from '@/pages/ContractsPage';
import InboxPage from '@/pages/InboxPage';
import SettingsPage from '@/pages/SettingsPage';
import LeadsPage from '@/pages/LeadsPage';
import { base44 } from '@/api/base44Client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import AISmartNudges from './AISmartNudges';
import RevenueGoal from './RevenueGoal';
import OverdueInvoices from './OverdueInvoices';
import TodaysShoots from './TodaysShoots';
import MorningTaskList from './MorningTaskList';

// ── Inline ProjectsView (moved here so state is preserved in the panel) ──────

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

function ProjectsPanel({ projects, onOpenDetail, onNewProject, onProjectUpdate, onProjectsChange, onMarkPaid, containerRef, isRefreshing, pullProgress, onNavigate }) {
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
      // If searching, show all (archived and non-archived) to find matches
      if (!search) {
        if (showArchived && !p.archived) return false;
        if (!showArchived && p.archived) return false;
      }
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
      <MorningTaskList />
      <TodaysShoots projects={projects} onOpenDetail={onOpenDetail} />
      <PaymentDeadlines projects={projects} />
      <UpcomingReminders projects={projects} />
      <OverdueInvoices projects={projects} onOpenDetail={onOpenDetail} />
      <AISmartNudges projects={projects} />
      <RevenueGoal projects={projects} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, alignItems: 'stretch' }}>
          {filtered.map(p => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <ProjectCard project={p} onClick={() => onOpenDetail(p)} onProjectUpdate={onProjectUpdate} onMarkPaid={onMarkPaid} />
            </div>
          ))}
        </div>
      )}

      <BottomSheet open={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort By" options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      <BottomSheet open={clientSheetOpen} onClose={() => setClientSheetOpen(false)} title="Filter by Client" options={clientOptions} value={clientFilter} onChange={setClientFilter} />
      <BottomSheet open={statusSheetOpen} onClose={() => setStatusSheetOpen(false)} title="Filter by Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
    </div>
  );
}

// ── TabPanels: all tabs always mounted, shown/hidden via CSS ─────────────────

const TABS = ['projects', 'analytics', 'calendar', 'crew', 'timeline', 'contacts', 'leads', 'gear', 'operations', 'contracts', 'inbox', 'settings'];

function ContactsTab({ contacts, onContactsChange, projects, onProjectsChange, loadData }) {
  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh(loadData);
  return (
    <div ref={containerRef}>
      <PullRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <ContactsView contacts={contacts} onContactsChange={onContactsChange} projects={projects} onProjectsChange={onProjectsChange} />
    </div>
  );
}

function GearTab({ loadData }) {
  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh(loadData);
  return (
    <div ref={containerRef}>
      <PullRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <GearPage />
    </div>
  );
}

function OperationsTab({ loadData }) {
  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh(loadData);
  return (
    <div ref={containerRef}>
      <PullRefreshIndicator progress={pullProgress} isRefreshing={isRefreshing} />
      <OperationsPage />
    </div>
  );
}

export default function TabPanels({
  projects, contacts, containerRef, isRefreshing, pullProgress,
  onOpenDetail, onNewProject, onContactsChange, onProjectsChange,
  onMarkPaid, onDeleteAccount, loadData,
}) {
  const { pathname } = useLocation();
  const activeTab = TABS.find(t => pathname === '/' + t) || 'projects';

  // Stable no-op for tabs that don't need their own refresh
  const noopRefresh = useCallback(async () => {}, []);

  return (
    <div>
      {TABS.map(tab => (
        <div key={tab} style={{ display: tab === activeTab ? 'block' : 'none' }}>
          {tab === 'projects' && (
            <ProjectsPanel
              projects={projects}
              onOpenDetail={onOpenDetail}
              onNewProject={onNewProject}
              onProjectUpdate={onProjectsChange ? (updated) => onProjectsChange(prev => prev.map(p => p.id === updated.id ? updated : p)) : () => {}}
              onProjectsChange={onProjectsChange}
              onMarkPaid={onMarkPaid}
              containerRef={containerRef}
              isRefreshing={isRefreshing}
              pullProgress={pullProgress}
            />
          )}
          {tab === 'analytics' && <AnalyticsView projects={projects} />}
          {tab === 'calendar' && <CalendarView projects={projects} onOpenDetail={onOpenDetail} />}
          {tab === 'crew' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Crew Spend Tracker</div>
              <CrewSpendView projects={projects.filter(p => !p.archived)} />
            </div>
          )}
          {tab === 'timeline' && (
            <TimelineView projects={projects.filter(p => !p.archived)} onOpenDetail={onOpenDetail} />
          )}
          {tab === 'gear' && <GearTab loadData={loadData || noopRefresh} />}
          {tab === 'operations' && <OperationsTab loadData={loadData || noopRefresh} />}
          {tab === 'contracts' && <ContractsPage />}
          {tab === 'inbox' && <InboxPage projects={projects} contacts={contacts} />}
          {tab === 'settings' && <SettingsPage onDeleteAccount={onDeleteAccount} />}
          {tab === 'contacts' && (
            <ContactsTab
              contacts={contacts}
              onContactsChange={onContactsChange}
              projects={projects}
              onProjectsChange={onProjectsChange}
              loadData={loadData || noopRefresh}
            />
          )}
          {tab === 'leads' && <LeadsPage />}
        </div>
      ))}
    </div>
  );
}