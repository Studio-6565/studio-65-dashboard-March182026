import React, { useState } from 'react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };

const CLIENT_TEMPLATE = `PRODUCTION SERVICES AGREEMENT

This agreement is entered into between Studio 65 ("Studio") and [CLIENT NAME] ("Client").

1. SERVICES
The Studio agrees to provide the following services: [DESCRIBE SERVICES]

2. PROJECT DETAILS
Project: [PROJECT NAME]
Shoot Date(s): [DATE(S)]
Location: [LOCATION]

3. FEES & PAYMENT
Total Fee: $[AMOUNT]
Deposit (50%): $[DEPOSIT] — due upon signing
Balance: $[BALANCE] — due upon delivery

4. DELIVERABLES
The Studio will deliver: [LIST DELIVERABLES]
Estimated delivery: [DELIVERY DATE]

5. USAGE RIGHTS
All delivered content is licensed to the Client for [usage scope]. The Studio retains the right to use content for portfolio purposes unless otherwise agreed in writing.

6. REVISIONS
This agreement includes [#] round(s) of revisions. Additional revisions are billed at $[RATE]/hr.

7. CANCELLATION
Cancellations within 7 days of the shoot are subject to a [%]% cancellation fee.

8. LIMITATION OF LIABILITY
Studio 65 is not liable for losses beyond the value of the agreement.

By signing below, both parties agree to the terms of this contract.

Studio 65
Signature: ____________________  Date: ____________

Client: [CLIENT NAME]
Signature: ____________________  Date: ____________`;

const CREW_TEMPLATE = `CREW MEMBER AGREEMENT

This agreement is between Studio 65 ("Studio") and [CREW NAME] ("Crew Member").

1. ENGAGEMENT
The Studio engages the Crew Member as: [ROLE]
Project: [PROJECT NAME]
Date(s): [DATE(S)]
Location: [LOCATION]

2. COMPENSATION
Rate: $[RATE] [flat / per hour]
Payment will be processed within [# days] of project completion.

3. RESPONSIBILITIES
The Crew Member agrees to:
- Arrive on time as specified in the call sheet
- Bring all required equipment agreed upon
- Maintain professional conduct on set
- Keep all project details confidential

4. EQUIPMENT
The Crew Member will provide: [EQUIPMENT LIST]
Studio-provided gear: [STUDIO GEAR]

5. INTELLECTUAL PROPERTY
All work produced during this engagement is property of Studio 65 and its clients.

6. CONFIDENTIALITY
The Crew Member agrees not to share project details, client information, or footage without written consent from Studio 65.

7. CANCELLATION
Cancellations by the Crew Member within 48 hours of shoot are subject to a $[AMOUNT] penalty.

By signing below, both parties agree to the terms of this agreement.

Studio 65
Signature: ____________________  Date: ____________

Crew Member: [CREW NAME]
Signature: ____________________  Date: ____________`;

export default function ContractEditor({ contract, contacts, projects, onSave, onCancel }) {
  const [form, setForm] = useState({
    title:         contract?.title         || '',
    type:          contract?.type          || 'client',
    contact_name:  contract?.contact_name  || '',
    contact_email: contract?.contact_email || '',
    project_id:    contract?.project_id    || '',
    project_name:  contract?.project_name  || '',
    body:          contract?.body          || '',
    status:        contract?.status        || 'draft',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const applyTemplate = () => {
    const t = form.type === 'crew' ? CREW_TEMPLATE : CLIENT_TEMPLATE;
    set('body', t);
  };

  const handleContactChange = (name) => {
    set('contact_name', name);
    const c = contacts.find(c => c.name === name);
    if (c?.email) set('contact_email', c.email);
  };

  const handleProjectChange = (id) => {
    set('project_id', id);
    const p = projects.find(p => p.id === id);
    if (p) set('project_name', p.name);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const filteredContacts = contacts.filter(c => {
    if (form.type === 'client') return (c.types || []).includes('Client');
    if (form.type === 'crew')   return (c.types || []).includes('Crew') || (c.types || []).includes('Vendor');
    return true;
  });

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>{contract ? 'Edit Contract' : 'New Contract'}</div>
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim() || !form.body.trim()}
          style={{ padding: '10px 22px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || !form.title || !form.body) ? 0.5 : 1 }}
        >{saving ? 'Saving...' : 'Save Contract'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>

        {/* Left: meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Type */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Contract Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['client', 'crew'].map(t => (
                <button key={t} onClick={() => set('type', t)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: form.type === t ? '#E81A1A' : '#1E1E1E',
                  color: form.type === t ? '#fff' : '#555',
                }}>{t === 'client' ? '👤 Client' : '🎬 Crew'}</button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Contract Title</label>
            <input style={IS} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Spring Campaign Agreement" />
          </div>

          {/* Contact */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
              {form.type === 'crew' ? 'Crew Member' : 'Client'}
            </label>
            <select style={{ ...IS, cursor: 'pointer' }} value={form.contact_name} onChange={e => handleContactChange(e.target.value)}>
              <option value="">Select contact...</option>
              {filteredContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Email override */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Their Email</label>
            <input style={IS} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="email@example.com" />
          </div>

          {/* Project */}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Linked Project</label>
            <select style={{ ...IS, cursor: 'pointer' }} value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
              <option value="">None</option>
              {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Template button */}
          <button
            onClick={applyTemplate}
            style={{ padding: '10px 0', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}
          >📄 Load {form.type === 'crew' ? 'Crew' : 'Client'} Template</button>

          {/* Status indicator */}
          {contract && (
            <div style={{ padding: '10px 14px', background: '#111', border: '1px solid #1E1E1E', borderRadius: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: form.status === 'signed' ? '#7BC853' : form.status === 'sent' ? '#4A9EFF' : form.status === 'declined' ? '#E81A1A' : '#666' }}>
                {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
              </div>
              {contract.signature_name && <div style={{ fontSize: 11, color: '#555', fontFamily: MONO, marginTop: 4 }}>Signed by: {contract.signature_name}</div>}
              {contract.signed_at && <div style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>On: {new Date(contract.signed_at).toLocaleDateString()}</div>}
            </div>
          )}
        </div>

        {/* Right: body editor */}
        <div>
          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Contract Body</label>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value)}
            rows={30}
            placeholder="Write your contract here, or click 'Load Template' to start with a pre-built template..."
            style={{
              ...IS,
              resize: 'vertical',
              lineHeight: 1.75,
              fontFamily: MONO,
              fontSize: 12,
              minHeight: 520,
            }}
          />
          <div style={{ fontSize: 11, color: '#444', fontFamily: MONO, marginTop: 6 }}>
            {form.body.length} chars · {form.body.split('\n').length} lines
          </div>
        </div>
      </div>
    </div>
  );
}