import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

export default function PortalEquipmentChecklist({ project }) {
  const checklist = project.equipment_checklist || [];
  const [items, setItems] = useState(checklist);
  const [saving, setSaving] = useState(false);

  if (!items.length) {
    return (
      <div style={{ color: '#555', fontSize: 12, fontFamily: MONO, padding: '8px 0' }}>
        No equipment checklist yet — the studio will add gear items here.
      </div>
    );
  }

  const checkedCount = items.filter(i => i.checked).length;
  const pct = Math.round(checkedCount / items.length * 100);

  const handleToggle = async (idx) => {
    const updated = items.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item);
    setItems(updated);
    setSaving(true);
    await base44.entities.Project.update(project.id, { ...project, equipment_checklist: updated });
    setSaving(false);
  };

  return (
    <div>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', fontWeight: 700 }}>
          📦 Equipment Checklist
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: pct === 100 ? '#7BC853' : '#666' }}>
          {checkedCount}/{items.length} · {pct}%
        </span>
      </div>

      <div style={{ height: 3, background: '#222', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#7BC853', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => handleToggle(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              background: item.checked ? 'rgba(123,200,83,0.06)' : '#1A1A1A',
              border: `1px solid ${item.checked ? 'rgba(123,200,83,0.2)' : '#252525'}`,
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${item.checked ? '#7BC853' : '#444'}`,
              background: item.checked ? '#7BC853' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.checked && <span style={{ color: '#000', fontSize: 11, fontWeight: 800 }}>✓</span>}
            </div>
            <span style={{
              fontSize: 13, flex: 1,
              color: item.checked ? '#555' : '#ccc',
              textDecoration: item.checked ? 'line-through' : 'none',
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {saving && (
        <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, marginTop: 8 }}>Saving...</div>
      )}
    </div>
  );
}