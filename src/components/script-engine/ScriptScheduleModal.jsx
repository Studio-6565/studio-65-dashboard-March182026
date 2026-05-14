import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Zap } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Twitter/X', 'Other'];
const CONTENT_TYPES = ['Reel', 'Post', 'Story', 'Short', 'Video', 'Carousel', 'Other'];

export default function ScriptScheduleModal({ version, defaultDate, projects, onScheduled, onClose }) {
  const project = projects.find(p => p.id === version.project_id);
  const [form, setForm] = useState({
    title: version.label || version.project_name || 'Untitled Script',
    platform: version.platform || 'Instagram',
    content_type: 'Reel',
    scheduled_date: defaultDate || '',
    scheduled_time: '12:00',
    caption: '',
    notes: '',
    status: 'scheduled',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.scheduled_date) return;
    setSaving(true);
    await base44.entities.ContentSchedule.create({
      project_id: version.project_id,
      project_name: version.project_name || project?.name,
      client_name: project?.client || '',
      title: form.title,
      platform: form.platform,
      content_type: form.content_type,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      caption: form.caption,
      notes: `Script v${version.version_number} — ${version.label || ''}`,
      status: form.status,
    });
    setSaving(false);
    onScheduled();
  };

  const IS = {
    width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8,
    padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
    fontFamily: 'Syne, sans-serif', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#F59E0B" /> Schedule Script
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 3 }}>
              {version.label || `v${version.version_number}`} · {project?.name || version.project_name}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', border: '1px solid #222', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Title</label>
            <input style={IS} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Platform</label>
              <select style={IS} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Content Type</label>
              <select style={IS} value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Publish Date *</label>
              <input type="date" style={IS} value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Time</label>
              <input type="time" style={IS} value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Caption / Copy (optional)</label>
            <textarea style={{ ...IS, resize: 'none' }} rows={3} value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Post caption for this piece of content..." />
          </div>

          <div>
            <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Status</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['scheduled', 'ready', 'posted'].map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: MONO, border: `1px solid ${form.status === s ? '#E81A1A' : '#1E1E1E'}`,
                  background: form.status === s ? 'rgba(232,26,26,0.1)' : 'transparent',
                  color: form.status === s ? '#E81A1A' : '#555',
                }}>{s}</button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.scheduled_date}
            style={{
              width: '100%', padding: '13px 0', background: form.scheduled_date ? '#E81A1A' : '#1A1A1A',
              border: 'none', borderRadius: 10, color: form.scheduled_date ? '#fff' : '#444',
              fontSize: 14, fontWeight: 800, cursor: form.scheduled_date ? 'pointer' : 'default',
              marginTop: 4,
            }}
          >
            {saving ? 'Scheduling...' : '🚀 Add to Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
}