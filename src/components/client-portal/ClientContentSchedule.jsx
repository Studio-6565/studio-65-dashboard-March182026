import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, CheckCircle2, Calendar, Clock, ExternalLink } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const PLATFORM_COLORS = {
  Instagram: '#E1306C',
  TikTok: '#69C9D0',
  YouTube: '#FF0000',
  LinkedIn: '#0077B5',
  Facebook: '#1877F2',
  'Twitter/X': '#1DA1F2',
  Other: '#888',
};

const STATUS_STYLE = {
  scheduled: { bg: 'rgba(74,158,255,0.1)',   color: '#4A9EFF', label: '📅 Scheduled' },
  ready:     { bg: 'rgba(123,200,83,0.1)',   color: '#7BC853', label: '✅ Ready to Post' },
  posted:    { bg: 'rgba(123,200,83,0.18)',  color: '#7BC853', label: '✓ Posted' },
  skipped:   { bg: 'rgba(100,100,100,0.1)', color: '#666',    label: '— Skipped' },
};

function ContentCard({ item, onMarkPosted }) {
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const st = STATUS_STYLE[item.status] || STATUS_STYLE.scheduled;
  const platColor = PLATFORM_COLORS[item.platform] || '#888';
  const isPosted = item.status === 'posted';

  const handleMarkPosted = async () => {
    setMarking(true);
    await onMarkPosted(item);
    setMarking(false);
  };

  const handleCopyCaption = () => {
    if (!item.caption) return;
    navigator.clipboard.writeText(item.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: isPosted ? 'rgba(123,200,83,0.03)' : '#0D0D0D',
      border: `1px solid ${isPosted ? 'rgba(123,200,83,0.15)' : '#141414'}`,
      borderRadius: 18,
      overflow: 'hidden',
      opacity: isPosted ? 0.75 : 1,
    }}>
      {/* Top bar */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: platColor, flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: platColor, fontWeight: 700 }}>{item.platform}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#333', background: '#1A1A1A', padding: '2px 7px', borderRadius: 4 }}>{item.content_type}</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.01em' }}>{item.title}</div>
        
        {/* Date / Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
            <Calendar size={12} color="#555" />
            {new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          {item.scheduled_time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
              <Clock size={12} color="#555" />
              {item.scheduled_time}
            </div>
          )}
        </div>

        {/* Caption */}
        {item.caption && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Suggested Caption</div>
            <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto' }}>
              {item.caption}
            </div>
            <button onClick={handleCopyCaption} style={{ marginTop: 8, padding: '7px 14px', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 8, color: copied ? '#7BC853' : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
              {copied ? '✓ Copied!' : '📋 Copy Caption'}
            </button>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(74,158,255,0.04)', border: '1px solid rgba(74,158,255,0.1)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{item.notes}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {item.file_url && (
            <a
              href={item.file_url}
              download={item.file_name || 'content'}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, minWidth: 120, padding: '12px 0', background: '#E81A1A', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
            >
              <Download size={14} />
              Download
            </a>
          )}
          {!isPosted && (
            <button
              onClick={handleMarkPosted}
              disabled={marking}
              style={{ flex: 1, minWidth: 120, padding: '12px 0', background: isPosted ? 'rgba(123,200,83,0.1)' : 'rgba(123,200,83,0.12)', border: `1px solid rgba(123,200,83,0.3)`, borderRadius: 12, color: '#7BC853', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
            >
              <CheckCircle2 size={14} />
              {marking ? 'Saving...' : 'Mark as Posted'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientContentSchedule({ contact }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    base44.entities.ContentSchedule.filter({ client_name: contact.name }, 'scheduled_date', 100)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [contact.name]);

  const handleMarkPosted = async (item) => {
    const updated = { ...item, status: 'posted', client_posted_at: new Date().toISOString() };
    await base44.entities.ContentSchedule.update(item.id, updated);
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  };

  const today = new Date().toISOString().split('T')[0];

  const filtered = items.filter(item => {
    if (filter === 'upcoming') return item.status !== 'posted' && item.status !== 'skipped';
    if (filter === 'posted') return item.status === 'posted';
    if (filter === 'this_week') {
      const d = new Date(item.scheduled_date);
      const now = new Date();
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
      return d >= now && d <= weekEnd && item.status !== 'posted';
    }
    return true;
  });

  const upcomingCount = items.filter(i => i.status !== 'posted' && i.status !== 'skipped').length;
  const postedCount = items.filter(i => i.status === 'posted').length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#333', fontFamily: MONO, fontSize: 12 }}>
        Loading content...
      </div>
    );
  }

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#0D0D0D', border: '1px solid #141414', borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>To Post</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: upcomingCount > 0 ? '#4A9EFF' : '#fff' }}>{upcomingCount}</div>
        </div>
        <div style={{ background: '#0D0D0D', border: '1px solid #141414', borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Posted</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: postedCount > 0 ? '#7BC853' : '#fff' }}>{postedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'this_week', label: 'This Week' },
          { key: 'posted', label: '✓ Posted' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${filter === f.key ? '#E81A1A' : '#141414'}`, background: filter === f.key ? 'rgba(232,26,26,0.1)' : 'transparent', color: filter === f.key ? '#E81A1A' : '#444', fontFamily: MONO }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.2 }}>🗓️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#444', marginBottom: 8 }}>
            {filter === 'posted' ? 'Nothing posted yet' : 'No content scheduled'}
          </div>
          <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
            {filter === 'posted' ? "Download content below and mark it as posted once you've shared it." : "Studio 65 will schedule your content here once it's ready."}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(item => (
            <ContentCard key={item.id} item={item} onMarkPosted={handleMarkPosted} />
          ))}
        </div>
      )}
    </div>
  );
}