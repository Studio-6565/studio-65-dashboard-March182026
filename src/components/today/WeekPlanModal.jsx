import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, X, Copy } from 'lucide-react';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

export default function WeekPlanModal({ tasks, projects, schoolDeadlines, onClose }) {
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const today = new Date();
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const inbox = tasks.filter(t => t.status === 'inbox').map(t => `- [${t.priority || 'P2'}] ${t.title} (${t.effort || '?'}, due: ${t.due_date || 'no date'})`).join('\n');
    const shoots = projects.filter(p => p.date >= weekDates[0] && p.date <= weekDates[6]).map(p => `- SHOOT: ${p.name} on ${p.date}${p.start_time ? ' at ' + p.start_time : ''}`).join('\n');
    const school = schoolDeadlines.filter(s => !s.done && s.due_date >= weekDates[0] && s.due_date <= weekDates[6]).map(s => `- SCHOOL: ${s.title} (${s.course}) due ${s.due_date}${s.due_time ? ' ' + s.due_time : ''}, effort: ${s.effort}`).join('\n');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a personal productivity planner. Generate a realistic week plan for the next 7 days starting ${weekDates[0]}.

Fixed commitments (shoots + school deadlines):
${shoots || 'none'}
${school || 'none'}

Task inbox:
${inbox || 'empty'}

Rules:
- Assume 8 working hours/day, but subtract shoot days (those are blocked)
- Place P1s on earliest available days
- Spread P2s across the week realistically
- Defer P3s to end of week or note "push to next week"
- Flag any day that's overcommitted
- Output a clean day-by-day plan: Mon–Sun with time estimates

Format: plain text, day-by-day, no JSON needed. Be direct and practical.`,
    });
    setPlan(typeof res === 'string' ? res : JSON.stringify(res));
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 640, zIndex: 1001, background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 16, overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📅 Weekly Plan Generator</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {!plan && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.7 }}>
                Generates a realistic week plan from your task inbox, upcoming shoots, and school deadlines.
              </div>
              <button onClick={generate} style={{ padding: '12px 28px', background: '#4A9EFF', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Generate This Week's Plan
              </button>
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Loader2 size={24} color="#4A9EFF" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>Planning your week...</div>
            </div>
          )}
          {plan && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button onClick={() => { navigator.clipboard.writeText(plan); showToast('Copied!'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid #222', borderRadius: 7, color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, color: '#ccc', lineHeight: 1.8 }}>{plan}</pre>
            </div>
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  );
}