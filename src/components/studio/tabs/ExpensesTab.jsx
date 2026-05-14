import React, { useState, useRef } from 'react';
import { fmt } from '@/lib/studio';
import { showToast } from '../StudioToast';
import { base44 } from '@/api/base44Client';
import ReceiptScanner from '@/components/studio/ReceiptScanner';

const MONO = '"DM Mono", monospace';
const SS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const CATEGORIES = ['Travel', 'Food', 'Props', 'Software', 'Printing', 'Other'];
const CAT_COLORS = { Travel: '#4A9EFF', Food: '#F59E0B', Props: '#A78BFA', Software: '#7BC853', Printing: '#F97316', Other: '#888' };

const emptyForm = { desc: '', category: 'Other', amount: '', date: new Date().toISOString().split('T')[0], receipt_url: '' };

export default function ExpensesTab({ project: p, onUpdate, allProjects = [] }) {
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const fileRef = useRef(null);
  const expenses = p.expenses || [];

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, receipt_url: res.file_url }));
    setUploading(false);
    showToast('Receipt uploaded', 'blue');
  };

  const handleAdd = async () => {
    if (!form.desc.trim()) { showToast('Enter a description', 'red'); return; }
    const amount = parseFloat(form.amount) || 0;
    const newExpenses = [...expenses, { ...form, amount }];
    await onUpdate({ expenses: newExpenses, _logMsg: `Expense added: ${form.desc} (${fmt(amount)})` });
    setForm(emptyForm);
    showToast('Expense logged', 'amber');
  };

  const handleDelete = async (i) => {
    const newExpenses = expenses.filter((_, j) => j !== i);
    await onUpdate({ expenses: newExpenses });
  };

  // Group by category for summary
  const byCategory = {};
  expenses.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = 0;
    byCategory[e.category] += (e.amount || 0);
  });

  // When the scanner adds an expense to *this* project, update locally
  const handleExpenseAdded = ({ projectId, expense }) => {
    if (projectId === p.id) {
      onUpdate({ expenses: [...(p.expenses || []), expense] });
    }
    setShowScanner(false);
  };

  return (
    <div>
      {showScanner && (
        <ReceiptScanner
          projects={allProjects.length ? allProjects : [p]}
          onExpenseAdded={handleExpenseAdded}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Misc Expenses</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {total > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>Total: {fmt(total)}</span>
          )}
          <button
            onClick={() => setShowScanner(true)}
            style={{ padding: '6px 12px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 7, color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
          >
            ✦ Scan Receipt
          </button>
        </div>
      </div>

      {/* Category summary chips */}
      {Object.keys(byCategory).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {Object.entries(byCategory).map(([cat, amt]) => (
            <span key={cat} style={{ fontFamily: MONO, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: `${CAT_COLORS[cat] || '#888'}15`, color: CAT_COLORS[cat] || '#888', border: `1px solid ${CAT_COLORS[cat] || '#888'}30` }}>
              {cat}: {fmt(amt)}
            </span>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
        {!expenses.length ? (
          <div style={{ color: '#555', fontSize: 13, padding: '12px 0' }}>No miscellaneous expenses logged yet.</div>
        ) : (
          expenses.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2A2A2A', borderRadius: 8, padding: '9px 12px', marginBottom: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${CAT_COLORS[e.category] || '#888'}18`, color: CAT_COLORS[e.category] || '#888', flexShrink: 0 }}>{e.category}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{e.desc}</div>
                {e.date && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 1 }}>{e.date}</div>}
                {e.receipt_url && <a href={e.receipt_url} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginTop: 2, display: 'block' }}>📎 Receipt</a>}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>{fmt(e.amount)}</span>
                <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '2px 5px' }}>×</button>
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Log Expense</div>
      <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={LL}>Description</label>
            <input style={{ ...SS, background: '#1E1E1E' }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Parking, lunch with client..." />
          </div>
          <div>
            <label style={LL}>Category</label>
            <select style={{ ...SS, background: '#1E1E1E', minWidth: 100 }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LL}>Amount ($)</label>
            <input style={{ ...SS, background: '#1E1E1E', width: 90 }} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label style={LL}>Date</label>
            <input style={{ ...SS, background: '#1E1E1E', width: 130 }} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        {/* Receipt photo upload */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleReceiptUpload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '7px 14px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 7, color: form.receipt_url ? '#4A9EFF' : '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
            {uploading ? '⏳ Uploading...' : form.receipt_url ? '📎 Receipt Attached ✓' : '📷 Attach Receipt'}
          </button>
          {form.receipt_url && <button onClick={() => setForm(f => ({ ...f, receipt_url: '' }))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13 }}>×</button>}
        </div>
        <button onClick={handleAdd} style={{ marginTop: 10, width: '100%', padding: '9px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Log Expense
        </button>
      </div>
    </div>
  );
}