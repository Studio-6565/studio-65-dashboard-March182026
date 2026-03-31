import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const CATEGORIES = ['Camera', 'Lens', 'Audio', 'Lighting', 'Drone', 'Stabilizer', 'Storage', 'Accessories', 'Other'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Repair'];

const CONDITION_COLOR = { Excellent: '#7BC853', Good: '#4A9EFF', Fair: '#F59E0B', 'Needs Repair': '#E81A1A' };

const emptyForm = { name: '', category: 'Camera', brand: '', model: '', serial_number: '', condition: 'Good', purchase_date: '', purchase_price: '', notes: '' };

export default function GearPage() {
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState('All');
  const [filterCond, setFilterCond] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.GearItem.list('name', 200).then(g => { setGear(g); setLoading(false); });
  }, []);

  const filtered = gear.filter(g => {
    if (g.archived) return false;
    if (filterCat !== 'All' && g.category !== filterCat) return false;
    if (filterCond !== 'All' && g.condition !== filterCond) return false;
    if (search) {
      const q = search.toLowerCase();
      return (g.name || '').toLowerCase().includes(q) || (g.brand || '').toLowerCase().includes(q) || (g.model || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalValue = gear.filter(g => !g.archived).reduce((s, g) => s + (g.purchase_price || 0), 0);

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'red'); return; }
    const data = { ...form, purchase_price: parseFloat(form.purchase_price) || 0 };
    if (editingId) {
      await base44.entities.GearItem.update(editingId, data);
      setGear(g => g.map(x => x.id === editingId ? { ...x, ...data } : x));
      showToast(form.name + ' updated', 'blue');
    } else {
      const created = await base44.entities.GearItem.create(data);
      setGear(g => [...g, created]);
      showToast(form.name + ' added', 'green');
    }
    setForm(emptyForm); setEditingId(null); setShowForm(false);
  };

  const handleEdit = (item) => {
    setForm({ name: item.name || '', category: item.category || 'Camera', brand: item.brand || '', model: item.model || '', serial_number: item.serial_number || '', condition: item.condition || 'Good', purchase_date: item.purchase_date || '', purchase_price: item.purchase_price || '', notes: item.notes || '' });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    if (!confirm('Remove ' + item.name + ' from inventory?')) return;
    await base44.entities.GearItem.update(item.id, { ...item, archived: true });
    setGear(g => g.map(x => x.id === item.id ? { ...x, archived: true } : x));
    showToast(item.name + ' removed', 'red');
  };

  // Group by category
  const byCat = {};
  filtered.forEach(g => {
    const cat = g.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(g);
  });

  if (loading) return <div style={{ color: '#555', padding: 40, textAlign: 'center', fontFamily: MONO }}>Loading gear...</div>;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Equipment Inventory</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>
            {gear.filter(g => !g.archived).length} items · Total value: ${totalValue.toLocaleString()}
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(s => !s); }}
          style={{ padding: '8px 18px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >+ Add Gear</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{editingId ? 'Edit Item' : 'Add Item'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={LS}>Name *</label>
              <input style={IS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sony FX3" />
            </div>
            <div>
              <label style={LS}>Category</label>
              <select style={IS} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Condition</label>
              <select style={IS} value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Brand</label>
              <input style={IS} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Sony" />
            </div>
            <div>
              <label style={LS}>Model</label>
              <input style={IS} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. ILME-FX3" />
            </div>
            <div>
              <label style={LS}>Serial #</label>
              <input style={IS} value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label style={LS}>Purchase Price ($)</label>
              <input style={IS} type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label style={LS}>Purchase Date</label>
              <input style={IS} type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={LS}>Notes</label>
              <textarea style={{ ...IS, resize: 'none', minHeight: 56 }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Accessories included, issues, etc." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{ flex: 1, padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {editingId ? 'Save Changes' : 'Add to Inventory'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} style={{ padding: '10px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gear..." style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', flex: 1, minWidth: 0 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '7px 10px', color: '#666', fontFamily: MONO, fontSize: 11, outline: 'none' }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCond} onChange={e => setFilterCond(e.target.value)} style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '7px 10px', color: '#666', fontFamily: MONO, fontSize: 11, outline: 'none' }}>
          <option value="All">All Conditions</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Gear list grouped by category */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🎒</div>
          <div>{gear.filter(g => !g.archived).length ? 'No gear matches your filters.' : 'No gear added yet. Click "+ Add Gear" to start.'}</div>
        </div>
      ) : (
        Object.entries(byCat).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{cat} ({items.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {items.map(item => (
                <div key={item.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
                      {(item.brand || item.model) && (
                        <div style={{ fontFamily: MONO, fontSize: 10, color: '#666' }}>{[item.brand, item.model].filter(Boolean).join(' · ')}</div>
                      )}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${CONDITION_COLOR[item.condition]}18`, color: CONDITION_COLOR[item.condition], flexShrink: 0, marginLeft: 8 }}>{item.condition}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                    {item.purchase_price > 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>💰 ${item.purchase_price.toLocaleString()}</div>}
                    {item.serial_number && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>S/N: {item.serial_number}</div>}
                    {item.purchase_date && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>Purchased: {item.purchase_date}</div>}
                    {item.notes && <div style={{ fontSize: 11, color: '#666', marginTop: 2, lineHeight: 1.4 }}>{item.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEdit(item)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>Edit</button>
                    <button onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}