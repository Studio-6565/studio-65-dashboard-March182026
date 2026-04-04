import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { useTheme } from '@/hooks/useTheme';

const MONO = '"DM Mono", monospace';

function Section({ title, children }) {
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E1E' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: hint ? 3 : 0 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#555', fontFamily: MONO, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? '#E81A1A' : '#2A2A2A',
        border: `1px solid ${value ? '#E81A1A' : '#333'}`,
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2,
        left: value ? 22 : 2,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

function FieldInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
        padding: '8px 12px', color: '#fff', fontSize: 13,
        outline: 'none', fontFamily: 'Syne, sans-serif', width: 200,
      }}
    />
  );
}

const PLAN_FEATURES = {
  free:  ['1 user', '10 active projects', 'Crew & Client portals', 'Basic analytics'],
  pro:   ['1 user', 'Unlimited projects', 'All portals', 'Full analytics', 'Contracts', 'AI Agents'],
  studio: ['Up to 5 users', 'Unlimited projects', 'All portals', 'Full analytics', 'Contracts', 'AI Agents', 'Priority support'],
};

export default function SettingsPage({ onDeleteAccount }) {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [studioName, setStudioName] = useState('Studio 65');
  const [studioEmail, setStudioEmail] = useState('studio65production@gmail.com');
  const [studioPhone, setStudioPhone] = useState('');
  const [studioWebsite, setStudioWebsite] = useState('');
  const [notifyBooking, setNotifyBooking]     = useState(true);
  const [notifyOnboarding, setNotifyOnboarding] = useState(true);
  const [notifyContracts, setNotifyContracts]  = useState(true);
  const [notifyMessages, setNotifyMessages]    = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan] = useState('pro'); // current plan

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) setUser(u);
    });
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600)); // simulate save
    setSaving(false);
    showToast('Studio profile saved', 'green');
  };

  const handleDeleteAccount = () => {
    if (!confirm('Delete your account? This is permanent and cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All your data will be lost.')) return;
    showToast('Account deletion requested — contact support to complete.', 'red');
    if (onDeleteAccount) onDeleteAccount();
  };

  const appUrl = window.location.origin;

  return (
    <div style={{ maxWidth: 580, fontFamily: 'Syne, sans-serif', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Settings</div>
        <div style={{ fontSize: 13, color: '#555', fontFamily: MONO }}>Manage your studio configuration and account</div>
      </div>

      {/* Studio Profile */}
      <Section title="Studio Profile">
        <Row label="Studio Name" hint="Shown on portals and documents">
          <FieldInput value={studioName} onChange={setStudioName} placeholder="Your Studio Name" />
        </Row>
        <Row label="Contact Email" hint="Used for client and crew communications">
          <FieldInput value={studioEmail} onChange={setStudioEmail} placeholder="email@studio.com" type="email" />
        </Row>
        <Row label="Phone" hint="Displayed on call sheets and contracts">
          <FieldInput value={studioPhone} onChange={setStudioPhone} placeholder="+1 (416) 000-0000" />
        </Row>
        <Row label="Website">
          <FieldInput value={studioWebsite} onChange={setStudioWebsite} placeholder="https://yourstudio.com" />
        </Row>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              padding: '10px 24px', background: '#E81A1A', border: 'none',
              borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </Section>

      {/* Plan & Billing */}
      <Section title="Plan & Billing">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(PLAN_FEATURES).map(([key, features]) => {
            const active = plan === key;
            const prices = { free: 'Free', pro: '$29/mo', studio: '$79/mo' };
            return (
              <div
                key={key}
                style={{
                  flex: 1, minWidth: 140,
                  padding: '14px 16px',
                  background: active ? 'rgba(232,26,26,0.07)' : '#111',
                  border: `1px solid ${active ? 'rgba(232,26,26,0.4)' : '#222'}`,
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'capitalize', color: active ? '#E81A1A' : '#888' }}>{key}</div>
                  {active && <div style={{ fontSize: 9, fontFamily: MONO, padding: '2px 7px', borderRadius: 4, background: 'rgba(232,26,26,0.15)', color: '#E81A1A' }}>CURRENT</div>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{prices[key]}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {features.map(f => (
                    <div key={f} style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: active ? '#E81A1A' : '#333', fontSize: 10 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                {!active && (
                  <button
                    onClick={() => showToast('Billing portal coming soon!', 'blue')}
                    style={{ marginTop: 12, width: '100%', padding: '8px 0', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#888', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
                  >Upgrade →</button>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ paddingTop: 4, display: 'flex', gap: 12 }}>
          <button onClick={() => showToast('Billing portal coming soon!', 'blue')} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8, color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>Manage Billing ↗</button>
          <button onClick={() => showToast('Invoice history coming soon!', 'blue')} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8, color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>View Invoices ↗</button>
        </div>
      </Section>

      {/* Portals */}
      <Section title="Portals & Public Links">
        {[
          { label: 'Onboarding Portal', hint: 'Crew, clients & vendors submit info', path: '/onboarding' },
          { label: 'Crew Portal', hint: 'Your crew views shoots & chat', path: '/portal' },
          { label: 'Client Portal', hint: 'Clients review deliverables & approve', path: '/client-portal' },
        ].map(({ label, hint, path }) => (
          <Row key={path} label={label} hint={hint}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#444', fontFamily: MONO, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appUrl}{path}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(`${appUrl}${path}`); showToast('Link copied!', 'green'); }}
                style={{ padding: '5px 10px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 6, color: '#aaa', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap' }}
              >Copy</button>
              <a href={path} target="_blank" rel="noreferrer"
                style={{ padding: '5px 10px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 6, color: '#4A9EFF', fontSize: 11, fontWeight: 600, fontFamily: MONO, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >Open ↗</a>
            </div>
          </Row>
        ))}
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Theme" hint="Switch between dark and light mode">
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ key: 'dark', label: '🌙 Dark' }, { key: 'light', label: '☀️ Light' }].map(t => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${theme === t.key ? 'rgba(232,26,26,0.5)' : '#2A2A2A'}`,
                  background: theme === t.key ? 'rgba(232,26,26,0.1)' : '#111',
                  color: theme === t.key ? '#E81A1A' : '#555',
                  fontFamily: MONO,
                }}
              >{t.label}</button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Email Notifications">
        <Row label="New Booking Requests" hint="Alert when a client submits a booking">
          <Toggle value={notifyBooking} onChange={setNotifyBooking} />
        </Row>
        <Row label="New Onboarding Submissions" hint="Alert when someone fills out the intake form">
          <Toggle value={notifyOnboarding} onChange={setNotifyOnboarding} />
        </Row>
        <Row label="Contract Signed / Declined" hint="Alert when a contract status changes">
          <Toggle value={notifyContracts} onChange={setNotifyContracts} />
        </Row>
        <Row label="New Client Messages" hint="Alert when a client sends a message">
          <Toggle value={notifyMessages} onChange={setNotifyMessages} />
        </Row>
      </Section>

      {/* Account */}
      <Section title="Account">
        {user && (
          <Row label="Signed in as">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.full_name || user.email}</div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>{user.email}</div>
            </div>
          </Row>
        )}
        <div style={{ height: 1, background: '#1E1E1E' }} />
        <Row label="Sign Out" hint="You'll be redirected to the login page">
          <button
            onClick={() => base44.auth.logout()}
            style={{ padding: '9px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#ccc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Sign Out</button>
        </Row>
        <div style={{ height: 1, background: '#1E1E1E' }} />
        <Row label="Delete Account" hint="Permanently removes all your data">
          <button
            onClick={handleDeleteAccount}
            style={{ padding: '9px 18px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 8, color: '#E81A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Delete Account</button>
        </Row>
      </Section>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#333', letterSpacing: '0.06em' }}>STUDIO 65 STUDIO OS</div>
        <div style={{ fontSize: 11, color: '#3A3A3A', fontFamily: MONO }}>v1.0 · Built for creatives who move fast</div>
      </div>
    </div>
  );
}