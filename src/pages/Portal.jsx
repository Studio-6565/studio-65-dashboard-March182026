import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange, STATUS_STYLE } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

// ── Login ──────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const urlCode = new URLSearchParams(window.location.search).get('code') || '';
  const [password, setPassword] = useState(urlCode);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError('');
    const contacts = await base44.entities.Contact.filter({ portal_password: password.trim() });
    if (!contacts.length) {
      setError('Invalid code. Please check with Studio 65.');
      setLoading(false); return;
    }
    const c = contacts[0];
    const allProjects = await base44.entities.Project.list('-date', 200);
    const myProjects  = allProjects.filter(p => {
      const inCrew    = (p.crew || []).some(m => m.name.toLowerCase() === c.name.toLowerCase());
      const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === c.name.toLowerCase());
      return inCrew || inRentals;
    });
    onLogin(c, myProjects);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 64, marginBottom: 12 }} />
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Crew Portal</div>
          <div style={{ fontSize: 13, color: '#555' }}>Your shoots, schedule & pay — all in one place</div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 16, padding: 32 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 10, display: 'block' }}>Access Code</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your personal code"
            autoFocus
            style={{ background: '#2A2A2A', border: '1px solid #444', borderRadius: 10, padding: '14px 16px', color: '#fff', fontSize: 16, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', marginBottom: 16, letterSpacing: '0.08em' }}
          />
          {error && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, fontSize: 13, color: '#E81A1A' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Loading your portal...' : 'Enter Portal →'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#444' }}>
          No code? Contact Studio 65.
        </div>
      </div>
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────

function ProjectCard({ project: p, contact }) {
  const [expanded, setExpanded]   = useState(false);
  const [savingIdx, setSavingIdx] = useState(null);
  const [noteText, setNoteText]   = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [delLinks, setDelLinks]   = useState({});
  const [delLinkSaving, setDelLinkSaving] = useState({});
  const [localCrew, setLocalCrew] = useState(p.crew || []);

  const crewRoles = (localCrew).map((m, i) => m.name.toLowerCase() === contact.name.toLowerCase() ? { entry: m, index: i } : null).filter(Boolean);
  const rentalRoles = (p.rentals || []).map((r, i) => (r.vendor || '').toLowerCase() === contact.name.toLowerCase() ? { entry: r, index: i } : null).filter(Boolean);
  const isCrew = crewRoles.length > 0;

  if (!crewRoles.length && !rentalRoles.length) return null;

  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
  const del = p.deliverables || [];

  const totalEarnings = crewRoles.reduce((s, r) => {
    return s + (r.entry.rate_type === 'hourly' ? (r.entry.cost || 0) * (r.entry.hours || 0) : (r.entry.cost || 0));
  }, 0);

  const myAvail = crewRoles[0]?.entry?.avail;
  const confirmed = myAvail === 'yes';
  const declined  = myAvail === 'no';
  const pending   = !myAvail || myAvail === 'pending';

  const handleAvail = async (crewIndex, status) => {
    setSavingIdx(crewIndex);
    const newCrew = localCrew.map((c, i) => i === crewIndex ? { ...c, avail: status } : c);
    const logMsg = status === 'yes' ? `${contact.name} confirmed via portal` : `${contact.name} declined via portal`;
    await base44.entities.Project.update(p.id, { ...p, crew: newCrew, activity: [...(p.activity || []), { msg: logMsg, ts: new Date().toISOString() }] });
    setLocalCrew(newCrew);
    setSavingIdx(null);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    const firstIdx = crewRoles[0]?.index;
    const newCrew  = localCrew.map((c, i) => i === firstIdx ? { ...c, portal_note: noteText.trim() } : c);
    await base44.entities.Project.update(p.id, { ...p, crew: newCrew });
    setLocalCrew(newCrew);
    setNoteSaving(false); setNoteText('');
  };

  const handleSaveDelLink = async (i, link) => {
    setDelLinkSaving(s => ({ ...s, [i]: true }));
    const deliverables = del.map((d, j) => j === i ? { ...d, link } : d);
    await base44.entities.Project.update(p.id, { ...p, deliverables });
    setDelLinkSaving(s => ({ ...s, [i]: false }));
  };

  return (
    <div style={{ background: '#1A1A1A', border: `1px solid ${expanded ? '#333' : '#222'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Header */}
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Availability dot */}
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: confirmed ? '#7BC853' : declined ? '#E81A1A' : '#555', flexShrink: 0, marginTop: 4 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: st.bg, color: st.clr }}>{p.status || 'Booked'}</span>
            {p.date && <span style={{ fontSize: 12, color: '#666' }}>📅 {fmtDateRange(p)}</span>}
            {p.start_time && <span style={{ fontSize: 12, color: '#666' }}>⏰ {p.start_time}{p.end_time ? '–' + p.end_time : ''}</span>}
            {isCrew && totalEarnings > 0 && <span style={{ fontSize: 12, color: '#F59E0B' }}>💰 {fmt(totalEarnings)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {confirmed && <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 9px', borderRadius: 5, fontWeight: 700, background: 'rgba(123,200,83,0.15)', color: '#7BC853' }}>✓ Confirmed</span>}
          {declined  && <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 9px', borderRadius: 5, fontWeight: 700, background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>✗ Declined</span>}
          <span style={{ color: '#444', fontSize: 13 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #222', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Your role & pay */}
          {crewRoles.map((r, ri) => {
            const computedCost = r.entry.rate_type === 'hourly'
              ? (r.entry.cost || 0) * (r.entry.hours || 0)
              : (r.entry.cost || 0);
            return (
              <div key={ri} style={{ background: '#242424', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontFamily: MONO, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Your Role</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{r.entry.role || 'Crew'}</div>
                {r.entry.cost > 0 && (
                  <div style={{ fontSize: 14, color: '#F59E0B', marginBottom: 8 }}>
                    {r.entry.rate_type === 'hourly'
                      ? `${fmt(r.entry.cost)}/hr × ${r.entry.hours || 0}h = ${fmt(computedCost)}`
                      : fmt(computedCost)}
                    <span style={{ marginLeft: 10, fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 700, background: r.entry.paid ? 'rgba(123,200,83,0.15)' : 'rgba(232,26,26,0.12)', color: r.entry.paid ? '#7BC853' : '#E81A1A' }}>
                      {r.entry.paid ? '✓ Paid' : 'Awaiting Payment'}
                    </span>
                  </div>
                )}

                {/* Availability response — large tap targets */}
                {(pending || r.entry.avail === 'pending') ? (
                  <div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>Can you make it? Let the team know.</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        disabled={savingIdx === r.index}
                        onClick={() => handleAvail(r.index, 'yes')}
                        style={{ flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#7BC853', color: '#000' }}
                      >{savingIdx === r.index ? '...' : '✓  I\'m In'}</button>
                      <button
                        disabled={savingIdx === r.index}
                        onClick={() => handleAvail(r.index, 'no')}
                        style={{ flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(232,26,26,0.15)', color: '#E81A1A' }}
                      >{savingIdx === r.index ? '...' : '✗  Can\'t Make It'}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: confirmed ? '#7BC853' : '#E81A1A' }}>
                      {confirmed ? '✓ You\'re confirmed!' : '✗ Marked as unavailable'}
                    </span>
                    <button onClick={() => handleAvail(r.index, 'pending')} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'none', border: '1px solid #333', color: '#555', cursor: 'pointer', fontFamily: MONO }}>Change</button>
                  </div>
                )}

                {r.entry.portal_note && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(74,158,255,0.07)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 8, fontSize: 12, color: '#ccc' }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginBottom: 3 }}>YOUR NOTE ON FILE</div>
                    {r.entry.portal_note}
                  </div>
                )}
              </div>
            );
          })}

          {/* Shoot details */}
          {(p.address || p.poc_name) && (
            <div style={{ background: '#242424', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontFamily: MONO, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Shoot Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.address  && <div style={{ fontSize: 13, color: '#ccc' }}>📍 {p.address}</div>}
                {p.poc_name && <div style={{ fontSize: 13, color: '#ccc' }}>👤 {p.poc_name}{p.poc_phone ? ' · ' + p.poc_phone : ''}</div>}
                {p.notes    && <div style={{ fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.6 }}>{p.notes}</div>}
              </div>
            </div>
          )}

          {/* Camera setup */}
          {p.setup && (p.setup.camera_orientation || p.setup.frame_rate || p.setup.resolution || p.setup.codec || p.setup.gear) && (
            <div style={{ background: '#242424', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontFamily: MONO, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Camera Setup</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['🎥 Orientation', p.setup.camera_orientation], ['⏱ Frame Rate', p.setup.frame_rate], ['📐 Resolution', p.setup.resolution], ['🗜 Codec', p.setup.codec], ['🎨 Color Profile', p.setup.color_profile]].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', minWidth: 110, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                    <span style={{ color: '#ddd' }}>{value}</span>
                  </div>
                ))}
                {p.setup.gear && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 6 }}>🎒 Gear / Kit</div>
                    {p.setup.gear.split('\n').filter(g => g.trim()).map((g, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#bbb', paddingLeft: 8, marginBottom: 3 }}>· {g.trim()}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deliverables */}
          {del.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontFamily: MONO, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Deliverables — {del.filter(d => d.done).length}/{del.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {del.map((d, i) => (
                  <div key={i} style={{ background: '#242424', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isCrew ? 10 : 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${d.done ? '#7BC853' : '#333'}`, background: d.done ? '#7BC853' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {d.done && <span style={{ fontSize: 10, color: '#000' }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, flex: 1, textDecoration: d.done ? 'line-through' : 'none', color: d.done ? '#555' : '#ddd' }}>{d.name}</span>
                      {d.due && <span style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>{d.due}</span>}
                    </div>
                    {d.link && <a href={d.link} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: '#4A9EFF', marginLeft: 28 }}>📎 {d.link}</a>}
                    {isCrew && (
                      <div style={{ display: 'flex', gap: 8, marginLeft: 28 }}>
                        <input
                          value={delLinks[i] !== undefined ? delLinks[i] : (d.link || '')}
                          onChange={e => setDelLinks(l => ({ ...l, [i]: e.target.value }))}
                          placeholder="Paste delivery link (Drive, Dropbox...)"
                          style={{ flex: 1, background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif' }}
                        />
                        <button
                          onClick={() => handleSaveDelLink(i, delLinks[i] !== undefined ? delLinks[i] : (d.link || ''))}
                          disabled={delLinkSaving[i]}
                          style={{ padding: '8px 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >{delLinkSaving[i] ? '...' : d.link ? 'Update' : 'Submit'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave a note */}
          {isCrew && (
            <div>
              <div style={{ fontSize: 11, fontFamily: MONO, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Leave a Note for Studio 65</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ask a question or leave a note..."
                  style={{ flex: 1, background: '#242424', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif', lineHeight: 1.6 }}
                />
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving || !noteText.trim()}
                  style={{ padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !noteText.trim() ? 0.4 : 1 }}
                >{noteSaving ? '...' : 'Send'}</button>
              </div>
            </div>
          )}

          {/* Call sheet download */}
          <button
            onClick={() => downloadCallSheet(p, crewRoles[0] || rentalRoles[0], contact)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 10, color: '#4A9EFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: MONO }}
          >📄 Download Call Sheet PDF</button>
        </div>
      )}
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────

export default function Portal() {
  const [contact, setContact]   = useState(null);
  const [projects, setProjects] = useState([]);

  const handleLogin = (c, projs) => { setContact(c); setProjects(projs); };
  const handleSignOut = () => { setContact(null); setProjects([]); };

  if (!contact) return <LoginScreen onLogin={handleLogin} />;

  const today            = new Date().toISOString().split('T')[0];
  const upcomingProjects = projects.filter(p => !p.archived && (p.date || '') >= today);
  const pastProjects     = projects.filter(p =>  p.archived || (p.date || '') <  today);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1A1A1A', background: '#0A0A0A', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 26 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{contact.name}</div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>{contact.role || 'Crew'}</div>
            </div>
            <button onClick={handleSignOut} style={{ padding: '6px 12px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>Hey {contact.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 13, color: '#555' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} on your account</div>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🎬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#666', marginBottom: 6 }}>No projects yet</div>
            <div style={{ fontSize: 13 }}>Studio 65 will add you to projects soon. Check back later!</div>
          </div>
        ) : (
          <>
            {upcomingProjects.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Upcoming</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcomingProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} />)}
                </div>
              </div>
            )}
            {pastProjects.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Past</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pastProjects.map(p => <ProjectCard key={p.id} project={p} contact={contact} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Call Sheet PDF ─────────────────────────────────────────────────────────

function downloadCallSheet(p, role, contact) {
  import('jspdf').then(({ jsPDF }) => {
    const doc  = new jsPDF();
    const MONO = 'courier';
    const SANS = 'helvetica';
    let y = 20;

    const line = (text, size = 11, style = 'normal', font = SANS, color = [255,255,255]) => {
      doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...color);
      doc.text(text, 20, y); y += size * 0.5 + 3;
    };
    const divider = () => { doc.setDrawColor(60,60,60); doc.line(20, y, 190, y); y += 6; };
    const section = (text) => {
      y += 2;
      doc.setFillColor(30,30,30); doc.roundedRect(18, y - 5, 174, 10, 2, 2, 'F');
      doc.setFont(MONO,'bold'); doc.setFontSize(8); doc.setTextColor(150,150,150);
      doc.text(text.toUpperCase(), 20, y + 1); y += 10;
    };

    doc.setFillColor(10,10,10); doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(232,26,26); doc.rect(0, 0, 210, 18, 'F');
    doc.setFont(SANS,'bold'); doc.setFontSize(13); doc.setTextColor(255,255,255);
    doc.text('STUDIO 65 — CALL SHEET', 20, 12);
    doc.setFont(MONO,'normal'); doc.setFontSize(8); doc.setTextColor(255,180,180);
    doc.text(new Date().toLocaleDateString('en-CA'), 170, 12);
    y = 28;

    section('Project');
    line(p.name, 16, 'bold', SANS, [255,255,255]);
    line(`Client: ${p.client || '—'}`, 10, 'normal', MONO, [180,180,180]);
    if (p.date) line(`Date: ${p.date}${p.end_date && p.end_date !== p.date ? ' – ' + p.end_date : ''}`, 10, 'normal', MONO, [180,180,180]);
    if (p.start_time) line(`Call Time: ${p.start_time}${p.end_time ? '  |  Wrap: ' + p.end_time : ''}`, 10, 'normal', MONO, [245,158,11]);
    if (p.address) line(`Location: ${p.address}`, 10, 'normal', MONO, [180,180,180]);
    if (p.poc_name) line(`POC: ${p.poc_name}${p.poc_phone ? ' · ' + p.poc_phone : ''}`, 10, 'normal', MONO, [180,180,180]);
    y += 2; divider();

    if (role) {
      section('Your Details');
      line(`Name: ${contact.name}`, 11, 'bold', SANS, [255,255,255]);
      if (role.entry?.role) line(`Role: ${role.entry.role}`, 10, 'normal', MONO, [180,180,180]);
      if (role.entry?.cost) line(`Rate: $${role.entry.cost}`, 10, 'normal', MONO, [123,200,83]);
      y += 2; divider();
    }

    const s = p.setup || {};
    if (s.camera_orientation || s.frame_rate || s.resolution || s.codec || s.gear) {
      section('Camera Setup');
      if (s.camera_orientation) line(`Orientation: ${s.camera_orientation}`, 10, 'normal', MONO, [180,180,180]);
      if (s.frame_rate)         line(`Frame Rate: ${s.frame_rate}`, 10, 'normal', MONO, [180,180,180]);
      if (s.resolution)         line(`Resolution: ${s.resolution}`, 10, 'normal', MONO, [180,180,180]);
      if (s.codec)              line(`Codec: ${s.codec}`, 10, 'normal', MONO, [180,180,180]);
      if (s.color_profile)      line(`Color Profile: ${s.color_profile}`, 10, 'normal', MONO, [180,180,180]);
      if (s.gear) { y += 2; line('Gear:', 10, 'bold', SANS, [255,255,255]); s.gear.split('\n').forEach(g => g.trim() && line(`  · ${g.trim()}`, 9, 'normal', MONO, [180,180,180])); }
      y += 2; divider();
    }

    if (p.notes) {
      section('Notes');
      const wrapped = doc.splitTextToSize(p.notes, 170);
      doc.setFont(MONO,'normal'); doc.setFontSize(9); doc.setTextColor(180,180,180);
      wrapped.forEach(ln => { doc.text(ln, 20, y); y += 5; });
      y += 2; divider();
    }

    section("Director's Contact");
    line('Rathan — Studio 65', 11, 'bold', SANS, [255,255,255]);
    line('studio65production@gmail.com', 9, 'normal', MONO, [74,158,255]);
    doc.setFillColor(30,30,30); doc.rect(0, 285, 210, 12, 'F');
    doc.setFont(MONO,'normal'); doc.setFontSize(7); doc.setTextColor(80,80,80);
    doc.text('STUDIO 65 — CONFIDENTIAL — FOR CREW USE ONLY', 20, 292);
    doc.save(`CallSheet_${p.name.replace(/\s+/g, '_')}.pdf`);
  });
}