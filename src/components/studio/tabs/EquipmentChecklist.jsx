import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' };
const MONO = '"DM Mono", monospace';

const STATUSES = [
  { key: 'needed',     label: 'Needed',      color: '#666',    bg: 'rgba(100,100,100,0.12)', dot: '#555' },
  { key: 'packed',     label: 'Packed',      color: '#4A9EFF', bg: 'rgba(74,158,255,0.12)',  dot: '#4A9EFF' },
  { key: 'checked_in', label: 'Checked In',  color: '#7BC853', bg: 'rgba(123,200,83,0.15)',  dot: '#7BC853' },
  { key: 'used',       label: 'On Set',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  dot: '#F59E0B' },
  { key: 'returned',   label: 'Returned',    color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', dot: '#A78BFA' },
  { key: 'missing',    label: 'Missing',     color: '#E81A1A', bg: 'rgba(232,26,26,0.12)',   dot: '#E81A1A' },
];

const DONE_KEYS = new Set(['checked_in', 'used', 'returned']);
const READY_KEYS = new Set(['packed', 'checked_in', 'used', 'returned']);

function StatusPill({ status, onChange }) {
  const cur = STATUSES.find(s => s.key === status) || STATUSES[0];
  const nextIdx = (STATUSES.indexOf(cur) + 1) % STATUSES.length;
  const next = STATUSES[nextIdx];
  return (
    <button
      onClick={() => onChange(next.key)}
      title={`Click → ${next.label}`}
      style={{
        padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
        cursor: 'pointer', border: `1px solid ${cur.color}55`,
        background: cur.bg, color: cur.color,
        fontFamily: MONO, whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {cur.label}
    </button>
  );
}

function QuickBtn({ label, color, bg, border, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700,
      cursor: 'pointer', border, background: bg, color,
      fontFamily: MONO, whiteSpace: 'nowrap', flexShrink: 0,
      transition: 'opacity 0.15s',
    }}>
      {label}
    </button>
  );
}

export default function EquipmentChecklist({ project, onUpdate }) {
  const checklist = project.equipment_checklist || [];
  const [itemInput, setItemInput] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    base44.entities.EquipmentChecklistTemplate.list('-created_date', 50).then(setTemplates);
  }, []);

  const save = (items) => onUpdate({ equipment_checklist: items });

  const handleAddItem = async () => {
    if (!itemInput.trim()) return;
    await save([...checklist, { label: itemInput.trim(), status: 'needed' }]);
    setItemInput('');
  };

  const handleSetStatus = async (i, status) => {
    await save(checklist.map((item, j) => j === i ? { ...item, status, checked: DONE_KEYS.has(status) } : item));
  };

  const handleDelete = async (i) => {
    await save(checklist.filter((_, j) => j !== i));
  };

  const handleResetAll = async () => {
    await save(checklist.map(item => ({ ...item, status: 'needed', checked: false })));
  };

  const handleMarkAllPacked = async () => {
    await save(checklist.map(item =>
      item.status === 'needed' ? { ...item, status: 'packed', checked: false } : item
    ));
  };

  const handleLoadTemplate = async (tpl) => {
    const existing = new Set(checklist.map(c => c.label.toLowerCase()));
    const toAdd = tpl.items
      .filter(it => !existing.has(it.label.toLowerCase()))
      .map(it => ({ label: it.label, status: 'needed' }));
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

  // Stats
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = checklist.filter(i => (i.status || 'needed') === s.key).length;
    return acc;
  }, {});
  const readyCount = checklist.filter(i => READY_KEYS.has(i.status || 'needed')).length;
  const checkedInCount = counts['checked_in'] || 0;
  const pct = checklist.length ? Math.round(readyCount / checklist.length * 100) : 0;
  const checkedInPct = checklist.length ? Math.round(checkedInCount / checklist.length * 100) : 0;

  const barColor = pct === 100 ? '#7BC853' : pct >= 60 ? '#4A9EFF' : pct > 0 ? '#F59E0B' : '#333';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          📦 Equipment Checklist
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {checklist.some(i => i.status === 'needed') && (
            <button onClick={handleMarkAllPacked} style={{ padding: '4px 10px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 6, color: '#4A9EFF', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
              Pack All Remaining
            </button>
          )}
          {checklist.length > 0 && (
            <button onClick={handleResetAll} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#666', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
              Reset All
            </button>
          )}
          {checklist.length > 0 && (
            <button onClick={() => setShowSaveForm(v => !v)} style={{ padding: '4px 10px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 6, color: '#4A9EFF', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
              💾 Save Template
            </button>
          )}
        </div>
      </div>

      {/* Progress bar + stats */}
      {checklist.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {/* Big progress bar */}
          <div style={{ height: 10, background: '#1E1E1E', borderRadius: 6, overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
            {/* Checked-in fill (darker green layer behind) */}
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${checkedInPct}%`,
              background: '#7BC853',
              borderRadius: 6,
              transition: 'width 0.4s ease',
            }} />
            {/* Total ready fill (semi-transparent overlay) */}
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${pct}%`,
              background: barColor,
              opacity: checkedInPct > 0 ? 0.5 : 1,
              borderRadius: 6,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUSES.filter(s => counts[s.key] > 0).map(s => (
                <span key={s.key} style={{
                  fontFamily: MONO, fontSize: 9, color: s.color,
                  background: s.bg, border: `1px solid ${s.color}33`,
                  borderRadius: 4, padding: '2px 7px',
                }}>
                  {s.label} {counts[s.key]}
                </span>
              ))}
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              color: pct === 100 ? '#7BC853' : barColor,
            }}>
              {readyCount}/{checklist.length} ready · {pct}%
              {checkedInCount > 0 && <span style={{ color: '#7BC853' }}> · {checkedInCount} checked in</span>}
            </span>
          </div>
        </div>
      )}

      {/* Save template form */}
      {showSaveForm && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input
            style={{ ...SS, flex: 1 }}
            placeholder="Template name (e.g. Wedding Video Kit)"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); }}
          />
          <button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()} style={{ padding: '9px 16px', background: '#4A9EFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !templateName.trim() ? 0.5 : 1 }}>
            {savingTemplate ? '...' : 'Save'}
          </button>
          <button onClick={() => setShowSaveForm(false)} style={{ padding: '9px 12px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Load templates */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Load Template</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', background: '#2A2A2A', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
                <button onClick={() => handleLoadTemplate(tpl)} style={{ padding: '5px 12px', background: 'transparent', border: 'none', color: '#ccc', fontSize: 12, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                  {tpl.name}
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginLeft: 6 }}>{(tpl.items || []).length} items</span>
                </button>
                <button onClick={() => handleDeleteTemplate(tpl.id)} style={{ padding: '5px 8px', background: 'transparent', border: 'none', borderLeft: '1px solid #333', color: '#444', fontSize: 13, cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 10 }}>
        {!checklist.length ? (
          <div style={{ color: '#555', fontSize: 13, padding: '8px 0' }}>No items yet. Add items or load a template.</div>
        ) : checklist.map((item, i) => {
          const s = STATUSES.find(st => st.key === (item.status || 'needed')) || STATUSES[0];
          const isDone = DONE_KEYS.has(item.status);
          const isCheckedIn = item.status === 'checked_in';
          const isPacked = item.status === 'packed';
          const isMissing = item.status === 'missing';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
              background: isCheckedIn ? 'rgba(123,200,83,0.08)' : isMissing ? 'rgba(232,26,26,0.06)' : '#2A2A2A',
              borderRadius: 8, marginBottom: 6,
              border: `1px solid ${isMissing ? 'rgba(232,26,26,0.3)' : isCheckedIn ? 'rgba(123,200,83,0.25)' : isPacked ? 'rgba(74,158,255,0.2)' : 'transparent'}`,
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              {/* Status dot */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />

              {/* Label */}
              <span style={{ flex: 1, fontSize: 13, color: isDone ? '#777' : isMissing ? '#E81A1A' : '#fff', textDecoration: isDone ? 'line-through' : 'none', transition: 'color 0.2s' }}>
                {item.label}
              </span>

              {/* Quick action buttons */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {item.status !== 'packed' && item.status !== 'checked_in' && item.status !== 'used' && item.status !== 'returned' && (
                  <QuickBtn
                    label="Pack"
                    color="#4A9EFF"
                    bg="rgba(74,158,255,0.1)"
                    border="1px solid rgba(74,158,255,0.3)"
                    onClick={() => handleSetStatus(i, 'packed')}
                  />
                )}
                {item.status !== 'checked_in' && item.status !== 'used' && item.status !== 'returned' && (
                  <QuickBtn
                    label="Check In"
                    color="#7BC853"
                    bg="rgba(123,200,83,0.1)"
                    border="1px solid rgba(123,200,83,0.3)"
                    onClick={() => handleSetStatus(i, 'checked_in')}
                  />
                )}

                {/* Full status cycle pill */}
                <StatusPill status={item.status || 'needed'} onChange={status => handleSetStatus(i, status)} />

                <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 15, padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            </div>
          );
        })}
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
      <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 9, color: '#444' }}>
        Use Pack / Check In buttons, or click the status pill to cycle through all states
      </div>
    </div>
  );
}