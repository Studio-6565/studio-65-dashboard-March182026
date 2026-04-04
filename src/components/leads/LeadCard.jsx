import React from 'react';
import { Trash2, ArrowRight, Phone, Mail } from 'lucide-react';

const STATUS_INFO = {
  prospect: { label: 'Prospect', color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)' },
  proposal_sent: { label: 'Proposal Sent', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  negotiating: { label: 'Negotiating', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  won: { label: 'Won', color: '#7BC853', bg: 'rgba(123,200,83,0.1)' },
  lost: { label: 'Lost', color: '#E81A1A', bg: 'rgba(232,26,26,0.1)' },
};

const MONO = '"DM Mono", monospace';

export default function LeadCard({ lead, onStatusChange, onDelete, onEdit }) {
  const st = STATUS_INFO[lead.status];
  const daysSinceContact = lead.last_contact_date
    ? Math.floor((new Date() - new Date(lead.last_contact_date)) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();

  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #1E1E1E',
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1E1E1E')}
      onClick={onEdit}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{lead.company}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{lead.contact_name}</div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: MONO,
            padding: '3px 8px',
            borderRadius: 4,
            background: st.bg,
            color: st.color,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {st.label}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, fontSize: 12, color: '#888' }}>
        {lead.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={13} />
            {lead.email}
          </div>
        )}
        {lead.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={13} />
            {lead.phone}
          </div>
        )}
        {lead.proposal_value && (
          <div style={{ fontFamily: MONO, fontSize: 11 }}>
            💰 ${lead.proposal_value.toLocaleString()} {lead.currency}
          </div>
        )}
      </div>

      {/* Follow-up status */}
      {lead.follow_up_date && (
        <div
          style={{
            padding: '8px 10px',
            background: isOverdue ? 'rgba(232,26,26,0.1)' : 'rgba(74,158,255,0.1)',
            border: `1px solid ${isOverdue ? 'rgba(232,26,26,0.25)' : 'rgba(74,158,255,0.25)'}`,
            borderRadius: 8,
            fontSize: 11,
            color: isOverdue ? '#E81A1A' : '#4A9EFF',
            fontFamily: MONO,
            marginBottom: 10,
          }}
        >
          {isOverdue ? '⚠️ OVERDUE: ' : '📅 '}
          Follow up: {lead.follow_up_date}
        </div>
      )}

      {daysSinceContact !== null && (
        <div style={{ fontSize: 11, color: '#444', fontFamily: MONO, marginBottom: 10 }}>
          Last contact: {daysSinceContact} days ago
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px solid #1A1A1A',
          onClick: (e) => e.stopPropagation(),
        }}
      >
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          style={{
            flex: 1,
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: 8,
            padding: '6px 10px',
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'Syne, sans-serif',
          }}
        >
          <option value="prospect">→ Prospect</option>
          <option value="proposal_sent">→ Proposal Sent</option>
          <option value="negotiating">→ Negotiating</option>
          <option value="won">→ Won</option>
          <option value="lost">→ Lost</option>
        </select>
        <button
          onClick={() => onDelete(lead.id)}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: '1px solid #2A2A2A',
            borderRadius: 8,
            color: '#666',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}