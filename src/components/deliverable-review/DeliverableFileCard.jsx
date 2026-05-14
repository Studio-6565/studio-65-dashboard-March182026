import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, MessageSquare, ChevronDown, ChevronUp, Film, Image, File, Download } from 'lucide-react';
import DeliverableVideoPlayer from './DeliverableVideoPlayer';
import DeliverableCommentThread from './DeliverableCommentThread';

const MONO = '"DM Mono", monospace';

function parseSeconds(tc) {
  if (!tc) return null;
  const parts = String(tc).split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const n = parseFloat(tc);
  return isNaN(n) ? null : n;
}

function isVideo(url = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return url.includes('vimeo') || url.includes('youtube') || url.includes('youtu.be') || url.includes('drive.google') || ['mp4', 'mov', 'webm'].includes(ext);
}

function isImage(mimeType = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

export default function DeliverableFileCard({ file, clientName, projectId, projectName }) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [timecode, setTimecode] = useState('');
  const [posting, setPosting] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(null); // 'approved' | 'changes_requested'
  const [submitting, setSubmitting] = useState(false);
  const [seekTo, setSeekTo] = useState(null);

  const isVid = isVideo(file.file_url, file.file_name);
  const isImg = isImage(file.file_type, file.file_name);

  const loadComments = async () => {
    if (commentsLoaded) return;
    const data = await base44.entities.DeliverableComment.filter({ file_id: file.id }, 'created_date', 100);
    setComments(data);
    setCommentsLoaded(true);
    // Detect existing approval
    const approval = data.find(c => c.approval_status !== 'pending' && c.from_role === 'client');
    if (approval) setApprovalStatus(approval.approval_status);
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadComments();
  };

  const postComment = async (status = 'pending') => {
    if (!commentText.trim() && status === 'pending') return;
    setPosting(true);

    const body = commentText.trim() || (status === 'approved' ? '✅ Approved this deliverable.' : '🔄 Requested changes on this deliverable.');
    const tcSecs = timecode ? parseSeconds(timecode) : null;

    const record = await base44.entities.DeliverableComment.create({
      project_id: projectId,
      project_name: projectName,
      file_id: file.id,
      file_name: file.file_name,
      client_name: clientName,
      from_role: 'client',
      body,
      timecode: timecode || null,
      timecode_seconds: tcSecs,
      approval_status: status,
    });

    setComments(prev => [...prev, record]);
    setCommentText('');
    setTimecode('');
    if (status !== 'pending') setApprovalStatus(status);

    // Sync project status
    if (status === 'changes_requested') {
      base44.entities.Project.update(projectId, {
        status: 'Feedback Requested',
        activity: [{ msg: `📋 ${clientName} requested changes on "${file.file_name}"`, ts: new Date().toISOString() }],
      }).catch(() => {});
      // Notify studio via ClientMessage
      base44.entities.ClientMessage.create({
        project_id: projectId,
        project_name: projectName,
        client_name: clientName,
        from: 'client',
        type: 'approval_request',
        title: `📋 Change Request: ${file.file_name}`,
        body: `${clientName} requested changes: ${body}`,
        approval_status: 'revision_requested',
        read_by_studio: false,
        read_by_client: true,
      }).catch(() => {});
    } else if (status === 'approved') {
      base44.entities.ClientMessage.create({
        project_id: projectId,
        project_name: projectName,
        client_name: clientName,
        from: 'client',
        type: 'approval_request',
        title: `✅ Approved: ${file.file_name}`,
        body: `${clientName} has approved the deliverable: ${file.file_name}`,
        approval_status: 'approved',
        read_by_studio: false,
        read_by_client: true,
      }).catch(() => {});
    }

    setPosting(false);
    setSubmitting(false);
  };

  const statusBadge = approvalStatus === 'approved'
    ? { bg: 'rgba(123,200,83,0.12)', color: '#7BC853', label: '✓ Approved' }
    : approvalStatus === 'changes_requested'
    ? { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: '↺ Changes Requested' }
    : null;

  return (
    <div style={{ background: '#0A0A0A', border: `1px solid ${approvalStatus === 'approved' ? 'rgba(123,200,83,0.2)' : approvalStatus === 'changes_requested' ? 'rgba(245,158,11,0.2)' : '#141414'}`, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#111', border: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isVid ? <Film size={20} color="#E81A1A" /> : isImg ? <Image size={20} color="#4A9EFF" /> : <File size={20} color="#666" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(123,200,83,0.08)', color: '#7BC853' }}>{file.category}</span>
            {statusBadge && (
              <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: statusBadge.bg, color: statusBadge.color }}>{statusBadge.label}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <a href={file.file_url} target="_blank" rel="noreferrer" download={file.file_name} style={{ width: 34, height: 34, borderRadius: 8, background: '#111', border: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Download size={14} color="#555" />
          </a>
          <button
            onClick={handleExpand}
            style={{ width: 34, height: 34, borderRadius: 8, background: expanded ? '#1A1A1A' : '#111', border: `1px solid ${expanded ? '#333' : '#1E1E1E'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {expanded ? <ChevronUp size={14} color="#fff" /> : <ChevronDown size={14} color="#555" />}
          </button>
        </div>
      </div>

      {/* Expanded: video/image + feedback */}
      {expanded && (
        <div style={{ padding: '0 18px 20px', borderTop: '1px solid #111' }}>
          <div style={{ paddingTop: 16 }}>
            {/* Media preview */}
            {isVid && (
              <DeliverableVideoPlayer
                url={file.file_url}
                comments={comments}
                onStamp={setTimecode}
              />
            )}
            {isImg && !isVid && (
              <div style={{ marginBottom: 16 }}>
                <img src={file.file_url} alt={file.file_name} style={{ width: '100%', borderRadius: 10, maxHeight: 300, objectFit: 'contain', background: '#000' }} />
              </div>
            )}

            {/* Approve / Request Changes — only if not already actioned */}
            {!approvalStatus && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => { setSubmitting(true); setCommentText(''); postComment('approved'); }}
                  disabled={posting}
                  style={{ flex: 1, padding: '11px 0', background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 10, color: '#7BC853', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: MONO }}
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  onClick={() => setSubmitting(true)}
                  disabled={posting}
                  style={{ flex: 1, padding: '11px 0', background: submitting ? 'rgba(245,158,11,0.1)' : 'transparent', border: `1px solid ${submitting ? 'rgba(245,158,11,0.3)' : '#1E1E1E'}`, borderRadius: 10, color: submitting ? '#F59E0B' : '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: MONO }}
                >
                  <MessageSquare size={14} /> Request Changes
                </button>
              </div>
            )}

            {/* Comment input — shown when requesting changes or just commenting */}
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              {isVid && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase' }}>Timecode</span>
                  <input
                    value={timecode}
                    onChange={e => setTimecode(e.target.value)}
                    placeholder="1:32"
                    style={{ width: 68, background: '#1A1A1A', border: `1px solid ${timecode ? '#F59E0B' : '#2A2A2A'}`, borderRadius: 6, padding: '6px 10px', color: timecode ? '#F59E0B' : '#666', fontSize: 12, outline: 'none', textAlign: 'center', fontFamily: MONO }}
                  />
                  {timecode && <button onClick={() => setTimecode('')} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 14 }}>×</button>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) postComment(submitting ? 'changes_requested' : 'pending'); }}
                  placeholder={submitting ? 'Describe what needs to change...' : 'Leave a timestamped comment...'}
                  style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
                />
                <button
                  onClick={() => postComment(submitting ? 'changes_requested' : 'pending')}
                  disabled={posting || !commentText.trim()}
                  style={{ padding: '9px 16px', background: submitting ? '#F59E0B' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !commentText.trim() ? 0.5 : 1 }}
                >
                  {posting ? '...' : submitting ? 'Send Request' : 'Post'}
                </button>
              </div>
            </div>

            {/* Comment thread */}
            {commentsLoaded && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </div>
                <DeliverableCommentThread
                  comments={comments}
                  onSeek={null}
                  isStudio={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}