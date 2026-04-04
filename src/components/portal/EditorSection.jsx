import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';
const SS = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };

const STATUS_COLORS = {
  pending_review: { bg: 'rgba(245,158,11,0.12)', clr: '#F59E0B', label: 'Pending Review' },
  approved: { bg: 'rgba(123,200,83,0.12)', clr: '#7BC853', label: 'Approved ✓' },
  revision_requested: { bg: 'rgba(232,26,26,0.1)', clr: '#E81A1A', label: 'Revision Requested' },
};

// ── Brief Viewer ──────────────────────────────────────────────────────────────

function BriefViewer({ projectId }) {
  const [brief, setBrief] = useState(null);

  useEffect(() => {
    base44.entities.EditBrief.filter({ project_id: projectId }).then(r => {
      const published = r.find(b => b.published);
      setBrief(published || null);
    });
  }, [projectId]);

  if (!brief) return (
    <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', padding: '12px 0' }}>No brief available yet. Check back soon.</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {brief.deadline && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, width: 'fit-content' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>⏰ DEADLINE: {brief.deadline}</span>
        </div>
      )}
      {brief.notes && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Director Notes</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, background: '#111', borderRadius: 8, padding: '10px 12px' }}>{brief.notes}</div>
        </div>
      )}
      {brief.script && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Script / Story Outline</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, background: '#111', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{brief.script}</div>
        </div>
      )}
      {brief.style_notes && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Style Notes</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, background: '#111', borderRadius: 8, padding: '10px 12px' }}>{brief.style_notes}</div>
        </div>
      )}
      {(brief.inspo_links || []).length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Inspiration</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.inspo_links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#111', borderRadius: 8, fontFamily: MONO, fontSize: 11, color: '#4A9EFF', textDecoration: 'none' }}>
                🔗 {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
      {(brief.raw_links || []).length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Raw Footage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.raw_links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#111', borderRadius: 8, fontFamily: MONO, fontSize: 11, color: '#7BC853', textDecoration: 'none' }}>
                📁 {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Submit Upload Form ────────────────────────────────────────────────────────

function SubmitForm({ project, contact, onSubmitted }) {
  const [form, setForm] = useState({ version: '', title: '', link: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.link.trim()) return;
    setSubmitting(true);
    await base44.entities.EditUpload.create({
      project_id: project.id,
      project_name: project.name,
      editor_name: contact.name,
      version: form.version || 'v1',
      title: form.title || `${contact.name}'s cut`,
      link: form.link.trim(),
      notes: form.notes.trim(),
      status: 'pending_review',
      comments: [],
      read_by_studio: false,
    });
    // Notify studio
    base44.functions.invoke('editReviewNotify', {
      type: 'new_upload',
      project_name: project.name,
      editor_name: contact.name,
      version: form.version || 'v1',
    });
    setForm({ version: '', title: '', link: '', notes: '' });
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 16 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Submit a Cut</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', display: 'block', marginBottom: 5 }}>VERSION</label>
            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v1, v2, Final..." style={SS} />
          </div>
          <div>
            <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', display: 'block', marginBottom: 5 }}>TITLE</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Highlight Reel Draft" style={SS} />
          </div>
        </div>
        <div>
          <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', display: 'block', marginBottom: 5 }}>LINK TO CUT *</label>
          <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://vimeo.com/... or drive.google.com/..." style={SS} />
        </div>
        <div>
          <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', display: 'block', marginBottom: 5 }}>YOUR NOTES</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything you want Studio 65 to know about this version..." style={{ ...SS, resize: 'none', lineHeight: 1.5 }} />
        </div>
        <button onClick={handleSubmit} disabled={submitting || !form.link.trim()} style={{ padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!form.link.trim() || submitting) ? 0.6 : 1 }}>
          {submitting ? 'Submitting...' : '↑ Submit Cut'}
        </button>
      </div>
    </div>
  );
}

// ── My Uploads ────────────────────────────────────────────────────────────────

function MyUploads({ project, contact }) {
  const [uploads, setUploads] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [showSubmit, setShowSubmit] = useState(false);

  const load = () => {
    base44.entities.EditUpload.filter({ project_id: project.id, editor_name: contact.name }).then(r => {
      setUploads(r.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    });
  };

  useEffect(() => { load(); }, [project.id, contact.name]);

  useEffect(() => {
    const unsub = base44.entities.EditUpload.subscribe((event) => {
      if (event.data?.project_id === project.id) load();
    });
    return unsub;
  }, [project.id]);

  const addComment = async (upload) => {
    const body = commentInputs[upload.id] || '';
    if (!body.trim()) return;
    setSubmitting(s => ({ ...s, [upload.id]: true }));
    const comment = {
      from: contact.name,
      from_role: 'editor',
      body: body.trim(),
      ts: new Date().toISOString(),
      read_by_editor: true,
      read_by_studio: false,
    };
    const updated = { ...upload, comments: [...(upload.comments || []), comment] };
    await base44.entities.EditUpload.update(upload.id, updated);
    // Notify studio
    base44.functions.invoke('editReviewNotify', {
      type: 'new_comment',
      project_name: project.name,
      editor_name: contact.name,
      version: upload.version,
      comment_body: body.trim(),
      timecode: null,
    });
    setUploads(prev => prev.map(u => u.id === updated.id ? updated : u));
    setCommentInputs(s => ({ ...s, [upload.id]: '' }));
    setSubmitting(s => ({ ...s, [upload.id]: false }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>My Submissions</div>
        <button onClick={() => setShowSubmit(s => !s)} style={{ padding: '6px 14px', background: showSubmit ? '#333' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {showSubmit ? '↑ Cancel' : '+ Submit Cut'}
        </button>
      </div>

      {showSubmit && (
        <div style={{ marginBottom: 16 }}>
          <SubmitForm project={project} contact={contact} onSubmitted={() => { setShowSubmit(false); load(); }} />
        </div>
      )}

      {uploads.length === 0 && !showSubmit && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>🎬</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>No cuts submitted yet.</div>
        </div>
      )}

      {uploads.map(u => {
        const st = STATUS_COLORS[u.status] || STATUS_COLORS.pending_review;
        const studioComments = (u.comments || []).filter(c => c.from_role === 'studio');
        return (
          <div key={u.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#E81A1A', background: 'rgba(232,26,26,0.1)', padding: '3px 8px', borderRadius: 6 }}>{u.version || 'v?'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{u.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>{new Date(u.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.clr }}>{st.label}</span>
            </div>

            {studioComments.length > 0 && (
              <div style={{ borderTop: '1px solid #1A1A1A', padding: '12px 14px' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Feedback from Studio 65</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {studioComments.map((c, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(232,26,26,0.06)', borderLeft: '2px solid rgba(232,26,26,0.3)', borderRadius: '0 8px 8px 0' }}>
                      {c.timecode && <span style={{ fontFamily: MONO, fontSize: 9, color: '#F59E0B', marginRight: 8 }}>⏱ {c.timecode}</span>}
                      <span style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>{c.body}</span>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    value={commentInputs[u.id] || ''}
                    onChange={e => setCommentInputs(s => ({ ...s, [u.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addComment(u); }}
                    placeholder="Reply to feedback..."
                    style={{ ...SS, flex: 1, fontSize: 12 }}
                  />
                  <button onClick={() => addComment(u)} disabled={submitting[u.id]} style={{ padding: '0 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── EditorSection (main export) ───────────────────────────────────────────────

export default function EditorSection({ project, contact }) {
  const [view, setView] = useState('brief');

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#1A1A1A', borderRadius: 10, padding: 4, marginBottom: 18 }}>
        {[{ key: 'brief', label: '📋 Brief' }, { key: 'uploads', label: '🎬 My Cuts' }].map(v => (
          <button key={v.key} onClick={() => setView(v.key)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: view === v.key ? '#E81A1A' : 'transparent',
            color: view === v.key ? '#fff' : '#666',
            fontFamily: MONO,
          }}>{v.label}</button>
        ))}
      </div>

      {view === 'brief' && <BriefViewer projectId={project.id} />}
      {view === 'uploads' && <MyUploads project={project} contact={contact} />}
    </div>
  );
}