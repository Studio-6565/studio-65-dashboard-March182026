import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LBL = { fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' };

const SHOOT_TYPES = ['Corporate Event', 'Wedding', 'Brand / Commercial', 'Music Video', 'Real Estate', 'Portrait / Headshots', 'Social Content', 'Documentary', 'Other'];

export default function BookingRequestForm({ contact, onSent, onClose }) {
  const [form, setForm] = useState({
    project_name: '',
    shoot_type: '',
    preferred_date: '',
    preferred_date_alt: '',
    location: '',
    description: '',
    budget: '',
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.shoot_type || !form.description.trim()) return;
    setSending(true);
    await base44.entities.BookingRequest.create({
      ...form,
      client_name: contact.name,
      status: 'pending',
    });
    setSending(false);
    setDone(true);
    setTimeout(() => { onSent(); }, 2000);
  };

  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Request Sent!</div>
        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>Studio 65 will review your request and get back to you shortly.</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom)' }}>
      <div style={{ width: '100%', maxWidth: 600, background: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '92vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Book a Shoot</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Submit a request to Studio 65</div>
          </div>
          <button onClick={onClose} style={{ background: '#2A2A2A', border: 'none', color: '#aaa', fontSize: 18, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div>
          <label style={LBL}>Project / Event Name (optional)</label>
          <input style={IS} placeholder="e.g. Annual Brand Campaign" value={form.project_name} onChange={e => set('project_name', e.target.value)} />
        </div>

        <div>
          <label style={LBL}>Type of Shoot *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SHOOT_TYPES.map(t => (
              <button key={t} onClick={() => set('shoot_type', t)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #333', background: form.shoot_type === t ? '#E81A1A' : '#2A2A2A', color: form.shoot_type === t ? '#fff' : '#777', transition: 'all 0.15s' }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LBL}>Preferred Date</label>
            <input type="date" style={IS} value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Alternative Date</label>
            <input type="date" style={IS} value={form.preferred_date_alt} onChange={e => set('preferred_date_alt', e.target.value)} />
          </div>
        </div>

        <div>
          <label style={LBL}>Location / Address</label>
          <input style={IS} placeholder="City or specific address" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>

        <div>
          <label style={LBL}>Budget Range</label>
          <input style={IS} placeholder="e.g. $2,000–$3,500" value={form.budget} onChange={e => set('budget', e.target.value)} />
        </div>

        <div>
          <label style={LBL}>Tell us about the project *</label>
          <textarea
            rows={5}
            style={{ ...IS, resize: 'vertical', lineHeight: 1.7 }}
            placeholder="Describe your vision, goals, style references, deliverables you need, timeline, etc."
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={sending || !form.shoot_type || !form.description.trim()}
          style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (sending || !form.shoot_type || !form.description.trim()) ? 0.5 : 1 }}
        >
          {sending ? 'Sending...' : '📤 Submit Booking Request'}
        </button>
      </div>
    </div>
  );
}