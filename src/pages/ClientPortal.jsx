import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, FolderOpen, MessageSquare, FileText, CreditCard, LogOut, Bell } from 'lucide-react';
import ClientLoginScreen from '@/components/client-portal/ClientLoginScreen';
import ClientActionCentre from '@/components/client-portal/ClientActionCentre';
import ClientProjectCard from '@/components/client-portal/ClientProjectCard';
import ClientInvoicesTab from '@/components/client-portal/ClientInvoicesTab';
import ClientMessagesTab from '@/components/client-portal/ClientMessagesTab';
import ClientContractsTab from '@/components/portal/ClientContractsTab';

const MONO = '"DM Mono", monospace';

// ── Nav tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'home',      label: 'Home',      Icon: LayoutDashboard },
  { key: 'projects',  label: 'Projects',  Icon: FolderOpen },
  { key: 'messages',  label: 'Messages',  Icon: MessageSquare },
  { key: 'invoices',  label: 'Invoices',  Icon: CreditCard },
  { key: 'contracts', label: 'Contracts', Icon: FileText },
];

// ── Dashboard Home ─────────────────────────────────────────────────────────────
function ClientDashboard({ contact, projects, messages, contracts, onNavigate }) {
  const today = new Date().toISOString().split('T')[0];
  const firstName = contact.name.split(' ')[0];

  const activeProjects = projects.filter(p => !['Delivered', 'Invoiced'].includes(p.status) || !p.paid);
  const upcomingShoot = projects
    .filter(p => p.date && p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const pendingApprovals = messages.filter(m =>
    m.from === 'studio' &&
    (m.type === 'script' || m.type === 'approval_request') &&
    (!m.approval_status || m.approval_status === 'pending')
  ).length;

  const unreadMessages = messages.filter(m => m.from === 'studio' && !m.read_by_client).length;
  const pendingContracts = contracts.filter(c => c.status === 'sent').length;
  const unpaidInvoices = projects.filter(p => !p.paid && p.revenue > 0 && p.status === 'Invoiced').length;

  const hasActions = pendingApprovals + pendingContracts + unpaidInvoices > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Welcome */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Studio 65 Client Portal
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6 }}>
          {greeting},<br />{firstName}.
        </div>
        {upcomingShoot && (
          <div style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📅</span>
            Next shoot: <span style={{ color: '#bbb', fontWeight: 600 }}>{upcomingShoot.name}</span>
            <span style={{ fontFamily: MONO, color: '#444' }}>· {upcomingShoot.date}</span>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { label: 'Active Projects', value: activeProjects.length, color: '#fff' },
          { label: 'Pending Approvals', value: pendingApprovals, color: pendingApprovals > 0 ? '#F59E0B' : '#fff' },
          { label: 'Messages', value: unreadMessages > 0 ? `${unreadMessages} new` : messages.length, color: unreadMessages > 0 ? '#4A9EFF' : '#fff' },
          { label: 'Invoices Due', value: unpaidInvoices, color: unpaidInvoices > 0 ? '#F59E0B' : '#fff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0D0D0D', border: '1px solid #141414', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action Centre */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.01em' }}>
          {hasActions ? '⚡ Action Required' : '✓ All Caught Up'}
        </div>
        <ClientActionCentre
          projects={projects}
          messages={messages}
          contracts={contracts}
          onNavigate={onNavigate}
        />
      </div>

      {/* Active projects preview */}
      {activeProjects.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Active Projects</div>
            {projects.length > activeProjects.length && (
              <button onClick={() => onNavigate('projects')} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
                View all →
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeProjects.slice(0, 3).map(p => (
              <ClientProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {/* Recent messages preview */}
      {messages.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Recent Messages</div>
            <button onClick={() => onNavigate('messages')} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.slice(0, 3).map(m => (
              <button
                key={m.id}
                onClick={() => onNavigate('messages')}
                style={{ width: '100%', textAlign: 'left', background: '#0D0D0D', border: `1px solid ${!m.read_by_client && m.from === 'studio' ? 'rgba(74,158,255,0.2)' : '#141414'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: m.from === 'studio' ? 'rgba(232,26,26,0.1)' : 'rgba(74,158,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: m.from === 'studio' ? '#E81A1A' : '#4A9EFF' }}>
                  {m.from === 'studio' ? 'S' : 'Y'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: !m.read_by_client && m.from === 'studio' ? 700 : 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title || (m.from === 'studio' ? 'Studio 65' : 'You')}
                  </div>
                  <div style={{ fontSize: 12, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {m.body || ''}
                  </div>
                </div>
                {!m.read_by_client && m.from === 'studio' && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A9EFF', flexShrink: 0 }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && messages.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0D0D0D', border: '1px solid #141414', borderRadius: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#555', marginBottom: 8 }}>Welcome to your portal</div>
          <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
            Studio 65 will add your projects, files, and messages here.<br />
            Check back soon or reach out to get started.
          </div>
          <a
            href="mailto:studio65production@gmail.com"
            style={{ display: 'inline-block', marginTop: 20, padding: '12px 24px', background: '#E81A1A', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            Contact Studio 65 →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [contact, setContact] = useState(null);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState('home');

  const handleLogin = (c, projs, msgs, ctrs) => {
    setContact(c);
    setProjects(projs || []);
    setMessages((msgs || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setContracts(ctrs || []);
    // Mark studio messages as read
    (msgs || []).filter(m => m.from === 'studio' && !m.read_by_client)
      .forEach(m => base44.entities.ClientMessage.update(m.id, { ...m, read_by_client: true }));
  };

  const handleApproval = async (msg, status, note = '') => {
    const updated = { ...msg, approval_status: status, approval_note: note };
    await base44.entities.ClientMessage.update(msg.id, updated);
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
  };

  const handleMessageSent = (msg) => {
    setMessages(prev => [msg, ...prev]);
  };

  const handleSignOut = () => {
    setContact(null); setProjects([]); setMessages([]); setContracts([]); setTab('home');
  };

  // Navigate to a tab (called from action centre)
  const handleNavigate = (tabKey) => setTab(tabKey);

  // Real-time message updates
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
    if (key === 'contracts') return pendingContracts;
    if (key === 'invoices') return unpaidInvoices;
    return 0;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Syne, sans-serif' }}>

      {/* Top header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5,5,5,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #0F0F0F',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png"
              alt="Studio 65"
              style={{ height: 24 }}
            />
            <div style={{ width: 1, height: 16, background: '#1E1E1E' }} />
            <span style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>Client Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{contact.name}</div>
              {contact.client_company && <div style={{ fontSize: 10, color: '#444', fontFamily: MONO }}>{contact.client_company}</div>}
            </div>
            <button
              onClick={handleSignOut}
              style={{ width: 32, height: 32, borderRadius: 10, background: '#0D0D0D', border: '1px solid #1A1A1A', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 120px' }}>
        {tab === 'home' && (
          <ClientDashboard
            contact={contact}
            projects={projects}
            messages={messages}
            contracts={contracts}
            onNavigate={handleNavigate}
          />
        )}
        {tab === 'projects' && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>Your Projects</div>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>🎬</div>
                <div style={{ fontSize: 14, color: '#555' }}>No projects yet. Studio 65 will add them here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.map(p => <ClientProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>
        )}
        {tab === 'messages' && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>Messages</div>
            <ClientMessagesTab
              messages={messages}
              projects={projects}
              contact={contact}
              onApproval={handleApproval}
              onMessageSent={handleMessageSent}
            />
          </div>
        )}
        {tab === 'invoices' && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>Invoices</div>
            <ClientInvoicesTab projects={projects} />
          </div>
        )}
        {tab === 'contracts' && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>Contracts</div>
            <ClientContractsTab contracts={contracts} contact={contact} onContractsChange={setContracts} />
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(5,5,5,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid #0F0F0F',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          const badge = getBadge(t.key);
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '12px 4px', cursor: 'pointer',
                position: 'relative', minHeight: 58,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active indicator */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: '0 0 2px 2px',
                  background: '#E81A1A',
                }} />
              )}
              {/* Badge */}
              {badge > 0 && (
                <div style={{
                  position: 'absolute', top: 8, right: '50%', transform: 'translateX(8px)',
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#E81A1A', color: '#fff',
                  fontSize: 9, fontWeight: 800, fontFamily: MONO,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {badge > 9 ? '9+' : badge}
                </div>
              )}
              <t.Icon size={20} color={active ? '#fff' : '#333'} strokeWidth={active ? 2 : 1.5} />
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400,
                color: active ? '#fff' : '#333',
                fontFamily: MONO, letterSpacing: '-0.01em',
              }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}