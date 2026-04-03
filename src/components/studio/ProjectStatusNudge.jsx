import React from 'react';

// What to nudge based on current status
const NUDGES = {
  Booked: {
    msg: 'Next: Add crew & confirm availability',
    action: 'Set up crew →',
    color: '#4A9EFF',
    bg: 'rgba(74,158,255,0.08)',
    border: 'rgba(74,158,255,0.2)',
    tab: 'crew',
  },
  'In Production': {
    msg: 'Shoot day! Mark deliverables as you go',
    action: 'View deliverables →',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    tab: 'deliverables',
  },
  'In Edit': {
    msg: 'Editing phase — share progress with client',
    action: 'Go to deliverables →',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
    tab: 'deliverables',
  },
  Delivered: {
    msg: 'Delivered! Time to send your invoice',
    action: 'Generate invoice →',
    color: '#7BC853',
    bg: 'rgba(123,200,83,0.08)',
    border: 'rgba(123,200,83,0.2)',
    tab: 'finance',
  },
  Invoiced: {
    msg: 'Invoice sent — follow up if unpaid',
    action: null,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.15)',
    tab: null,
  },
};

// Extra condition nudges
function getExtraNudge(p) {
  const crew = p.crew || [];
  const pendingCrew = crew.filter(c => !c.avail || c.avail === 'pending').length;
  if (pendingCrew > 0 && (p.status === 'Booked' || p.status === 'In Production')) {
    return { msg: `${pendingCrew} crew member${pendingCrew > 1 ? 's' : ''} haven't confirmed yet`, color: '#F59E0B' };
  }
  const del = p.deliverables || [];
  if (del.length > 0 && p.status === 'In Edit') {
    const undone = del.filter(d => !d.done).length;
    if (undone === 0) return { msg: 'All deliverables done! Ready to deliver?', color: '#7BC853' };
  }
  if (p.status === 'Invoiced' && !p.paid) {
    const due = p.invoice_due_date ? new Date(p.invoice_due_date) : null;
    if (due && due < new Date()) return { msg: '⚠️ Invoice is overdue!', color: '#E81A1A' };
  }
  return null;
}

export default function ProjectStatusNudge({ project, onClick }) {
  const nudge = NUDGES[project.status];
  const extra = getExtraNudge(project);
  if (!nudge && !extra) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {nudge && (
        <div
          onClick={nudge.action && onClick ? (e) => { e.stopPropagation(); onClick(nudge.tab); } : undefined}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 12px',
            background: nudge.bg, border: `1px solid ${nudge.border}`,
            borderRadius: 8, gap: 8,
            cursor: nudge.action ? 'pointer' : 'default',
          }}
        >
          <span style={{ fontSize: 11, color: nudge.color, lineHeight: 1.4 }}>{nudge.msg}</span>
          {nudge.action && (
            <span style={{ fontSize: 10, fontFamily: '"DM Mono", monospace', color: nudge.color, whiteSpace: 'nowrap', fontWeight: 700 }}>{nudge.action}</span>
          )}
        </div>
      )}
      {extra && (
        <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${extra.color}30`, borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: extra.color }}>{extra.msg}</span>
        </div>
      )}
    </div>
  );
}