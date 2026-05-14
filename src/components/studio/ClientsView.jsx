import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import { waLink } from '@/lib/studio';
import { ExternalLink, Copy, Mail, MessageCircle, User, Plus, Trash2, Users, Palette, Brain } from 'lucide-react';
import ClientBrainModal from '@/components/client-brain/ClientBrainModal';

const MONO = '"DM Mono", monospace';
const inputStyle = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const emptyForm = {
  name: '', types: ['Client'], role: '', phone: '', email: '', notes: '', portal_password: '',
  client_company: '', client_project_type: '', client_budget: '', client_how_found: '',
  portal_users: [],
  brand_profile: {
    primary_color: '', secondary_color: '', accent_color: '',
    font_primary: '', font_secondary: '', tone_of_voice: '',
    target_audience: '', content_pillars: '', competitors: '',
    do_not_use: '', logo_url: '', brand_notes: '',
  },
};

function ClientCard({ client: c, projects, onEdit, onDelete, onOpenBrain }) {
  const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const clientProjects = projects.filter(p => p.client === c.name);
  const totalRevenue = clientProjects.reduce((s, p) => s + (p.revenue || 0), 0);
  const activeProjects = clientProjects.filter(p => !p.archived && !p.paid).length;

  const portalUrl = `${window.location.origin}/client-portal${c.portal_password ? `?code=${c.portal_password}` : ''}`;

  const copyPortalLink = (e) => {
    e.stopPropagation();
    if (!c.portal_password) { showToast('Set a portal access code first', 'amber'); return; }
    navigator.clipboard.writeText(portalUrl);
    showToast('Portal link copied!', 'blue');
  };

  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 14, padding: '18px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#4A9EFF', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              {c.client_company && <div style={{ fontSize: 12, color: '#666', fontFamily: MONO }}>{c.client_company}</div>}
          {!c.client_company && c.role && <div style={{ fontSize: 12, color: '#666' }}>{c.role}</div>}
          {c._synthetic && <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', background: 'rgba(100,100,100,0.12)', border: '1px solid #333', borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginTop: 4 }}>project client · no contact record</div>}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Projects', value: clientProjects.length },
          { label: 'Active', value: activeProjects, color: activeProjects > 0 ? '#4A9EFF' : undefined },
          { label: 'Revenue', value: totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '—', color: totalRevenue > 0 ? '#7BC853' : undefined },
        ].map(s => (
          <div key={s.label} style={{ background: '#2A2A2A', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color || '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        {c.email && <div style={{ fontFamily: MONO, fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {c.email}</div>}
        {c.phone && <div style={{ fontFamily: MONO, fontSize: 11, color: '#888' }}>📱 {c.phone}</div>}
        {c.client_project_type && <div style={{ fontFamily: MONO, fontSize: 11, color: '#888' }}>🎬 {c.client_project_type}</div>}
        {c.client_budget && <div style={{ fontFamily: MONO, fontSize: 11, color: '#F59E0B' }}>💰 {c.client_budget}</div>}
        {c.client_how_found && <div style={{ fontFamily: MONO, fontSize: 11, color: '#666' }}>📍 Found via: {c.client_how_found}</div>}
        {c.notes && <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5, marginTop: 2 }}>{c.notes}</div>}
      </div>

      {/* Portal access */}
      <div style={{ background: '#2A2A2A', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Client Portal</div>
            {c.portal_password ? (
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#A78BFA' }}>🔑 {c.portal_password}</div>
            ) : (
              <div style={{ fontSize: 11, color: '#444' }}>No access code set</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={copyPortalLink} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>
              <Copy size={11} /> Copy Link
            </button>
            {c.portal_password && (
              <a href={portalUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: MONO, background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>
                <ExternalLink size={11} /> View
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {c.phone && (
          <button onClick={() => waLink(c.phone, `Hi ${c.name}! This is Rathan from Studio 65 👋`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
            <MessageCircle size={12} /> WhatsApp
          </button>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: MONO, background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>
            <Mail size={12} /> Email
          </a>
        )}
        <button onClick={() => onOpenBrain(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>
          <Brain size={12} /> Brain
        </button>
        <button onClick={() => onEdit(c)} style={{ padding: '7px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', marginLeft: 'auto' }}>Edit</button>
        <button onClick={() => onDelete(c)} style={{ padding: '7px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>Delete</button>
      </div>
    </div>
  );
}

export default function ClientsView({ contacts, onContactsChange, projects }) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formTab, setFormTab] = useState('info');
  const [newPortalUser, setNewPortalUser] = useState({ name: '', email: '', access_code: '', role: '' });
  const [brainClient, setBrainClient] = useState(null);

  // Include contacts tagged as Client OR any project client name not yet in contacts
  const taggedClients = contacts.filter(c => (c.types || []).includes('Client'));
  const taggedNames = new Set(taggedClients.map(c => c.name.toLowerCase()));
  // Build synthetic entries for project clients with no contact record
  const projectClientNames = [...new Set(projects.map(p => p.client).filter(Boolean))];
  const untaggedClients = projectClientNames
    .filter(name => !taggedNames.has(name.toLowerCase()))
    .map(name => ({ id: '_proj_' + name, name, types: [], _synthetic: true }));
  const clients = [...taggedClients, ...untaggedClients];
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.client_company || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'red'); return; }
    const data = { ...form, types: ['Client'], portal_users: form.portal_users || [], brand_profile: form.brand_profile || {} };
    // editingId starting with '_proj_' means synthetic — always create
    const isSynthetic = editingId && String(editingId).startsWith('_proj_');
    if (editingId && !isSynthetic) {
      await base44.entities.Contact.update(editingId, data);
      onContactsChange(contacts.map(c => c.id === editingId ? { ...c, ...data } : c));
      showToast(form.name + ' updated', 'blue');
    } else {
      const created = await base44.entities.Contact.create(data);
      onContactsChange([...contacts, created]);
      showToast(form.name + ' added');
    }
    setForm(emptyForm); setEditingId(null); setShowForm(false);
  };

  const handleEdit = (c) => {
    setForm({
      name: c.name || '', types: c.types || ['Client'], role: c.role || '',
      phone: c.phone || '', email: c.email || '', notes: c.notes || '',
      portal_password: c.portal_password || '',
      client_company: c.client_company || '', client_project_type: c.client_project_type || '',
      client_budget: c.client_budget || '', client_how_found: c.client_how_found || '',
      portal_users: c.portal_users || [],
      brand_profile: {
        primary_color: '', secondary_color: '', accent_color: '',
        font_primary: '', font_secondary: '', tone_of_voice: '',
        target_audience: '', content_pillars: '', competitors: '',
        do_not_use: '', logo_url: '', brand_notes: '',
        ...(c.brand_profile || {}),
      },
    });
    setEditingId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (c) => {
    if (c._synthetic) { showToast('This client has no contact record to delete', 'amber'); return; }
    if (!confirm(`Delete ${c.name}?`)) return;
    onContactsChange(contacts.filter(x => x.id !== c.id));
    await base44.entities.Contact.delete(c.id);
    showToast(c.name + ' removed', 'red');
  };

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          style={{ flex: 1, background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
        />
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(s => !s); }}
          style={{ padding: '9px 18px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          + Add Client
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{editingId ? 'Edit Client' : 'New Client'}</div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#111', border: '1px solid #222', borderRadius: 8, padding: 3, marginBottom: 18, width: 'fit-content' }}>
            {[
              { key: 'info', label: 'Info', Icon: User },
              { key: 'brand', label: 'Brand', Icon: Palette },
              { key: 'portal', label: 'Portal Users', Icon: Users },
            ].map(t => (
              <button key={t.key} onClick={() => setFormTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: MONO, background: formTab === t.key ? '#E81A1A' : 'transparent', color: formTab === t.key ? '#fff' : '#555', whiteSpace: 'nowrap' }}>
                <t.Icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* ── Info Tab ── */}
          {formTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" autoFocus /></div>
                <div><label style={labelStyle}>Company / Brand</label><input style={inputStyle} value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} placeholder="Acme Corp" /></div>
                <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" /></div>
                <div><label style={labelStyle}>Phone / WhatsApp</label><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 416 555 0100" /></div>
                <div><label style={labelStyle}>Project Type</label><input style={inputStyle} value={form.client_project_type} onChange={e => setForm(f => ({ ...f, client_project_type: e.target.value }))} placeholder="e.g. Brand video" /></div>
                <div><label style={labelStyle}>Budget Range</label><input style={inputStyle} value={form.client_budget} onChange={e => setForm(f => ({ ...f, client_budget: e.target.value }))} placeholder="e.g. $2k–$5k" /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>How They Found Us</label><input style={inputStyle} value={form.client_how_found} onChange={e => setForm(f => ({ ...f, client_how_found: e.target.value }))} placeholder="e.g. Instagram, referral" /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 56 }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything useful..." /></div>
              </div>
            </div>
          )}

          {/* ── Brand Tab ── */}
          {formTab === 'brand' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { key: 'primary_color', label: 'Primary Color', placeholder: '#E81A1A' },
                  { key: 'secondary_color', label: 'Secondary Color', placeholder: '#1E1E1E' },
                  { key: 'accent_color', label: 'Accent Color', placeholder: '#F59E0B' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={labelStyle}>{f.label}</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={form.brand_profile[f.key] || '#000000'}
                        onChange={e => setForm(prev => ({ ...prev, brand_profile: { ...prev.brand_profile, [f.key]: e.target.value } }))}
                        style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 2 }}
                      />
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={form.brand_profile[f.key] || ''}
                        onChange={e => setForm(prev => ({ ...prev, brand_profile: { ...prev.brand_profile, [f.key]: e.target.value } }))}
                        placeholder={f.placeholder}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Primary Font</label><input style={inputStyle} value={form.brand_profile.font_primary || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, font_primary: e.target.value } }))} placeholder="e.g. Helvetica Neue" /></div>
                <div><label style={labelStyle}>Secondary Font</label><input style={inputStyle} value={form.brand_profile.font_secondary || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, font_secondary: e.target.value } }))} placeholder="e.g. Georgia" /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Logo URL</label><input style={inputStyle} value={form.brand_profile.logo_url || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, logo_url: e.target.value } }))} placeholder="https://..." /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Tone of Voice</label><input style={inputStyle} value={form.brand_profile.tone_of_voice || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, tone_of_voice: e.target.value } }))} placeholder="e.g. Bold & energetic, Warm & approachable" /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Target Audience</label><input style={inputStyle} value={form.brand_profile.target_audience || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, target_audience: e.target.value } }))} placeholder="e.g. 25–40 year old health-conscious professionals" /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Content Pillars</label><input style={inputStyle} value={form.brand_profile.content_pillars || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, content_pillars: e.target.value } }))} placeholder="e.g. Education, Behind the scenes, Testimonials" /></div>
                <div><label style={labelStyle}>Competitors</label><input style={inputStyle} value={form.brand_profile.competitors || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, competitors: e.target.value } }))} placeholder="e.g. Brand A, Brand B" /></div>
                <div><label style={labelStyle}>Do NOT Use</label><input style={inputStyle} value={form.brand_profile.do_not_use || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, do_not_use: e.target.value } }))} placeholder="e.g. red colours, cursive fonts" /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Brand Notes</label><textarea style={{ ...inputStyle, resize: 'none', minHeight: 72 }} rows={3} value={form.brand_profile.brand_notes || ''} onChange={e => setForm(p => ({ ...p, brand_profile: { ...p.brand_profile, brand_notes: e.target.value } }))} placeholder="Any other brand direction, references, or important context..." /></div>
              </div>
            </div>
          )}

          {/* ── Portal Users Tab ── */}
          {formTab === 'portal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Main access code */}
              <div>
                <label style={labelStyle}>Main Portal Access Code</label>
                <input style={inputStyle} value={form.portal_password} onChange={e => setForm(f => ({ ...f, portal_password: e.target.value }))} placeholder="e.g. acme2025" />
                {form.portal_password && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{window.location.origin}/client-portal?code={form.portal_password}</span>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/client-portal?code=${form.portal_password}`); showToast('Copied!', 'blue'); }} style={{ padding: '3px 10px', borderRadius: 5, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', fontSize: 10, cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap' }}>Copy Link</button>
                  </div>
                )}
              </div>

              {/* Additional portal users */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Additional Portal Users ({(form.portal_users || []).length})</label>
                </div>

                {(form.portal_users || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(form.portal_users || []).map((u, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#2A2A2A', borderRadius: 8, border: '1px solid #333' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginTop: 2 }}>
                            {u.role && <span style={{ marginRight: 8 }}>{u.role}</span>}
                            {u.email && <span style={{ marginRight: 8 }}>✉ {u.email}</span>}
                            <span style={{ color: '#A78BFA' }}>🔑 {u.access_code}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/client-portal?code=${u.access_code}`);
                            showToast('Link copied!', 'blue');
                          }}
                          style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(74,158,255,0.1)', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: 10, fontFamily: MONO }}
                        >
                          <Copy size={11} />
                        </button>
                        <button
                          onClick={() => setForm(f => ({ ...f, portal_users: f.portal_users.filter((_, j) => j !== i) }))}
                          style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(232,26,26,0.1)', border: 'none', color: '#E81A1A', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new portal user */}
                <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 10, textTransform: 'uppercase' }}>Add Portal User</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={newPortalUser.name} onChange={e => setNewPortalUser(u => ({ ...u, name: e.target.value }))} placeholder="Alex Johnson" /></div>
                    <div><label style={labelStyle}>Role / Title</label><input style={inputStyle} value={newPortalUser.role} onChange={e => setNewPortalUser(u => ({ ...u, role: e.target.value }))} placeholder="Marketing Manager" /></div>
                    <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={newPortalUser.email} onChange={e => setNewPortalUser(u => ({ ...u, email: e.target.value }))} placeholder="alex@company.com" /></div>
                    <div><label style={labelStyle}>Access Code *</label><input style={inputStyle} value={newPortalUser.access_code} onChange={e => setNewPortalUser(u => ({ ...u, access_code: e.target.value }))} placeholder="e.g. alex2025" /></div>
                  </div>
                  <button
                    onClick={() => {
                      if (!newPortalUser.name.trim() || !newPortalUser.access_code.trim()) { showToast('Name and access code required', 'red'); return; }
                      setForm(f => ({ ...f, portal_users: [...(f.portal_users || []), { ...newPortalUser }] }));
                      setNewPortalUser({ name: '', email: '', access_code: '', role: '' });
                      showToast('Portal user added');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(123,200,83,0.12)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 8, color: '#7BC853', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Add User
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={handleSave} style={{ flex: 1, padding: '11px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {editingId ? 'Save Changes' : 'Add Client'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); setFormTab('info'); }} style={{ padding: '11px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Summary row */}
      {clients.length > 0 && !showForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total Clients', value: clients.length },
            { label: 'With Portal', value: clients.filter(c => c.portal_password).length, color: '#A78BFA' },
            { label: 'Total Revenue', value: `$${projects.filter(p => clients.some(c => c.name === p.client)).reduce((s, p) => s + (p.revenue || 0), 0).toLocaleString()}`, color: '#7BC853' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color || '#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Client Brain Modal */}
      {brainClient && (
        <ClientBrainModal
          client={brainClient}
          onClose={() => setBrainClient(null)}
          onSaved={(updated) => {
            onContactsChange(contacts.map(c => c.id === updated.id ? updated : c));
            setBrainClient(updated);
          }}
        />
      )}

      {/* Client cards */}
      {!filtered.length ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
          <User size={48} color="#333" style={{ margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {clients.length ? 'No clients match your search.' : 'No clients yet.'}
          </div>
          {!clients.length && (
            <div style={{ fontSize: 13, color: '#444' }}>Add your first client to get started.</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(c => (
            <ClientCard key={c.id} client={c} projects={projects} onEdit={handleEdit} onDelete={handleDelete} onOpenBrain={setBrainClient} />
          ))}
        </div>
      )}
    </div>
  );
}