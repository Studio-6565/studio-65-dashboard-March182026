import React from 'react';

const MONO = '"DM Mono", monospace';

const STATUS_STYLE = {
  draft:    { bg: 'rgba(100,100,100,0.15)', color: '#666',    label: 'Draft' },
  sent:     { bg: 'rgba(74,158,255,0.12)',  color: '#4A9EFF', label: 'Sent' },
  signed:   { bg: 'rgba(123,200,83,0.15)',  color: '#7BC853', label: 'Signed' },
  declined: { bg: 'rgba(232,26,26,0.12)',   color: '#E81A1A', label: 'Declined' },
};

const TYPE_STYLE = {
  client:   { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Client' },
  crew:     { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: 'Crew' },
  retainer: { bg: 'rgba(123,200,83,0.12)',  color: '#7BC853', label: 'Retainer' },
};

export default function ContractList({ contracts, filterType, onFilterType, onNew, onEdit, onDelete, onSend }) {
  const filtered = contracts.filter(c =>
    filterType === 'all' ? true : c.type === filterType
  );

  const chip = (active, label, onClick) => (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', border: active ? '1px solid rgba(232,26,26,0.5)' : '1px solid #2A2A2A',
      background: active ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
      color: active ? '#E81A1A' : '#666',
      fontFamily: MONO, whiteSpace: 'nowrap',
    }}>{label}</button>
  );

  return (
    <div style={{ fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Contracts</div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>{contracts.length} total · {contracts.filter(c => c.status === 'signed').length} signed</div>
        </div>
        <button
          onClick={onNew}
          style={{ padding: '10px 20px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >+ New Contract</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {chip(filterType === 'all',      'All',      () => onFilterType('all'))}
        {chip(filterType === 'client',   'Client',   () => onFilterType('client'))}
        {chip(filterType === 'crew',     'Crew',     () => onFilterType('crew'))}
        {chip(filterType === 'retainer', '📋 Retainers', () => onFilterType('retainer'))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📄</div>
          <div style={{ fontSize: 15, color: '#666', marginBottom: 8 }}>No contracts yet</div>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>Create a client or crew contract and send it via their portal.</div>
          <button onClick={onNew} style={{ padding: '12px 24px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Create First Contract
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
            const tt = TYPE_STYLE[c.type]   || TYPE_STYLE.client;
            return (
              <div key={c.id} style={{
                background: '#1A1A1A', border: '1px solid #252525', borderRadius: 14,
                padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              }}>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 700, background: tt.bg, color: tt.color }}>{tt.label}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>
                    {c.contact_name && `${c.contact_name}`}
                    {c.project_name && ` · ${c.project_name}`}
                    {c.sent_at && ` · Sent ${new Date(c.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`}
                    {c.signed_at && ` · Signed ${new Date(c.signed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  {(c.status === 'draft') && (
                    <button
                      onClick={() => onSend(c)}
                      style={{ padding: '8px 14px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
                    >Send →</button>
                  )}
                  <button
                    onClick={() => onEdit(c)}
                    style={{ padding: '8px 14px', background: '#222', border: '1px solid #333', borderRadius: 8, color: '#aaa', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}
                  >Edit</button>
                  <button
                    onClick={() => onDelete(c.id)}
                    style={{ padding: '8px 12px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 8, color: '#E81A1A', fontSize: 12, cursor: 'pointer', fontFamily: MONO }}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}