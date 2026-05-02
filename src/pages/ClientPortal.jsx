import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, FolderOpen, MessageSquare, CreditCard, CalendarDays, Plus, X, Calendar, Phone, Film } from 'lucide-react';
import ClientContentSchedule from '@/components/client-portal/ClientContentSchedule';
import ClientLoginScreen from '@/components/client-portal/ClientLoginScreen';
import ClientActionCentre from '@/components/client-portal/ClientActionCentre';
import ClientProjectCard from '@/components/client-portal/ClientProjectCard';
import ClientInvoicesTab from '@/components/client-portal/ClientInvoicesTab';
import ClientMessagesTab from '@/components/client-portal/ClientMessagesTab';
import ClientContractsTab from '@/components/portal/ClientContractsTab';
import ShootRequestModal from '@/components/client-portal/ShootRequestModal';
import { ReserveDateSheet, CallBackSheet } from '@/components/client-portal/QuickRequestSheet';
import ProjectFilesHub from '@/components/shared/ProjectFilesHub';

const MONO = '"DM Mono", monospace';

// ── Bottom nav tabs ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'home',     label: 'Home',     Icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', Icon: FolderOpen },
  { key: 'content',  label: 'Content',  Icon: CalendarDays },
  { key: 'messages', label: 'Messages', Icon: MessageSquare },
  { key: 'invoices', label: 'Invoices', Icon: CreditCard },
];

