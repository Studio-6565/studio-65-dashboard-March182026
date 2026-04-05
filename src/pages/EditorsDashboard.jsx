import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

const STATUS_STYLE = {
  pending_review: { bg: 'rgba(245,158,11,0.15)', clr: '#F59E0B', label: 'Pending Review' },
  approved:       { bg: 'rgba(123,200,83,0.15)',  clr: '#7BC853', label: 'Approved' },
  revision_requested: { bg: 'rgba(232,26,26,0.12)', clr: '#E81A1A', label: 'Revision Requested' },
};

export default function EditorsDashboard() {
  const [uploads, setUploads] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUpload, setActiveUpload] = useState(null);
  const [comment, setComment] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.EditUpload.list('-created_date', 100),
      base44.entities.EditBrief.list('-created_date', 100),
      base44.entities.Project.list('-date', 200),
    ]).then(([u, b, p]) => {
      setUploads(u);
      setBriefs(b);
      setProjects(p);
    }).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (upload, status) => {
    const updated = { ...upload, status };
    setUploads(prev => prev.map(u => u.id === upload.id ? updated : u));
    if (activeUpload?.id === upload.id) setActiveUpload(updated);
    await base44.entities.EditUpload.update(upload.id, { status });
    showToast(status === 'approved' ? 'Edit approved ✓' : 'Revision requested', status === 'approved' ? 'green' : 'amber');
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !activeUpload) return;
    const newComment = { from: 'Studio', from_role: 'studio', body: comment.trim(), ts: new Date().toISOString(), read_by_editor: false };
    const comments = [...(activeUpload.comments || []), newComment];
    const updated = { ...activeUpload, comments };
    setUploads(prev => prev.map(u => u.id === activeUpload.id ? updated : u));
    setActiveUpload(updated);
    setComment('');
    await base44.entities.EditUpload.update(activeUpload.id, { comments });
  };

  const filtered = filter === 'all' ? uploads : uploads.filter(u => u.status === filter);

  const unread = uploads.filter(u => !u.read_by_studio).length;
  const pendingCount = uploads.filter(u => u.status === 'pending_review').length;

  if (loading) return <div style={{ color: '#555', padding: 40, fontFamily: MONO, fontSize: 12 }}>Loading editors dashboard...</div>;

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Editors</div>
        <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>
          {pendingCount} pending review · {unread} unread uploads
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Uploads', val: uploads.length, color: '#fff' },
          { label: 'Pending Review', val: pendingCount, color: '#F59E0B' },
          { label: 'Approved', val: uploads.filter(u => u.status === 'approved').length, color: '#7BC853' },
          { label: 'Revisions', val: uploads.filter(u => u.status === 'revision_requested').length, color: '#E81A1A' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeUpload ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Upload list */}
        <div>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['pending_review', 'Pending'], ['approved', 'Approved'], ['revision_requested', 'Revisions']].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === val ? 'rgba(232,26,26,0.5)' : '#2A2A2A'}`, background: filter === val ? 'rgba(232,26,26,0.1)' : 'transparent', color: filter === val ? '#E81A1A' : '#666', fontFamily: MONO }}>
                {label}
              </button>
            ))}
          </div>

          {!filtered.length ? (
            <div style={{ color: '#555', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
              No edit uploads yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(u => {
                const st = STATUS_STYLE[u.status] || STATUS_STYLE.pending_review;
                const isActive = activeUpload?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setActiveUpload(isActive ? null : u)}
                    style={{
                      background: isActive ? '#1E1E1E' : '#1A1A1A',
                      border: `1px solid ${isActive ? '#333' : '#1E1E1E'}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{u.title || u.project_name}</div>
                        <div style={{ fontSize: 11, color: '#666', fontFamily: MONO }}>
                          {u.editor_name} · {u.version || 'v1'} · {u.project_name}
                        </div>
                        {u.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 5, lineHeight: 1.4 }}>{u.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: st.bg, color: st.clr }}>{st.label}</span>
                        {!u.read_by_studio && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(74,158,255,0.15)', color: '#4A9EFF', fontFamily: MONO }}>NEW</span>}
                      </div>
                    </div>
                    {u.link && (
                      <a href={u.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: '#4A9EFF', fontFamily: MONO, textDecoration: 'none' }}>
                        ▶ Watch Edit →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {activeUpload && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 20, position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{activeUpload.title || activeUpload.project_name}</div>
                <div style={{ fontSize: 11, color: '#666', fontFamily: MONO, marginTop: 2 }}>{activeUpload.editor_name} · {activeUpload.version}</div>
              </div>
              <button onClick={() => setActiveUpload(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => handleStatusChange(activeUpload, 'approved')} style={{ flex: 1, padding: '9px 0', background: 'rgba(123,200,83,0.12)', border: '1px solid rgba(123,200,83,0.3)', borderRadius: 8, color: '#7BC853', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
                ✓ Approve
              </button>
              <button onClick={() => handleStatusChange(activeUpload, 'revision_requested')} style={{ flex: 1, padding: '9px 0', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 8, color: '#E81A1A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
                ↺ Revise
              </button>
            </div>

            {activeUpload.link && (
              <a href={activeUpload.link} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '10px 14px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 600, fontFamily: MONO, textDecoration: 'none', marginBottom: 16, textAlign: 'center' }}>
                ▶ Watch Edit →
              </a>
            )}

            {/* Comments */}
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Comments</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!(activeUpload.comments || []).length ? (
                <div style={{ color: '#555', fontSize: 12, fontFamily: MONO }}>No comments yet.</div>
              ) : (
                (activeUpload.comments || []).map((c, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: c.from_role === 'studio' ? 'rgba(74,158,255,0.08)' : '#222', borderRadius: 6, borderLeft: `2px solid ${c.from_role === 'studio' ? '#4A9EFF' : '#444'}` }}>
                    <div style={{ fontSize: 10, fontFamily: MONO, color: c.from_role === 'studio' ? '#4A9EFF' : '#888', marginBottom: 3 }}>{c.from}</div>
                    <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>{c.body}</div>
                    {c.timecode && <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, marginTop: 2 }}>@ {c.timecode}</div>}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                style={{ flex: 1, background: '#111', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif' }}
              />
              <button onClick={handleAddComment} style={{ padding: '9px 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}