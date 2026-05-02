import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import EditorAssignmentPanel from '@/components/studio/EditorAssignmentPanel';

const MONO = '"DM Mono", monospace';
const SS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const STATUS_COLORS = {
  pending_review: { bg: 'rgba(245,158,11,0.12)', clr: '#F59E0B', label: 'Pending Review' },
  approved: { bg: 'rgba(123,200,83,0.12)', clr: '#7BC853', label: 'Approved' },
  revision_requested: { bg: 'rgba(232,26,26,0.1)', clr: '#E81A1A', label: 'Revision Requested' },
};

// ── Brief Section ────────────────────────────────────────────────────────────

function BriefSection({ project }) {
  const [brief, setBrief] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ notes: '', script: '', style_notes: '', deadline: '' });
  const [inspoInput, setInspoInput] = useState({ label: '', url: '' });
  const [rawInput, setRawInput] = useState({ label: '', url: '' });
  const saveTimer = useRef(null);

  useEffect(() => {
    base44.entities.EditBrief.filter({ project_id: project.id }).then(results => {
      if (results.length > 0) {
        const b = results[0];
        setBrief(b);
        setForm({ notes: b.notes || '', script: b.script || '', style_notes: b.style_notes || '', deadline: b.deadline || '' });
      }
    });
  }, [project.id]);

  const save = async (updates) => {
    setSaving(true);
    const data = { ...form, ...updates, project_id: project.id, project_name: project.name };
    if (brief) {
      const updated = await base44.entities.EditBrief.update(brief.id, { ...brief, ...data });
      setBrief(updated);
    } else {
      const created = await base44.entities.EditBrief.create(data);
      setBrief(created);
    }
    setSaving(false);
  };

  const handleFieldChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save({ [key]: val }), 700);
  };

  const addLink = async (type) => {
    const input = type === 'inspo' ? inspoInput : rawInput;
    if (!input.url.trim()) return;
    const current = brief?.[type === 'inspo' ? 'inspo_links' : 'raw_links'] || [];
    const updated = [...current, { label: input.label || input.url, url: input.url.trim() }];
    const key = type === 'inspo' ? 'inspo_links' : 'raw_links';
    await save({ [key]: updated });
    if (type === 'inspo') setInspoInput({ label: '', url: '' });
    else setRawInput({ label: '', url: '' });
    showToast('Link added', 'blue');
  };

  const removeLink = async (type, idx) => {
    const key = type === 'inspo' ? 'inspo_links' : 'raw_links';
    const updated = (brief?.[key] || []).filter((_, i) => i !== idx);
    await save({ [key]: updated });
  };

  const handlePublishToggle = async () => {
    const newPublished = !brief?.published;
    await save({ published: newPublished });
    if (newPublished) {
      // Notify editor that brief is ready
      base44.functions.invoke('editReviewNotify', {
        type: 'brief_published',
        project_name: project.name,
        project_id: project.id,
      });
      showToast('Brief published — editor notified!', 'green');
    } else {
      showToast('Brief unpublished', 'amber');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edit Brief</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saving && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>Saving...</div>}
          <button onClick={handlePublishToggle} style={{
            padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO,
            background: brief?.published ? 'rgba(123,200,83,0.15)' : 'rgba(245,158,11,0.12)',
            color: brief?.published ? '#7BC853' : '#F59E0B',
          }}>
            {brief?.published ? '✓ Published' : '↑ Publish to Editor'}
          </button>
        </div>
      </div>
      {!brief?.published && (
        <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontFamily: MONO, fontSize: 11, color: '#F59E0B' }}>
          Draft — editor cannot see this yet. Click "Publish to Editor" when ready.
        </div>
      )}

      {/* Notes */}
      <div>
        <label style={LL}>Director Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => handleFieldChange('notes', e.target.value)} placeholder="Key moments, pacing notes, what to include/exclude..." style={{ ...SS, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {/* Script */}
      <div>
        <label style={LL}>Script / Story Outline</label>
        <textarea rows={4} value={form.script} onChange={e => handleFieldChange('script', e.target.value)} placeholder="Scene breakdown, voiceover script, story arc..." style={{ ...SS, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {/* Style Notes */}
      <div>
        <label style={LL}>Style Notes</label>
        <textarea rows={2} value={form.style_notes} onChange={e => handleFieldChange('style_notes', e.target.value)} placeholder="Color grade preference, music vibe, pacing style..." style={{ ...SS, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {/* Deadline */}
      <div>
        <label style={LL}>Edit Deadline</label>
        <input type="date" value={form.deadline} onChange={e => handleFieldChange('deadline', e.target.value)} style={{ ...SS, maxWidth: 200 }} />
      </div>

      {/* Inspo Links */}
      <div>
        <label style={LL}>Inspiration Links</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {(brief?.inspo_links || []).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1A1A', borderRadius: 8, padding: '8px 12px' }}>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontFamily: MONO, fontSize: 11, color: '#4A9EFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔗 {l.label}</a>
              <button onClick={() => removeLink('inspo', i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={inspoInput.label} onChange={e => setInspoInput(f => ({ ...f, label: e.target.value }))} placeholder="Label (optional)" style={{ ...SS, flex: 1 }} />
          <input value={inspoInput.url} onChange={e => setInspoInput(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ ...SS, flex: 2 }} />
          <button onClick={() => addLink('inspo')} style={{ padding: '0 14px', background: '#4A9EFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
        </div>
      </div>

      {/* Raw Footage Links */}
      <div>
        <label style={LL}>Raw Footage Links</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {(brief?.raw_links || []).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1A1A', borderRadius: 8, padding: '8px 12px' }}>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontFamily: MONO, fontSize: 11, color: '#7BC853', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {l.label}</a>
              <button onClick={() => removeLink('raw', i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={rawInput.label} onChange={e => setRawInput(f => ({ ...f, label: e.target.value }))} placeholder="Label (optional)" style={{ ...SS, flex: 1 }} />
          <input value={rawInput.url} onChange={e => setRawInput(f => ({ ...f, url: e.target.value }))} placeholder="https://drive.google.com/..." style={{ ...SS, flex: 2 }} />
          <button onClick={() => addLink('raw')} style={{ padding: '0 14px', background: '#7BC853', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
        </div>
      </div>
    </div>
  );
}

// ── Comment Thread ────────────────────────────────────────────────────────────

function CommentThread({ upload, onUpdate }) {
  const [input, setInput] = useState('');
  const [timecode, setTimecode] = useState('');
  const [sending, setSending] = useState(false);

  const addComment = async () => {
    if (!input.trim()) return;
    setSending(true);
    const comment = {
      from: 'Studio 65',
      from_role: 'studio',
      body: input.trim(),
      timecode: timecode.trim() || null,
      ts: new Date().toISOString(),
      read_by_editor: false,
      read_by_studio: true,
    };
    const updated = { ...upload, comments: [...(upload.comments || []), comment], read_by_studio: true };
    await base44.entities.EditUpload.update(upload.id, updated);
    // Notify editor via backend function
    base44.functions.invoke('editReviewNotify', {
      type: 'new_comment',
      project_name: upload.project_name,
      editor_name: upload.editor_name,
      version: upload.version,
      comment_body: input.trim(),
      timecode: timecode.trim() || null,
    });
    onUpdate(updated);
    setInput('');
    setTimecode('');
    setSending(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
        {!(upload.comments || []).length && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', padding: '6px 0' }}>No comments yet. Leave feedback below.</div>
        )}
        {(upload.comments || []).map((c, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '9px 12px',
            background: c.from_role === 'studio' ? 'rgba(232,26,26,0.06)' : 'rgba(74,158,255,0.06)',
            borderLeft: `2px solid ${c.from_role === 'studio' ? '#E81A1A' : '#4A9EFF'}`,
            borderRadius: '0 8px 8px 0',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.from_role === 'studio' ? '#E81A1A' : '#4A9EFF' }}>{c.from}</span>
                {c.timecode && (
                  <span style={{ fontFamily: MONO, fontSize: 10, padding: '1px 6px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: 4 }}>⏱ {c.timecode}</span>
                )}
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginLeft: 'auto' }}>
                  {new Date(c.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{c.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input
          value={timecode}
          onChange={e => setTimecode(e.target.value)}
          placeholder="0:32"
          style={{ ...SS, width: 70, flexShrink: 0, fontFamily: MONO, textAlign: 'center' }}
        />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
          placeholder="Leave feedback..."
          style={{ ...SS, flex: 1 }}
        />
        <button onClick={addComment} disabled={sending || !input.trim()} style={{ padding: '9px 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!input.trim() || sending) ? 0.5 : 1 }}>
          {sending ? '...' : 'Post'}
        </button>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginTop: 4 }}>Optional: enter timecode (e.g. 0:32) before posting</div>
    </div>
  );
}

// ── Upload Card ───────────────────────────────────────────────────────────────

function UploadCard({ upload, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const st = STATUS_COLORS[upload.status] || STATUS_COLORS.pending_review;

  const setStatus = async (status) => {
    setUpdatingStatus(true);
    const updated = { ...upload, status };
    await base44.entities.EditUpload.update(upload.id, updated);
    // Notify editor
    base44.functions.invoke('editReviewNotify', {
      type: 'status_change',
      project_name: upload.project_name,
      editor_name: upload.editor_name,
      version: upload.version,
      status,
    });
    onUpdate(updated);
    setUpdatingStatus(false);
    showToast(status === 'approved' ? 'Cut approved!' : 'Revision requested', status === 'approved' ? 'green' : 'amber');
  };

  const unreadComments = (upload.comments || []).filter(c => c.from_role === 'editor' && !c.read_by_studio).length;

  return (
    <div style={{ background: '#1A1A1A', border: `1px solid ${expanded ? '#2A2A2A' : '#1E1E1E'}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Version badge */}
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#E81A1A', background: 'rgba(232,26,26,0.1)', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>
          {upload.version || 'v?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{upload.title || 'Untitled Cut'}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{upload.editor_name} · {new Date(upload.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {unreadComments > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,158,255,0.15)', color: '#4A9EFF' }}>{unreadComments} new</span>
          )}
          <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.clr }}>{st.label}</span>
          <span style={{ color: '#444', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #1E1E1E', padding: '14px 16px' }}>
          {/* Link */}
          {upload.link && (
            <div style={{ marginBottom: 12 }}>
              <a href={upload.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 8, fontFamily: MONO, fontSize: 12, color: '#4A9EFF', textDecoration: 'none' }}>
                ▶ View Cut
              </a>
            </div>
          )}

          {/* Editor notes */}
          {upload.notes && (
            <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(74,158,255,0.04)', borderLeft: '2px solid rgba(74,158,255,0.2)', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginBottom: 3, textTransform: 'uppercase' }}>Editor Notes</div>
              <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{upload.notes}</div>
            </div>
          )}

          {/* Status actions */}
          {upload.status !== 'approved' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setStatus('approved')} disabled={updatingStatus} style={{ flex: 1, padding: '10px 0', background: 'rgba(123,200,83,0.12)', border: '1px solid rgba(123,200,83,0.3)', borderRadius: 8, color: '#7BC853', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ✓ Approve
              </button>
              <button onClick={() => setStatus('revision_requested')} disabled={updatingStatus} style={{ flex: 1, padding: '10px 0', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 8, color: '#E81A1A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ↺ Request Revision
              </button>
            </div>
          )}
          {upload.status === 'approved' && (
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setStatus('revision_requested')} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#666', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Reopen for Revision
              </button>
            </div>
          )}

          {/* Comment thread */}
          <CommentThread upload={upload} onUpdate={onUpdate} />

          {/* Delete */}
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#444', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>Delete upload</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EditReviewTab ────────────────────────────────────────────────────────

export default function EditReviewTab({ project, contacts }) {
  const [view, setView] = useState('assignments'); // 'assignments' | 'brief' | 'review'
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.EditUpload.filter({ project_id: project.id }).then(results => {
      setUploads(results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setLoading(false);
    });
  }, [project.id]);

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.EditUpload.subscribe((event) => {
      if (event.data?.project_id !== project.id) return;
      if (event.type === 'create') setUploads(prev => [event.data, ...prev]);
      if (event.type === 'update') setUploads(prev => prev.map(u => u.id === event.id ? event.data : u));
      if (event.type === 'delete') setUploads(prev => prev.filter(u => u.id !== event.id));
    });
    return unsub;
  }, [project.id]);

  const handleUpdate = (updated) => {
    setUploads(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const handleDelete = async (id) => {
    await base44.entities.EditUpload.delete(id);
    setUploads(prev => prev.filter(u => u.id !== id));
    showToast('Upload deleted', 'red');
  };

  const pendingCount = uploads.filter(u => u.status === 'pending_review').length;
  const newFromEditor = uploads.reduce((sum, u) => sum + (u.comments || []).filter(c => c.from_role === 'editor' && !c.read_by_studio).length, 0);

  const markAllRead = async () => {
    const unread = uploads.filter(u => (u.comments || []).some(c => c.from_role === 'editor' && !c.read_by_studio));
    await Promise.all(unread.map(u => {
      const updated = { ...u, read_by_studio: true, comments: (u.comments || []).map(c => ({ ...c, read_by_studio: c.from_role === 'editor' ? true : c.read_by_studio })) };
      return base44.entities.EditUpload.update(u.id, updated).then(() => handleUpdate(updated));
    }));
    showToast('All marked as read', 'blue');
  };

  return (
    <div>
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 0, background: '#111', borderRadius: 10, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {[
          { key: 'assignments', label: '📋 Assignments' },
          { key: 'brief', label: '📝 Brief' },
          { key: 'review', label: `🎬 Review${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ].map(v => (
          <button key={v.key} onClick={() => setView(v.key)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: view === v.key ? '#E81A1A' : 'transparent',
            color: view === v.key ? '#fff' : '#666',
            fontFamily: MONO, position: 'relative',
          }}>
            {v.label}
            {v.key === 'review' && newFromEditor > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#4A9EFF' }} />
            )}
          </button>
        ))}
      </div>

      {view === 'assignments' && <EditorAssignmentPanel project={project} contacts={contacts} />}
      {view === 'brief' && <BriefSection project={project} />}

      {view === 'review' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#555', fontFamily: MONO, fontSize: 12 }}>Loading...</div>
          ) : uploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
              <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>🎬</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#555' }}>No cuts submitted yet.</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>The editor will upload from their portal.</div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {uploads.length} cut{uploads.length !== 1 ? 's' : ''} submitted
                </div>
                {newFromEditor > 0 && (
                  <button onClick={markAllRead} style={{ padding: '5px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 8, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
                    ✓ Mark All Read ({newFromEditor})
                  </button>
                )}
              </div>
              {/* Version history summary */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {uploads.map(u => {
                  const st = STATUS_COLORS[u.status] || STATUS_COLORS.pending_review;
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#111', border: `1px solid ${st.clr}30`, borderRadius: 20 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', fontWeight: 700 }}>{u.version || 'v?'}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: st.clr }}>·</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: st.clr }}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
              {uploads.map(u => (
                <UploadCard key={u.id} upload={u} onUpdate={handleUpdate} onDelete={() => handleDelete(u.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}