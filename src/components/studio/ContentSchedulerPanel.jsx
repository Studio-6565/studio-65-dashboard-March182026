import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import { Plus, Trash2, Calendar, Download, Upload } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const SS = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Twitter/X', 'Other'];
const CONTENT_TYPES = ['Reel', 'Post', 'Story', 'Short', 'Video', 'Carousel', 'Other'];
const STATUS_STYLE = {
  scheduled: { color: '#4A9EFF', label: 'Scheduled' },
  ready:     { color: '#7BC853', label: 'Ready' },
  posted:    { color: '#7BC853', label: 'Posted ✓' },
  skipped:   { color: '#666',    label: 'Skipped' },
};

const emptyForm = {
  title: '', caption: '', platform: 'Instagram', content_type: 'Reel',
  scheduled_date: '', scheduled_time: '', notes: '', status: 'scheduled',
};

export default function ContentSchedulerPanel({ project, contacts = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const fileRef = useRef(null);

  // Get unique clients from this project or contacts
  const clients = contacts
    .filter(c => (c.types || []).includes('Client'))
    .map(c => c.name);

  const [selectedClient, setSelectedClient] = useState(project?.client || '');

  useEffect(() => {
    const query = project
      ? { project_id: project.id }
      : selectedClient
        ? { client_name: selectedClient }
        : {};
    base44.entities.ContentSchedule.filter(query, 'scheduled_date', 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [project?.id, selectedClient]);

  const handleFileChange = async (file) => {
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, _file_url: res.file_url, _file_name: file.name }));
    setFilePreview(file.name);
    setUploading(false);
    showToast('File uploaded', 'blue');
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.scheduled_date) {
      showToast('Title and date are required', 'red'); return;
    }
    setSaving(true);
    const clientName = project?.client || selectedClient;
    await base44.entities.ContentSchedule.create({
      project_id: project?.id || '',
      project_name: project?.name || '',
      client_name: clientName,
      title: form.title.trim(),
      caption: form.caption.trim(),
      platform: form.platform,
      content_type: form.content_type,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      notes: form.notes.trim(),
      status: form.status,
      file_url: form._file_url || '',
      file_name: form._file_name || '',
    });

    // Reload
    const query = project ? { project_id: project.id } : { client_name: clientName };
    const updated = await base44.entities.ContentSchedule.filter(query, 'scheduled_date', 200);
    setItems(updated);
    setForm(emptyForm);
    setFilePreview(null);
    setShowForm(false);
    setSaving(false);
    showToast('Content scheduled!', 'green');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scheduled content?')) return;
    await base44.entities.ContentSchedule.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    showToast('Deleted', 'red');
  };

  const handleStatusChange = async (item, status) => {
    const updated = { ...item, status };
    await base44.entities.ContentSchedule.update(item.id, updated);
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Content Scheduler {project ? `· ${project.name}` : ''}
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: showForm ? 'transparent' : '#E81A1A', border: showForm ? '1px solid #333' : 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> {showForm ? 'Cancel' : 'Schedule Content'}
        </button>
      </div>

      {/* Client selector (only if no project context) */}
      {!project && clients.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <select style={{ ...SS, background: '#1A1A1A' }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
            <option value="">— All clients —</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>TITLE *</label>
              <input style={SS} placeholder="e.g. Spring Campaign Reel #1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>PLATFORM</label>
              <select style={SS} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>CONTENT TYPE</label>
              <select style={SS} value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>POST DATE *</label>
              <input type="date" style={SS} value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>POST TIME</label>
              <input type="time" style={SS} value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>SUGGESTED CAPTION</label>
              <textarea rows={3} style={{ ...SS, resize: 'vertical', lineHeight: 1.6 }} placeholder="Write the caption the client should post..." value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>NOTES FOR CLIENT</label>
              <input style={SS} placeholder="Any special instructions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'block', marginBottom: 5 }}>STATUS</label>
              <select style={SS} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="ready">Ready to Post</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => handleFileChange(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ height: 38, padding: '0 12px', background: form._file_url ? 'rgba(123,200,83,0.1)' : '#2A2A2A', border: `1px solid ${form._file_url ? 'rgba(123,200,83,0.3)' : '#333'}`, borderRadius: 8, color: form._file_url ? '#7BC853' : '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={13} />
                {uploading ? 'Uploading...' : filePreview ? `✓ ${filePreview.slice(0,20)}` : 'Attach File'}
              </button>
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !form.title.trim() || !form.scheduled_date} style={{ width: '100%', padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Scheduling...' : '+ Schedule Content'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: '#444', fontSize: 13, padding: '12px 0', fontFamily: MONO }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#444', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No content scheduled yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{item.platform} · {item.content_type}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={9} /> {item.scheduled_date}{item.scheduled_time ? ' ' + item.scheduled_time : ''}</span>
                </div>
                {item.client_name && <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginTop: 3 }}>Client: {item.client_name}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={item.status}
                  onChange={e => handleStatusChange(item, e.target.value)}
                  style={{ background: '#111', border: '1px solid #2A2A2A', borderRadius: 6, padding: '4px 8px', color: STATUS_STYLE[item.status]?.color || '#fff', fontSize: 10, fontFamily: MONO, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                >
                  {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noreferrer" style={{ padding: '5px 10px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 6, color: '#4A9EFF', fontSize: 10, fontFamily: MONO, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Download size={11} /> File
                  </a>
                )}
                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px 6px' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}