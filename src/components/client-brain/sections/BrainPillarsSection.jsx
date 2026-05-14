import React from 'react';
import AiFillButton from '../AiFillButton';
import { Plus, Trash2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 11px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 4, display: 'block' };

const PILLAR_COLORS = ['#E81A1A', '#4A9EFF', '#7BC853', '#F59E0B', '#A78BFA'];

export default function BrainPillarsSection({ data = [], onChange, onAiFill, aiFilling }) {
  const add = () => onChange([...data, { name: '', description: '', example_topics: '' }]);
  const remove = (i) => onChange(data.filter((_, j) => j !== i));
  const update = (i, k, v) => onChange(data.map((p, j) => j === i ? { ...p, [k]: v } : p));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>📌 Content Pillars</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>3–5 pillars that anchor the content strategy</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((pillar, i) => (
          <div key={i} style={{ background: '#111', border: `1px solid ${PILLAR_COLORS[i % PILLAR_COLORS.length]}22`, borderLeft: `3px solid ${PILLAR_COLORS[i % PILLAR_COLORS.length]}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: PILLAR_COLORS[i % PILLAR_COLORS.length], fontWeight: 700 }}>PILLAR {i + 1}</div>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={LS}>Pillar Name</label>
                <input style={IS} value={pillar.name} onChange={e => update(i, 'name', e.target.value)} placeholder="e.g. Education, Behind the Scenes, Social Proof..." />
              </div>
              <div>
                <label style={LS}>Description</label>
                <input style={IS} value={pillar.description} onChange={e => update(i, 'description', e.target.value)} placeholder="What kind of content falls under this pillar?" />
              </div>
              <div>
                <label style={LS}>Example Topics / Post Ideas</label>
                <textarea style={{ ...IS, resize: 'none', minHeight: 60 }} rows={3} value={pillar.example_topics} onChange={e => update(i, 'example_topics', e.target.value)} placeholder="List 3 specific post ideas for this pillar..." />
              </div>
            </div>
          </div>
        ))}

        {data.length < 5 && (
          <button onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'transparent', border: '1px dashed #222', borderRadius: 10, color: '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
            <Plus size={14} /> Add Pillar {data.length + 1}
          </button>
        )}
      </div>
    </div>
  );
}