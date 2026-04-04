import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';
const IS = {
  background: '#1E1E1E',
  border: '1px solid #2A2A2A',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  fontFamily: 'Syne, sans-serif',
  marginBottom: 12,
};

export default function LeadModal({ open, lead, onClose, onSave }) {
  const [form, setForm] = useState({
    company: '',
    contact_name: '',
    email: '',
    phone: '',
    project_type: '',
    proposal_value: '',
    status: 'prospect',
    follow_up_date: '',
    notes: '',
  });

  useEffect(() => {
    if (lead) {
      setForm({
        company: lead.company || '',
        contact_name: lead.contact_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        project_type: lead.project_type || '',
        proposal_value: lead.proposal_value || '',
        status: lead.status || 'prospect',
        follow_up_date: lead.follow_up_date || '',
        notes: lead.notes || '',
      });
    } else {
      setForm({
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        project_type: '',
        proposal_value: '',
        status: 'prospect',
        follow_up_date: '',
        notes: '',
      });
    }
  }, [lead, open]);

  const handleSubmit = async () => {
    if (!form.company || !form.contact_name) {
      alert('Company and contact name required');
      return;
    }

    const data = {
      ...form,
      proposal_value: form.proposal_value ? parseFloat(form.proposal_value) : null,
      first_contact_date: lead?.first_contact_date || new Date().toISOString().split('T')[0],
      last_contact_date: new Date().toISOString().split('T')[0],
      activity: [
        ...(lead?.activity || []),
        { type: 'note', message: 'Updated', date: new Date().toISOString() },
      ],
    };

    onSave(data);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0A0A0A',
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid #1E1E1E',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{lead ? 'Edit Lead' : 'New Lead'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>COMPANY *</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Brand or agency name"
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>CONTACT NAME *</label>
          <input
            type="text"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            placeholder="Full name"
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>EMAIL</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="contact@company.com"
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>PHONE</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>PROJECT TYPE</label>
          <input
            type="text"
            value={form.project_type}
            onChange={(e) => setForm({ ...form, project_type: e.target.value })}
            placeholder="e.g. Commercial, music video, product demo"
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>PROPOSAL VALUE</label>
          <input
            type="number"
            value={form.proposal_value}
            onChange={(e) => setForm({ ...form, proposal_value: e.target.value })}
            placeholder="5000"
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>PIPELINE STATUS</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            style={{ ...IS, marginBottom: 12 }}
          >
            <option value="prospect">Prospect</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="negotiating">Negotiating</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>NEXT FOLLOW-UP</label>
          <input
            type="date"
            value={form.follow_up_date}
            onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
            style={IS}
          />

          <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 4 }}>NOTES</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Add any notes about this lead..."
            rows={3}
            style={{ ...IS, resize: 'none', marginBottom: 12 }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'transparent',
                border: '1px solid #2A2A2A',
                borderRadius: 10,
                color: '#666',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1,
                padding: '12px 0',
                background: '#E81A1A',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}