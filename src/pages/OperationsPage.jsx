import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const DEFAULT_CHECKLIST = [
  'Camera body charged & formatted',
  'Lenses packed',
  'Memory cards formatted',
  'ND filters packed',
  'Tripod / gimbal packed',
  'Audio recorder + mics',
  'Batteries charged (all)',
  'Laptop + hard drive',
  'Charging cables',
  'Location scouted',
  'Parking confirmed',
  'Client brief reviewed',
  'Call sheet sent to crew',
];

export default function OperationsPage() {
  const [shotTemplates, setShotTemplates] = useState([]);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shot list template state
  const [showShotForm, setShowShotForm] = useState(false);
  const [editingShotId, setEditingShotId] = useState(null);
  const [shotForm, setShotForm] = useState({ name: '', category: '', shots: [] });
  const [shotInput, setShotInput] = useState('');

  // Checklist template state
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [checklistForm, setChecklistForm] = useState({ name: '', items: [] });
  const [checklistInput, setChecklistInput] = useState('');

  const [activeTab, setActiveTab] = useState('shots');

  useEffect(() => {
    Promise.all([
      base44.entities.ShotListTemplate.list('name', 100),
      base44.entities.EquipmentChecklistTemplate.list('name', 100),
    ]).then(([s, c]) => { setShotTemplates(s); setChecklistTemplates(c); setLoading(false); });
  }, []);

  // ── Shot list templates ──
  const handleSaveShotTemplate = async () => {
    if (!shotForm.name.trim()) { showToast('Name required', 'red'); return; }
    if (editingShotId) {
      await base44.entities.ShotListTemplate.update(editingShotId, shotForm);
      setShotTemplates(t => t.map(x => x.id === editingShotId ? { ...x, ...shotForm } : x));
      showToast('Template updated', 'blue');
    } else {
      const created = await base44.entities.ShotListTemplate.create(shotForm);
      setShotTemplates(t => [...t, created]);
      showToast('Template created');
    }
    setShotForm({ name: '', category: '', shots: [] }); setShotInput(''); setEditingShotId(null); setShowShotForm(false);
  };

  const addShot = () => {
    if (!shotInput.trim()) return;
    setShotForm(f => ({ ...f, shots: [...f.shots, { shot: shotInput.trim() }] }));
    setShotInput('');
  };

  const handleDeleteShotTemplate = async (id) => {
    if (!confirm('Delete this shot list template?')) return;
    await base44.entities.ShotListTemplate.delete(id);
    setShotTemplates(t => t.filter(x => x.id !== id));
    showToast('Template deleted', 'red');
  };

  const handleEditShot = (t) => {
    setShotForm({ name: t.name, category: t.category || '', shots: t.shots || [] });
    setEditingShotId(t.id);
    setShowShotForm(true);
  };

  // ── Checklist templates ──
  const handleSaveChecklistTemplate = async () => {
    if (!checklistForm.name.trim()) { showToast('Name required', 'red'); return; }
    if (editingChecklistId) {
      await base44.entities.EquipmentChecklistTemplate.update(editingChecklistId, checklistForm);
      setChecklistTemplates(t => t.map(x => x.id === editingChecklistId ? { ...x, ...checklistForm } : x));
      showToast('Checklist updated', 'blue');
    } else {
      const created = await base44.entities.EquipmentChecklistTemplate.create(checklistForm);
      setChecklistTemplates(t => [...t, created]);
      showToast('Checklist created');
    }
    setChecklistForm({ name: '', items: [] }); setChecklistInput(''); setEditingChecklistId(null); setShowChecklistForm(false);
  };

  const addChecklistItem = (label) => {
    const l = label || checklistInput.trim();
    if (!l) return;
    setChecklistForm(f => ({ ...f, items: [...f.items, { label: l }] }));
    if (!label) setChecklistInput('');
  };

  const handleDeleteChecklistTemplate = async (id) => {
    if (!confirm('Delete this checklist template?')) return;
    await base44.entities.EquipmentChecklistTemplate.delete(id);
    setChecklistTemplates(t => t.filter(x => x.id !== id));
    showToast('Checklist deleted', 'red');
  };

  const handleEditChecklist = (t) => {
    setChecklistForm({ name: t.name, items: t.items || [] });
    setEditingChecklistId(t.id);
    setShowChecklistForm(true);
  };

  const loadDefaultChecklist = () => {
    setChecklistForm(f => ({ ...f, items: DEFAULT_CHECKLIST.map(label => ({ label })) }));
    showToast('Default items loaded');
  };

  if (loading) return <div style={{ color: '#555', padding: 40, textAlign: 'center', fontFamily: MONO }}>Loading...</div>;

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Operations</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 16 }}>Shot list & checklist templates</div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 3, background: '#111', border: '1px solid #222', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 16 }}>
        {['shots', 'checklists'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '5px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: 'none', fontFamily: MONO,
            background: activeTab === t ? '#E81A1A' : 'transparent',
            color: activeTab === t ? '#fff' : '#555',
          }}>{t === 'shots' ? 'Shot Lists' : 'Pre-Shoot Checklists'}</button>
        ))}
      </div>

      {/* ── SHOT LIST TEMPLATES ── */}
      {activeTab === 'shots' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => { setShotForm({ name: '', category: '', shots: [] }); setEditingShotId(null); setShowShotForm(s => !s); }}
              style={{ padding: '8px 18px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + New Template
            </button>
          </div>

          {showShotForm && (
            <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{editingShotId ? 'Edit Template' : 'New Shot List Template'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div><label style={LS}>Template Name *</label><input style={IS} value={shotForm.name} onChange={e => setShotForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Corporate Event" /></div>
                <div><label style={LS}>Category / Type</label><input style={IS} value={shotForm.category} onChange={e => setShotForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Event, Wedding, Real Estate" /></div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={LS}>Shots ({shotForm.shots.length})</label>
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                  {shotForm.shots.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#2A2A2A', borderRadius: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4A9EFF', flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12 }}>{s.shot}</div>
                      <button onClick={() => setShotForm(f => ({ ...f, shots: f.shots.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 15, padding: '0 3px' }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...IS, flex: 1 }} value={shotInput} onChange={e => setShotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addShot()} placeholder="e.g. Wide establishing shot" />
                  <button onClick={addShot} style={{ padding: '0 16px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveShotTemplate} style={{ flex: 1, padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {editingShotId ? 'Save Changes' : 'Create Template'}
                </button>
                <button onClick={() => { setShowShotForm(false); setEditingShotId(null); }} style={{ padding: '10px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {shotTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🎬</div>
              <div>No shot list templates yet. Create one to reuse across projects.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {shotTemplates.map(t => (
                <div key={t.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                      {t.category && <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginTop: 2 }}>{t.category}</div>}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF', padding: '2px 7px', background: 'rgba(74,158,255,0.1)', borderRadius: 4 }}>{(t.shots || []).length} shots</span>
                  </div>
                  <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
                    {(t.shots || []).slice(0, 6).map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#888', padding: '2px 0', display: 'flex', gap: 6 }}>
                        <span style={{ color: '#444' }}>·</span>{s.shot}
                      </div>
                    ))}
                    {(t.shots || []).length > 6 && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 4 }}>+{(t.shots || []).length - 6} more</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEditShot(t)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>Edit</button>
                    <button onClick={() => handleDeleteShotTemplate(t.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHECKLIST TEMPLATES ── */}
      {activeTab === 'checklists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => { setChecklistForm({ name: '', items: [] }); setEditingChecklistId(null); setShowChecklistForm(s => !s); }}
              style={{ padding: '8px 18px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + New Checklist
            </button>
          </div>

          {showChecklistForm && (
            <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{editingChecklistId ? 'Edit Checklist' : 'New Pre-Shoot Checklist'}</div>
              <div style={{ marginBottom: 12 }}>
                <label style={LS}>Checklist Name *</label>
                <input style={IS} value={checklistForm.name} onChange={e => setChecklistForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Shoot Pack-Up" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...LS, marginBottom: 0 }}>Items ({checklistForm.items.length})</label>
                  {checklistForm.items.length === 0 && (
                    <button onClick={loadDefaultChecklist} style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF', background: 'none', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>
                      Load Defaults
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                  {checklistForm.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#2A2A2A', borderRadius: 6, marginBottom: 4 }}>
                      <div style={{ width: 10, height: 10, border: '1.5px solid #555', borderRadius: 3, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12 }}>{item.label}</div>
                      <button onClick={() => setChecklistForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 15, padding: '0 3px' }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...IS, flex: 1 }} value={checklistInput} onChange={e => setChecklistInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()} placeholder="e.g. Memory cards formatted" />
                  <button onClick={() => addChecklistItem()} style={{ padding: '0 16px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveChecklistTemplate} style={{ flex: 1, padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {editingChecklistId ? 'Save Changes' : 'Create Checklist'}
                </button>
                <button onClick={() => { setShowChecklistForm(false); setEditingChecklistId(null); }} style={{ padding: '10px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {checklistTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>✅</div>
              <div>No checklist templates yet. Create one to use before every shoot.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {checklistTemplates.map(t => (
                <div key={t.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853', padding: '2px 7px', background: 'rgba(123,200,83,0.1)', borderRadius: 4 }}>{(t.items || []).length} items</span>
                  </div>
                  <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
                    {(t.items || []).slice(0, 6).map((item, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#888', padding: '2px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, border: '1.5px solid #444', borderRadius: 2, flexShrink: 0 }} />
                        {item.label}
                      </div>
                    ))}
                    {(t.items || []).length > 6 && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 4 }}>+{(t.items || []).length - 6} more</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEditChecklist(t)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>Edit</button>
                    <button onClick={() => handleDeleteChecklistTemplate(t.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>×</button>
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