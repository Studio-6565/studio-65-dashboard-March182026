import React, { useState, useRef, useCallback } from 'react';

const MONO = '"DM Mono", monospace';

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

function isDirectVideo(url = '') {
  return /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url);
}

function getEmbedUrl(url = '') {
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0`;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const gdrive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdrive) return `https://drive.google.com/file/d/${gdrive[1]}/preview`;
  return null;
}

function TimelineBar({ duration, currentTime, comments, onSeek, onSetPending }) {
  const barRef = useRef(null);

  const handleClick = (e) => {
    if (!duration || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const secs = ratio * duration;
    onSeek(secs);
    onSetPending(fmtTime(secs));
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const markers = comments.filter(c => c.timecode_seconds != null);

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <div
        ref={barRef}
        onClick={handleClick}
        style={{ position: 'relative', height: 8, background: '#222', borderRadius: 4, cursor: 'crosshair', overflow: 'visible' }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPct}%`, background: '#E81A1A', borderRadius: 4, pointerEvents: 'none' }} />
        {markers.map((c, i) => {
          const pct = duration ? (c.timecode_seconds / duration) * 100 : 0;
          return (
            <div
              key={i}
              title={`${fmtTime(c.timecode_seconds)} — ${c.body?.slice(0, 60)}`}
              onClick={(e) => { e.stopPropagation(); onSeek(c.timecode_seconds); onSetPending(fmtTime(c.timecode_seconds)); }}
              style={{
                position: 'absolute', left: `${pct}%`, top: '50%',
                transform: 'translate(-50%, -50%)', width: 10, height: 10,
                borderRadius: '50%', background: c.from_role === 'studio' ? '#E81A1A' : '#4A9EFF',
                border: '2px solid #0A0A0A', cursor: 'pointer', zIndex: 2,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: MONO, fontSize: 9, color: '#444' }}>
        <span>{fmtTime(currentTime) || '0:00'}</span>
        <span style={{ color: '#E81A1A' }}>click timeline to stamp a comment</span>
        <span>{fmtTime(duration) || '—'}</span>
      </div>
    </div>
  );
}

export default function DeliverableVideoPlayer({ url, comments = [], onStamp }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const isDirect = isDirectVideo(url);
  const embedUrl = !isDirect ? getEmbedUrl(url) : null;
  const hasVideo = isDirect || !!embedUrl;

  const seekTo = useCallback((secs) => {
    if (videoRef.current) {
      videoRef.current.currentTime = secs;
      videoRef.current.pause();
    }
  }, []);

  const stampCurrentTime = () => {
    if (videoRef.current) onStamp(fmtTime(videoRef.current.currentTime));
  };

  if (!hasVideo) {
    return (
      <div style={{ padding: '20px', background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 12, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>No video preview available for this file</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {isDirect ? (
        <div>
          <video
            ref={videoRef}
            src={url}
            controls
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
            style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 340 }}
          />
          <TimelineBar
            duration={duration}
            currentTime={currentTime}
            comments={comments}
            onSeek={seekTo}
            onSetPending={onStamp}
          />
          <button
            onClick={stampCurrentTime}
            style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, color: '#F59E0B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
          >
            ⏱ Stamp Current Time
          </button>
        </div>
      ) : (
        <div>
          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
            <iframe src={embedUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; fullscreen" title="Video preview" />
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>
              Pause the video, then type a timecode (e.g. <strong>1:32</strong>) in the comment box below.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}