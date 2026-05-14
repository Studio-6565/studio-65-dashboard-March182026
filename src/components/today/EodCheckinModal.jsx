import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function EodCheckinModal({ items, date, onClose, onCheckedIn }) {
  const [done, setDone] = useState(new Set());
  const [slipped, setSlipped] = useState(new Set());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id, setFn, otherFn) => {
    setFn(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    otherFn(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleSubmit = async () => {
    setSaving(true);
    // Mark done items
    await Promise.all([...done].map(id => base44.entities.CaptureTask.update(id, { status: 'done' }).catch(() => {})));
    // Roll slipped items: increment roll_count, defer to tomorrow
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await Promise.all([...slipped].map(async id => {
      const task = items.find(i => i.id === id);
      if (!task) return;
      const rollCount = (task.roll_count || 0) + 1;
      await base44.entities.CaptureTask.update(id, { due_date: tomorrowStr, roll_count: rollCount }).catch(() => {});
    }));
    // Save checkin record
    await base44.entities.EodCheckin.create({
      date,
      done_task_ids: [...done],
      slipped_task_ids: [...slipped],
      added_notes: notes,
      summary: `${done.size} done, ${slipped.size} slipped to tomorrow`,
    });
    showToast('End of day saved ✓', 'green');
    onCheckedIn?.();
    onClose?.();
    setSaving(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, zIndex: 1001, background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🌙 End of Day Check-In</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{date}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Mark each task:</div>
          {items.length === 0 && <div style={{ fontFamily: MONO, fontSize: 11, color: '#333', textAlign: 'center', padding: '20px 0' }}>No tasks for today</div>}
          {items.map(item => {
            const isDone = done.has(item.id);
            const isSlipped = slipped.has(item.id);
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isDone ? 'rgba(123,200,83,0.06)' : isSlipped ? 'rgba(232,26,26,0.05)' : '#111', border: `1px solid ${isDone ? 'rgba(123,200,83,0.2)' : isSlipped ? 'rgba(232,26,26,0.15)' : '#1E1E1E'}`, borderRadius: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: 13, color: '#ccc' }}>{item.title}</div>
                <button onClick={() => toggle(item.id, setDone, setSlipped)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, background: isDone ? 'rgba(123,200,83,0.18)' : 'transparent', border: `1px solid ${isDone ? '#7BC853' : '#222'}`, color: isDone ? '#7BC853' : '#555' }}>
                  ✓ Done
                </button>
                <button onClick={() => toggle(item.id, setSlipped, setDone)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, background: isSlipped ? 'rgba(232,26,26,0.15)' : 'transparent', border: `1px solid ${isSlipped ? '#E81A1A' : '#222'}`, color: isSlipped ? '#E81A1A' : '#555' }}>
                  → Slip
                </button>
              </div>
            );
          })}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Anything added today? Notes?</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="New tasks added, blockers, wins..." style={{ width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #1A1A1A', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, fontFamily: MONO, fontSize: 10, color: '#555' }}>
            {done.size > 0 && <span style={{ color: '#7BC853' }}>{done.size} done · </span>}
            {slipped.size > 0 && <span style={{ color: '#E81A1A' }}>{slipped.size} rolling tomorrow</span>}
          </div>
          <button onClick={onClose} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #222', borderRadius: 8, color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 20px', background: '#F59E0B', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Submit Check-In'}
          </button>
        </div>
      </div>
    </>
  );
}