// ── Premium Empty State ────────────────────────────────────────────────────────
function EmptyState({ emoji, title, subtitle, cta, onCta }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px' }}>
      <div style={{ fontSize: 44, marginBottom: 18, opacity: 0.25 }}>{emoji}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#888', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8, maxWidth: 320, margin: '0 auto', marginBottom: cta ? 24 : 0 }}>{subtitle}</div>
      {cta && (
        <button onClick={onCta} style={{ padding: '12px 28px', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {cta}
        </button>
      )}
    </div>
  );
}

// ── Dashboard Home ─────────────────────────────────────────────────────────────
function ClientDashboard({ contact, projects, messages, contracts, onNavigate, onRequestShoot }) {
  const today = new Date().toISOString().split('T')[0];
  const firstName = contact.name.split(' ')[0];

  const activeProjects = projects.filter(p => !['Delivered', 'Invoiced'].includes(p.status) || !p.paid);
  const upcomingShoot = projects.filter(p => p.date && p.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

  const pendingApprovals = messages.filter(m => m.from === 'studio' && (m.type === 'script' || m.type === 'approval_request') && (!m.approval_status || m.approval_status === 'pending')).length;
  const unreadMessages = messages.filter(m => m.from === 'studio' && !m.read_by_client).length;
  const pendingContracts = contracts.filter(c => c.status === 'sent').length;
  const unpaidInvoices = projects.filter(p => !p.paid && p.revenue > 0 && p.status === 'Invoiced').length;
  const hasActions = pendingApprovals + pendingContracts + unpaidInvoices > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Welcome */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Studio 65 Client Portal
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 8 }}>
          {greeting},<br />{firstName}.
        </div>
        {upcomingShoot && (
          <div style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} color="#E81A1A" />
            Next shoot: <span style={{ color: '#ccc', fontWeight: 600 }}>{upcomingShoot.name}</span>
            <span style={{ fontFamily: MONO, color: '#444' }}>· {upcomingShoot.date}</span>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { label: 'Active Projects', value: activeProjects.length, color: '#fff' },
          { label: 'Pending Approvals', value: pendingApprovals, color: pendingApprovals > 0 ? '#F59E0B' : '#fff' },
          { label: unreadMessages > 0 ? 'New Messages' : 'Total Messages', value: unreadMessages > 0 ? unreadMessages : messages.length, color: unreadMessages > 0 ? '#4A9EFF' : '#fff' },
          { label: 'Invoices Due', value: unpaidInvoices, color: unpaidInvoices > 0 ? '#F59E0B' : '#fff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0D0D0D', border: '1px solid #141414', borderRadius: 16, padding: '18px 18px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action Centre */}
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.01em' }}>
          {hasActions ? '⚡ Action Required' : '✓ All Caught Up'}
        </div>
        <ClientActionCentre projects={projects} messages={messages} contracts={contracts} onNavigate={onNavigate} />

        {!hasActions && (
          <div style={{ marginTop: 16, padding: '16px 20px', background: '#0D0D0D', border: '1px solid #141414', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#555' }}>Need new content?</div>
            <button onClick={onRequestShoot} style={{ padding: '10px 18px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Request a Shoot →
            </button>
          </div>
        )}
      </div>

      {/* Active projects preview */}
      {activeProjects.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Active Projects</div>
            {projects.length > activeProjects.length && (
              <button onClick={() => onNavigate('projects')} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>View all →</button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeProjects.slice(0, 3).map(p => <ClientProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {/* Empty home */}
      {projects.length === 0 && messages.length === 0 && (
        <div style={{ background: '#0D0D0D', border: '1px solid #141414', borderRadius: 20, padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>🎬</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#666', marginBottom: 10 }}>Welcome to your portal</div>
          <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8, marginBottom: 24 }}>
            Studio 65 will add your projects, files, and messages here.<br />
            Ready to get started?
          </div>
          <button onClick={onRequestShoot} style={{ padding: '14px 28px', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Request Your First Shoot →
          </button>
        </div>
      )}

      {/* Recent messages preview */}
      {messages.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Recent Messages</div>
            <button onClick={() => onNavigate('messages')} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.slice(0, 3).map(m => (
              <button key={m.id} onClick={() => onNavigate('messages')} style={{ width: '100%', textAlign: 'left', background: '#0D0D0D', border: `1px solid ${!m.read_by_client && m.from === 'studio' ? 'rgba(74,158,255,0.2)' : '#141414'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: m.from === 'studio' ? 'rgba(232,26,26,0.1)' : 'rgba(74,158,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: m.from === 'studio' ? '#E81A1A' : '#4A9EFF' }}>
                  {m.from === 'studio' ? 'S' : 'Y'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: !m.read_by_client && m.from === 'studio' ? 700 : 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || (m.from === 'studio' ? 'Studio 65' : 'You')}</div>
                  <div style={{ fontSize: 12, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{m.body || ''}</div>
                </div>
                {!m.read_by_client && m.from === 'studio' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A9EFF', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FAB Menu ──────────────────────────────────────────────────────────────────
function FabMenu({ open, onClose, onRequestShoot, onReserveDate, onCallBack }) {
  if (!open) return null;
  const items = [
    { icon: Film, label: 'Request a Shoot', color: '#E81A1A', bg: 'rgba(232,26,26,0.1)', onClick: onRequestShoot },
    { icon: Calendar, label: 'Reserve a Date', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', onClick: onReserveDate },
    { icon: Phone, label: 'Request a Call Back', color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)', onClick: onCallBack },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        {items.map(item => (
          <button key={item.label} onClick={() => { onClose(); item.onClick(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#0D0D0D', border: `1px solid ${item.color}30`, borderRadius: 16, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{item.label}</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={16} color={item.color} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [contact, setContact] = useState(null);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState('home');
  const [fabOpen, setFabOpen] = useState(false);
  const [showShootRequest, setShowShootRequest] = useState(false);
  const [showReserveDate, setShowReserveDate] = useState(false);
  const [showCallBack, setShowCallBack] = useState(false);
  const [activeProjectFiles, setActiveProjectFiles] = useState(null);

  const handleLogin = (c, projs, msgs, ctrs) => {
    setContact(c);
    setProjects(projs || []);
    setMessages((msgs || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setContracts(ctrs || []);
    (msgs || []).filter(m => m.from === 'studio' && !m.read_by_client)
      .forEach(m => base44.entities.ClientMessage.update(m.id, { ...m, read_by_client: true }));
  };

  const handleApproval = async (msg, status, note = '') => {
    const updated = { ...msg, approval_status: status, approval_note: note };
    await base44.entities.ClientMessage.update(msg.id, updated);
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
  };

  const handleSignOut = () => {
    setContact(null); setProjects([]); setMessages([]); setContracts([]); setTab('home');
  };

  const handleNavigate = (tabKey) => setTab(tabKey);

  useEffect(() => {
    if (!contact) return;
    const unsub = base44.entities.ClientMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.client_name === contact.name && event.data?.from === 'studio') {
        setMessages(prev => [event.data, ...prev]);
      } else if (event.type === 'update' && event.data?.client_name === contact.name) {
        setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
      }
    });
    return unsub;
  }, [contact?.name]);

  if (!contact) return <ClientLoginScreen onLogin={handleLogin} />;

  const unreadMessages = messages.filter(m => m.from === 'studio' && !m.read_by_client).length;
  const pendingApprovals = messages.filter(m => m.from === 'studio' && (m.type === 'script' || m.type === 'approval_request') && (!m.approval_status || m.approval_status === 'pending')).length;
  const pendingContracts = contracts.filter(c => c.status === 'sent').length;
  const unpaidInvoices = projects.filter(p => !p.paid && p.revenue > 0 && p.status === 'Invoiced').length;

  const getBadge = (key) => {
    if (key === 'messages') return unreadMessages + pendingApprovals;
    if (key === 'invoices') return unpaidInvoices;
    return 0;
  };

  const PAGE_TITLES = { home: null, projects: 'Your Projects', content: 'Content Schedule', messages: 'Messages', invoices: 'Invoices', contracts: 'Contracts' };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Top header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid #0F0F0F', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 24 }} />
            <div style={{ width: 1, height: 16, background: '#1E1E1E' }} />
            <span style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>Client Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{contact.name}</div>
              {contact.client_company && <div style={{ fontSize: 10, color: '#444', fontFamily: MONO }}>{contact.client_company}</div>}
            </div>
            <button onClick={handleSignOut} style={{ width: 32, height: 32, borderRadius: 10, background: '#0D0D0D', border: '1px solid #1A1A1A', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sign out">
              <X size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 140px' }}>
        {PAGE_TITLES[tab] && (
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 }}>{PAGE_TITLES[tab]}</div>
        )}

        {tab === 'home' && (
          <ClientDashboard contact={contact} projects={projects} messages={messages} contracts={contracts} onNavigate={handleNavigate} onRequestShoot={() => setShowShootRequest(true)} />
        )}
        {tab === 'projects' && !activeProjectFiles && (
          projects.length === 0 ? (
            <EmptyState emoji="🎬" title="No projects yet" subtitle="Studio 65 will add your projects here once work begins. Want to get the ball rolling?" cta="Request a Shoot" onCta={() => setShowShootRequest(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {projects.map(p => (
                <div key={p.id}>
                  <ClientProjectCard project={p} />
                  <button onClick={() => setActiveProjectFiles(p)} style={{ width: '100%', marginTop: 6, padding: '10px 0', background: 'transparent', border: '1px solid #111', borderRadius: 12, color: '#333', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Mono", monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    📁 View Project Files →
                  </button>
                </div>
              ))}
            </div>
          )
        )}
        {tab === 'projects' && activeProjectFiles && (
          <div>
            <button onClick={() => setActiveProjectFiles(null)} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Back to Projects
            </button>
            <ProjectFilesHub
              projectId={activeProjectFiles.id}
              projectName={activeProjectFiles.name}
              clientName={contact.name}
              isStudio={false}
              uploaderName={contact.name}
            />
          </div>
        )}
        {tab === 'content' && (
          <ClientContentSchedule contact={contact} />
        )}
        {tab === 'messages' && (
          <ClientMessagesTab messages={messages} projects={projects} contact={contact} onApproval={handleApproval} onMessageSent={msg => setMessages(prev => [msg, ...prev])} />
        )}
        {tab === 'invoices' && (
          projects.filter(p => p.revenue > 0 && (p.invoice_status !== 'draft' || p.status === 'Invoiced' || p.paid)).length === 0 ? (
            <EmptyState emoji="💳" title="No invoices yet" subtitle="You're all caught up. No payments are due right now. Invoices will appear here when Studio 65 sends them." />
          ) : (
            <ClientInvoicesTab projects={projects} />
          )
        )}
        {tab === 'contracts' && (
          <div>
            {contracts.filter(c => c.status !== 'draft').length === 0 ? (
              <EmptyState emoji="📄" title="No agreements waiting" subtitle="When Studio 65 sends a contract for review or signature, it will appear here." />
            ) : (
              <ClientContractsTab contracts={contracts} contact={contact} onContractsChange={setContracts} />
            )}
          </div>
        )}
      </main>

      {/* FAB — Request button */}
      <button onClick={() => setFabOpen(o => !o)} style={{ position: 'fixed', bottom: 86, right: 20, zIndex: 300, width: 52, height: 52, borderRadius: 16, background: fabOpen ? '#333' : '#E81A1A', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(232,26,26,0.35)', transition: 'all 0.2s' }}>
        {fabOpen ? <X size={20} color="#fff" /> : <Plus size={22} color="#fff" />}
      </button>

      <FabMenu open={fabOpen} onClose={() => setFabOpen(false)} onRequestShoot={() => setShowShootRequest(true)} onReserveDate={() => setShowReserveDate(true)} onCallBack={() => setShowCallBack(true)} />

      {/* Bottom navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid #0F0F0F', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map(t => {
          const active = tab === t.key;
          const badge = getBadge(t.key);
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 4px', cursor: 'pointer', position: 'relative', minHeight: 62, WebkitTapHighlightColor: 'transparent' }}>
              {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, borderRadius: '0 0 2px 2px', background: '#E81A1A' }} />}
              {badge > 0 && <div style={{ position: 'absolute', top: 8, right: '50%', transform: 'translateX(8px)', minWidth: 16, height: 16, borderRadius: 8, background: '#E81A1A', color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{badge > 9 ? '9+' : badge}</div>}
              <t.Icon size={20} color={active ? '#fff' : '#333'} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? '#fff' : '#333', fontFamily: MONO, letterSpacing: '-0.01em' }}>{t.label}</span>
            </button>
          );
        })}
        {/* Contracts tab indicator if pending */}
        {pendingContracts > 0 && (
          <button onClick={() => setTab('contracts')} style={{ flex: 1, border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 4px', cursor: 'pointer', position: 'relative', minHeight: 62, WebkitTapHighlightColor: 'transparent' }}>
            {tab === 'contracts' && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, borderRadius: '0 0 2px 2px', background: '#E81A1A' }} />}
            <div style={{ position: 'absolute', top: 8, right: '50%', transform: 'translateX(8px)', minWidth: 16, height: 16, borderRadius: 8, background: '#4A9EFF', color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{pendingContracts}</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tab === 'contracts' ? '#fff' : '#333'} strokeWidth={tab === 'contracts' ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
            <span style={{ fontSize: 10, fontWeight: tab === 'contracts' ? 700 : 400, color: tab === 'contracts' ? '#fff' : '#333', fontFamily: MONO, letterSpacing: '-0.01em' }}>Contracts</span>
          </button>
        )}
      </nav>

      {/* Modals */}
      {showShootRequest && <ShootRequestModal contact={contact} projects={projects} onClose={() => setShowShootRequest(false)} onSubmitted={() => {}} />}
      {showReserveDate && <ReserveDateSheet contact={contact} onClose={() => setShowReserveDate(false)} />}
      {showCallBack && <CallBackSheet contact={contact} projects={projects} onClose={() => setShowCallBack(false)} />}
    </div>
  );
}