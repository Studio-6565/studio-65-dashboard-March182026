import React, { useState } from 'react';
import { X, BarChart2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const IS = {
  background: '#111', border: '1px solid #1E1E1E', borderRadius: 8,
  padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
  fontFamily: 'Syne, sans-serif', width: '100%', boxSizing: 'border-box',
};
const LS = { fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 };

const FIELDS = [
  { key: 'views',      label: 'Views',      placeholder: 'e.g. 12000', color: '#4A9EFF' },
  { key: 'likes',      label: 'Likes',      placeholder: 'e.g. 840',   color: '#E81A1A' },
  { key: 'saves',      label: 'Saves',      placeholder: 'e.g. 220',   color: '#A78BFA' },
  { key: 'shares',     label: 'Shares',     placeholder: 'e.g. 105',   color: '#7BC853' },
  { key: 'comments',   label: 'Comments',   placeholder: 'e.g. 67',    color: '#F59E0B' },
  { key: 'watch_time', label: 'Watch Time (avg s)', placeholder: 'e.g. 28', color: '#4A9EFF' },
];

export default function PerformanceLogger({ scriptTitle, onLog, onClose }) {
  const [stats, setStats] = useState({ views: '', likes: '', saves: '', shares: '', comments: '', watch_time: '' });

  const set = (k, v) => setStats(s => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    const parsed = {};
    Object.entries(stats).forEach(([k, v]) => { parsed[k] = parseFloat(v) || 0; });
    onLog(parsed);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
      <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 16, width: '100%', maxWidth: 480, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={16} color="#7BC853" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Log Performance</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#1A1A1A', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 20 }}>
          "{scriptTitle}" — log actuals to update the brain's performance memory
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ ...LS, color: f.color }}>{f.label}</label>
              <input
                style={IS}
                type="number"
                placeholder={f.placeholder}
                value={stats[f.key]}
                onChange={e => set(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 14px', background: 'rgba(123,200,83,0.06)', border: '1px solid rgba(123,200,83,0.15)', borderRadius: 10, marginBottom: 20, fontSize: 11, color: '#7BC853', lineHeight: 1.7 }}>
          🧠 High-performing hooks (10k+ views) will be added to winning hooks.<br />
          High-save or high-share formats will update winning formats.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 10, color: '#555', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSubmit} style={{ flex: 2, padding: '11px 0', background: '#7BC853', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            Log & Update Brain
          </button>
        </div>
      </div>
    </div>
  );
}