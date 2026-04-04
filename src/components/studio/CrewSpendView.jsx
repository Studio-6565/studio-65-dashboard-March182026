import React, { useState } from 'react';
import { fmt } from '@/lib/studio';

export default function CrewSpendView({ projects }) {
  const [viewType, setViewType] = useState('all');
  const [selectedPayee, setSelectedPayee] = useState(null);

  // Aggregate all spend by payee/vendor name
  const map = {};

  projects.forEach(p => {
    // Crew
    (p.crew || []).forEach(c => {
      if (!map[c.name]) map[c.name] = { paid: 0, owed: 0, type: 'Crew', projects: new Set() };
      if (c.paid) map[c.name].paid += c.cost || 0;
      else map[c.name].owed += c.cost || 0;
      map[c.name].projects.add(p.id);
    });

    // Rentals
    (p.rentals || []).forEach(r => {
      if (!map[r.vendor]) map[r.vendor] = { paid: 0, owed: 0, type: 'Rental', projects: new Set() };
      if (r.paid) map[r.vendor].paid += r.cost || 0;
      else map[r.vendor].owed += r.cost || 0;
      map[r.vendor].projects.add(p.id);
    });

    // Project expenses (lump them under "Project Expenses")
    (p.expenses || []).forEach(exp => {
      if (!map['Project Expenses']) map['Project Expenses'] = { paid: 0, owed: 0, type: 'Expense', projects: new Set() };
      map['Project Expenses'].owed += exp.amount || 0;
      map['Project Expenses'].projects.add(p.id);
    });
  });

  let payees = Object.keys(map).sort((a, b) => (map[b].paid + map[b].owed) - (map[a].paid + map[a].owed));

  // Filter by type
  if (viewType === 'crew') payees = payees.filter(name => map[name].type === 'Crew');
  if (viewType === 'rentals') payees = payees.filter(name => map[name].type === 'Rental');
  if (viewType === 'expenses') payees = payees.filter(name => map[name].type === 'Expense');

  const totalOwed = Object.values(map).reduce((sum, d) => sum + d.owed, 0);
  const totalPaid = Object.values(map).reduce((sum, d) => sum + d.paid, 0);

  if (!payees.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>💰</div>
      <div>No expenses tracked yet.</div>
    </div>
  );

  // Get payee details
  const getPayeeDetails = (payeeName) => {
    const details = { projects: [], totalOwed: 0, totalPaid: 0 };
    projects.forEach(p => {
      let owed = 0, paid = 0;
      
      (p.crew || []).forEach(c => {
        if (c.name === payeeName) {
          if (c.paid) paid += c.cost || 0;
          else owed += c.cost || 0;
        }
      });
      
      (p.rentals || []).forEach(r => {
        if (r.vendor === payeeName) {
          if (r.paid) paid += r.cost || 0;
          else owed += r.cost || 0;
        }
      });
      
      if (payeeName === 'Project Expenses') {
        (p.expenses || []).forEach(exp => {
          owed += exp.amount || 0;
        });
      }
      
      if (owed > 0 || paid > 0) {
        details.projects.push({ name: p.name, owed, paid, total: owed + paid });
        details.totalOwed += owed;
        details.totalPaid += paid;
      }
    });
    return details;
  };

  if (selectedPayee) {
    const detail = getPayeeDetails(selectedPayee);
    const d = map[selectedPayee];
    return (
      <div>
        <button
          onClick={() => setSelectedPayee(null)}
          style={{ padding: '8px 12px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E81A1A', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
        >
          ← Back
        </button>
        <div style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{selectedPayee}</div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginBottom: 12 }}>{d.type}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: '"DM Mono", monospace', marginBottom: 4 }}>Paid</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#7BC853' }}>{fmt(detail.totalPaid)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: '"DM Mono", monospace', marginBottom: 4 }}>Owed</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#E81A1A' }}>{fmt(detail.totalOwed)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: '"DM Mono", monospace', marginBottom: 4 }}>Total</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{fmt(detail.totalOwed + detail.totalPaid)}</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Projects</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {detail.projects.map(proj => (
            <div key={proj.name} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{proj.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: '"DM Mono", monospace' }}>
                <span style={{ color: '#7BC853' }}>{fmt(proj.paid)} paid</span>
                {proj.owed > 0 && <span style={{ color: '#E81A1A' }}>{fmt(proj.owed)} owed</span>}
                <span style={{ color: '#666' }}>{fmt(proj.total)} total</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace', textTransform: 'uppercase', marginBottom: 6 }}>Total Paid</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#7BC853' }}>{fmt(totalPaid)}</div>
        </div>
        <div style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace', textTransform: 'uppercase', marginBottom: 6 }}>Total Owed</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#E81A1A' }}>{fmt(totalOwed)}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'crew', 'rentals', 'expenses'].map(type => (
          <button
            key={type}
            onClick={() => setViewType(type)}
            style={{
              padding: '8px 12px',
              background: viewType === type ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
              border: `1px solid ${viewType === type ? 'rgba(232,26,26,0.35)' : '#2A2A2A'}`,
              borderRadius: 8,
              color: viewType === type ? '#E81A1A' : '#666',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Mono", monospace',
              textTransform: 'capitalize',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Payee list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {payees.map(name => {
          const d = map[name];
          const total = d.paid + d.owed;
          const pct = total > 0 ? Math.round(d.paid / total * 100) : 0;
          const allPaid = d.owed === 0;
          return (
            <button key={name} onClick={() => setSelectedPayee(name)} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#333'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2A2A2A'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', background: '#111', padding: '2px 6px', borderRadius: 4 }}>{d.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#7BC853' }}>{fmt(d.paid)} paid</span>
                  {d.owed > 0 && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#E81A1A' }}>{fmt(d.owed)} owed</span>}
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>{fmt(total)} total</span>
                </div>
              </div>
              <div style={{ height: 4, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: allPaid ? '#7BC853' : '#E81A1A', borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}