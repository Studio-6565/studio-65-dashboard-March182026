import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import VideoTimecodeReview from '@/components/studio/VideoTimecodeReview';

const MONO = '"DM Mono", monospace';

const STATUS_COLORS = {
  pending_review: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: '⏳ Pending Review' },
  approved:       { bg: 'rgba(123,200,83,0.1)', color: '#7BC853', label: '✓ Approved' },
  revision_requested: { bg: 'rgba(232,26,26,0.08)', color: '#E81A1A', label: '↺ Revision Requested' },
};

export default function ClientEditReview({ contact, projects }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);

  useEffect(() => {
    const projectIds = projects.map(p => p.id);
    if (!projectIds.length) { setLoading(false); return; }

    // Fetch uploads for all client projects
    Promise.all(
      projectIds.map(id => base44.entities.EditUpload.filter({ project_id: id }, '-created_date', 20))
    ).then(results => {
      const all = results.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setUploads(all);
      setLoading(false);
    });
  }, [projects]);

  const handleUpdate = (updated) => {
    setUploads(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (selectedUpload?.id === updated.id) setSelectedUpload(updated);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: MONO, fontSize: 12, color: '#333' }}>Loading...</div>;
  }

  if (uploads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.15 }}>🎬</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#444', marginBottom: 8 }}>No cuts submitted yet</div>
        <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
          Once the editor submits a cut for review, you'll be able to watch and leave timestamped feedback here.
        </div>
      </div>
    );
  }

  // If a cut is selected, show it full-screen
  if (selectedUpload) {
    const st = STATUS_COLORS[selectedUpload.status] || STATUS_COLORS.pending_review;
    return (
      <div>
        <button
          onClick={() => setSelectedUpload(null)}
          style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back to all cuts
        </button>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#E81A1A', background: 'rgba(232,26,26,0.1)', padding: '3px 8px', borderRadius: 6 }}>
              {selectedUpload.version || 'v?'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{selectedUpload.title || 'Untitled Cut'}</div>
            <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>
            {selectedUpload.project_name} · {selectedUpload.editor_name}
          </div>
          {selectedUpload.notes && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(74,158,255,0.04)', border: '1px solid rgba(74,158,255,0.1)', borderRadius: 10, fontSize: 13, color: '#777', lineHeight: 1.6 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Editor Notes</span>
              {selectedUpload.notes}
            </div>
          )}
        </div>

        <VideoTimecodeReview
          upload={selectedUpload}
          onUpdate={handleUpdate}
          isStudio={false}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        {uploads.length} cut{uploads.length !== 1 ? 's' : ''} submitted
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {uploads.map(u => {
          const st = STATUS_COLORS[u.status] || STATUS_COLORS.pending_review;
          const openComments = (u.comments || []).filter(c => !c.resolved).length;
          const unread = (u.comments || []).filter(c => c.from_role === 'studio' && !c.read_by_client).length;

          return (
            <button
              key={u.id}
              onClick={() => setSelectedUpload(u)}
              style={{ width: '100%', textAlign: 'left', background: '#0D0D0D', border: `1px solid ${u.status === 'pending_review' ? 'rgba(245,158,11,0.2)' : '#141414'}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#E81A1A' }}>
                {u.version || 'v?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{u.title || 'Untitled Cut'}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginBottom: 6 }}>
                  {u.project_name} · {new Date(u.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
                  {openComments > 0 && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(100,100,100,0.1)', color: '#555' }}>{openComments} comment{openComments !== 1 ? 's' : ''}</span>}
                  {unread > 0 && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(74,158,255,0.12)', color: '#4A9EFF' }}>{unread} new</span>}
                </div>
              </div>
              <span style={{ color: '#333', fontSize: 16, flexShrink: 0 }}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}