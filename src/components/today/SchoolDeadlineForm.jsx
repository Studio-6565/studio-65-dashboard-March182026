import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { X } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 };

export default function SchoolDeadlineForm({ onSaved, onClose }) {
  const [form, setForm] = useState({ title: '', course: '', due_date: '', due_time: '', type: 'assignment', effort: '1hr', weight_pct: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim() || !form.due_date) { showToast('Title and due date required', 'red'); return; }
    setSaving(true);
    await base44.entities.SchoolDeadline.create({ ...form, weight_pct: form.weight_pct ? Number(form.weight_pct) : undefined, done: false });
    showToast('Deadline added', 'green');
    onSaved?.();
    onClose?.();
    setSaving(false);
  };

  return (
    <div style={{ background: '#0D0D0D', border: '1px solid #222', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🎓 Add School Deadline</div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={14} /></button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={LS}>Assignment / Title</label>
          <input style={IS} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. BUSI2200 Case Study" />
        </div>
        <div>
          <label style={LS}>Course</label>
          <input style={IS} value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. BUSI2200" />
        </div>
        <div>
          <label style={LS}>Type</label>
          <select style={IS} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {['assignment', 'quiz', 'exam', 'project', 'reading', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={LS}>Due Date</label>
          <input style={IS} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div>
          <label style={LS}>Due Time</label>
          <input style={IS} type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
        </div>
        <div>
          <label style={LS}>Effort</label>
          <select style={IS} value={form.effort} onChange={e => setForm(f => ({ ...f, effort: e.target.value }))}>
            {['15min', '30min', '1hr', 'half-day', 'full-day'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={LS}>Grade Weight (%)</label>
          <input style={IS} type="number" min="0" max="100" value={form.weight_pct} onChange={e => setForm(f => ({ ...f, weight_pct: e.target.value }))} placeholder="e.g. 20" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '10px 0', background: saving ? '#1A1A1A' : '#A78BFA', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        {saving ? 'Saving...' : 'Add Deadline'}
      </button>
    </div>
  );
}