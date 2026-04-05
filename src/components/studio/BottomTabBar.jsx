import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHaptic } from '@/hooks/useHaptic';
import { Film, Calendar, Clipboard, Mail, BarChart3, Users, Clock, Backpack, CheckSquare, FileText, Settings, LayoutDashboard, Video } from 'lucide-react';

// Primary tabs — always visible
const PRIMARY_TABS = [
  { path: '/projects',  Icon: Film, label: 'Projects' },
  { path: '/calendar',  Icon: Calendar, label: 'Calendar' },
  { path: '/contacts',  Icon: Clipboard, label: 'Contacts' },
  { path: '/leads',     Icon: BarChart3, label: 'Leads' },
];

// Secondary tabs — appear in the "More" drawer
const MORE_TABS = [
  { path: '/dashboard',  Icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/analytics',  Icon: BarChart3, label: 'Analytics' },
  { path: '/crew',       Icon: Users, label: 'Crew Spend' },
  { path: '/timeline',   Icon: Clock, label: 'Timeline' },
  { path: '/editors',    Icon: Video, label: 'Editors' },
  { path: '/gear',       Icon: Backpack, label: 'Gear' },
  { path: '/inbox',      Icon: Mail, label: 'Inbox' },
  { path: '/contracts',  Icon: FileText, label: 'Contracts' },
  { path: '/operations', Icon: CheckSquare, label: 'Operations' },
  { path: '/settings',   Icon: Settings, label: 'Settings' },
];

export default function BottomTabBar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const haptic = useHaptic();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const inMore = MORE_TABS.some(t => isActive(t.path));

  const go = (path) => {
    haptic.tap();
    setMoreOpen(false);
    navigate(location.pathname === path ? path : path, { replace: location.pathname === path });
  };

  return (
    <>
      {/* ── More drawer backdrop ── */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 198,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── More drawer ── */}
      <div style={{
        position: 'fixed', left: 0, right: 0, zIndex: 199,
        background: '#111',
        borderTop: '1px solid #222',
        borderRadius: '20px 20px 0 0',
        padding: '16px 20px',
        paddingBottom: 'calc(90px + env(safe-area-inset-bottom))',
        transform: moreOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        bottom: 0,
        userSelect: 'none',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: '#333', margin: '0 auto 18px',
        }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#444', fontFamily: '"DM Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          More
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {MORE_TABS.map(t => {
            const active = isActive(t.path);
            return (
              <button
                key={t.path}
                onClick={() => go(t.path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '16px 8px',
                  background: active ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
                  border: `1px solid ${active ? 'rgba(232,26,26,0.35)' : '#222'}`,
                  borderRadius: 14, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <t.Icon size={24} color={active ? '#E81A1A' : '#888'} strokeWidth={1.5} />
                <span style={{
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? '#E81A1A' : '#888',
                  fontFamily: '"DM Mono", monospace',
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main bottom bar ── */}
      <nav data-bottom-tab="true" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 200,
        background: '#0A0A0A',
        borderTop: '1px solid #1E1E1E',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        userSelect: 'none',
      }}>
        {PRIMARY_TABS.map(t => {
          const active = isActive(t.path);
          return (
            <button
              key={t.path}
              onClick={() => go(t.path)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '10px 4px 10px',
                cursor: 'pointer', position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                minHeight: 58,
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 3, borderRadius: '0 0 3px 3px',
                  background: '#E81A1A',
                }} />
              )}
              <t.Icon size={20} color={active ? '#E81A1A' : '#555'} strokeWidth={1.5} />
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400,
                color: active ? '#fff' : '#444',
                fontFamily: '"DM Mono", monospace',
                letterSpacing: '-0.01em',
              }}>{t.label}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => { haptic.tap(); setMoreOpen(o => !o); }}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 4px 10px',
            cursor: 'pointer', position: 'relative',
            WebkitTapHighlightColor: 'transparent',
            minHeight: 58,
          }}
        >
          {inMore && !moreOpen && (
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 28, height: 3, borderRadius: '0 0 3px 3px',
              background: '#E81A1A',
            }} />
          )}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3.5,
            width: 18, height: 18,
          }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: 2,
                background: (moreOpen || inMore) ? '#E81A1A' : '#444',
                transition: 'background 0.15s',
              }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, fontWeight: (moreOpen || inMore) ? 700 : 400,
            color: (moreOpen || inMore) ? '#E81A1A' : '#444',
            fontFamily: '"DM Mono", monospace',
          }}>More</span>
        </button>
      </nav>
    </>
  );
}