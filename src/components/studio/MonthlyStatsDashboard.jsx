import React, { useMemo } from 'react';
import { fmt } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

function StatCard({ label, value, sub, color, bgColor }) {
  return (
    <div style={{
      background: bgColor || '#1A1A1A',
      border: '1px solid #222',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 5, fontFamily: MONO }}>{sub}</div>}
    </div>
  );
}

export default function MonthlyStatsDashboard({ projects = [] }) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const monthProjects = useMemo(() =>
    projects.filter(p => (p.date || '').startsWith(thisMonth)), [projects, thisMonth]);

  const lastMonthProjects = useMemo(() =>
    projects.filter(p => (p.date || '').startsWith(lastMonth)), [projects, lastMonth]);

  const revenue = useMemo(() => monthProjects.reduce((s, p) => s + (p.revenue || 0), 0), [monthProjects]);
  const crewCost = useMemo(() => monthProjects.reduce((s, p) => s + (p.crew_cost || 0), 0), [monthProjects]);
  const rentalCost = useMemo(() => monthProjects.reduce((s, p) => s + (p.rental_cost || 0), 0), [monthProjects]);
  const expenseCost = useMemo(() => monthProjects.reduce((s, p) => s + (p.expenses || []).reduce((es, e) => es + (e.amount || 0), 0), 0), [monthProjects]);
  const totalExpenses = crewCost + rentalCost + expenseCost;
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  const booked = monthProjects.length;
  const completed = monthProjects.filter(p => ['Delivered', 'Invoiced'].includes(p.status)).length;
  const outstandingInvoices = monthProjects.filter(p => p.status === 'Invoiced' && !p.paid);
  const paidInvoices = monthProjects.filter(p => p.paid);
  const outstandingAmt = outstandingInvoices.reduce((s, p) => s + (p.revenue || 0), 0);
  const paidAmt = paidInvoices.reduce((s, p) => s + (p.revenue || 0), 0);
  const overdueInvoices = projects.filter(p =>
    p.status === 'Invoiced' && !p.paid &&
    p.invoice_due_date && p.invoice_due_date < today
  );
  const overdueAmt = overdueInvoices.reduce((s, p) => s + (p.revenue || 0), 0);

  const lastRevenue = lastMonthProjects.reduce((s, p) => s + (p.revenue || 0), 0);
  const revChange = lastRevenue > 0 ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100) : null;

  const avgMargin = monthProjects.length > 0
    ? Math.round(monthProjects.reduce((s, p) => s + (p.revenue > 0 ? (p.net || 0) / p.revenue : 0), 0) / monthProjects.length * 100)
    : 0;

  const now = new Date();
  const monthName = now.toLocaleString('en', { month: 'long' });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{monthName} Overview</div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: MONO, marginTop: 2 }}>Monthly performance snapshot</div>
        </div>
        {revChange !== null && (
          <div style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            fontFamily: MONO,
            background: revChange >= 0 ? 'rgba(123,200,83,0.1)' : 'rgba(232,26,26,0.1)',
            color: revChange >= 0 ? '#7BC853' : '#E81A1A',
            border: `1px solid ${revChange >= 0 ? 'rgba(123,200,83,0.3)' : 'rgba(232,26,26,0.3)'}`,
          }}>
            {revChange >= 0 ? '↑' : '↓'} {Math.abs(revChange)}% vs last month
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        <StatCard label="Revenue" value={fmt(revenue)} sub={`${booked} project${booked !== 1 ? 's' : ''}`} />
        <StatCard label="Total Expenses" value={fmt(totalExpenses)} color="#E81A1A" />
        <StatCard label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? '#7BC853' : '#E81A1A'} />
        <StatCard label="Avg Margin" value={`${avgMargin}%`} color={avgMargin >= 50 ? '#7BC853' : avgMargin >= 25 ? '#F59E0B' : '#E81A1A'} />
        <StatCard label="Completed" value={completed} sub={`of ${booked} booked`} color="#7BC853" />
        <StatCard label="Paid Invoices" value={fmt(paidAmt)} sub={`${paidInvoices.length} paid`} color="#7BC853" />
        <StatCard label="Outstanding" value={fmt(outstandingAmt)} sub={`${outstandingInvoices.length} unpaid`} color={outstandingInvoices.length > 0 ? '#F59E0B' : '#7BC853'} />
        <StatCard label="Crew Cost" value={fmt(crewCost)} />
        <StatCard label="Rental Cost" value={fmt(rentalCost)} />
        <StatCard label="Misc Expenses" value={fmt(expenseCost)} />
        <StatCard label="Overdue" value={fmt(overdueAmt)} sub={`${overdueInvoices.length} overdue`} color={overdueInvoices.length > 0 ? '#E81A1A' : '#7BC853'} />
      </div>
    </div>
  );
}