import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, FileText, Upload, MessageSquare, CreditCard, PenLine } from 'lucide-react';

const MONO = '"DM Mono", monospace';

function getActions(projects, messages, contracts) {
  const actions = [];
  const today = new Date().toISOString().split('T')[0];

  // Pending approvals
  const pendingApprovals = messages.filter(m =>
    m.from === 'studio' &&
    (m.type === 'script' || m.type === 'approval_request') &&
    (!m.approval_status || m.approval_status === 'pending')
  );
  pendingApprovals.forEach(m => {
    actions.push({
      id: 'approval_' + m.id,
      icon: CheckCircle2,
      iconColor: '#F59E0B',
      iconBg: 'rgba(245,158,11,0.12)',
      title: m.type === 'script' ? 'Review & Approve Script' : 'Review & Approve',
      subtitle: m.title || m.project_name || 'Review required',
      project: m.project_name,
      priority: 'high',
      action: 'review',
      msgId: m.id,
      tab: 'inbox',
    });
  });

  // Contracts to sign
  const pendingContracts = contracts.filter(c => c.status === 'sent');
  pendingContracts.forEach(c => {
    actions.push({
      id: 'contract_' + c.id,
      icon: PenLine,
      iconColor: '#4A9EFF',
      iconBg: 'rgba(74,158,255,0.12)',
      title: 'Sign Contract',
      subtitle: c.title,
      project: c.project_name,
      priority: 'high',
      action: 'sign',
      tab: 'contracts',
    });
  });

  // Unpaid invoices
  const unpaidProjects = projects.filter(p =>
    !p.paid && p.revenue > 0 && ['Invoiced'].includes(p.status)
  );
  unpaidProjects.forEach(p => {
    const isOverdue = p.invoice_due_date && p.invoice_due_date < today;
    actions.push({
      id: 'invoice_' + p.id,
      icon: CreditCard,
      iconColor: isOverdue ? '#E81A1A' : '#F59E0B',
      iconBg: isOverdue ? 'rgba(232,26,26,0.1)' : 'rgba(245,158,11,0.1)',
      title: isOverdue ? 'Invoice Overdue' : 'Invoice Awaiting Payment',
      subtitle: p.name + (p.invoice_due_date ? ` · Due ${p.invoice_due_date}` : ''),
      project: p.name,
      priority: isOverdue ? 'urgent' : 'high',
      action: 'pay',
      tab: 'invoices',
      projectId: p.id,
    });
  });

  // Deliverables ready for review
  const delProjects = projects.filter(p =>
    (p.deliverables || []).some(d => !d.done && d.link)
  );
  delProjects.forEach(p => {
    const readyDels = (p.deliverables || []).filter(d => !d.done && d.link);
    actions.push({
      id: 'del_' + p.id,
      icon: FileText,
      iconColor: '#7BC853',
      iconBg: 'rgba(123,200,83,0.1)',
      title: `Review Deliverable${readyDels.length > 1 ? 's' : ''}`,
      subtitle: readyDels.map(d => d.name).join(', '),
      project: p.name,
      priority: 'medium',
      action: 'review',
      tab: 'projects',
      projectId: p.id,
    });
  });

  return actions;
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function ClientActionCentre({ projects, messages, contracts, onNavigate }) {
  const actions = getActions(projects, messages, contracts)
    .sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  if (!actions.length) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <CheckCircle2 size={22} color="#7BC853" />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#7BC853', marginBottom: 4 }}>All caught up!</div>
        <div style={{ fontSize: 12, color: '#444' }}>No actions needed right now.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onNavigate(action.tab, action)}
            style={{
              width: '100%', textAlign: 'left', background: '#0D0D0D',
              border: `1px solid ${action.priority === 'urgent' ? 'rgba(232,26,26,0.3)' : action.priority === 'high' ? 'rgba(245,158,11,0.2)' : '#1A1A1A'}`,
              borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: action.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={action.iconColor} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{action.title}</div>
              <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {action.project && <span style={{ color: '#E81A1A', marginRight: 6 }}>●</span>}
                {action.subtitle}
              </div>
            </div>
            {action.priority === 'urgent' && (
              <span style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 4, padding: '3px 7px', fontWeight: 700, flexShrink: 0 }}>URGENT</span>
            )}
            <span style={{ color: '#333', fontSize: 14, flexShrink: 0 }}>→</span>
          </button>
        );
      })}
    </div>
  );
}