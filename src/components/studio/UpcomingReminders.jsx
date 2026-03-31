import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MONO = '"DM Mono", monospace';

export default function UpcomingReminders({ projects }) {
  const [dismissed, setDismissed] = useState(new Set());
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Overdue invoices: not paid, has invoice_due_date in the past, or delivered/invoiced and unpaid > 14 days
  const overdueInvoices = projects.filter(p => {
    if (p.archived || p.paid) return false;
    if (dismissed.has('overdue_' + p.id)) return false;
    if (p.invoice_due_date) {
      const due = new Date(p.invoice_due_date + 'T12:00:00');
      return due < today;
    }
    // Auto-flag: Invoiced status and unpaid for more than 0 days
    if (p.status === 'Invoiced') return true;
    return false;
  });

  const upcoming = projects
    .filter(p => !p.archived && p.date)
    .map(p => {
      const d = new Date(p.date + 'T12:00:00');
      const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
      return { ...p, diffDays };
    })
    .filter(p => p.diffDays >= 0 && p.diffDays <= 7)
    .filter(p => !dismissed.has(p.id))
    .sort((a, b) => a.diffDays - b.diffDays);

  if (!upcoming.length && !overdueInvoices.length) return null;

  const urgencyColor = (days) => {
    if (days === 0) return '#E81A1A';
    if (days === 1) return '#F59E0B';
    if (days <= 3) return '#4A9EFF';
    return '#7BC853';
  };

  const dayLabel = (days) => {
    if (days === 0) return 'TODAY';
    if (days === 1) return 'TOMORROW';
    return `IN ${days} DAYS`;
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Overdue invoices */}
      {overdueInvoices.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ⚠ Overdue Invoices ({overdueInvoices.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {overdueInvoices.map(p => (
              <div
                key={p.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.25)', borderLeft: '3px solid #E81A1A', borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#E81A1A', padding: '1px 6px', borderRadius: 3, background: 'rgba(232,26,26,0.15)', flexShrink: 0 }}>
                      {p.invoice_due_date ? `DUE ${p.invoice_due_date}` : 'INVOICED — UNPAID'}
                    </span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#888', marginTop: 2 }}>
                    {p.client} · {p.revenue > 0 ? `$${Number(p.revenue).toLocaleString()} outstanding` : ''}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, 'overdue_' + p.id])); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '2px 5px', flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        🔔 Upcoming Shoots ({upcoming.length})
      </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.map((p) => {
          const col = urgencyColor(p.diffDays);
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: `${col}08`,
                border: `1px solid ${col}30`,
                borderLeft: `3px solid ${col}`,
                borderRadius: 8, padding: '10px 12px',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: col, padding: '1px 6px', borderRadius: 3, background: `${col}18`, flexShrink: 0 }}>{dayLabel(p.diffDays)}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginTop: 2 }}>
                  {p.client}{p.start_time ? ` · ${p.start_time}` : ''}{p.address ? ` · ${p.address}` : ''}
                </div>
                {/* Crew readiness */}
                {(p.crew || []).length > 0 && (() => {
                  const confirmed = (p.crew || []).filter(c => c.avail === 'yes').length;
                  const total = (p.crew || []).length;
                  const allGood = confirmed === total;
                  return (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: allGood ? '#7BC853' : '#F59E0B', marginTop: 3 }}>
                      👥 {confirmed}/{total} crew confirmed
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setDismissed(d => new Set([...d, p.id])); }}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '2px 5px', flexShrink: 0 }}
              >×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}