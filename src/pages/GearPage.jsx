import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import BottomSheet from '@/components/studio/BottomSheet';
import ShootKits from '@/components/gear/ShootKits';
import { Camera, Eye, Mic2, Lightbulb, Radio, Maximize2, HardDrive, Plug, Package, Download } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#161616', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const CATEGORIES = ['Camera', 'Lens', 'Audio', 'Lighting', 'Drone', 'Stabilizer', 'Storage', 'Accessories', 'Other'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Repair'];
const CONDITION_COLOR = { Excellent: '#7BC853', Good: '#4A9EFF', Fair: '#F59E0B', 'Needs Repair': '#E81A1A' };
const CAT_ICON = { Camera, Lens: Eye, Audio: Mic2, Lighting: Lightbulb, Drone: Radio, Stabilizer: Maximize2, Storage: HardDrive, Accessories: Plug, Other: Package };

const emptyForm = { name: '', category: 'Camera', brand: '', model: '', serial_number: '', condition: 'Good', ownership: 'Mine', owner_name: '', purchase_date: '', purchase_price: '', notes: '' };

export default function GearPage() {
  const [tab, setTab] = useState('inventory');
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState('All');
  const [filterCond, setFilterCond] = useState('All');
  const [search, setSearch] = useState('');
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [condSheetOpen, setCondSheetOpen] = useState(false);
  const [formCatSheetOpen, setFormCatSheetOpen] = useState(false);
  const [formCondSheetOpen, setFormCondSheetOpen] = useState(false);
  const [formOwnershipSheetOpen, setFormOwnershipSheetOpen] = useState(false);

  useEffect(() => {
    base44.entities.GearItem.list('name', 200).then(g => { setGear(g); setLoading(false); });
  }, []);

  const activeGear = gear.filter(g => !g.archived);
  const totalValue = activeGear.reduce((s, g) => s + (g.purchase_price || 0), 0);

  const filtered = activeGear.filter(g => {
    if (filterCat !== 'All' && g.category !== filterCat) return false;
    if (filterCond !== 'All' && g.condition !== filterCond) return false;
    if (search) {
      const q = search.toLowerCase();
      return (g.name || '').toLowerCase().includes(q) || (g.brand || '').toLowerCase().includes(q) || (g.model || '').toLowerCase().includes(q);
    }
    return true;
  });

  const byCat = {};
  filtered.forEach(g => {
    const cat = g.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(g);
  });

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
      showToast(form.name + ' added');
    }
    setForm(emptyForm); setEditingId(null); setShowForm(false);
  };

  const handleEdit = (item) => {
    setForm({ name: item.name || '', category: item.category || 'Camera', brand: item.brand || '', model: item.model || '', serial_number: item.serial_number || '', condition: item.condition || 'Good', ownership: item.ownership || 'Mine', owner_name: item.owner_name || '', purchase_date: item.purchase_date || '', purchase_price: item.purchase_price || '', notes: item.notes || '' });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) { showToast('No gear to export', 'amber'); return; }
    const headers = ['Name', 'Category', 'Brand', 'Model', 'Serial #', 'Condition', 'Ownership', 'Owner Name', 'Purchase Date', 'Price', 'Notes'];
    const rows = filtered.map(g => [
      g.name || '',
      g.category || '',
      g.brand || '',
      g.model || '',
      g.serial_number || '',
      g.condition || '',
      g.ownership || 'Mine',
      g.owner_name || '',
      g.purchase_date || '',
      g.purchase_price || '',
      g.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gear-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported ' + filtered.length + ' items');
  };

  const handleDelete = async (item) => {
    if (!confirm('Remove ' + item.name + ' from inventory?')) return;
    await base44.entities.GearItem.update(item.id, { ...item, archived: true });
    setGear(g => g.map(x => x.id === item.id ? { ...x, archived: true } : x));
    showToast(item.name + ' removed', 'red');
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  if (loading) return (
    <div style={{ color: '#444', padding: 60, textAlign: 'center', fontFamily: MONO, fontSize: 11 }}>Loading inventory...</div>
  );

  if (tab === 'kits') {
    return (
      <div style={{ paddingBottom: 40 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, background: '#1A1A1A', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {[{ key: 'inventory', label: '🗃 Inventory' }, { key: 'kits', label: '🎒 Shoot Kits' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.key ? '#E81A1A' : 'transparent', color: tab === t.key ? '#fff' : '#666' }}>{t.label}</button>
          ))}
        </div>
        <ShootKits gear={gear} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, background: '#1A1A1A', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {[{ key: 'inventory', label: '🗃 Inventory' }, { key: 'kits', label: '🎒 Shoot Kits' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.key ? '#E81A1A' : 'transparent', color: tab === t.key ? '#fff' : '#666' }}>{t.label}</button>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Gear Inventory</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 3 }}>
            {activeGear.length} items · ${totalValue.toLocaleString()} total value
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleExportCSV}
            style={{ padding: '9px 14px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Export gear list as CSV"
          ><Download size={16} />Export</button>
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(s => !s); }}
            style={{ padding: '9px 18px', background: showForm && !editingId ? '#2A2A2A' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >{showForm && !editingId ? '✕ Cancel' : '+ Add Gear'}</button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px 20px 16px', marginBottom: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
            {editingId ? 'Edit Item' : 'New Item'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LS}>Name *</label>
              <input style={IS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sony FX3" autoFocus />
            </div>
            <div>
              <label style={LS}>Category</label>
              <button onClick={() => setFormCatSheetOpen(true)} style={{ ...IS, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{form.category}</span><span style={{ fontSize: 10, color: '#555' }}>▼</span>
              </button>
              <BottomSheet open={formCatSheetOpen} onClose={() => setFormCatSheetOpen(false)} title="Select Category" options={CATEGORIES.map(c => ({ value: c, label: c }))} value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
            </div>
            <div>
              <label style={LS}>Condition</label>
              <button onClick={() => setFormCondSheetOpen(true)} style={{ ...IS, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{form.condition}</span><span style={{ fontSize: 10, color: '#555' }}>▼</span>
              </button>
              <BottomSheet open={formCondSheetOpen} onClose={() => setFormCondSheetOpen(false)} title="Select Condition" options={CONDITIONS.map(c => ({ value: c, label: c }))} value={form.condition} onChange={v => setForm(f => ({ ...f, condition: v }))} />
            </div>
            <div>
              <label style={LS}>Ownership</label>
              <button onClick={() => setFormOwnershipSheetOpen(true)} style={{ ...IS, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{form.ownership}</span><span style={{ fontSize: 10, color: '#555' }}>▼</span>
              </button>
            </div>
            {(form.ownership === 'Borrowed' || form.ownership === 'Rental') && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LS}>Owner Name</label>
                <input style={IS} value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Name of owner" />
              </div>
            )}
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
              <label style={LS}>Purchase Price</label>
              <input style={IS} type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="$0" />
            </div>
            <div>
              <label style={LS}>Purchase Date</label>
              <input style={IS} type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LS}>Notes</label>
              <textarea style={{ ...IS, resize: 'none', minHeight: 52 }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Accessories, quirks, storage location..." />
            </div>
          </div>
          <BottomSheet open={formOwnershipSheetOpen} onClose={() => setFormOwnershipSheetOpen(false)} title="Select Ownership" options={[{ value: 'Mine', label: 'Mine' }, { value: 'Borrowed', label: 'Borrowed' }, { value: 'Rental', label: 'Rental' }]} value={form.ownership} onChange={v => setForm(f => ({ ...f, ownership: v }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{ flex: 1, padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {editingId ? 'Save Changes' : 'Add to Inventory'}
            </button>
            <button onClick={closeForm} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search gear..."
          style={{ ...IS, flex: 1, minWidth: 120 }}
        />
        <button onClick={() => setCatSheetOpen(true)} style={{ ...IS, width: 'auto', color: filterCat !== 'All' ? '#fff' : '#555', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
          {filterCat === 'All' ? 'All Categories' : filterCat} <span style={{ fontSize: 10, color: '#555' }}>▼</span>
        </button>
        <button onClick={() => setCondSheetOpen(true)} style={{ ...IS, width: 'auto', color: filterCond !== 'All' ? '#fff' : '#555', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
          {filterCond === 'All' ? 'All Conditions' : filterCond} <span style={{ fontSize: 10, color: '#555' }}>▼</span>
        </button>

        <BottomSheet open={catSheetOpen} onClose={() => setCatSheetOpen(false)} title="Filter by Category" options={[{ value: 'All', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} value={filterCat} onChange={setFilterCat} />
        <BottomSheet open={condSheetOpen} onClose={() => setCondSheetOpen(false)} title="Filter by Condition" options={[{ value: 'All', label: 'All Conditions' }, ...CONDITIONS.map(c => ({ value: c, label: c }))]} value={filterCond} onChange={setFilterCond} />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 20px', color: '#444' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>🎒</div>
          <div style={{ fontSize: 14 }}>{activeGear.length ? 'No gear matches your filters.' : 'No gear yet — add your first item above.'}</div>
        </div>
      )}

      {/* Gear grouped by category */}
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          {/* Category header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {React.createElement(CAT_ICON[cat] || Package, { size: 18, color: '#E81A1A', strokeWidth: 1.5 })}
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginLeft: 2 }}>({items.length})</span>
            <div style={{ flex: 1, height: 1, background: '#1A1A1A', marginLeft: 6 }} />
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => {
              const condColor = CONDITION_COLOR[item.condition] || '#666';
              return (
                <div key={item.id} style={{
                  background: '#111',
                  border: '1px solid #1E1E1E',
                  borderLeft: `3px solid ${condColor}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</span>
                      {(item.brand || item.model) && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>
                          {[item.brand, item.model].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${condColor}15`, color: condColor }}>
                        {item.condition}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(74,158,255,0.15)', color: '#4A9EFF' }}>
                        {item.ownership || 'Mine'}
                      </span>
                      {item.owner_name && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#888' }}>({item.owner_name})</span>
                      )}
                      {item.purchase_price > 0 && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>${item.purchase_price.toLocaleString()}</span>
                      )}
                      {item.serial_number && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>S/N: {item.serial_number}</span>
                      )}
                      {item.notes && (
                        <span style={{ fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{item.notes}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
                    >Edit</button>
                    <button
                      onClick={() => handleDelete(item)}
                      style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}
                    >×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}