import React, { useState } from 'react';
import AiFillButton from '../AiFillButton';
import { Plus, X } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1A1A1A', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };

function TagList({ items = [], onChange, placeholder, color = '#F59E0B' }) {
  const [input, setInput] = useState('');
  const add = () => {
    if (!input.trim()) return;
    onChange([...items, input.trim()]);
    setInput('');
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: color + '15', border: `1px solid ${color}30`, borderRadius: 20, fontSize: 11, color, fontFamily: MONO }}>
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0, lineHeight: 1 }}><X size={10} /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...IS, flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
        />
        <button onClick={add} style={{ padding: '8px 14px', background: color + '18', border: `1px solid ${color}35`, borderRadius: 8, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export default function BrainPerformanceSection({ data = {}, onChange, onAiFill, aiFilling }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>📊 Performance Memory</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>What's working — hooks, formats, and top content</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={LS}>Top 10 Posts (paste captions + platform + key metric)</label>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginBottom: 6 }}>Paste your best performing posts here — AI can analyze patterns</div>
          <textarea
            style={{ ...IS, resize: 'vertical', minHeight: 180 }}
            rows={8}
            value={data.top_posts || ''}
            onChange={e => set('top_posts', e.target.value)}
            placeholder={`1. [Caption] | Platform: Instagram | Views: 45K | Saves: 812\n2. [Caption] | Platform: TikTok | Views: 120K | Likes: 3.2K\n...`}
          />
        </div>

        <div>
          <label style={LS}>Winning Hooks 🪝</label>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginBottom: 8 }}>Hook formulas that consistently perform well</div>
          <TagList
            items={data.winning_hooks || []}
            onChange={v => set('winning_hooks', v)}
            placeholder="e.g. 'Nobody talks about [X] but...' — Enter to add"
            color="#F59E0B"
          />
        </div>

        <div>
          <label style={LS}>Winning Formats 🎬</label>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginBottom: 8 }}>Content formats that drive the best results</div>
          <TagList
            items={data.winning_formats || []}
            onChange={v => set('winning_formats', v)}
            placeholder="e.g. 'Before/after transformation reel' — Enter to add"
            color="#7BC853"
          />
        </div>
      </div>
    </div>
  );
}