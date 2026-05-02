import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#0D0D0D', border: '1px solid #222', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LABEL = { fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, display: 'block' };

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? 'rgba(232,26,26,0.5)' : '#252525'}`, background: active ? 'rgba(232,26,26,0.1)' : '#0D0D0D', color: active ? '#E81A1A' : '#666', fontFamily: MONO }}>
      {label}
    </button>
  );
}

// ── Reserve a Date ─────────────────────────────────────────────────────────────
export function ReserveDateSheet({ contact, onClose }) {
  const [form, setForm] = useState({ preferred_date: '', backup_date: '', time_window: '', shoot_type: '', duration: '', location: '', notes: '', urgent: '', callback: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.BookingRequest.create({
      client_name: contact.name,
      project_name: 'Date Reservation',
      shoot_type: form.shoot_type || 'Date Request',
      preferred_date: form.preferred_date,
      preferred_date_alt: form.backup_date,
      location: form.location,
      description: `Time window: ${form.time_window}\nDuration: ${form.duration}\nUrgent: ${form.urgent}\nCallback requested: ${form.callback}\nNotes: ${form.notes}`,
      status: 'pending',
      studio_note: 'DATE REQUEST PENDING',
    });
    setSaving(false);
    setDone(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#080808', border: '1px solid #141414', borderRadius: '24px 24px 0 0', padding: '28px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quick Action</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Reserve a Date</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#111', border: '1px solid #1E1E1E', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0 40px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={24} color="#7BC853" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Date Request Sent!</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 24 }}>Studio 65 will review availability and follow up to confirm.</div>
            <button onClick={onClose} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 16px', background: 'rgba(74,158,255,0.05)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 12, fontSize: 13, color: '#4A9EFF', lineHeight: 1.7 }}>
              ℹ️ This does not confirm your booking. Studio 65 will review availability and follow up.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={LABEL}>Preferred Date</label><input type="date" style={IS} value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} /></div>
              <div><label style={LABEL}>Backup Date</label><input type="date" style={IS} value={form.backup_date} onChange={e => set('backup_date', e.target.value)} /></div>
            </div>
            <div><label style={LABEL}>Preferred Time Window</label><input style={IS} placeholder="e.g. 10am–2pm" value={form.time_window} onChange={e => set('time_window', e.target.value)} /></div>
            <div><label style={LABEL}>Shoot Type</label><input style={IS} placeholder="e.g. Event coverage, brand shoot" value={form.shoot_type} onChange={e => set('shoot_type', e.target.value)} /></div>
            <div><label style={LABEL}>Estimated Duration</label><input style={IS} placeholder="e.g. Half day, 4 hours" value={form.duration} onChange={e => set('duration', e.target.value)} /></div>
            <div><label style={LABEL}>Location (if known)</label><input style={IS} placeholder="City or venue name" value={form.location} onChange={e => set('location', e.target.value)} /></div>
            <div>
              <label style={LABEL}>Urgent?</label>
              <div style={{ display: 'flex', gap: 8 }}>{['Yes','No'].map(v => <Chip key={v} label={v} active={form.urgent === v} onClick={() => set('urgent', v)} />)}</div>
            </div>
            <div>
              <label style={LABEL}>Request a Call Back?</label>
              <div style={{ display: 'flex', gap: 8 }}>{['Yes','No'].map(v => <Chip key={v} label={v} active={form.callback === v} onClick={() => set('callback', v)} />)}</div>
            </div>
            <div><label style={LABEL}>Quick Notes</label><textarea style={{ ...IS, resize: 'none' }} rows={2} placeholder="Anything Studio 65 should know..." value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            <button onClick={handleSubmit} disabled={saving || !form.preferred_date} style={{ width: '100%', padding: '15px 0', marginTop: 4, background: form.preferred_date ? '#E81A1A' : '#1A1A1A', border: 'none', borderRadius: 12, color: form.preferred_date ? '#fff' : '#444', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <Loader2 size={16} /> : null}
              {saving ? 'Sending...' : 'Reserve Date'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Request a Call Back ─────────────────────────────────────────────────────────
const TOPICS = ['New shoot','Existing project','Invoice/payment','Deliverables','Strategy call','Content planning','Contract','Other'];

export function CallBackSheet({ contact, projects, onClose }) {
  const [form, setForm] = useState({ name: contact.name || '', phone: contact.phone || '', email: contact.email || '', call_date: '', call_time: '', topic: '', project_related: '', project_id: '', urgency: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    const project = projects.find(p => p.id === form.project_id);
    await base44.entities.BookingRequest.create({
      client_name: contact.name,
      project_name: project?.name || '',
      shoot_type: 'Call Back Request',
      description: `Topic: ${form.topic}\nPhone: ${form.phone}\nPreferred: ${form.call_date} ${form.call_time}\nUrgency: ${form.urgency}\nNotes: ${form.notes}`,
      status: 'pending',
      studio_note: 'CALL BACK REQUESTED',
    });
    setSaving(false);
    setDone(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#080808', border: '1px solid #141414', borderRadius: '24px 24px 0 0', padding: '28px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quick Action</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Request a Call Back</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#111', border: '1px solid #1E1E1E', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0 40px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={24} color="#4A9EFF" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Call Back Requested!</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 24 }}>Studio 65 has been notified and will reach out at your preferred time.</div>
            <button onClick={onClose} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={LABEL}>Your Name</label><input style={IS} value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div><label style={LABEL}>Phone Number</label><input style={IS} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 416 555 0100" /></div>
              <div><label style={LABEL}>Preferred Date</label><input type="date" style={IS} value={form.call_date} onChange={e => set('call_date', e.target.value)} /></div>
              <div><label style={LABEL}>Preferred Time</label><input style={IS} placeholder="e.g. 2pm–4pm" value={form.call_time} onChange={e => set('call_time', e.target.value)} /></div>
            </div>
            <div>
              <label style={LABEL}>Topic</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TOPICS.map(t => <Chip key={t} label={t} active={form.topic === t} onClick={() => set('topic', t)} />)}
              </div>
            </div>
            {projects.length > 0 && (
              <div>
                <label style={LABEL}>Related Project (optional)</label>
                <select style={IS} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">General inquiry</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div><label style={LABEL}>Notes</label><textarea style={{ ...IS, resize: 'none' }} rows={2} placeholder="What would you like to discuss?" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            <button onClick={handleSubmit} disabled={saving || !form.phone} style={{ width: '100%', padding: '15px 0', marginTop: 4, background: form.phone ? '#E81A1A' : '#1A1A1A', border: 'none', borderRadius: 12, color: form.phone ? '#fff' : '#444', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <Loader2 size={16} /> : null}
              {saving ? 'Sending...' : 'Request Call Back'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}