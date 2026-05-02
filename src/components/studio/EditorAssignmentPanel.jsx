import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import { Send, MessageSquare, CheckCircle2, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import AssetAttachPicker from './AssetAttachPicker';

const MONO = '"DM Mono", monospace';
const SS = { background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LL = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const STATUS_STYLE = {
  'Assigned':             { bg: 'rgba(74,158,255,0.12)',   clr: '#4A9EFF' },
  'In Progress':          { bg: 'rgba(245,158,11,0.12)',   clr: '#F59E0B' },
  'Submitted for Review': { bg: 'rgba(167,139,250,0.12)',  clr: '#A78BFA' },
  'Revision Requested':   { bg: 'rgba(232,26,26,0.12)',    clr: '#E81A1A' },
  'Approved':             { bg: 'rgba(123,200,83,0.12)',   clr: '#7BC853' },
  'Final Delivered':      { bg: 'rgba(123,200,83,0.2)',    clr: '#7BC853' },
  'Cancelled':            { bg: 'rgba(100,100,100,0.12)', clr: '#666' },
};

const CONTENT_TYPES = ['Reel', 'TikTok', 'YouTube Short', 'Real Estate Listing', 'Event Recap', 'Podcast Clip', 'Corporate Video', 'Brand Campaign', 'Paid Ad', 'Restaurant Content', 'Product Video', 'Social Package', 'Other'];

const DEFAULT_CHECKLISTS = {
  'Reel': ['Download raw clips', 'Review script', 'Review inspo', 'Select music', 'Add captions', 'Add branding', 'Colour correct', 'Clean audio', 'Export correct format', 'Submit Frame.io link'],
  'TikTok': ['Download raw clips', 'Review script/hook', 'Review inspo', 'Select music', 'Add captions', 'Colour correct', 'Clean audio', 'Export 9:16', 'Submit Frame.io link'],
  'YouTube Short': ['Download raw clips', 'Review script', 'Select music', 'Add captions', 'Colour correct', 'Export 9:16', 'Submit Frame.io link'],
  'Corporate Video': ['Download raw clips', 'Review brief', 'Review inspo', 'Select music', 'Add lower thirds', 'Add logo/branding', 'Colour correct', 'Clean audio', 'Export correct format', 'Submit Frame.io link'],
  'default': ['Download raw clips', 'Review script', 'Review inspo', 'Colour correct', 'Clean audio', 'Export correct format', 'Submit Frame.io link'],
};

// ── Create Assignment Form ────────────────────────────────────────────────────
function CreateAssignmentForm({ project, contacts, onCreated, onCancel }) {
  const editorContacts = (contacts || []).filter(c => (c.types || []).includes('Editor') || c.role?.toLowerCase().includes('editor'));

  const [form, setForm] = useState({
    editor_name: '',
    editor_email: '',
    deliverable_name: '',
    content_type: 'Reel',
    platform: '',
    aspect_ratio: '9:16',
    duration_target: '',
    deadline: '',
    priority: 'Normal',
    script: '',
    hook: '',
    cta: '',
    director_notes: '',
    music_direction: '',
    editing_style: '',
    colour_direction: '',
    caption_style: '',
    export_resolution: '1080x1920',
    export_format: 'MP4',
    frame_rate: '30fps',
    codec: 'H.264',
    naming_convention: '',
    audio_notes: '',
    show_client_to_editor: true,
    rate_type: 'Flat',
    rate_amount: '',
    payment_due_date: '',
    payment_notes: '',
  });

  const [rawLinks, setRawLinks] = useState([]);
  const [inspoLinks, setInspoLinks] = useState([]);
  const [attachedAssets, setAttachedAssets] = useState([]);
  const [rawInput, setRawInput] = useState({ label: '', url: '' });
  const [inspoInput, setInspoInput] = useState({ label: '', url: '' });
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState('basic');

  const SECTIONS = [
    { key: 'basic', label: 'Basics' },
    { key: 'brief', label: 'Brief' },
    { key: 'links', label: 'Links' },
    { key: 'specs', label: 'Specs' },
    { key: 'pay', label: 'Pay' },
  ];

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addLink = (type) => {
    const input = type === 'raw' ? rawInput : inspoInput;
    if (!input.url.trim()) return;
    const link = { label: input.label.trim() || input.url.trim(), url: input.url.trim() };
    if (type === 'raw') { setRawLinks(prev => [...prev, link]); setRawInput({ label: '', url: '' }); }
    else { setInspoLinks(prev => [...prev, link]); setInspoInput({ label: '', url: '' }); }
  };

  const handleSave = async (publish = false) => {
    if (!form.editor_name.trim() || !form.deliverable_name.trim()) {
      showToast('Editor name and deliverable name are required', 'red'); return;
    }
    setSaving(true);
    const checklist = (DEFAULT_CHECKLISTS[form.content_type] || DEFAULT_CHECKLISTS['default']).map(label => ({ label, done: false }));
    const data = {
      ...form,
      rate_amount: parseFloat(form.rate_amount) || 0,
      project_id: project.id,
      project_name: project.name,
      client_name: project.client,
      raw_links: rawLinks,
      inspo_links: inspoLinks,
      attached_assets: attachedAssets,
      checklist,
      submissions: [],
      messages: [],
      activity: [{ msg: 'Assignment created by Studio 65', ts: new Date().toISOString() }],
      published: publish,
    };
    const created = await base44.entities.EditAssignment.create(data);
    if (publish) showToast(`Assignment published to ${form.editor_name}!`, 'green');
    else showToast('Assignment saved as draft', 'blue');
    onCreated(created);
    setSaving(false);
  };

  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #111', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>New Edit Assignment</div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: section === s.key ? '#E81A1A' : '#1A1A1A', color: section === s.key ? '#fff' : '#666', fontFamily: MONO, whiteSpace: 'nowrap' }}>{s.label}</button>
        ))}
      </div>

      {section === 'basic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LL}>Editor *</label>
            {editorContacts.length > 0 ? (
              <select style={SS} value={form.editor_name} onChange={e => {
                const c = editorContacts.find(x => x.name === e.target.value);
                f('editor_name', e.target.value);
                if (c?.email) f('editor_email', c.email);
              }}>
                <option value="">— Select editor —</option>
                {editorContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__custom__">+ Type name manually</option>
              </select>
            ) : (
              <input style={SS} value={form.editor_name} onChange={e => f('editor_name', e.target.value)} placeholder="Editor name" />
            )}
            {form.editor_name === '__custom__' && <input style={{ ...SS, marginTop: 8 }} placeholder="Type editor name" onChange={e => f('editor_name', e.target.value)} />}
          </div>
          <div>
            <label style={LL}>Editor Email</label>
            <input style={SS} value={form.editor_email} onChange={e => f('editor_email', e.target.value)} placeholder="editor@email.com" type="email" />
          </div>
          <div>
            <label style={LL}>Deliverable Name *</label>
            <input style={SS} value={form.deliverable_name} onChange={e => f('deliverable_name', e.target.value)} placeholder="e.g. 60s Reel — Product Launch" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LL}>Content Type</label>
              <select style={SS} value={form.content_type} onChange={e => f('content_type', e.target.value)}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Priority</label>
              <select style={SS} value={form.priority} onChange={e => f('priority', e.target.value)}>
                {['Low', 'Normal', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LL}>Deadline</label>
              <input style={SS} type="date" value={form.deadline} onChange={e => f('deadline', e.target.value)} />
            </div>
            <div>
              <label style={LL}>Platform</label>
              <input style={SS} value={form.platform} onChange={e => f('platform', e.target.value)} placeholder="Instagram, TikTok..." />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LL}>Aspect Ratio</label>
              <select style={SS} value={form.aspect_ratio} onChange={e => f('aspect_ratio', e.target.value)}>
                {['9:16', '16:9', '1:1', '4:5'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Duration Target</label>
              <input style={SS} value={form.duration_target} onChange={e => f('duration_target', e.target.value)} placeholder="e.g. 60s, 30–45s" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#111', borderRadius: 8 }}>
            <input type="checkbox" checked={form.show_client_to_editor} onChange={e => f('show_client_to_editor', e.target.checked)} style={{ accentColor: '#E81A1A' }} />
            <span style={{ fontSize: 12, color: '#888' }}>Show client name to editor</span>
          </div>
        </div>
      )}

      {section === 'brief' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LL}>Director Notes</label>
            <textarea rows={3} style={{ ...SS, resize: 'vertical' }} value={form.director_notes} onChange={e => f('director_notes', e.target.value)} placeholder="What to include, what to avoid, pacing, key moments..." />
          </div>
          <div>
            <label style={LL}>Hook</label>
            <input style={SS} value={form.hook} onChange={e => f('hook', e.target.value)} placeholder="First 3 seconds hook idea..." />
          </div>
          <div>
            <label style={LL}>Script</label>
            <textarea rows={5} style={{ ...SS, resize: 'vertical' }} value={form.script} onChange={e => f('script', e.target.value)} placeholder="Full script or scene breakdown..." />
          </div>
          <div>
            <label style={LL}>CTA</label>
            <input style={SS} value={form.cta} onChange={e => f('cta', e.target.value)} placeholder="e.g. Follow for more, DM us, link in bio..." />
          </div>
          <div>
            <label style={LL}>Music Direction</label>
            <input style={SS} value={form.music_direction} onChange={e => f('music_direction', e.target.value)} placeholder="e.g. Upbeat pop, cinematic piano, lo-fi..." />
          </div>
          <div>
            <label style={LL}>Editing Style</label>
            <input style={SS} value={form.editing_style} onChange={e => f('editing_style', e.target.value)} placeholder="e.g. Fast-paced cuts, smooth transitions, documentary..." />
          </div>
          <div>
            <label style={LL}>Colour Direction</label>
            <input style={SS} value={form.colour_direction} onChange={e => f('colour_direction', e.target.value)} placeholder="e.g. Warm tones, desaturated, brand palette..." />
          </div>
          <div>
            <label style={LL}>Caption Style</label>
            <input style={SS} value={form.caption_style} onChange={e => f('caption_style', e.target.value)} placeholder="e.g. Bold white, CapCut default, auto-captions..." />
          </div>
        </div>
      )}

      {section === 'links' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LL}>Raw Footage Links</label>
            {rawLinks.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#7BC853', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {l.label}</span>
                <button onClick={() => setRawLinks(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={13} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={rawInput.label} onChange={e => setRawInput(f => ({ ...f, label: e.target.value }))} placeholder="Label" style={{ ...SS, flex: 1 }} />
              <input value={rawInput.url} onChange={e => setRawInput(f => ({ ...f, url: e.target.value }))} placeholder="https://drive.google.com/..." style={{ ...SS, flex: 2 }} />
              <button onClick={() => addLink('raw')} style={{ padding: '0 12px', background: '#7BC853', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
          </div>
          <div>
            <label style={LL}>Brand Assets (from Asset Library)</label>
            <AssetAttachPicker
              attachedAssets={attachedAssets}
              clientName={project?.client || ''}
              onChange={setAttachedAssets}
            />
          </div>
          <div>
            <label style={LL}>Inspiration / Reference Links</label>
            {inspoLinks.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#F59E0B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎬 {l.label}</span>
                <button onClick={() => setInspoLinks(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={13} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={inspoInput.label} onChange={e => setInspoInput(f => ({ ...f, label: e.target.value }))} placeholder="Label" style={{ ...SS, flex: 1 }} />
              <input value={inspoInput.url} onChange={e => setInspoInput(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ ...SS, flex: 2 }} />
              <button onClick={() => addLink('inspo')} style={{ padding: '0 12px', background: '#F59E0B', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
          </div>
        </div>
      )}

      {section === 'specs' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['Export Resolution', 'export_resolution', '1080x1920'], ['Format', 'export_format', 'MP4'], ['Frame Rate', 'frame_rate', '30fps'], ['Codec', 'codec', 'H.264'], ['Naming Convention', 'naming_convention', 'ClientName_Deliverable_v1'], ['Audio Notes', 'audio_notes', 'Loudness: -14 LUFS']].map(([l, k, ph]) => (
            <div key={k}>
              <label style={LL}>{l}</label>
              <input style={SS} value={form[k]} onChange={e => f(k, e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
      )}

      {section === 'pay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LL}>Rate Type</label>
              <select style={SS} value={form.rate_type} onChange={e => f('rate_type', e.target.value)}>
                {['Flat', 'Hourly', 'Daily', 'Per Video', 'Per Project'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Amount ($)</label>
              <input style={SS} type="number" value={form.rate_amount} onChange={e => f('rate_amount', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label style={LL}>Payment Due Date</label>
            <input style={SS} type="date" value={form.payment_due_date} onChange={e => f('payment_due_date', e.target.value)} />
          </div>
          <div>
            <label style={LL}>Payment Notes</label>
            <input style={SS} value={form.payment_notes} onChange={e => f('payment_notes', e.target.value)} placeholder="e.g. Paid via e-transfer after delivery" />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={() => handleSave(false)} disabled={saving} style={{ flex: 1, padding: '11px 0', background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, color: '#888', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
          Save Draft
        </button>
        <button onClick={() => handleSave(true)} disabled={saving} style={{ flex: 2, padding: '11px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Send size={13} /> Publish to Editor
        </button>
      </div>
    </div>
  );
}

// ── Assignment Row (internal view) ────────────────────────────────────────────
function AssignmentRow({ assignment, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [revNote, setRevNote] = useState('');
  const [revDue, setRevDue] = useState('');
  const st = STATUS_STYLE[assignment.status] || { bg: 'rgba(100,100,100,0.1)', clr: '#666' };
  const unreadMsgs = (assignment.messages || []).filter(m => m.from_role === 'editor' && !m.read_by_studio).length;
  const latestSubmission = (assignment.submissions || []).slice(-1)[0];

  const addLog = (a, msg) => ({ ...a, activity: [...(a.activity || []), { msg, ts: new Date().toISOString() }] });

  const handleStatusChange = async (status, extra = {}) => {
    let updated = addLog({ ...assignment, status, ...extra }, `Status changed to ${status}`);
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
    showToast(status === 'Approved' ? 'Approved ✓' : status === 'Revision Requested' ? 'Revision requested' : status, status === 'Approved' ? 'green' : 'amber');
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim()) return;
    const msg = { from: 'Studio 65', from_role: 'studio', body: msgInput.trim(), ts: new Date().toISOString(), read_by_editor: false, read_by_studio: true };
    const updated = addLog({ ...assignment, messages: [...(assignment.messages || []), msg] }, 'Studio 65 sent a message');
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
    setMsgInput('');
    showToast('Message sent', 'blue');
  };

  const handlePaymentStatus = async (status) => {
    const updated = addLog({ ...assignment, payment_status: status }, `Payment marked as ${status}`);
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
    showToast(`Payment: ${status}`, 'green');
  };

  const handleTogglePublish = async () => {
    const updated = { ...assignment, published: !assignment.published };
    await base44.entities.EditAssignment.update(assignment.id, updated);
    onUpdate(updated);
    showToast(updated.published ? 'Published to editor ✓' : 'Hidden from editor', updated.published ? 'green' : 'amber');
  };

  const generateWhatsApp = () => {
    const msg = `Hey ${assignment.editor_name}! New edit assigned 🎬\n\nProject: ${assignment.project_name}\nDeliverable: ${assignment.deliverable_name}\nDeadline: ${assignment.deadline || 'TBD'}\n${assignment.script ? `Script: ${assignment.script.substring(0, 200)}...\n` : ''}${(assignment.raw_links || []).length > 0 ? `Raw Clips: ${assignment.raw_links[0].url}\n` : ''}${(assignment.inspo_links || []).length > 0 ? `Inspo: ${assignment.inspo_links[0].url}\n` : ''}\nFull brief in your editor portal → studio65production.ca/editor-portal`;
    const phone = '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const generateEmail = () => {
    const subject = encodeURIComponent(`Edit Brief: ${assignment.project_name} — ${assignment.deliverable_name}`);
    const body = encodeURIComponent(`Hi ${assignment.editor_name},\n\nYou have a new edit assignment from Studio 65.\n\nProject: ${assignment.project_name}\nDeliverable: ${assignment.deliverable_name}\nContent Type: ${assignment.content_type || ''}\nDeadline: ${assignment.deadline || 'TBD'}\nPriority: ${assignment.priority || 'Normal'}\n\nRaw Footage:\n${(assignment.raw_links || []).map(l => `${l.label}: ${l.url}`).join('\n') || 'None added yet'}\n\nScript/Notes:\n${assignment.script || assignment.director_notes || 'See portal for full brief'}\n\nMusic Direction: ${assignment.music_direction || 'TBD'}\nEditing Style: ${assignment.editing_style || 'TBD'}\nExport Specs: ${assignment.export_resolution || ''} ${assignment.export_format || ''} ${assignment.frame_rate || ''}\n\nView your full brief and submit your Frame.io link in the Editor Portal:\nhttps://studio65production.ca/editor-portal\n\nStudio 65`);
    window.open(`mailto:${assignment.editor_email || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div style={{ background: '#0D0D0D', border: `1px solid ${expanded ? '#1A1A1A' : '#111'}`, borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      {/* Row header */}
      <div style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }} onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.clr, fontWeight: 700 }}>{assignment.status}</span>
            {!assignment.published && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(100,100,100,0.1)', color: '#666' }}>DRAFT</span>}
            {unreadMsgs > 0 && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>{unreadMsgs} msg</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{assignment.deliverable_name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>{assignment.editor_name} · {assignment.deadline || 'No deadline'}</div>
        </div>
        {expanded ? <ChevronUp size={14} color="#444" /> : <ChevronDown size={14} color="#444" />}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #111', padding: '14px' }}>
          {/* Latest submission */}
          {latestSubmission && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA', marginBottom: 6 }}>LATEST SUBMISSION · {latestSubmission.version}</div>
              <a href={latestSubmission.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(74,158,255,0.1)', borderRadius: 8, fontFamily: MONO, fontSize: 11, color: '#4A9EFF', textDecoration: 'none' }}>
                ▶ Watch Edit <ExternalLink size={10} />
              </a>
              {latestSubmission.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{latestSubmission.notes}</div>}
            </div>
          )}

          {/* Review actions */}
          {assignment.status === 'Submitted for Review' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Review Actions</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => handleStatusChange('Approved')} style={{ flex: 1, padding: '9px 0', background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 8, color: '#7BC853', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>✓ Approve</button>
              </div>
              <div>
                <label style={LL}>Revision Notes (required for revision)</label>
                <textarea rows={2} style={{ ...SS, marginBottom: 6, resize: 'none' }} value={revNote} onChange={e => setRevNote(e.target.value)} placeholder="Specific feedback for the editor..." />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" style={{ ...SS, flex: 1 }} value={revDue} onChange={e => setRevDue(e.target.value)} placeholder="Revision due date" />
                  <button onClick={() => { if (!revNote.trim()) { showToast('Add revision notes', 'red'); return; } handleStatusChange('Revision Requested', { revision_notes: revNote, revision_deadline: revDue }); setRevNote(''); setRevDue(''); }} style={{ padding: '0 14px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 8, color: '#E81A1A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap' }}>↺ Request Revision</button>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={handleTogglePublish} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${assignment.published ? 'rgba(123,200,83,0.3)' : 'rgba(245,158,11,0.3)'}`, background: 'transparent', color: assignment.published ? '#7BC853' : '#F59E0B', fontFamily: MONO }}>
              {assignment.published ? '✓ Published' : '↑ Publish'}
            </button>
            <button onClick={generateEmail} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #2A2A2A', background: 'transparent', color: '#888', fontFamily: MONO }}>✉ Email Brief</button>
            <button onClick={generateWhatsApp} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(37,211,102,0.3)', background: 'transparent', color: '#25D366', fontFamily: MONO }}>💬 WA Brief</button>
            <select style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.25)', background: 'transparent', color: '#F59E0B', fontFamily: MONO }} value={assignment.payment_status || 'Unpaid'} onChange={e => handlePaymentStatus(e.target.value)}>
              <option value="Unpaid">Unpaid</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid ✓</option>
            </select>
          </div>

          {/* Messaging */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Message Editor</div>
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(assignment.messages || []).slice(-5).map((m, i) => (
                <div key={i} style={{ padding: '7px 10px', background: m.from_role === 'studio' ? 'rgba(74,158,255,0.06)' : '#111', borderRadius: 8, fontSize: 12, color: '#aaa', borderLeft: `2px solid ${m.from_role === 'studio' ? '#4A9EFF' : '#333'}` }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: m.from_role === 'studio' ? '#4A9EFF' : '#888', marginBottom: 2 }}>{m.from}</div>
                  {m.body}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Message editor..." style={{ ...SS, flex: 1 }} />
              <button onClick={handleSendMessage} disabled={!msgInput.trim()} style={{ padding: '9px 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function EditorAssignmentPanel({ project, contacts }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    base44.entities.EditAssignment.filter({ project_id: project.id }, '-created_date', 50).then(data => {
      setAssignments(data);
      setLoading(false);
    });
  }, [project.id]);

  const handleCreated = (created) => {
    setAssignments(prev => [created, ...prev]);
    setShowCreate(false);
  };

  const handleUpdate = (updated) => {
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const pending = assignments.filter(a => a.status === 'Submitted for Review').length;
  const unread = assignments.reduce((n, a) => n + (a.messages || []).filter(m => m.from_role === 'editor' && !m.read_by_studio).length, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase' }}>Edit Assignments</div>
          {(pending > 0 || unread > 0) && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', marginTop: 2 }}>
              {pending > 0 ? `${pending} awaiting review` : ''}{pending > 0 && unread > 0 ? ' · ' : ''}{unread > 0 ? `${unread} unread msg${unread > 1 ? 's' : ''}` : ''}
            </div>
          )}
        </div>
        <button onClick={() => setShowCreate(v => !v)} style={{ padding: '6px 14px', background: showCreate ? '#333' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {showCreate ? '× Cancel' : '+ Assign Edit'}
        </button>
      </div>

      {showCreate && (
        <CreateAssignmentForm project={project} contacts={contacts} onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {loading ? (
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', padding: 20 }}>Loading...</div>
      ) : assignments.length === 0 && !showCreate ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#444', fontFamily: MONO, fontSize: 11 }}>No edit assignments yet for this project.</div>
      ) : (
        assignments.map(a => <AssignmentRow key={a.id} assignment={a} onUpdate={handleUpdate} />)
      )}
    </div>
  );
}