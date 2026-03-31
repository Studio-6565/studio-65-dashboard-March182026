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

  const getMyRoles = (project) => {
    const crewEntries = (project.crew || [])
      .map((m, i) => m.name.toLowerCase() === contact.name.toLowerCase() ? { type: 'crew', entry: m, index: i } : null)
      .filter(Boolean);
    const rentalEntries = (project.rentals || [])
      .map((r, i) => (r.vendor || '').toLowerCase() === contact.name.toLowerCase() ? { type: 'rental', entry: r, index: i } : null)
      .filter(Boolean);
    const all = [...crewEntries, ...rentalEntries];
    return all.length ? all : null;
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
                {upcomingProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} getMyRoles={getMyRoles} active={activeProject?.id === p.id} onToggle={() => setActiveProject(activeProject?.id === p.id ? null : p)} onAvailChange={handleAvailChange} />)}
              </div>
            )}
            {pastProjects.length > 0 && (
              <div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Past</div>
                {pastProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} getMyRoles={getMyRoles} active={activeProject?.id === p.id} onToggle={() => setActiveProject(activeProject?.id === p.id ? null : p)} onAvailChange={handleAvailChange} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function downloadCallSheet(p, role, contact) {
  const { jsPDF } = window.jspdf || {};
  // Use dynamic import fallback
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF();
    const MONO = 'courier';
    const SANS = 'helvetica';
    let y = 20;

    const line = (text, size = 11, style = 'normal', font = SANS, color = [255,255,255]) => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(text, 20, y);
      y += size * 0.5 + 3;
    };

    const divider = () => {
      doc.setDrawColor(60, 60, 60);
      doc.line(20, y, 190, y);
      y += 6;
    };

    const sectionHeader = (text) => {
      y += 2;
      doc.setFillColor(30, 30, 30);
      doc.roundedRect(18, y - 5, 174, 10, 2, 2, 'F');
      doc.setFont(MONO, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(text.toUpperCase(), 20, y + 1);
      y += 10;
    };

    // Dark background
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, 'F');

    // Header
    doc.setFillColor(232, 26, 26);
    doc.rect(0, 0, 210, 18, 'F');
    doc.setFont(SANS, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('STUDIO 65 — CALL SHEET', 20, 12);
    doc.setFont(MONO, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 180, 180);
    doc.text(new Date().toLocaleDateString('en-CA'), 170, 12);
    y = 28;

    // Project
    sectionHeader('Project');
    line(p.name, 16, 'bold', SANS, [255, 255, 255]);
    line(`Client: ${p.client || '—'}`, 10, 'normal', MONO, [180, 180, 180]);
    if (p.date) line(`Date: ${p.date}${p.end_date && p.end_date !== p.date ? ' – ' + p.end_date : ''}`, 10, 'normal', MONO, [180, 180, 180]);
    if (p.start_time) line(`Call Time: ${p.start_time}${p.end_time ? '  |  Wrap: ' + p.end_time : ''}`, 10, 'normal', MONO, [245, 158, 11]);
    if (p.setup?.arrival_time) line(`Arrival Time: ${p.setup.arrival_time}`, 10, 'normal', MONO, [180, 180, 180]);
    if (p.address) line(`Location: ${p.address}`, 10, 'normal', MONO, [180, 180, 180]);
    if (p.poc_name) line(`Point of Contact: ${p.poc_name}${p.poc_phone ? '  ·  ' + p.poc_phone : ''}`, 10, 'normal', MONO, [180, 180, 180]);
    y += 2;
    divider();

    // Your Details
    sectionHeader('Your Details');
    line(`Name: ${contact.name}`, 11, 'bold', SANS, [255, 255, 255]);
    if (role.entry.role) line(`Role: ${role.entry.role}`, 10, 'normal', MONO, [180, 180, 180]);
    if (role.entry.cost) line(`Rate: $${role.entry.cost}`, 10, 'normal', MONO, [123, 200, 83]);
    y += 2;
    divider();

    // Setup / Camera
    const s = p.setup || {};
    const hasSetup = s.camera_orientation || s.frame_rate || s.resolution || s.codec || s.color_profile || s.gear;
    if (hasSetup) {
      sectionHeader('Camera Setup');
      if (s.camera_orientation) line(`Orientation: ${s.camera_orientation}`, 10, 'normal', MONO, [180, 180, 180]);
      if (s.frame_rate) line(`Frame Rate: ${s.frame_rate}`, 10, 'normal', MONO, [180, 180, 180]);
      if (s.resolution) line(`Resolution: ${s.resolution}`, 10, 'normal', MONO, [180, 180, 180]);
      if (s.codec) line(`Codec: ${s.codec}`, 10, 'normal', MONO, [180, 180, 180]);
      if (s.color_profile) line(`Color Profile: ${s.color_profile}`, 10, 'normal', MONO, [180, 180, 180]);
      if (s.gear) {
        y += 2;
        line('Gear List:', 10, 'bold', SANS, [255, 255, 255]);
        s.gear.split('\n').forEach(g => g.trim() && line(`  · ${g.trim()}`, 9, 'normal', MONO, [180, 180, 180]));
      }
      if (s.notes) { y += 2; line(`Notes: ${s.notes}`, 9, 'normal', MONO, [150, 150, 150]); }
      y += 2;
      divider();
    }

    // Deliverables
    const dels = p.deliverables || [];
    if (dels.length) {
      sectionHeader('Deliverables');
      dels.forEach(d => {
        const status = d.done ? '[DONE]' : '[    ]';
        line(`${status}  ${d.name}${d.due ? '  —  Due: ' + d.due : ''}`, 9, 'normal', MONO, d.done ? [123, 200, 83] : [180, 180, 180]);
      });
      y += 2;
      divider();
    }

    // Notes
    if (p.notes) {
      sectionHeader('Production Notes');
      const wrapped = doc.splitTextToSize(p.notes, 170);
      doc.setFont(MONO, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      wrapped.forEach(ln => { doc.text(ln, 20, y); y += 5; });
      y += 2;
      divider();
    }

    // Footer — Rathan contact
    sectionHeader("Director's Contact");
    line('Rathan — Studio 65', 11, 'bold', SANS, [255, 255, 255]);
    line('studio65production@gmail.com', 9, 'normal', MONO, [74, 158, 255]);

    // Footer bar
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont(MONO, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('STUDIO 65 — CONFIDENTIAL — FOR CREW USE ONLY', 20, 292);

    doc.save(`CallSheet_${p.name.replace(/\s+/g, '_')}.pdf`);
  });
}

function ProjectCard({ project: p, contact, getMyRoles, active, onToggle, onAvailChange }) {
  const roles = getMyRoles(p);
  if (!roles) return null;
  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
  const del = p.deliverables || [];
  const doneDel = del.filter(d => d.done).length;
  const [savingIdx, setSavingIdx] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [delLinks, setDelLinks] = useState({});
  const [delLinkSaving, setDelLinkSaving] = useState({});

  const crewRoles = roles.filter(r => r.type === 'crew');
  const hasAnyCrew = crewRoles.length > 0;

  const handleAvail = async (crewIndex, status) => {
    setSavingIdx(crewIndex);
    const crew = (p.crew || []).map((c, i) => i === crewIndex ? { ...c, avail: status } : c);
    const logMsg = status === 'yes'
      ? `${contact.name} confirmed availability via portal`
      : `${contact.name} declined via portal`;
    const activity = [...(p.activity || []), { msg: logMsg, ts: new Date().toISOString() }];
    await base44.entities.Project.update(p.id, { ...p, crew, activity });
    onAvailChange(p.id, crew);
    setSavingIdx(null);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    // Apply note to the first crew entry for this contact
    const firstCrewIdx = crewRoles[0]?.index;
    const crew = (p.crew || []).map((c, i) => i === firstCrewIdx ? { ...c, portal_note: noteText.trim() } : c);
    await base44.entities.Project.update(p.id, { ...p, crew });
    onAvailChange(p.id, crew);
    setNoteSaving(false);
    setNoteText('');
  };

  const handleSaveDelLink = async (i, link) => {
    setDelLinkSaving(s => ({ ...s, [i]: true }));
    const deliverables = (p.deliverables || []).map((d, j) => j === i ? { ...d, link } : d);
    await base44.entities.Project.update(p.id, { ...p, deliverables });
    onAvailChange(p.id, p.crew || []);
    setDelLinkSaving(s => ({ ...s, [i]: false }));
  };

  // Summary line for header: list all roles/entries
  const roleSummary = roles.map(r =>
    r.type === 'crew' ? (r.entry.role || 'Crew') : `Vendor — ${r.entry.equipment}`
  ).join(' · ');

  const totalEarnings = crewRoles.reduce((sum, r) => {
    if (r.entry.rate_type === 'hourly') return sum + (r.entry.cost || 0) * (r.entry.hours || 0);
    return sum + (r.entry.cost || 0);
  }, 0);

  const allConfirmed = crewRoles.length > 0 && crewRoles.every(r => r.entry.avail === 'yes');
  const anyDeclined = crewRoles.some(r => r.entry.avail === 'no');
  const anyPending = crewRoles.some(r => !r.entry.avail || r.entry.avail === 'pending');

  return (
    <div style={{ background: '#1E1E1E', border: `1px solid ${active ? '#444' : '#2A2A2A'}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Card header */}
      <div onClick={onToggle} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: st.bg, color: st.clr }}>{p.status}</span>
          </div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span>📅 {fmtDateRange(p)}</span>
            {p.start_time && <span>⏰ {p.start_time}{p.end_time ? '–' + p.end_time : ''}</span>}
            <span>👤 {roleSummary}</span>
            {hasAnyCrew && totalEarnings > 0 && <span style={{ color: '#aaa' }}>💰 {fmt(totalEarnings)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {hasAnyCrew && (
            allConfirmed ? (
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px', borderRadius: 4, fontWeight: 700, background: 'rgba(123,200,83,0.15)', color: '#7BC853' }}>✓ Confirmed</span>
            ) : anyDeclined && !anyPending ? (
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px', borderRadius: 4, fontWeight: 700, background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>✗ Declined</span>
            ) : null
          )}
          <span style={{ color: '#555', fontSize: 12 }}>{active ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {active && (
        <div style={{ borderTop: '1px solid #2A2A2A', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Download Call Sheet */}
          <button
            onClick={() => downloadCallSheet(p, roles[0], contact)}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}
          >
            📄 Download Call Sheet
          </button>

          {/* All roles/services for this person */}
          <div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>
              Your Role{roles.length > 1 ? 's' : ''} on This Project
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.map((r, ri) => {
                const isCrew = r.type === 'crew';
                const computedCost = isCrew && r.entry.rate_type === 'hourly'
                  ? (r.entry.cost || 0) * (r.entry.hours || 0)
                  : (r.entry.cost || 0);
                return (
                  <div key={ri} style={{ background: '#2A2A2A', borderRadius: 10, padding: '12px 14px', border: '1px solid #333' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                          {isCrew ? (r.entry.role || 'Crew') : `Vendor — ${r.entry.equipment}`}
                        </div>
                        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {isCrew && r.entry.cost > 0 && (
                            r.entry.rate_type === 'hourly'
                              ? <span>{fmt(r.entry.cost)}/hr × {r.entry.hours || 0}h = <span style={{ color: '#fff' }}>{fmt(computedCost)}</span></span>
                              : <span style={{ color: '#fff' }}>{fmt(r.entry.cost)}</span>
                          )}
                          {!isCrew && r.entry.cost > 0 && <span style={{ color: '#fff' }}>{fmt(r.entry.cost)}</span>}
                          {isCrew && (
                            <span style={{ padding: '1px 7px', borderRadius: 4, fontWeight: 700, fontSize: 10,
                              background: r.entry.paid ? 'rgba(123,200,83,0.15)' : 'rgba(232,26,26,0.12)',
                              color: r.entry.paid ? '#7BC853' : '#E81A1A' }}>
                              {r.entry.paid ? '✓ Paid' : 'Awaiting Payment'}
                            </span>
                          )}
                        </div>
                        {isCrew && r.entry.portal_note && (
                          <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 6, fontSize: 11, color: '#ccc' }}>
                            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#4A9EFF', display: 'block', marginBottom: 2 }}>YOUR NOTE</span>
                            {r.entry.portal_note}
                          </div>
                        )}
                      </div>
                      {/* Per-entry availability for crew */}
                      {isCrew && (
                        <div onClick={e => e.stopPropagation()}>
                          {r.entry.avail === 'yes' || r.entry.avail === 'no' ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px', borderRadius: 4, fontWeight: 700,
                                background: r.entry.avail === 'yes' ? 'rgba(123,200,83,0.15)' : 'rgba(232,26,26,0.12)',
                                color: r.entry.avail === 'yes' ? '#7BC853' : '#E81A1A' }}>
                                {r.entry.avail === 'yes' ? '✓ Confirmed' : '✗ Declined'}
                              </span>
                              <button onClick={() => handleAvail(r.index, 'pending')} style={{ background: 'none', border: '1px solid #444', borderRadius: 4, color: '#666', fontSize: 10, cursor: 'pointer', padding: '2px 7px', fontFamily: '"DM Mono", monospace' }}>Change</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button disabled={savingIdx === r.index} onClick={() => handleAvail(r.index, 'yes')}
                                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(123,200,83,0.15)', color: '#7BC853' }}>
                                {savingIdx === r.index ? '...' : '✓ Confirm'}
                              </button>
                              <button disabled={savingIdx === r.index} onClick={() => handleAvail(r.index, 'no')}
                                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>
                                ✗
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

          {/* Setup */}
          {p.setup && (p.setup.arrival_time || p.setup.camera_orientation || p.setup.frame_rate || p.setup.resolution || p.setup.codec || p.setup.color_profile || p.setup.gear || p.setup.notes) && (
            <div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Camera Setup</div>
              <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['🕐 Arrival Time', p.setup.arrival_time],
                  ['🎥 Orientation', p.setup.camera_orientation],
                  ['⏱ Frame Rate', p.setup.frame_rate],
                  ['📐 Resolution', p.setup.resolution],
                  ['🗜 Codec', p.setup.codec],
                  ['🎨 Color Profile', p.setup.color_profile],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', minWidth: 110, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: '#ddd' }}>{value}</span>
                  </div>
                ))}
                {p.setup.gear && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginBottom: 6 }}>🎒 Gear / Kit</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {p.setup.gear.split('\n').filter(g => g.trim()).map((g, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#ddd', paddingLeft: 10 }}>· {g.trim()}</div>
                      ))}
                    </div>
                  </div>
                )}
                {p.setup.notes && (
                  <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: 11, color: '#aaa', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', display: 'block', marginBottom: 4 }}>SETUP NOTES</span>
                    {p.setup.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deliverables */}
          {del.length > 0 && (
            <div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Deliverables — {doneDel}/{del.length} done</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {del.map((d, i) => (
                  <div key={i} style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: d.link ? 6 : 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.done ? '#7BC853' : '#444', flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, textDecoration: d.done ? 'line-through' : 'none', color: d.done ? '#555' : '#ddd' }}>{d.name}</div>
                      {d.due && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666' }}>{d.due}</span>}
                    </div>
                    {d.link && (
                      <a href={d.link} target="_blank" rel="noreferrer" style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#4A9EFF', marginLeft: 18 }}>📎 {d.link}</a>
                    )}
                    {hasAnyCrew && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          value={delLinks[i] !== undefined ? delLinks[i] : (d.link || '')}
                          onChange={e => setDelLinks(l => ({ ...l, [i]: e.target.value }))}
                          placeholder="Paste delivery link (Dropbox, Drive, WeTransfer...)"
                          style={{ flex: 1, background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 11, outline: 'none', fontFamily: 'Syne, sans-serif' }}
                        />
                        <button
                          onClick={() => handleSaveDelLink(i, delLinks[i] !== undefined ? delLinks[i] : (d.link || ''))}
                          disabled={delLinkSaving[i]}
                          style={{ padding: '6px 12px', background: '#E81A1A', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >{delLinkSaving[i] ? '...' : d.link ? 'Update' : 'Submit'}</button>
                      </div>
                    )}
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

          {/* Leave a note (crew only) */}
          {hasAnyCrew && (
            <div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Your Note / Question</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ask a question or leave a note for Studio 65..."
                  style={{ flex: 1, background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif' }}
                />
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving || !noteText.trim()}
                  style={{ padding: '0 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !noteText.trim() ? 0.5 : 1 }}
                >{noteSaving ? '...' : 'Send'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}