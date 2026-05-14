import React from 'react';
import AiFillButton from '../AiFillButton';
import { Plus, Trash2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 11px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 4, display: 'block' };
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Twitter/X'];

export default function BrainCompetitorsSection({ data = [], onChange, onAiFill, aiFilling }) {
  const add = () => onChange([...data, { name: '', platform: 'Instagram', handle: '', what_they_do_well: '' }]);
  const remove = (i) => onChange(data.filter((_, j) => j !== i));
  const update = (i, k, v) => onChange(data.map((c, j) => j === i ? { ...c, [k]: v } : c));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>🏁 Competitor Set</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Up to 5 competitors per platform — what to learn from and beat</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((comp, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', fontWeight: 700 }}>COMPETITOR {i + 1}</div>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={LS}>Brand / Name</label>
                <input style={IS} value={comp.name} onChange={e => update(i, 'name', e.target.value)} placeholder="e.g. Nike" />
              </div>
              <div>
                <label style={LS}>Platform</label>
                <select style={{ ...IS, cursor: 'pointer' }} value={comp.platform} onChange={e => update(i, 'platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={LS}>Handle</label>
                <input style={IS} value={comp.handle} onChange={e => update(i, 'handle', e.target.value)} placeholder="@handle" />
              </div>
            </div>
            <div>
              <label style={LS}>What They Do Well (and what to learn / counter)</label>
              <textarea style={{ ...IS, resize: 'none', minHeight: 60 }} rows={3} value={comp.what_they_do_well} onChange={e => update(i, 'what_they_do_well', e.target.value)} placeholder="Strong UGC content, consistent posting schedule, great hooks..." />
            </div>
          </div>
        ))}

        {data.length < 5 && (
          <button onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'transparent', border: '1px dashed #222', borderRadius: 10, color: '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
            <Plus size={14} /> Add Competitor
          </button>
        )}
      </div>
    </div>
  );
}