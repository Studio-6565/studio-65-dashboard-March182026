import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2 } from 'lucide-react';
import DeliverableFileCard from '@/components/deliverable-review/DeliverableFileCard';

const MONO = '"DM Mono", monospace';

// URL params: ?project_id=xxx&client_name=xxx&token=xxx
// token = base64(project_id + ":" + client_name) for lightweight auth

export default function DeliverableReview() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project_id');
  const clientNameParam = params.get('client_name') || '';
  const token = params.get('token') || '';

  // Simple token validation: base64(projectId:clientName)
  const expectedToken = btoa(`${projectId}:${clientNameParam}`);
  const isValidToken = token === expectedToken;

  const [project, setProject] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allApproved, setAllApproved] = useState(false);

  useEffect(() => {
    if (!projectId || !isValidToken) {
      setError('Invalid or missing review link. Please ask Studio 65 to resend the link.');
      setLoading(false);
      return;
    }

    Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.ProjectFile.filter({ project_id: projectId }, '-created_date', 100),
    ]).then(([projects, files]) => {
      const proj = projects[0];
      if (!proj) { setError('Project not found.'); setLoading(false); return; }
      setProject(proj);
      // Only show deliverables visible to client
      const delivs = files.filter(f => f.category === 'Deliverables' && f.visible_to_client !== false);
      setDeliverables(delivs);
      setLoading(false);
    }).catch(() => {
      setError('Could not load project. Please try again.');
      setLoading(false);
    });
  }, [projectId, isValidToken]);

  // Check if all deliverables have been approved via DeliverableComment
  useEffect(() => {
    if (!deliverables.length || !projectId) return;
    base44.entities.DeliverableComment.filter({ project_id: projectId, approval_status: 'approved' }, null, 200)
      .then(approvals => {
        const approvedIds = new Set(approvals.map(a => a.file_id));
        const all = deliverables.every(d => approvedIds.has(d.id));
        setAllApproved(all && deliverables.length > 0);
      }).catch(() => {});
  }, [deliverables, projectId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="#E81A1A" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#E81A1A', marginBottom: 8 }}>Invalid Review Link</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #0F0F0F' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 24 }} />
            <div style={{ width: 1, height: 16, background: '#1E1E1E' }} />
            <span style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>Deliverable Review</span>
          </div>
          {allApproved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, color: '#7BC853' }}>
              <CheckCircle2 size={13} /> All Approved
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Project info */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Studio 65 — Deliverable Review
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
            {project?.name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>
            Reviewing as <span style={{ color: '#ccc' }}>{clientNameParam}</span>
            {project?.date && <> · Shoot date: <span style={{ color: '#ccc' }}>{project.date}</span></>}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: 'rgba(74,158,255,0.04)', border: '1px solid rgba(74,158,255,0.12)', borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>How to review</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#666', lineHeight: 1.9 }}>
            <li>Expand each deliverable to preview and review it</li>
            <li>For videos — click the timeline or use ⏱ Stamp to pin a comment to a specific moment</li>
            <li>Hit <strong style={{ color: '#7BC853' }}>Approve</strong> or <strong style={{ color: '#F59E0B' }}>Request Changes</strong> on each file</li>
            <li>Studio 65 is notified instantly of your feedback</li>
          </ul>
        </div>

        {/* All approved banner */}
        {allApproved && (
          <div style={{ background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 14, padding: '18px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={22} color="#7BC853" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#7BC853' }}>All deliverables approved!</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>Studio 65 has been notified. Thank you!</div>
            </div>
          </div>
        )}

        {/* Deliverables */}
        {deliverables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, opacity: 0.1, marginBottom: 14 }}>📦</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#444', marginBottom: 8 }}>No deliverables yet</div>
            <div style={{ fontSize: 13, color: '#2A2A2A', lineHeight: 1.7 }}>
              Studio 65 hasn't uploaded any deliverables for this project yet. Check back soon!
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''} to review
            </div>
            {deliverables.map(file => (
              <DeliverableFileCard
                key={file.id}
                file={file}
                clientName={clientNameParam}
                projectId={projectId}
                projectName={project?.name}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #0F0F0F', textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#2A2A2A' }}>Powered by Studio 65</div>
        </div>
      </main>
    </div>
  );
}