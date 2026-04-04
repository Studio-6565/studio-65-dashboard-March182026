import React, { useState } from 'react';
import { fmt } from '@/lib/studio';
import { base44 } from '@/api/base44Client';
import { Download, Search } from 'lucide-react';

export default function CrewSpendView({ projects, onProjectsChange }) {
  const [viewType, setViewType] = useState('all');
  const [selectedPayee, setSelectedPayee] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total');
  const [notes, setNotes] = useState({});
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Aggregate all spend by payee/vendor name
  const map = {};
  const contactMap = {};

  // Build contact map for quick lookup
  projects.forEach(p => {
    (p.crew || []).forEach(c => {
      if (!contactMap[c.name]) contactMap[c.name] = { email: c.email, phone: c.phone };
    });
    (p.rentals || []).forEach(r => {
      if (!contactMap[r.vendor]) contactMap[r.vendor] = { email: r.email, phone: r.phone };
    });
  });

  projects.forEach(p => {
    (p.crew || []).forEach(c => {
      if (!map[c.name]) map[c.name] = { paid: 0, owed: 0, type: 'Crew', projects: new Set(), email: c.email, phone: c.phone };
      if (c.paid) map[c.name].paid += c.cost || 0;
      else map[c.name].owed += c.cost || 0;
      map[c.name].projects.add(p.id);
    });

    (p.rentals || []).forEach(r => {
      if (!map[r.vendor]) map[r.vendor] = { paid: 0, owed: 0, type: 'Rental', projects: new Set(), email: r.email, phone: r.phone };
      if (r.paid) map[r.vendor].paid += r.cost || 0;
      else map[r.vendor].owed += r.cost || 0;
      map[r.vendor].projects.add(p.id);
    });

    (p.expenses || []).forEach(exp => {
      if (!map['Project Expenses']) map['Project Expenses'] = { paid: 0, owed: 0, type: 'Expense', projects: new Set() };
      map['Project Expenses'].owed += exp.amount || 0;
      map['Project Expenses'].projects.add(p.id);
    });
  });

  let payees = Object.keys(map);
  
  // Filter by type
  if (viewType === 'crew') payees = payees.filter(name => map[name].type === 'Crew');
  if (viewType === 'rentals') payees = payees.filter(name => map[name].type === 'Rental');
  if (viewType === 'expenses') payees = payees.filter(name => map[name].type === 'Expense');

  // Filter by status
  if (statusFilter === 'paid') payees = payees.filter(name => map[name].owed === 0);
  if (statusFilter === 'unpaid') payees = payees.filter(name => map[name].owed > 0);

  // Search
  if (search) payees = payees.filter(name => name.toLowerCase().includes(search.toLowerCase()));

  // Sort
  payees.sort((a, b) => {
    if (sortBy === 'total') return (map[b].paid + map[b].owed) - (map[a].paid + map[a].owed);
    if (sortBy === 'owed') return map[b].owed - map[a].owed;
    if (sortBy === 'alpha') return a.localeCompare(b);
    return 0;
  });

  const totalOwed = Object.values(map).reduce((sum, d) => sum + d.owed, 0);
  const totalPaid = Object.values(map).reduce((sum, d) => sum + d.paid, 0);

  // CSV export
  const handleExport = () => {
    let csv = 'Name,Type,Paid,Owed,Total\n';
    payees.forEach(name => {
      const d = map[name];
      const total = d.paid + d.owed;
      csv += `"${name}",${d.type},${d.paid},${d.owed},${total}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spend-tracker.csv';
    a.click();
  };

  // Get payee details with ability to mark paid
  const getPayeeDetails = (payeeName) => {
    const details = { projects: [], totalOwed: 0, totalPaid: 0 };
    projects.forEach(p => {
      let owed = 0, paid = 0, projectCrew = [], projectRentals = [];
      
      (p.crew || []).forEach(c => {
        if (c.name === payeeName) {
          projectCrew.push(c);
          if (c.paid) paid += c.cost || 0;
          else owed += c.cost || 0;
        }
      });
      
      (p.rentals || []).forEach(r => {
        if (r.vendor === payeeName) {
          projectRentals.push(r);
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
        details.projects.push({ name: p.name, id: p.id, owed, paid, total: owed + paid, crew: projectCrew, rentals: projectRentals });
        details.totalOwed += owed;
        details.totalPaid += paid;
      }
    });
    return details;
  };

  const handleMarkPaid = async (projectId, type, index) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const updated = { ...project };
    if (type === 'crew' && updated.crew) {
      updated.crew[index] = { ...updated.crew[index], paid: !updated.crew[index].paid };
    } else if (type === 'rental' && updated.rentals) {
      updated.rentals[index] = { ...updated.rentals[index], paid: !updated.rentals[index].paid };
    }
    
    await base44.entities.Project.update(projectId, updated);
    if (onProjectsChange) onProjectsChange(prev => prev.map(p => p.id === projectId ? updated : p));
  };

  if (!payees.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>💰</div>
      <div>No expenses tracked yet.</div>
    </div>
  );

  if (selectedPayee) {
    const detail = getPayeeDetails(selectedPayee);
    const d = map[selectedPayee];
    const payeeNote = notes[selectedPayee] || '';

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
          
          {(d.email || d.phone) && (
            <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
              {d.email && <div>📧 {d.email}</div>}
              {d.phone && <div>📱 {d.phone}</div>}
            </div>
          )}

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

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Notes</div>
          {editingNote === selectedPayee ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add payment note..."
                style={{ flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif', minHeight: 60 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => {
                    setNotes(prev => ({ ...prev, [selectedPayee]: noteText }));
                    setEditingNote(null);
                  }}
                  style={{ padding: '8px 12px', background: '#7BC853', border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >Save</button>
                <button
                  onClick={() => setEditingNote(null)}
                  style={{ padding: '8px 12px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#666', fontSize: 11, cursor: 'pointer' }}
                >Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingNote(selectedPayee); setNoteText(payeeNote); }}
              style={{ width: '100%', padding: '10px 12px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: payeeNote ? '#fff' : '#666', fontSize: 11, cursor: 'pointer', textAlign: 'left', minHeight: 50 }}
            >
              {payeeNote || '+ Add a note...'}
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Projects</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {detail.projects.map(proj => (
            <div key={proj.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{proj.name}</div>
              </div>
              {proj.crew.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMarkPaid(proj.id, 'crew', idx)}
                  style={{ width: '100%', padding: '8px 10px', background: c.paid ? 'rgba(123,200,83,0.08)' : 'rgba(232,26,26,0.08)', border: `1px solid ${c.paid ? 'rgba(123,200,83,0.2)' : 'rgba(232,26,26,0.2)'}`, borderRadius: 6, marginBottom: 6, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#fff' }}>{c.role}</span>
                    <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: c.paid ? '#7BC853' : '#E81A1A', fontWeight: 700 }}>{c.paid ? '✓ Paid' : fmt(c.cost)} {c.paid ? '' : '— Click to mark paid'}</span>
                  </div>
                </button>
              ))}
              {proj.rentals.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMarkPaid(proj.id, 'rental', idx)}
                  style={{ width: '100%', padding: '8px 10px', background: r.paid ? 'rgba(123,200,83,0.08)' : 'rgba(232,26,26,0.08)', border: `1px solid ${r.paid ? 'rgba(123,200,83,0.2)' : 'rgba(232,26,26,0.2)'}`, borderRadius: 6, marginBottom: 6, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#fff' }}>{r.equipment}</span>
                    <span style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: r.paid ? '#7BC853' : '#E81A1A', fontWeight: 700 }}>{r.paid ? '✓ Paid' : fmt(r.cost)} {r.paid ? '' : '— Click to mark paid'}</span>
                  </div>
                </button>
              ))}
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

      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 12px' }}>
          <Search size={14} color="#666" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payees..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, fontFamily: 'Syne, sans-serif' }}
          />
        </div>
        <button
          onClick={handleExport}
          style={{ padding: '8px 12px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'crew', label: 'Crew' },
          { key: 'rentals', label: 'Rentals' },
          { key: 'expenses', label: 'Expenses' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setViewType(f.key)}
            style={{
              padding: '8px 12px',
              background: viewType === f.key ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
              border: `1px solid ${viewType === f.key ? 'rgba(232,26,26,0.35)' : '#2A2A2A'}`,
              borderRadius: 8,
              color: viewType === f.key ? '#E81A1A' : '#666',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Mono", monospace',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Status filter & Sort */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Status' },
          { key: 'unpaid', label: 'Unpaid Only' },
          { key: 'paid', label: 'Paid Only' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={{
              padding: '8px 12px',
              background: statusFilter === f.key ? 'rgba(74,158,255,0.1)' : '#1A1A1A',
              border: `1px solid ${statusFilter === f.key ? 'rgba(74,158,255,0.35)' : '#2A2A2A'}`,
              borderRadius: 8,
              color: statusFilter === f.key ? '#4A9EFF' : '#666',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Mono", monospace',
            }}
          >
            {f.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: 8,
              color: '#666',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Mono", monospace',
            }}
          >
            <option value="total">Sort: Total</option>
            <option value="owed">Sort: Owed</option>
            <option value="alpha">Sort: A-Z</option>
          </select>
        </div>
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