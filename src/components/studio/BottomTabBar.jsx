import React from 'react';

const TABS = [
  { id: 'Projects', icon: '🎬', label: 'Projects' },
  { id: 'Analytics', icon: '📊', label: 'Analytics' },
  { id: 'Calendar', icon: '📅', label: 'Calendar' },
  { id: 'Crew', icon: '👥', label: 'Crew' },
  { id: 'Timeline', icon: '⏱', label: 'Timeline' },
  { id: 'Contacts', icon: '📋', label: 'Contacts' },
];

export default function BottomTabBar({ tab, setTab }) {
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
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              minHeight: 54,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 2px',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
              transition: 'opacity 0.15s',
              // 44dp touch target compliance
              minWidth: 44,
            }}
          >
            {/* Active indicator bar */}
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, borderRadius: 2,
                background: '#E81A1A',
              }} />
            )}
            <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#E81A1A' : '#555',
              fontFamily: '"DM Mono", monospace',
              letterSpacing: '-0.02em',
              transition: 'color 0.15s',
            }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}