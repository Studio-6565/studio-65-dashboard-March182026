import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Film, Calendar, BarChart3, Clock, Users, Clipboard, Mail, Backpack, CheckSquare, FileText, Settings, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/projects',   Icon: Film, label: 'Projects' },
  { path: '/calendar',   Icon: Calendar, label: 'Calendar' },
  { path: '/analytics',  Icon: BarChart3, label: 'Analytics' },
  { path: '/timeline',   Icon: Clock, label: 'Timeline' },
  { path: '/crew',       Icon: Users, label: 'Crew' },
  { path: '/contacts',   Icon: Clipboard, label: 'Contacts' },
  { path: '/inbox',      Icon: Mail, label: 'Inbox' },
  { path: '/gear',       Icon: Backpack, label: 'Gear' },
  { path: '/operations', Icon: CheckSquare, label: 'Operations' },
  { path: '/contracts',  Icon: FileText, label: 'Contracts' },
  { path: '/settings',   Icon: Settings, label: 'Settings' },
];

const AI_ITEM = { path: '/agents', Icon: Sparkles, label: 'AI Agents' };

export default function SideNav({ onNewProject }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) =>
    location.pathname === path ||
    (path === '/projects' && location.pathname.startsWith('/projects/'));

  const W = collapsed ? 64 : 220;

  return (
    <aside style={{
      width: W,
      minWidth: W,
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#0F0F0F',
      borderRight: '1px solid #1E1E1E',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      zIndex: 50,
      flexShrink: 0,
    }}>

      {/* Logo + collapse toggle */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0' : '0 14px 0 16px',
        borderBottom: '1px solid #1A1A1A',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <img
            src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png"
            alt="Studio 65"
            style={{ height: 26 }}
            draggable="false"
          />
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#444', fontSize: 16, padding: 6, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 32, minHeight: 32,
          }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* New Project button */}
      <div style={{ padding: collapsed ? '12px 10px' : '12px 12px', flexShrink: 0 }}>
        <button
          onClick={onNewProject}
          style={{
            width: '100%',
            padding: collapsed ? '10px 0' : '10px 14px',
            background: '#E81A1A',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontSize: collapsed ? 18 : 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            fontFamily: 'Syne, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span>+</span>
          {!collapsed && <span>New Project</span>}
        </button>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ path, Icon, label }) => {
          const active = isActive(path);
          return (
            <Link key={path} to={path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                cursor: 'pointer',
                background: active ? '#1E1E1E' : 'transparent',
                borderLeft: active ? '2px solid #E81A1A' : '2px solid transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#161616'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={18} color={active ? '#E81A1A' : '#666'} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#fff' : '#666',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                  }}>{label}</span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Divider before AI */}
        <div style={{ height: 1, background: '#1A1A1A', margin: '8px 4px' }} />

        {/* AI Agents */}
        {(() => {
          const active = isActive(AI_ITEM.path);
          return (
            <Link to={AI_ITEM.path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                cursor: 'pointer',
                background: active ? 'rgba(232,26,26,0.08)' : 'transparent',
                borderLeft: active ? '2px solid #E81A1A' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#161616'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <AI_ITEM.Icon size={18} color="#E81A1A" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#E81A1A' : '#555',
                    whiteSpace: 'nowrap',
                  }}>{AI_ITEM.label}</span>
                )}
              </div>
            </Link>
          );
        })()}
      </nav>

      {/* Bottom: sign out */}
      <div style={{
        borderTop: '1px solid #1A1A1A',
        padding: collapsed ? '12px 10px' : '12px 12px',
        flexShrink: 0,
      }}>
        <button
          onClick={() => base44.auth.logout()}
          style={{
            width: '100%',
            padding: collapsed ? '8px 0' : '8px 12px',
            background: 'transparent',
            border: '1px solid #222',
            borderRadius: 8,
            color: '#444',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            fontFamily: 'Syne, sans-serif',
          }}
        >
          <span style={{ fontSize: 14 }}>↪</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

    </aside>
  );
}