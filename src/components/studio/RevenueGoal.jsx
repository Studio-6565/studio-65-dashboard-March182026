import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

export default function RevenueGoal({ projects }) {
  const [goal, setGoal] = useState('');
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.revenue_goal) {
        setGoal(u.revenue_goal);
        setInput(u.revenue_goal);
      }
    });
  }, []);

  const currentYear = new Date().getFullYear();
  const yearRevenue = projects
    .filter(p => !p.archived && (p.date || '').startsWith(String(currentYear)))
    .reduce((s, p) => s + (p.revenue || 0), 0);

  const pct = goal > 0 ? Math.min((yearRevenue / goal) * 100, 100) : 0;
  const fmt = (n) => '$' + (n || 0).toLocaleString();

  const handleSave = async () => {
    const val = parseFloat(input) || 0;
    await base44.auth.updateMe({ revenue_goal: val });
    setGoal(val);
    setEditing(false);
    showToast('Revenue goal saved', 'green');
  };

  if (!goal && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          width: '100%', padding: '12px 16px', marginBottom: 16,
          background: '#1A1A1A', border: '1px dashed #2A2A2A', borderRadius: 12,
          color: '#444', fontSize: 12, cursor: 'pointer', fontFamily: MONO, textAlign: 'left',
        }}
      >
        + Set {currentYear} revenue goal →
      </button>
    );
  }

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{currentYear} Revenue Goal</div>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <input
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
                style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 13, outline: 'none', width: 130, fontFamily: 'Syne, sans-serif' }}
                placeholder="e.g. 100000"
              />
              <button onClick={handleSave} style={{ padding: '5px 12px', background: '#E81A1A', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>Cancel</button>
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fmt(yearRevenue)} <span style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>of {fmt(goal)}</span></div>
          )}
        </div>
        {!editing && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: pct >= 100 ? '#7BC853' : pct >= 50 ? '#F59E0B' : '#E81A1A' }}>{Math.round(pct)}%</div>
            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 10, cursor: 'pointer', fontFamily: MONO }}>Edit goal</button>
          </div>
        )}
      </div>
      {!editing && (
        <div style={{ height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, transition: 'width 0.6s ease',
            width: `${pct}%`,
            background: pct >= 100 ? '#7BC853' : pct >= 50 ? '#F59E0B' : '#E81A1A',
          }} />
        </div>
      )}
    </div>
  );
}