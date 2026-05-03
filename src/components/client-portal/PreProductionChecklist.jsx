import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export const PREPROD_TASKS = [
  { id: 'logo_assets',      label: 'Submit Logo Assets',          hint: 'Upload your logo files (PNG/SVG with transparency)' },
  { id: 'brand_guidelines', label: 'Share Brand Guidelines',      hint: 'Fonts, colours, do/don\'t rules' },
  { id: 'release_forms',    label: 'Sign Release Forms',          hint: 'Talent & location release documents' },
  { id: 'location_access',  label: 'Confirm Location Access',     hint: 'Parking, entry codes, on-site contact' },
  { id: 'wardrobe',         label: 'Confirm Wardrobe / Styling',  hint: 'What will talent wear on shoot day' },
  { id: 'script_approved',  label: 'Approve Script / Shot List',  hint: 'Final sign-off on content direction' },
  { id: 'deposit_paid',     label: 'Deposit Paid',                hint: 'Initial deposit to confirm booking' },
];

export default function PreProductionChecklist({ project, contact }) {
  const [checked, setChecked] = useState(project.preprod_checklist || {});
  const saveTimer = useRef(null);

  // Seed from project entity if it changes upstream
  useEffect(() => {
    if (project.preprod_checklist) setChecked(project.preprod_checklist);
  }, [project.id]);

  const toggle = async (taskId) => {
    const next = { ...checked, [taskId]: !checked[taskId] };
    setChecked(next);

    // Debounce DB writes to avoid hammering on rapid taps
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await base44.entities.Project.update(project.id, { preprod_checklist: next });
    }, 600);

    // Notify studio in inbox only when checking (not unchecking)
    if (next[taskId]) {
      const task = PREPROD_TASKS.find(t => t.id === taskId);
      try {
        await base44.entities.ClientMessage.create({
          project_id: project.id,
          project_name: project.name,
          client_name: contact.name,
          from: 'client',
          type: 'message',
          title: `✅ Pre-production: ${task?.label}`,
          body: `${contact.name} completed the pre-production task: **${task?.label}**`,
          read_by_studio: false,
          read_by_client: true,
        });
      } catch {}
    }
  };

  const doneCount = PREPROD_TASKS.filter(t => checked[t.id]).length;
  const pct = Math.round((doneCount / PREPROD_TASKS.length) * 100);

  return (
    <div style={{ padding: '20px', borderTop: '1px solid #141414' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Pre-Production Checklist
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: doneCount === PREPROD_TASKS.length ? '#7BC853' : '#F59E0B' }}>
          {doneCount}/{PREPROD_TASKS.length} done
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#7BC853' : '#F59E0B', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PREPROD_TASKS.map(task => {
          const done = !!checked[task.id];
          return (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
                background: done ? 'rgba(123,200,83,0.04)' : '#080808',
                border: `1px solid ${done ? 'rgba(123,200,83,0.2)' : '#141414'}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {done ? <CheckCircle2 size={18} color="#7BC853" /> : <Circle size={18} color="#333" />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: done ? 500 : 600, color: done ? '#555' : '#ccc', textDecoration: done ? 'line-through' : 'none' }}>
                  {task.label}
                </div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 2, lineHeight: 1.4 }}>{task.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      {doneCount === PREPROD_TASKS.length && (
        <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(123,200,83,0.06)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>🎉 All pre-production tasks complete!</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>You're ready for shoot day.</div>
        </div>
      )}
    </div>
  );
}