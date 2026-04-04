import React from 'react';

const MONO = '"DM Mono", monospace';

export default function LeadMetrics({ leads }) {
  const total = leads.length;
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;
  const closureRate = total - lost > 0 ? Math.round((won / (total - lost)) * 100) : 0;
  const totalProposalValue = leads
    .filter((l) => l.status !== 'lost')
    .reduce((sum, l) => sum + (l.proposal_value || 0), 0);
  const avgDealSize = won > 0 ? Math.round(totalProposalValue / won) : 0;

  const overdueLead = leads.filter(
    (l) => l.follow_up_date && new Date(l.follow_up_date) < new Date() && l.status !== 'won' && l.status !== 'lost'
  ).length;

  const stats = [
    { label: 'Total Leads', value: total, color: '#4A9EFF' },
    { label: 'Closure Rate', value: closureRate + '%', color: '#7BC853' },
    { label: 'Won', value: won, color: '#7BC853' },
    { label: 'Overdue Follow-ups', value: overdueLead, color: overdueLead > 0 ? '#E81A1A' : '#444' },
    { label: 'Avg Deal Size', value: '$' + avgDealSize.toLocaleString(), color: '#F59E0B' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            background: '#111',
            border: '1px solid #1E1E1E',
            borderRadius: 10,
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, color: '#555', fontFamily: MONO, marginBottom: 6 }}>{stat.label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}