import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#161616', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const TYPE_LABELS = { service: 'Service', repair: 'Repair', cleaning: 'Cleaning', calibration: 'Calibration', inspection: 'Inspection', other: 'Other' };
const STATUS_CONFIG = {
  scheduled: { color: '#4A9EFF', icon: Clock, label: 'Scheduled' },
  completed: { color: '#7BC853', icon: CheckCircle, label: 'Completed' },
  overdue: { color: '#E81A1A', icon: AlertTriangle, label: 'Overdue' },
};

const emptyRecord = { type: 'service', description: '', date: new Date().toISOString().split('T')[0], next_due_date: '', cost: '', vendor: '', status: 'scheduled', notes: '' };

export default function GearMaintenanceTab({ gear, onGearUpdate }) {
  const [selectedGearId, setSelectedGearId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyRecord);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const today = new Date().toISOString().split('T')[0];

  // Auto-flag overdue items
  const allRecords = gear.flatMap(g =>
    (g.maintenance_records || []).map(r => {
      const isOverdue = r.status === 'scheduled' && r.next_due_date && r.next_due_date < today;
      return { ...r, gearId: g.id, gearName: g.name, gearCategory: g.category, _overdue: isOverdue };
    })
  ).sort((a, b) => {
    const aDate = a.next_due_date || a.date || '';
    const bDate = b.next_due_date || b.date || '';
    return aDate.localeCompare(bDate);
  });

  const filtered = allRecords.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'overdue') return r._overdue;
    return r.status === filterStatus;
  });

  const selectedGear = gear.find(g => g.id === selectedGearId);

  const handleSaveRecord = async () => {
    if (!selectedGearId) { showToast('Select a gear item first', 'red'); return; }
    if (!form.description.trim()) { showToast('Description is required', 'red'); return; }

    const records = [...(selectedGear.maintenance_records || [])];
    const newRecord = {
      ...form,
      id: editingRecordId || `mr_${Date.now()}`,
      cost: parseFloat(form.cost) || 0,
    };

    let updated;
    if (editingRecordId) {
      updated = records.map(r => r.id === editingRecordId ? newRecord : r);
    } else {
      updated = [...records, newRecord];
    }

    const updatedGear = { ...selectedGear, maintenance_records: updated };
    await base44.entities.GearItem.update(selectedGearId, { maintenance_records: updated });
    onGearUpdate(updatedGear);
    showToast(editingRecordId ? 'Record updated' : 'Maintenance logged', 'green');
    setShowForm(false);
    setForm(emptyRecord);
    setEditingRecordId(null);
  };

  const handleMarkComplete = async (record) => {
    const g = gear.find(x => x.id === record.gearId);
    if (!g) return;
    const updated = (g.maintenance_records || []).map(r =>
      r.id === record.id ? { ...r, status: 'completed' } : r
    );
    await base44.entities.GearItem.update(g.id, { maintenance_records: updated });
    onGearUpdate({ ...g, maintenance_records: updated });
    showToast('Marked complete', 'green');
  };

  const handleDeleteRecord = async (record) => {
    if (!confirm('Delete this maintenance record?')) return;
    const g = gear.find(x => x.id === record.gearId);
    if (!g) return;
    const updated = (g.maintenance_records || []).filter(r => r.id !== record.id);
    await base44.entities.GearItem.update(g.id, { maintenance_records: updated });
    onGearUpdate({ ...g, maintenance_records: updated });
    showToast('Record deleted', 'red');
  };

  const overdueCount = allRecords.filter(r => r._overdue).length;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Maintenance</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 3 }}>
            {allRecords.length} records · {overdueCount > 0 ? <span style={{ color: '#E81A1A' }}>{overdueCount} overdue</span> : 'all on track'}
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyRecord); setEditingRecordId(null); setShowForm(s => !s); }}
          style={{ padding: '9px 16px', background: showForm && !editingRecordId ? '#2A2A2A' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} />{showForm && !editingRecordId ? 'Cancel' : 'Log Maintenance'}
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 16 }}>
            {editingRecordId ? 'Edit Record' : 'New Maintenance Record'}
          </div>
          {/* Gear selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={LS}>Gear Item *</label>
            <select
              style={{ ...IS }}
              value={selectedGearId || ''}
              onChange={e => setSelectedGearId(e.target.value || null)}
            >
              <option value="">— Select gear —</option>
              {gear.filter(g => !g.archived).map(g => (
                <option key={g.id} value={g.id}>{g.name}{g.brand ? ` (${g.brand})` : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={LS}>Type</label>
              <select style={IS} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Status</label>
              <select style={IS} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label style={LS}>Date</label>
              <input style={IS} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={LS}>Next Due Date</label>
              <input style={IS} type="date" value={form.next_due_date} onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))} />
            </div>
            <div>
              <label style={LS}>Cost ($)</label>
              <input style={IS} type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label style={LS}>Vendor / Technician</label>
              <input style={IS} value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Canon Service" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LS}>Description *</label>
              <input style={IS} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Sensor cleaning, firmware update..." autoFocus />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LS}>Notes</label>
              <textarea style={{ ...IS, resize: 'none' }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveRecord} style={{ flex: 1, padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {editingRecordId ? 'Save Changes' : 'Save Record'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyRecord); setEditingRecordId(null); }} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all', 'All'], ['scheduled', 'Scheduled'], ['overdue', 'Overdue'], ['completed', 'Completed']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO,
            background: filterStatus === v ? '#E81A1A' : '#1A1A1A',
            color: filterStatus === v ? '#fff' : '#555',
          }}>{l}{v === 'overdue' && overdueCount > 0 ? ` (${overdueCount})` : ''}</button>
        ))}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
          <Wrench size={36} color="#333" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>No maintenance records yet.</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 6 }}>Log your first service, repair, or cleaning above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const status = r._overdue ? 'overdue' : r.status;
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
            const StatusIcon = cfg.icon;
            return (
              <div key={`${r.gearId}-${r.id}`} style={{
                background: '#111', border: '1px solid #1E1E1E',
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <StatusIcon size={16} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.gearName}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: `${cfg.color}18`, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#1E1E1E', color: '#666' }}>{TYPE_LABELS[r.type] || r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#ccc', marginBottom: 4 }}>{r.description}</div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {r.date && <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>📅 {r.date}</span>}
                    {r.next_due_date && <span style={{ fontFamily: MONO, fontSize: 10, color: r._overdue ? '#E81A1A' : '#4A9EFF' }}>⏭ Due: {r.next_due_date}</span>}
                    {r.cost > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B' }}>${r.cost}</span>}
                    {r.vendor && <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>🔧 {r.vendor}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {r.status !== 'completed' && (
                    <button onClick={() => handleMarkComplete(r)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(123,200,83,0.12)', color: '#7BC853' }}>✓ Done</button>
                  )}
                  <button onClick={() => handleDeleteRecord(r)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}