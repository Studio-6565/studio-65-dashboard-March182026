import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange, STATUS_STYLE } from '@/lib/studio';

export default function Portal() {
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const contacts = await base44.entities.Contact.filter({ portal_password: password.trim() });
      if (!contacts.length) {
        setError('Invalid password. Please check with Studio 65.');
        setLoading(false);
        return;
      }
      const c = contacts[0];
      setContact(c);
      // Find all projects where this person is in crew or rentals
      const allProjects = await base44.entities.Project.list('-date', 200);
      const myProjects = allProjects.filter(p => {
        const inCrew = (p.crew || []).some(m => m.name.toLowerCase() === c.name.toLowerCase());
        const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === c.name.toLowerCase());
        return inCrew || inRentals;
      });
      setProjects(myProjects);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const getMyRole = (project) => {
    const crewEntry = (project.crew || []).find(m => m.name.toLowerCase() === contact.name.toLowerCase());
    if (crewEntry) return { type: 'crew', entry: crewEntry };
    const rentalEntry = (project.rentals || []).find(r => (r.vendor || '').toLowerCase() === contact.name.toLowerCase());
    if (rentalEntry) return { type: 'rental', entry: rentalEntry };
    return null;
  };

  // Login screen
  if (!contact) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 60, marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#666' }}>Crew & Vendor Portal</div>
          </div>
          <form onSubmit={handleLogin} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 14, padding: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 8, display: 'block' }}>
                Enter your access code
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your personal code"
                autoFocus
                style={{ background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' }}
              />
            </div>
            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 8, fontSize: 12, color: '#E81A1A' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Checking...' : 'Access My Portal'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#444' }}>
            Contact Studio 65 if you don't have an access code.
          </div>
        </div>
      </div>
    );
  }

  const upcomingProjects = projects.filter(p => !p.archived && p.date >= new Date().toISOString().split('T')[0]);
  const pastProjects = projects.filter(p => p.archived || p.date < new Date().toISOString().split('T')[0]);

  const handleAvailChange = (projectId, newCrew) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, crew: newCrew } : p));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1E1E1E', background: 'rgba(10,10,10,0.97)', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <div>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 28 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{contact.name}</div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: '"DM Mono", monospace' }}>{contact.role || 'Crew / Vendor'}</div>
            </div>
            <button
              onClick={() => { setContact(null); setProjects([]); setPassword(''); setActiveProject(null); }}
              style={{ padding: '5px 12px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 6, color: '#666', fontSize: 11, cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Welcome, {contact.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 13, color: '#666' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} found for you</div>
        </div>

        {!projects.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🎬</div>
            <div>No projects found for your account yet. Check back soon!</div>
          </div>
        ) : (
          <>
            {upcomingProjects.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Upcoming</div>
                {upcomingProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} getMyRole={getMyRole} active={activeProject?.id === p.id} onToggle={() => setActiveProject(activeProject?.id === p.id ? null : p)} onAvailChange={handleAvailChange} />)}
              </div>
            )}
            {pastProjects.length > 0 && (
              <div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Past</div>
                {pastProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} getMyRole={getMyRole} active={activeProject?.id === p.id} onToggle={() => setActiveProject(activeProject?.id === p.id ? null : p)} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project: p, contact, getMyRole, active, onToggle, onAvailChange }) {
  const role = getMyRole(p);
  if (!role) return null;
  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
  const del = p.deliverables || [];
  const doneDel = del.filter(d => d.done).length;
  const [saving, setSaving] = useState(false);

  const handleAvail = async (status) => {
    setSaving(true);
    const crew = (p.crew || []).map(c =>
      c.name.toLowerCase() === contact.name.toLowerCase() ? { ...c, avail: status } : c
    );
    await base44.entities.Project.update(p.id, { ...p, crew });
    onAvailChange(p.id, crew);
    setSaving(false);
  };

  return (
    <div style={{ background: '#1E1E1E', border: `1px solid ${active ? '#444' : '#2A2A2A'}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Card header — always visible, clickable */}
      <div onClick={onToggle} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: st.bg, color: st.clr }}>{p.status}</span>
          </div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span>📅 {fmtDateRange(p)}</span>
            {p.start_time && <span>⏰ {p.start_time}{p.end_time ? '–' + p.end_time : ''}</span>}
            <span>👤 {role.type === 'crew' ? role.entry.role || 'Crew' : `Vendor — ${role.entry.equipment}`}</span>
            {role.type === 'crew' && <span style={{ color: '#7BC853' }}>💰 {fmt(role.entry.cost)}{role.entry.paid ? ' ✓ Paid' : ''}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {role.type === 'crew' && (
            role.entry.avail === 'yes' || role.entry.avail === 'no' ? (
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px', borderRadius: 4, fontWeight: 700, background: role.entry.avail === 'yes' ? 'rgba(123,200,83,0.15)' : 'rgba(232,26,26,0.12)', color: role.entry.avail === 'yes' ? '#7BC853' : '#E81A1A' }}>
                {role.entry.avail === 'yes' ? '✓ Confirmed' : '✗ Declined'}
              </span>
            ) : (
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button
                  disabled={saving}
                  onClick={() => handleAvail('yes')}
                  style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(123,200,83,0.15)', color: '#7BC853' }}
                >✓ Confirm</button>
                <button
                  disabled={saving}
                  onClick={() => handleAvail('no')}
                  style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}
                >✗ Decline</button>
              </div>
            )
          )}
          <span style={{ color: '#555', fontSize: 12 }}>{active ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {active && (
        <div style={{ borderTop: '1px solid #2A2A2A', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Shoot details */}
          {(p.address || p.poc_name || p.client) && (
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Shoot Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {p.client && <div style={{ fontSize: 12 }}>🏢 <span style={{ color: '#999' }}>{p.client}</span></div>}
                {p.address && <div style={{ fontSize: 12 }}>📍 <span style={{ color: '#999' }}>{p.address}</span></div>}
                {p.poc_name && <div style={{ fontSize: 12 }}>👤 <span style={{ color: '#999' }}>{p.poc_name}{p.poc_phone ? ' · ' + p.poc_phone : ''}</span></div>}
              </div>
            </div>
          )}

          {/* Deliverables */}
          {del.length > 0 && (
            <div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Deliverables — {doneDel}/{del.length} done</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {del.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#2A2A2A', borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.done ? '#7BC853' : '#444', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, textDecoration: d.done ? 'line-through' : 'none', color: d.done ? '#555' : '#ddd' }}>{d.name}</div>
                    {d.due && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666' }}>{d.due}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {p.notes && (
            <div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Notes</div>
              <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}