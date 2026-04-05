import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import { waLink } from '@/lib/studio';

const TYPE_COLORS = {
  Crew: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  Client: { bg: 'rgba(74,158,255,0.12)', color: '#4A9EFF' },
  Vendor: { bg: 'rgba(123,200,83,0.12)', color: '#7BC853' },
  Editor: { bg: 'rgba(232,26,26,0.12)', color: '#E81A1A' },
  Other: { bg: 'rgba(150,150,150,0.12)', color: '#888' },
};

const WaSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 11, height: 11 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.057 23.882l6.197-1.453A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.347l-.356-.211-3.679.863.925-3.585-.232-.368A9.818 9.818 0 1112 21.818z"/>
  </svg>
);

const inputStyle = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };
const TYPES = ['Crew', 'Client', 'Vendor', 'Editor', 'Other'];
const emptyForm = {
  name: '', types: [], role: '', phone: '', email: '', rate: '', rate_type: 'flat',
  notes: '', portal_password: '', offerings: [],
  crew_skills: '', crew_experience: '', crew_equipment: '', crew_availability: '',
  crew_instagram: '', crew_portfolio: '',
  client_company: '', client_project_type: '', client_budget: '', client_how_found: '',
  vendor_company: '', vendor_service_area: '', vendor_website: '',
  editor_software: '', editor_style: '', editor_portfolio: '', editor_rate: '', editor_availability: '',
};

