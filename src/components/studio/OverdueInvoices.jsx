import React, { useState } from 'react';
import { fmt } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

export default function OverdueInvoices({ projects, onOpenDetail }) {
  const [collapsed, setCollapsed] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const overdue = projects.filter(p =>
    !p.archived &&
    !p.paid &&
    p.invoice_due_date &&
    p.invoice_due_date < today &&
    (p.status === 'Invoiced' || p.status === 'Delivered')
  );

  // Also flag invoiced projects with no due date that are older than 30 days
  const stale = projects.filter(p =>
    !p.archived &&
    !p.paid &&
    !p.invoice_due_date &&
    p.status === 'Invoiced' &&
    p.invoice_date &&
    new Date(p.invoice_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const all = [...overdue, ...stale.filter(s => !overdue.find(o => o.id === s.id))];

  if (!all.length) return null;

  const totalOwed = all.reduce((s, p) => s + (p.revenue || 0), 0);

  return (
    <div style={{ marginBottom: 16, background: 'rgba(232,26,26,0.05)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E81A1A' }}>
              {all.length} Overdue Invoice{all.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#888', marginTop: 1 }}>
              {fmt(totalOwed)} outstanding
            </div>
          </div>
        </div>
        <span style={{ color: '#555', fontSize: 12, fontFamily: MONO }}>{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 16px 14px' }}>
          {all.map(p => {
            const daysOverdue = p.invoice_due_date
              ? Math.floor((new Date(today) - new Date(p.invoice_due_date)) / (1000 * 60 * 60 * 24))
              : null;
            return (
              <div
                key={p.id}
                onClick={() => onOpenDetail(p)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.15)',
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer', flexWrap: 'wrap', gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#888', marginTop: 2 }}>
                    {p.client} · {p.invoice_number || 'No invoice #'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#E81A1A' }}>{fmt(p.revenue)}</div>
                  {daysOverdue !== null && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', marginTop: 1 }}>
                      {daysOverdue}d overdue
                    </div>
                  )}
                  {daysOverdue === null && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#888', marginTop: 1 }}>
                      30+ days unpaid
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}