import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';
const IS = { background: '#161616', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const CAT_ICON = { Camera: '📷', Lens: '🔭', Audio: '🎙', Lighting: '💡', Drone: '🚁', Stabilizer: '⚖️', Storage: '💾', Accessories: '🔌', Other: '📦' };

// ── Kit Editor ────────────────────────────────────────────────────────────

function KitEditor({ kit, gear, onSave, onCancel }) {
  const [name, setName] = useState(kit?.name || '');
  const [description, setDescription] = useState(kit?.description || '');
  const [tags, setTags] = useState((kit?.tags || []).join(', '));
  const [items, setItems] = useState(kit?.items || []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const activeGear = gear.filter(g => !g.archived);

  const filtered = activeGear.filter(g => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (g.name || '').toLowerCase().includes(q) || (g.brand || '').toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q);
  });

  const inKit = (id) => items.some(i => i.gear_id === id);

  const toggle = (g) => {
    if (inKit(g.id)) {
      setItems(prev => prev.filter(i => i.gear_id !== g.id));
    } else {
      setItems(prev => [...prev, { gear_id: g.id, gear_name: g.name, category: g.category, quantity: 1, notes: '' }]);
    }
  };

  const updateItem = (gear_id, field, value) => {
    setItems(prev => prev.map(i => i.gear_id === gear_id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('Kit name is required', 'red'); return; }
    setSaving(true);
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    await onSave({ name: name.trim(), description: description.trim(), tags: tagArr, items });
    setSaving(false);
  };

  // Group gear by category
  const byCat = {};
  filtered.forEach(g => {
    const cat = g.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(g);
  });

  // Items in kit with quantity/notes controls
  const kitItems = items.map(i => {
    const gearItem = gear.find(g => g.id === i.gear_id);
    return { ...i, _gear: gearItem };
  }).filter(i => i._gear);

  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 20 }}>← Back to Kits</button>

      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{kit ? 'Edit Kit' : 'New Shoot Kit'}</div>

      {/* Kit meta */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LS}>Kit Name *</label>
            <input style={IS} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wedding Full Kit, Corporate Day Pack, Drone Kit" autoFocus />
          </div>
          <div>
            <label style={LS}>Description</label>
            <input style={IS} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short notes about this kit..." />
          </div>
          <div>
            <label style={LS}>Tags (comma-separated)</label>
            <input style={IS} value={tags} onChange={e => setTags(e.target.value)} placeholder="Wedding, Outdoor, Run-and-gun..." />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: gear picker */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Select from Inventory ({items.length} selected)
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search gear..."
            style={{ ...IS, marginBottom: 12 }}
          />
          <div style={{ maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(byCat).map(([cat, catItems]) => (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12 }}>{CAT_ICON[cat] || '📦'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {catItems.map(g => {
                    const selected = inKit(g.id);
                    return (
                      <button key={g.id} onClick={() => toggle(g)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', background: selected ? 'rgba(123,200,83,0.07)' : '#111',
                        border: `1px solid ${selected ? 'rgba(123,200,83,0.3)' : '#1E1E1E'}`,
                        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `1.5px solid ${selected ? '#7BC853' : '#333'}`,
                          background: selected ? '#7BC853' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ color: '#000', fontSize: 9, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: selected ? '#7BC853' : '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                          {(g.brand || g.model) && <div style={{ fontSize: 10, color: '#444', fontFamily: MONO }}>{[g.brand, g.model].filter(Boolean).join(' · ')}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ color: '#444', fontSize: 12, fontFamily: MONO, textAlign: 'center', padding: '20px 0' }}>No gear found</div>
            )}
          </div>
        </div>

        {/* Right: kit contents with qty/notes */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Kit Contents
          </div>
          {kitItems.length === 0 ? (
            <div style={{ background: '#111', border: '1px dashed #222', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#444' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
              <div style={{ fontSize: 12, fontFamily: MONO }}>Select gear from the list</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {kitItems.map(item => (
                <div key={item.gear_id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{item.gear_name}</div>
                    <button onClick={() => toggle(item._gear)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: '0 0 60px' }}>
                      <label style={{ ...LS, fontSize: 9 }}>Qty</label>
                      <input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={e => updateItem(item.gear_id, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ ...IS, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...LS, fontSize: 9 }}>Notes</label>
                      <input
                        value={item.notes}
                        onChange={e => updateItem(item.gear_id, 'notes', e.target.value)}
                        placeholder="e.g. bring ND filters"
                        style={{ ...IS, padding: '6px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : kit ? 'Save Changes' : 'Create Kit'}
        </button>
        <button onClick={onCancel} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Kit Card ──────────────────────────────────────────────────────────────

function KitCard({ kit, gear, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const items = kit.items || [];
  const tags = kit.tags || [];

  // Group items by category
  const byCat = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(item);
  });

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{kit.name}</span>
            {tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(74,158,255,0.1)', color: '#4A9EFF', fontFamily: MONO, fontWeight: 600 }}>{tag}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            {kit.description && <span style={{ fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kit.description}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(kit); }} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(kit); }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}>×</button>
          <span style={{ color: '#333', fontSize: 12, display: 'flex', alignItems: 'center' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #1E1E1E', padding: '14px 18px' }}>
          {items.length === 0 ? (
            <div style={{ color: '#444', fontSize: 12, fontFamily: MONO }}>No items in this kit.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(byCat).map(([cat, catItems]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>{CAT_ICON[cat] || '📦'}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat}</span>
                    <div style={{ flex: 1, height: 1, background: '#1E1E1E', marginLeft: 4 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {catItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#111', borderRadius: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#555', fontFamily: MONO, flexShrink: 0 }}>×{item.quantity || 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{item.gear_name}</div>
                          {item.notes && <div style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>{item.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ShootKits ────────────────────────────────────────────────────────

export default function ShootKits({ gear }) {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=list, 'new'=new kit, kit obj=editing

  useEffect(() => {
    base44.entities.ShootKit.list('name', 200).then(k => { setKits(k); setLoading(false); });
  }, []);

  const handleSave = async (data) => {
    if (editing === 'new') {
      const created = await base44.entities.ShootKit.create(data);
      setKits(prev => [created, ...prev]);
      showToast(`"${data.name}" kit created`, 'green');
    } else {
      const updated = await base44.entities.ShootKit.update(editing.id, data);
      setKits(prev => prev.map(k => k.id === updated.id ? updated : k));
      showToast(`"${data.name}" updated`, 'blue');
    }
    setEditing(null);
  };

  const handleDelete = async (kit) => {
    if (!confirm(`Delete kit "${kit.name}"?`)) return;
    await base44.entities.ShootKit.delete(kit.id);
    setKits(prev => prev.filter(k => k.id !== kit.id));
    showToast(`"${kit.name}" deleted`, 'red');
  };

  if (loading) return <div style={{ color: '#444', padding: 60, textAlign: 'center', fontFamily: MONO, fontSize: 11 }}>Loading kits...</div>;

  if (editing) {
    return <KitEditor kit={editing === 'new' ? null : editing} gear={gear} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Shoot Kits</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 3 }}>
            Saved gear sets for repeat shoot types
          </div>
        </div>
        <button
          onClick={() => setEditing('new')}
          style={{ padding: '9px 18px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
        >+ New Kit</button>
      </div>

      {kits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444' }}>
          <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.2 }}>🎒</div>
          <div style={{ fontSize: 15, color: '#666', marginBottom: 6 }}>No shoot kits yet</div>
          <div style={{ fontSize: 12, fontFamily: MONO, color: '#444', marginBottom: 20 }}>Build kits from your inventory for weddings, corporates, drone shoots, etc.</div>
          <button onClick={() => setEditing('new')} style={{ padding: '12px 28px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Create First Kit</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {kits.map(kit => (
            <KitCard key={kit.id} kit={kit} gear={gear} onEdit={setEditing} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}