import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/projects', icon: '🎬', label: 'Projects' },
  { path: '/analytics', icon: '📊', label: 'Analytics' },
  { path: '/calendar', icon: '📅', label: 'Calendar' },
  { path: '/crew', icon: '👥', label: 'Crew' },
  { path: '/timeline', icon: '⏱', label: 'Timeline' },
  { path: '/contacts', icon: '📋', label: 'Contacts' },
  { path: '/gear', icon: '🎒', label: 'Gear' },
  { path: '/operations', icon: '✅', label: 'Ops' },
  { path: '/agents', icon: '✦', label: 'AI' },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabPress = (path, isActive) => {
    if (isActive) {
      // Already on this tab — navigate to its root
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  };

  return (
    <nav data-bottom-tab="true" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 200,
      background: 'rgba(10,10,10,0.97)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid #1E1E1E',
      display: 'flex',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      userSelect: 'none',
    }}>
      {TABS.map(t => {
        const isActive = location.pathname === t.path || location.pathname.startsWith(t.path + '/');
        return (
          <div
            key={t.path}
            onClick={() => handleTabPress(t.path, isActive)}
            style={{ flex: 1, textDecoration: 'none', minWidth: 44, cursor: 'pointer' }}
          >
            <div style={{
              minHeight: 54,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3,
              padding: '8px 2px',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: 2,
                  background: '#E81A1A',
                }} />
              )}
              <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#E81A1A' : '#555',
                fontFamily: '"DM Mono", monospace',
                letterSpacing: '-0.02em',
                transition: 'color 0.15s',
              }}>{t.label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}