function VendorOfferingsEditor({ offerings, onChange }) {
  const [nameInput, setNameInput] = useState('');
  const [costInput, setCostInput] = useState('');

  const add = () => {
    if (!nameInput.trim()) return;
    onChange([...offerings, { name: nameInput.trim(), cost: parseFloat(costInput) || 0 }]);
    setNameInput(''); setCostInput('');
  };

  const remove = (i) => onChange(offerings.filter((_, j) => j !== i));

  return (
    <div>
      <label style={labelStyle}>What They Offer (gear / services)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {offerings.map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2A2A2A', borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{o.name}</div>
            {o.cost > 0 && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#F59E0B' }}>${o.cost}</div>}
            <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 15, padding: '0 3px', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
        <input
          style={{ ...inputStyle, background: '#2A2A2A' }}
          placeholder="e.g. Sony FX3, Drone, Lighting Kit..."
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <input
          style={{ ...inputStyle, background: '#2A2A2A', width: 90 }}
          type="number"
          placeholder="Cost $"
          value={costInput}
          onChange={e => setCostInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button onClick={add} style={{ padding: '0 14px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
      </div>
    </div>
  );
}

export default function ContactsView({ contacts, onContactsChange, projects, onProjectsChange }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q);
    const types = Array.isArray(c.types) ? c.types : (c.type ? [c.type] : ['Other']);
    const matchF = filter === 'all' || types.includes(filter);
    return matchQ && matchF;
  });

  const toggleType = (type) => {
    setForm(f => ({
      ...f,
      types: f.types.includes(type) ? f.types.filter(t => t !== type) : [...f.types, type]
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'red'); return; }
    if (!form.types.length) { showToast('Select at least one type', 'red'); return; }
    if (editingId) {
      const oldContact = contacts.find(c => c.id === editingId);
      await base44.entities.Contact.update(editingId, form);
      onContactsChange(contacts.map(c => c.id === editingId ? { ...c, ...form } : c));

      if (oldContact && projects && onProjectsChange) {
        const oldName = oldContact.name;
        const updatedProjects = [];
        for (const project of projects) {
          const crew = project.crew || [];
          const hasMatch = crew.some(c => c.name.toLowerCase() === oldName.toLowerCase());
          if (hasMatch) {
            const newCrew = crew.map(c => {
              if (c.name.toLowerCase() !== oldName.toLowerCase()) return c;
              return { ...c, name: form.name || c.name, role: form.role || c.role, phone: form.phone !== undefined ? form.phone : c.phone };
            });
            const updated = { ...project, crew: newCrew };
            await base44.entities.Project.update(project.id, updated);
            updatedProjects.push(updated);
          }
        }
        if (updatedProjects.length > 0) {
          onProjectsChange(projects.map(p => updatedProjects.find(u => u.id === p.id) || p));
          showToast(`${form.name} updated across ${updatedProjects.length} project(s)`, 'blue');
        } else {
          showToast(form.name + ' updated', 'blue');
        }
      } else {
        showToast(form.name + ' updated', 'blue');
      }
    } else {
      const created = await base44.entities.Contact.create(form);
      onContactsChange([...contacts, created]);
      showToast(form.name + ' added');
    }
    setForm(emptyForm); setEditingId(null); setShowForm(false);
  };

  const handleEdit = (c) => {
    setForm({
      name: c.name || '', types: c.types || (c.type ? [c.type] : []), role: c.role || '',
      phone: c.phone || '', email: c.email || '', rate: c.rate || '', rate_type: c.rate_type || 'flat',
      notes: c.notes || '', portal_password: c.portal_password || '', offerings: c.offerings || [],
      crew_skills: c.crew_skills || '', crew_experience: c.crew_experience || '',
      crew_equipment: c.crew_equipment || '', crew_availability: c.crew_availability || '',
      crew_instagram: c.crew_instagram || '', crew_portfolio: c.crew_portfolio || '',
      client_company: c.client_company || '', client_project_type: c.client_project_type || '',
      client_budget: c.client_budget || '', client_how_found: c.client_how_found || '',
      vendor_company: c.vendor_company || '', vendor_service_area: c.vendor_service_area || '',
      vendor_website: c.vendor_website || '',
      editor_software: c.editor_software || '', editor_style: c.editor_style || '',
      editor_portfolio: c.editor_portfolio || '', editor_rate: c.editor_rate || '',
      editor_availability: c.editor_availability || '',
    });
    setEditingId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (c) => {
    onContactsChange(contacts.filter(x => x.id !== c.id));
    showToast(c.name + ' removed', 'red');
    await base44.entities.Contact.delete(c.id);
  };

  const handleCancel = () => {
    setForm(emptyForm); setEditingId(null); setShowForm(false);
  };

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', flex: 1, minWidth: 0 }}
        />
        <button
          onClick={() => setFilterSheetOpen(true)}
          style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '7px 12px', color: filter !== 'all' ? '#fff' : '#666', fontFamily: '"DM Mono", monospace', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', minHeight: 36 }}
        >
          {filter === 'all' ? 'All types' : filter} <span style={{ fontSize: 9, color: '#555' }}>▼</span>
        </button>
        <BottomSheet
          open={filterSheetOpen}
          onClose={() => setFilterSheetOpen(false)}
          title="Filter by Type"
          options={[{ value: 'all', label: 'All Types' }, ...TYPES.map(t => ({ value: t, label: t }))]}
          value={filter}
          onChange={setFilter}
        />
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(s => !s); }}
          style={{ padding: '7px 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          + Add
        </button>
      </div>

      {/* Form panel — shown inline on mobile, above list */}
      {showForm && (
        <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{editingId ? 'Edit Contact' : 'Add Contact'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Vithu Karunakaran" /></div>
            <div>
              <label style={labelStyle}>Type (select all that apply)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                {TYPES.map(t => {
                  const tc = TYPE_COLORS[t];
                  const active = form.types.includes(t);
                  return (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '6px 10px', background: active ? tc.bg : '#2A2A2A', border: `1px solid ${active ? tc.color : '#333'}`, borderRadius: 6, fontSize: 12 }}>
                      <input type="checkbox" checked={active} onChange={() => toggleType(t)} style={{ accentColor: tc.color }} /> {t}
                    </label>
                  );
                })}
              </div>
            </div>
            {/* Universal fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>WhatsApp / Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 416 555 0100" /></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
            </div>

            {/* ── Crew fields ── */}
            {form.types.includes('Crew') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 4 }}>🎥 Crew Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Primary Role</label><input style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. DP, Sound, Editor" /></div>
                  <div><label style={labelStyle}>Availability</label><input style={inputStyle} value={form.crew_availability} onChange={e => setForm(f => ({ ...f, crew_availability: e.target.value }))} placeholder="e.g. Weekends" /></div>
                  <div><label style={labelStyle}>Skills</label><input style={inputStyle} value={form.crew_skills} onChange={e => setForm(f => ({ ...f, crew_skills: e.target.value }))} placeholder="e.g. Color grading, drone" /></div>
                  <div><label style={labelStyle}>Experience</label><input style={inputStyle} value={form.crew_experience} onChange={e => setForm(f => ({ ...f, crew_experience: e.target.value }))} placeholder="e.g. 5 years" /></div>
                  <div><label style={labelStyle}>Instagram</label><input style={inputStyle} value={form.crew_instagram} onChange={e => setForm(f => ({ ...f, crew_instagram: e.target.value }))} placeholder="@handle" /></div>
                  <div><label style={labelStyle}>Portfolio</label><input style={inputStyle} value={form.crew_portfolio} onChange={e => setForm(f => ({ ...f, crew_portfolio: e.target.value }))} placeholder="https://..." /></div>
                </div>
                <div><label style={labelStyle}>Gear Owned</label><input style={inputStyle} value={form.crew_equipment} onChange={e => setForm(f => ({ ...f, crew_equipment: e.target.value }))} placeholder="e.g. Sony FX3, Rode NTG" /></div>
                <div>
                  <label style={labelStyle}>Rate</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 0, background: '#1E1E1E', borderRadius: 8, border: '1px solid #333', overflow: 'hidden', flexShrink: 0 }}>
                      {['flat', 'hourly'].map(rt => (
                        <button key={rt} type="button" onClick={() => setForm(f => ({ ...f, rate_type: rt }))}
                          style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: form.rate_type === rt ? '#E81A1A' : 'transparent', color: form.rate_type === rt ? '#fff' : '#666' }}>
                          {rt === 'flat' ? 'Flat' : '$/hr'}
                        </button>
                      ))}
                    </div>
                    <input style={inputStyle} type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder={form.rate_type === 'hourly' ? 'Hourly rate' : 'Day rate'} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Client fields ── */}
            {form.types.includes('Client') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: 'rgba(74,158,255,0.04)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 10 }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#4A9EFF', textTransform: 'uppercase', marginBottom: 4 }}>🏢 Client Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Company / Brand</label><input style={inputStyle} value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} placeholder="e.g. Acme Corp" /></div>
                  <div><label style={labelStyle}>Project Type</label><input style={inputStyle} value={form.client_project_type} onChange={e => setForm(f => ({ ...f, client_project_type: e.target.value }))} placeholder="e.g. Brand video" /></div>
                  <div><label style={labelStyle}>Budget Range</label><input style={inputStyle} value={form.client_budget} onChange={e => setForm(f => ({ ...f, client_budget: e.target.value }))} placeholder="e.g. $2k–$5k" /></div>
                  <div><label style={labelStyle}>How Did They Find Us</label><input style={inputStyle} value={form.client_how_found} onChange={e => setForm(f => ({ ...f, client_how_found: e.target.value }))} placeholder="e.g. Instagram, referral" /></div>
                </div>
              </div>
            )}

            {/* ── Vendor fields ── */}
            {form.types.includes('Vendor') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: 'rgba(123,200,83,0.04)', border: '1px solid rgba(123,200,83,0.15)', borderRadius: 10 }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#7BC853', textTransform: 'uppercase', marginBottom: 4 }}>🛒 Vendor Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Company Name</label><input style={inputStyle} value={form.vendor_company} onChange={e => setForm(f => ({ ...f, vendor_company: e.target.value }))} placeholder="e.g. Toronto Lens Rentals" /></div>
                  <div><label style={labelStyle}>Service Area</label><input style={inputStyle} value={form.vendor_service_area} onChange={e => setForm(f => ({ ...f, vendor_service_area: e.target.value }))} placeholder="e.g. GTA" /></div>
                  <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Website</label><input style={inputStyle} value={form.vendor_website} onChange={e => setForm(f => ({ ...f, vendor_website: e.target.value }))} placeholder="https://..." /></div>
                </div>
                <VendorOfferingsEditor
                  offerings={form.offerings || []}
                  onChange={offerings => setForm(f => ({ ...f, offerings }))}
                />
              </div>
            )}

            {/* ── Editor fields ── */}
            {form.types.includes('Editor') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: 'rgba(232,26,26,0.04)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 10 }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#E81A1A', textTransform: 'uppercase', marginBottom: 4 }}>🎞️ Editor Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={labelStyle}>Software</label><input style={inputStyle} value={form.editor_software} onChange={e => setForm(f => ({ ...f, editor_software: e.target.value }))} placeholder="e.g. Premiere Pro, DaVinci" /></div>
                  <div><label style={labelStyle}>Editing Style</label><input style={inputStyle} value={form.editor_style} onChange={e => setForm(f => ({ ...f, editor_style: e.target.value }))} placeholder="e.g. Cinematic, fast-paced" /></div>
                  <div><label style={labelStyle}>Rate</label><input style={inputStyle} value={form.editor_rate} onChange={e => setForm(f => ({ ...f, editor_rate: e.target.value }))} placeholder="e.g. $300/day" /></div>
                  <div><label style={labelStyle}>Availability</label><input style={inputStyle} value={form.editor_availability} onChange={e => setForm(f => ({ ...f, editor_availability: e.target.value }))} placeholder="e.g. Freelance" /></div>
                  <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Portfolio / Showreel</label><input style={inputStyle} value={form.editor_portfolio} onChange={e => setForm(f => ({ ...f, editor_portfolio: e.target.value }))} placeholder="https://vimeo.com/..." /></div>
                </div>
              </div>
            )}

            {/* ── Other / universal role field if no specific type selected ── */}
            {!form.types.includes('Crew') && !form.types.includes('Client') && !form.types.includes('Vendor') && !form.types.includes('Editor') && (
              <div><label style={labelStyle}>Role</label><input style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Partner, Collaborator" /></div>
            )}

            <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 60 }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything useful..." /></div>

            <div>
              <label style={labelStyle}>Portal Access Code</label>
              <input style={inputStyle} value={form.portal_password} onChange={e => setForm(f => ({ ...f, portal_password: e.target.value }))} placeholder="e.g. vithu2025 (they use this to log in)" />
              <div style={{ fontSize: 10, color: '#555', marginTop: 4, fontFamily: '"DM Mono", monospace', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                Share:{' '}
                <span style={{ color: '#4A9EFF' }}>{window.location.origin}/portal{form.portal_password ? `?code=${form.portal_password}` : ''}</span>
                {form.portal_password && (
                  <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal?code=${form.portal_password}`); }} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.2)', color: '#4A9EFF', fontSize: 10, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Copy Link</button>
                )}
                {form.types.includes('Client') && form.portal_password && (
                  <span style={{ color: '#444' }}>· Client portal: {window.location.origin}/client-portal?code={form.portal_password}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} style={{ flex: 1, padding: '10px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {editingId ? 'Save Changes' : 'Add Contact'}
              </button>
              <button onClick={handleCancel} style={{ padding: '10px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact cards grid */}
      {!filtered.length ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#666', fontSize: 14 }}>
          {contacts.length ? 'No contacts match your search.' : 'No contacts yet. Tap "+ Add" to create your first one.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filtered.map(c => {
            const types = Array.isArray(c.types) ? c.types : (c.type ? [c.type] : ['Other']);
            const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={c.id} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{c.role || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flexShrink: 0, maxWidth: 100, justifyContent: 'flex-end' }}>
                    {types.map(t => {
                      const tc = TYPE_COLORS[t] || TYPE_COLORS.Other;
                      return <span key={t} style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: tc.bg, color: tc.color }}>{t}</span>;
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {c.phone && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888' }}>📱 {c.phone}</div>}
                  {c.email && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {c.email}</div>}
                  {c.rate && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#F59E0B' }}>💰 ${c.rate}{c.rate_type === 'hourly' ? '/hr' : ' flat'}</div>}
                  {c.notes && <div style={{ fontSize: 11, color: '#666', marginTop: 2, lineHeight: 1.4 }}>{c.notes}</div>}
                  {c.portal_password && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#A78BFA' }}>🔑 {c.portal_password}</span>
                      <button
                        onClick={e => { e.stopPropagation(); const portal = types.includes('Client') ? 'client-portal' : 'portal'; navigator.clipboard.writeText(`${window.location.origin}/${portal}?code=${c.portal_password}`); }}
                        style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', fontSize: 10, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}
                      >Copy Link</button>
                    </div>
                  )}
                  {/* Editor profile info on card */}
                  {types.includes('Editor') && (c.editor_software || c.editor_style || c.editor_portfolio) && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {c.editor_software && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#E81A1A' }}>🎞️ {c.editor_software}</div>}
                      {c.editor_style && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#888' }}>🎨 {c.editor_style}</div>}
                      {c.editor_rate && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#F59E0B' }}>💰 {c.editor_rate}</div>}
                      {c.editor_portfolio && <a href={c.editor_portfolio} target="_blank" rel="noreferrer" style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#4A9EFF' }}>🎬 Portfolio →</a>}
                    </div>
                  )}
                  {(c.offerings || []).length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {c.offerings.map((o, i) => (
                        <span key={i} style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(123,200,83,0.1)', color: '#7BC853', border: '1px solid rgba(123,200,83,0.2)' }}>
                          {o.name}{o.cost > 0 ? ` · $${o.cost}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.phone && (
                    <button onClick={() => waLink(c.phone, `Hi ${c.name}! This is Rathan from Studio 65 👋`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                      <WaSvg /> WhatsApp
                    </button>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>✉ Email</a>
                  )}
                  <button onClick={() => handleEdit(c)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>Edit</button>
                  <button onClick={() => handleDelete(c)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(232,26,26,0.15)', color: '#E81A1A' }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}