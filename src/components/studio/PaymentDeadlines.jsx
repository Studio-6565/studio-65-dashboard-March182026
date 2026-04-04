import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { fmt } from '@/lib/studio';

export default function PaymentDeadlines({ projects }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Collect all upcoming payments with due dates
  const deadlines = [];

  projects.forEach(p => {
    (p.crew || []).forEach((c, idx) => {
      if (!c.paid && c.due_date) {
        const dueDate = new Date(c.due_date);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        deadlines.push({
          type: 'crew',
          name: c.name,
          role: c.role,
          projectName: p.name,
          projectId: p.id,
          cost: c.cost,
          dueDate: c.due_date,
          daysUntil,
          urgency: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'upcoming',
        });
      }
    });

    (p.rentals || []).forEach((r, idx) => {
      if (!r.paid && r.due_date) {
        const dueDate = new Date(r.due_date);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        deadlines.push({
          type: 'rental',
          name: r.vendor,
          equipment: r.equipment,
          projectName: p.name,
          projectId: p.id,
          cost: r.cost,
          dueDate: r.due_date,
          daysUntil,
          urgency: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'upcoming',
        });
      }
    });
  });

  // Sort by days until due
  deadlines.sort((a, b) => a.daysUntil - b.daysUntil);

  if (!deadlines.length) return null;

  const urgent = deadlines.filter(d => d.urgency === 'urgent').length;
  const soon = deadlines.filter(d => d.urgency === 'soon').length;

  const getUrgencyColor = (urgency) => {
    if (urgency === 'urgent') return { bg: 'rgba(232,26,26,0.06)', border: 'rgba(232,26,26,0.25)', icon: '#E81A1A', text: '#E81A1A' };
    if (urgency === 'soon') return { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.25)', icon: '#F59E0B', text: '#F59E0B' };
    return { bg: 'rgba(123,200,83,0.06)', border: 'rgba(123,200,83,0.25)', icon: '#4A9EFF', text: '#4A9EFF' };
  };

  return (
    <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={14} color="#E81A1A" />
        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, fontWeight: 700, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Payment Deadlines — {urgent} urgent{soon > 0 ? `, ${soon} this week` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deadlines.slice(0, 5).map((d, i) => {
          const color = getUrgencyColor(d.urgency);
          const dueDateObj = new Date(d.dueDate);
          const dateStr = dueDateObj.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
          
          return (
            <div
              key={i}
              style={{
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: 10,
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color.text;
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = color.border;
                e.currentTarget.style.opacity = '1';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                    {d.name}
                    {d.role && <span style={{ color: '#888', fontWeight: 400 }}> · {d.role}</span>}
                    {d.equipment && <span style={{ color: '#888', fontWeight: 400 }}> · {d.equipment}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', fontFamily: '"DM Mono", monospace' }}>{d.projectName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: color.text, marginBottom: 2 }}>{fmt(d.cost)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: '"DM Mono", monospace', color: color.text, fontWeight: 700 }}>
                    <Clock size={11} />
                    {d.daysUntil <= 0 ? '🔴 OVERDUE' : d.daysUntil === 1 ? 'Tomorrow' : `${d.daysUntil}d`}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: '#666', fontFamily: '"DM Mono", monospace' }}>Due {dateStr}</div>
            </div>
          );
        })}
        {deadlines.length > 5 && (
          <div style={{ fontSize: 10, color: '#666', textAlign: 'center', padding: '8px 0' }}>
            +{deadlines.length - 5} more deadlines
          </div>
        )}
      </div>
    </div>
  );
}