import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseSeconds(tc) {
  if (!tc) return null;
  const parts = String(tc).split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const n = parseFloat(tc);
  return isNaN(n) ? null : n;
}

function fmtTime(secs) {
  if (secs == null || isNaN(secs)) return null;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isDirectVideo(url) {
  return /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url);
}

function getEmbedUrl(url) {
  if (!url) return null;
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0`;
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Google Drive
  const gdrive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdrive) return `https://drive.google.com/file/d/${gdrive[1]}/preview`;
  // Dropbox
  if (url.includes('dropbox.com') && url.includes('.mp4')) return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  return null;
}

// ── Timeline scrubber ─────────────────────────────────────────────────────────

function TimelineBar({ duration, currentTime, comments, onSeek, pendingTimecode, onSetPending }) {
  const barRef = useRef(null);

  const getX = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleClick = (e) => {
    if (!duration) return;
    const ratio = getX(e);
    const secs = ratio * duration;
    onSeek(secs);
    onSetPending(fmtTime(secs));
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // Group comments by approximate bucket for overlap handling
  const markers = comments.filter(c => c.timecode_seconds != null);

  return (
    <div style={{ position: 'relative', marginTop: 8, marginBottom: 4 }}>
      {/* Bar */}
      <div
        ref={barRef}
        onClick={handleClick}
        style={{ position: 'relative', height: 8, background: '#222', borderRadius: 4, cursor: 'crosshair', overflow: 'visible' }}
      >
        {/* Playhead */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPct}%`, background: '#E81A1A', borderRadius: 4, transition: 'width 0.1s linear', pointerEvents: 'none' }} />

        {/* Comment markers */}
        {markers.map((c, i) => {
          const pct = duration ? (c.timecode_seconds / duration) * 100 : 0;
          const isResolved = c.resolved;
          return (
            <div
              key={i}
              title={`${fmtTime(c.timecode_seconds)} — ${c.body?.slice(0, 60)}`}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10,
                borderRadius: '50%',
                background: isResolved ? '#444' : (c.from_role === 'studio' ? '#E81A1A' : '#4A9EFF'),
                border: `2px solid ${isResolved ? '#333' : '#0A0A0A'}`,
                cursor: 'pointer',
                zIndex: 2,
                opacity: isResolved ? 0.5 : 1,
              }}
              onClick={(e) => { e.stopPropagation(); onSeek(c.timecode_seconds); onSetPending(fmtTime(c.timecode_seconds)); }}
            />
          );
        })}

        {/* Pending stamp indicator */}
        {pendingTimecode && duration && (() => {
          const secs = parseSeconds(pendingTimecode);
          if (!secs) return null;
          const pct = (secs / duration) * 100;
          return (
            <div style={{ position: 'absolute', left: `${pct}%`, top: -4, transform: 'translateX(-50%)', width: 2, height: 16, background: '#F59E0B', borderRadius: 1, zIndex: 3, pointerEvents: 'none' }} />
          );
        })()}
      </div>

      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: MONO, fontSize: 9, color: '#444' }}>
        <span>{fmtTime(currentTime) || '0:00'}</span>
        <span style={{ color: '#E81A1A', fontSize: 9 }}>click timeline to stamp a comment</span>
        <span>{fmtTime(duration) || '—'}</span>
      </div>
    </div>
  );
}

// ── Comment item ─────────────────────────────────────────────────────────────

function CommentItem({ comment, index, onReply, onResolve, onSeek, isStudio }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    await onReply(index, replyText.trim());
    setReplyText('');
    setShowReply(false);
    setSaving(false);
  };

  const isResolved = comment.resolved;
  const replies = comment.replies || [];
  const fromColor = comment.from_role === 'studio' ? '#E81A1A' : '#4A9EFF';

  return (
    <div style={{
      borderLeft: `2px solid ${isResolved ? '#2A2A2A' : fromColor}`,
      paddingLeft: 12,
      marginBottom: 10,
      opacity: isResolved ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Main comment */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: fromColor }}>{comment.from}</span>
            {comment.timecode && (
              <button
                onClick={() => comment.timecode_seconds != null && onSeek(comment.timecode_seconds)}
                style={{ fontFamily: MONO, fontSize: 10, padding: '1px 7px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: 4, border: 'none', cursor: comment.timecode_seconds != null ? 'pointer' : 'default' }}
              >
                ⏱ {comment.timecode}
              </button>
            )}
            {isResolved && <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', padding: '1px 5px', background: '#1A1A1A', borderRadius: 3 }}>resolved</span>}
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginLeft: 'auto' }}>
              {new Date(comment.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, marginBottom: 6 }}>{comment.body}</div>

          {/* Replies */}
          {replies.map((r, ri) => (
            <div key={ri} style={{ marginLeft: 12, marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${r.from_role === 'studio' ? '#E81A1A33' : '#4A9EFF33'}` }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.from_role === 'studio' ? '#E81A1A' : '#4A9EFF' }}>{r.from}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{new Date(r.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>{r.body}</div>
            </div>
          ))}

          {/* Actions */}
          {isStudio && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowReply(v => !v)} style={{ fontSize: 10, fontFamily: MONO, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showReply ? '— cancel' : '↩ reply'}
              </button>
              <button onClick={() => onResolve(index)} style={{ fontSize: 10, fontFamily: MONO, color: isResolved ? '#555' : '#7BC853', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {isResolved ? '↺ reopen' : '✓ resolve'}
              </button>
            </div>
          )}

          {/* Reply form */}
          {showReply && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
                placeholder="Write a reply..."
                style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif' }}
              />
              <button onClick={handleReply} disabled={saving || !replyText.trim()} style={{ padding: '7px 12px', background: '#E81A1A', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: !replyText.trim() ? 0.5 : 1 }}>
                {saving ? '...' : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VideoTimecodeReview({ upload, onUpdate, isStudio = true }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [pendingTimecode, setPendingTimecode] = useState('');
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [useTimeline, setUseTimeline] = useState(true);

  const directVideo = isDirectVideo(upload.link || '');
  const embedUrl = !directVideo ? getEmbedUrl(upload.link || '') : null;
  const hasVideo = directVideo || !!embedUrl;

  const comments = (upload.comments || []).map(c => ({
    ...c,
    timecode_seconds: parseSeconds(c.timecode),
  }));

  // Sync video time
  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };
  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const seekTo = useCallback((secs) => {
    if (videoRef.current) {
      videoRef.current.currentTime = secs;
      videoRef.current.pause();
    }
  }, []);

  // Stamp current video time when clicking "Stamp"
  const stampCurrentTime = () => {
    if (videoRef.current) {
      setPendingTimecode(fmtTime(videoRef.current.currentTime));
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);

    const tc = pendingTimecode.trim() || null;
    const tcSecs = tc ? parseSeconds(tc) : null;

    const newComment = {
      from: isStudio ? 'Studio 65' : 'Client',
      from_role: isStudio ? 'studio' : 'client',
      body: commentText.trim(),
      timecode: tc,
      timecode_seconds: tcSecs,
      ts: new Date().toISOString(),
      read_by_editor: false,
      read_by_studio: isStudio,
      resolved: false,
      replies: [],
    };

    const updated = { ...upload, comments: [...(upload.comments || []), newComment] };
    await base44.entities.EditUpload.update(upload.id, updated);

    if (isStudio) {
      base44.functions.invoke('editReviewNotify', {
        type: 'new_comment',
        project_name: upload.project_name,
        editor_name: upload.editor_name,
        version: upload.version,
        comment_body: commentText.trim(),
        timecode: tc,
      });
    }

    onUpdate(updated);
    setCommentText('');
    setPendingTimecode('');
    setSending(false);
  };

  const handleReply = async (commentIndex, replyText) => {
    const reply = {
      from: isStudio ? 'Studio 65' : 'Client',
      from_role: isStudio ? 'studio' : 'client',
      body: replyText,
      ts: new Date().toISOString(),
    };
    const updatedComments = [...(upload.comments || [])];
    updatedComments[commentIndex] = {
      ...updatedComments[commentIndex],
      replies: [...(updatedComments[commentIndex].replies || []), reply],
    };
    const updated = { ...upload, comments: updatedComments };
    await base44.entities.EditUpload.update(upload.id, updated);
    onUpdate(updated);
  };

  const handleResolve = async (commentIndex) => {
    const updatedComments = [...(upload.comments || [])];
    updatedComments[commentIndex] = {
      ...updatedComments[commentIndex],
      resolved: !updatedComments[commentIndex].resolved,
    };
    const updated = { ...upload, comments: updatedComments };
    await base44.entities.EditUpload.update(upload.id, updated);
    onUpdate(updated);
    showToast(updatedComments[commentIndex].resolved ? 'Comment resolved' : 'Reopened', 'blue');
  };

  const unresolvedCount = comments.filter(c => !c.resolved).length;
  const resolvedCount = comments.filter(c => c.resolved).length;
  const displayedComments = comments.filter(c => showResolved ? true : !c.resolved);

  // Sort: timecoded first (chronological), then general
  const sorted = [...displayedComments].sort((a, b) => {
    if (a.timecode_seconds != null && b.timecode_seconds != null) return a.timecode_seconds - b.timecode_seconds;
    if (a.timecode_seconds != null) return -1;
    if (b.timecode_seconds != null) return 1;
    return new Date(a.ts) - new Date(b.ts);
  });

  return (
    <div>
      {/* Video player */}
      {hasVideo && (
        <div style={{ marginBottom: 16 }}>
          {directVideo ? (
            <div>
              <video
                ref={videoRef}
                src={upload.link}
                controls
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 320 }}
              />
              {/* Timeline bar */}
              <TimelineBar
                duration={duration}
                currentTime={currentTime}
                comments={comments}
                onSeek={seekTo}
                pendingTimecode={pendingTimecode}
                onSetPending={setPendingTimecode}
              />
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                <iframe
                  src={embedUrl}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                  allow="autoplay; fullscreen"
                  title="Video preview"
                />
              </div>
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>
                  ℹ Pause the video at any moment, then type a timecode below (e.g. <strong>1:32</strong>) or click "Stamp" to capture your current position.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comment input */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginRight: 4 }}>Timecode</div>
          <input
            value={pendingTimecode}
            onChange={e => setPendingTimecode(e.target.value)}
            placeholder="1:32"
            style={{ width: 68, background: '#1A1A1A', border: `1px solid ${pendingTimecode ? '#F59E0B' : '#2A2A2A'}`, borderRadius: 6, padding: '6px 10px', color: pendingTimecode ? '#F59E0B' : '#666', fontSize: 12, outline: 'none', textAlign: 'center', fontFamily: MONO }}
          />
          {directVideo && (
            <button
              onClick={stampCurrentTime}
              style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, color: '#F59E0B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap' }}
            >
              ⏱ Stamp
            </button>
          )}
          {pendingTimecode && (
            <button onClick={() => setPendingTimecode('')} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) postComment(); }}
            placeholder={pendingTimecode ? `Comment at ${pendingTimecode}...` : 'Leave feedback (or stamp a timecode first)...'}
            style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
          />
          <button
            onClick={postComment}
            disabled={sending || !commentText.trim()}
            style={{ padding: '9px 18px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !commentText.trim() ? 0.5 : 1 }}
          >
            {sending ? '...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Comment list header */}
      {comments.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {unresolvedCount} open · {resolvedCount} resolved
          </div>
          {resolvedCount > 0 && (
            <button onClick={() => setShowResolved(v => !v)} style={{ fontFamily: MONO, fontSize: 10, color: '#444', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showResolved ? 'Hide resolved' : 'Show resolved'}
            </button>
          )}
        </div>
      )}

      {/* Comments */}
      <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
        {sorted.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', padding: '8px 0' }}>
            No comments yet. {directVideo ? 'Click the timeline or stamp a timecode to leave feedback.' : 'Enter a timecode and leave feedback below.'}
          </div>
        )}
        {sorted.map((c, i) => {
          // find original index for mutations
          const origIdx = (upload.comments || []).findIndex((oc, oi) => oc.ts === c.ts && oc.body === c.body);
          return (
            <CommentItem
              key={i}
              comment={c}
              index={origIdx}
              onReply={handleReply}
              onResolve={handleResolve}
              onSeek={seekTo}
              isStudio={isStudio}
            />
          );
        })}
      </div>
    </div>
  );
}