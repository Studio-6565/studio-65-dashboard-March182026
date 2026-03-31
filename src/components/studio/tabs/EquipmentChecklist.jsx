import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' };
const MONO = '"DM Mono", monospace';

export default function EquipmentChecklist({ project, onUpdate }) {
  const checklist = project.equipment_checklist || [];
  const [itemInput, setItemInput] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    base44.entities.EquipmentChecklistTemplate.list('-created_date', 50).then(setTemplates);
  }, []);

  const save = (items) => onUpdate({ equipment_checklist: items });

  const handleAddItem = async () => {
    if (!itemInput.trim()) return;
    await save([...checklist, { label: itemInput.trim(), checked: false }]);
    setItemInput('');
  };

  const handleToggle = async (i) => {
    await save(checklist.map((item, j) => j === i ? { ...item, checked: !item.checked } : item));
  };

  const handleDelete = async (i) => {
    await save(checklist.filter((_, j) => j !== i));
  };

  const handleClearChecked = async () => {
    await save(checklist.map(item => ({ ...item, checked: false })));
  };

  const handleLoadTemplate = async (tpl) => {
    const newItems = tpl.items.map(it => ({ label: it.label, checked: false }));
    // Merge: avoid duplicate labels
    const existing = new Set(checklist.map(c => c.label.toLowerCase()));
    const toAdd = newItems.filter(it => !existing.has(it.label.toLowerCase()));
    await save([...checklist, ...toAdd]);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !checklist.length) return;
    setSavingTemplate(true);
    const tpl = await base44.entities.EquipmentChecklistTemplate.create({
      name: templateName.trim(),
      items: checklist.map(it => ({ label: it.label })),
    });
    setTemplates(t => [tpl, ...t]);
    setTemplateName('');
    setShowSaveForm(false);
    setSavingTemplate(false);
  };

  const handleDeleteTemplate = async (id) => {
    await base44.entities.EquipmentChecklistTemplate.delete(id);
    setTemplates(t => t.filter(tpl => tpl.id !== id));
  };

  const checkedCount = checklist.filter(i => i.checked).length;
  const pct = checklist.length ? Math.round(checkedCount / checklist.length * 100) : 0;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>📦 Equipment Checklist</span>
          {checklist.length > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: pct === 100 ? '#7BC853' : '#666' }}>
              {checkedCount}/{checklist.length} · {pct}%
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {checkedCount > 0 && (
            <button onClick={handleClearChecked} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#666', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
              Reset Checks
            </button>
          )}
          {checklist.length > 0 && (
            <button onClick={() => setShowSaveForm(v => !v)} style={{ padding: '4px 10px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 6, color: '#4A9EFF', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
              💾 Save as Template
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {checklist.length > 0 && (
        <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#7BC853', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}

      {/* Save as template form */}
      {showSaveForm && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input
            style={{ ...SS, flex: 1 }}
            placeholder="Template name (e.g. Wedding Video Kit)"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); }}
          />
          <button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()} style={{ padding: '9px 16px', background: '#4A9EFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !templateName.trim() ? 0.5 : 1 }}>
            {savingTemplate ? '...' : 'Save'}
          </button>
          <button onClick={() => setShowSaveForm(false)} style={{ padding: '9px 12px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Load template */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Load Template</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#2A2A2A', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => handleLoadTemplate(tpl)}
                  style={{ padding: '5px 12px', background: 'transparent', border: 'none', color: '#ccc', fontSize: 12, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}
                >
                  {tpl.name}
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginLeft: 6 }}>{(tpl.items || []).length} items</span>
                </button>
                <button
                  onClick={() => handleDeleteTemplate(tpl.id)}
                  style={{ padding: '5px 8px', background: 'transparent', border: 'none', borderLeft: '1px solid #333', color: '#444', fontSize: 13, cursor: 'pointer' }}
                  title="Delete template"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 10 }}>
        {!checklist.length ? (
          <div style={{ color: '#555', fontSize: 13, padding: '8px 0' }}>No items yet. Add items or load a template.</div>
        ) : checklist.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: item.checked ? 'rgba(123,200,83,0.05)' : '#2A2A2A', borderRadius: 8, marginBottom: 6, border: `1px solid ${item.checked ? 'rgba(123,200,83,0.2)' : 'transparent'}` }}>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => handleToggle(i)}
              style={{ width: 15, height: 15, accentColor: '#7BC853', flexShrink: 0 }}
            />
            <span style={{ flex: 1, fontSize: 13, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? '#555' : '#fff' }}>
              {item.label}
            </span>
            <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 15, padding: '0 4px' }}>×</button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...SS, flex: 1 }}
          value={itemInput}
          onChange={e => setItemInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
          placeholder="e.g. Sony FX6 body + battery"
        />
        <button onClick={handleAddItem} style={{ padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
      </div>
    </div>
  );
}