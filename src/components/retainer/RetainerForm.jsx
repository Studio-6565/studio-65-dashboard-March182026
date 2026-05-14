import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';
const IS = {
  background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10,
  padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none',
  width: '100%', fontFamily: 'Syne, sans-serif',
};
const Label = ({ children }) => (
  <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.05em' }}>
    {children}
  </label>
);

const RETAINER_TEMPLATE = `RETAINER SERVICES AGREEMENT

This Retainer Agreement is entered into between Studio 65 ("Studio") and [CLIENT NAME] ("Client").

1. SCOPE OF RETAINER
The Studio agrees to provide [DESCRIBE SERVICES] on a monthly retainer basis.

2. HOURS & FEES
Monthly Hours Bucket: [HOURS] hours
Monthly Fee: $[FEE]
Hours roll over: No (unused hours expire at month end unless otherwise agreed)

3. DELIVERABLES
Work will be completed within the agreed hours. Additional hours are billed at $[RATE]/hr.

4. PAYMENT
The monthly retainer fee is due on the 1st of each month. Late payments incur a 2% monthly interest.

5. TERM & RENEWAL
Start Date: [START DATE]
This agreement renews [automatically / manually] on [RENEWAL DATE] unless cancelled in writing 30 days prior.

6. TERMINATION
Either party may terminate with 30 days written notice.

7. INTELLECTUAL PROPERTY
All deliverables become Client property upon receipt of full payment.

By signing below, both parties agree to the terms of this retainer.

Studio 65
Signature: ____________________  Date: ____________

Client: [CLIENT NAME]
Signature: ____________________  Date: ____________`;

export default function RetainerForm({ contract, contacts, onSave, onCancel }) {
  const [form, setForm] = useState({
    title:                    contract?.title                    || '',
    type:                     'retainer',
    status:                   contract?.status                   || 'active',
    contact_name:             contract?.contact_name             || '',
    contact_email:            contract?.contact_email            || '',
    body:                     contract?.body                     || RETAINER_TEMPLATE,
    retainer_monthly_hours:   contract?.retainer_monthly_hours   || '',
    retainer_monthly_fee:     contract?.retainer_monthly_fee     || '',
    retainer_start_date:      contract?.retainer_start_date      || '',
    retainer_renewal_date:    contract?.retainer_renewal_date    || '',
    retainer_auto_renew:      contract?.retainer_auto_renew      ?? false,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const clientContacts = contacts.filter(c => (c.types || []).includes('Client'));

  const handleContactChange = (name) => {
    set('contact_name', name);
    const c = clientContacts.find(c => c.name === name);
    if (c?.email) set('contact_email', c.email);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>{contract ? 'Edit Retainer' : 'New Retainer Contract'}</div>
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          style={{ padding: '10px 22px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || !form.title) ? 0.5 : 1 }}
        >{saving ? 'Saving...' : 'Save Retainer'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: retainer meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Retainer badge */}
          <div style={{ padding: '8px 14px', background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 8, fontFamily: MONO, fontSize: 10, color: '#7BC853', fontWeight: 700 }}>
            📋 RETAINER CONTRACT
          </div>

          <div>
            <Label>Retainer Title</Label>
            <input style={IS} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Acme Corp Monthly Retainer" />
          </div>

          <div>
            <Label>Client</Label>
            <select style={{ ...IS, cursor: 'pointer' }} value={form.contact_name} onChange={e => handleContactChange(e.target.value)}>
              <option value="">Select client...</option>
              {clientContacts.map(c => <option key={c.id} value={c.name}>{c.name}{c.client_company ? ` — ${c.client_company}` : ''}</option>)}
            </select>
          </div>

          <div>
            <Label>Client Email</Label>
            <input style={IS} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="email@example.com" />
          </div>

          {/* Retainer-specific fields */}
          <div style={{ padding: '14px', background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Retainer Terms</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Monthly Hours</Label>
                <input style={IS} type="number" value={form.retainer_monthly_hours} onChange={e => set('retainer_monthly_hours', parseFloat(e.target.value) || '')} placeholder="e.g. 20" />
              </div>
              <div>
                <Label>Monthly Fee ($)</Label>
                <input style={IS} type="number" value={form.retainer_monthly_fee} onChange={e => set('retainer_monthly_fee', parseFloat(e.target.value) || '')} placeholder="e.g. 2500" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Start Date</Label>
                <input style={IS} type="date" value={form.retainer_start_date} onChange={e => set('retainer_start_date', e.target.value)} />
              </div>
              <div>
                <Label>Renewal Date</Label>
                <input style={IS} type="date" value={form.retainer_renewal_date} onChange={e => set('retainer_renewal_date', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Auto-Renew</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => set('retainer_auto_renew', v)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', border: 'none',
                    background: form.retainer_auto_renew === v ? (v ? 'rgba(123,200,83,0.2)' : 'rgba(232,26,26,0.15)') : '#1E1E1E',
                    color: form.retainer_auto_renew === v ? (v ? '#7BC853' : '#E81A1A') : '#555',
                  }}>{v ? '✓ Yes' : '✗ No'}</button>
                ))}
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <select style={{ ...IS, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Rate summary */}
          {form.retainer_monthly_hours && form.retainer_monthly_fee && (
            <div style={{ padding: '10px 14px', background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>Effective Rate</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>
                ${(form.retainer_monthly_fee / form.retainer_monthly_hours).toFixed(0)}<span style={{ fontSize: 11, color: '#555' }}>/hr</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: contract body */}
        <div>
          <Label>Contract Body</Label>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value)}
            rows={28}
            style={{ ...IS, resize: 'vertical', lineHeight: 1.75, fontFamily: MONO, fontSize: 12, minHeight: 500 }}
          />
          <div style={{ fontSize: 11, color: '#444', fontFamily: MONO, marginTop: 6 }}>
            {form.body.length} chars
          </div>
        </div>
      </div>
    </div>
  );
}