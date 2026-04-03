import React from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

export default function SettingsPage({ onDeleteAccount }) {
  const handleDeleteAccount = () => {
    if (!confirm('Delete your account? This is permanent and cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All your data will be lost.')) return;
    showToast('Account deletion requested — contact support to complete.', 'red');
    if (onDeleteAccount) onDeleteAccount();
  };

  return (
    <div style={{ maxWidth: 520, fontFamily: 'Syne, sans-serif' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Settings</div>

      {/* Account section */}
      <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Account</div>
        </div>
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => base44.auth.logout()}
            style={{
              width: '100%', padding: '14px 16px', background: 'transparent',
              border: 'none', borderRadius: 10, color: '#ddd', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex',
              alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>↪</span> Sign Out
          </button>
          <div style={{ height: 1, background: '#1E1E1E', margin: '0 4px' }} />
          <button
            onClick={handleDeleteAccount}
            style={{
              width: '100%', padding: '14px 16px', background: 'transparent',
              border: 'none', borderRadius: 10, color: '#E81A1A', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex',
              alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>🗑</span> Delete Account
          </button>
        </div>
      </div>

      {/* App info */}
      <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>About</div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Studio</span>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Studio 65</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Portals</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/onboarding" target="_blank" style={{ fontSize: 12, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none' }}>Onboarding ↗</a>
              <a href="/portal" target="_blank" style={{ fontSize: 12, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none' }}>Crew ↗</a>
              <a href="/client-portal" target="_blank" style={{ fontSize: 12, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none' }}>Client ↗</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}