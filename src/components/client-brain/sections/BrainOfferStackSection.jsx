import React from 'react';
import AiFillButton from '../AiFillButton';
import { Plus, Trash2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '8px 11px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 4, display: 'block' };

export default function BrainOfferStackSection({ data = [], onChange, onAiFill, aiFilling }) {
  const add = () => onChange([...data, { product_name: '', description: '', positioning_angle: '', price: '' }]);
  const remove = (i) => onChange(data.filter((_, j) => j !== i));
  const update = (i, k, v) => onChange(data.map((o, j) => j === i ? { ...o, [k]: v } : o));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>💼 Offer Stack</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Products/services with the positioning angle for content</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((offer, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853', fontWeight: 700 }}>OFFER {i + 1}</div>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div>
                  <label style={LS}>Product / Service Name</label>
                  <input style={IS} value={offer.product_name} onChange={e => update(i, 'product_name', e.target.value)} placeholder="e.g. 1-on-1 Coaching Program" />
                </div>
                <div>
                  <label style={LS}>Price / Range</label>
                  <input style={IS} value={offer.price} onChange={e => update(i, 'price', e.target.value)} placeholder="e.g. $997/mo" />
                </div>
              </div>
              <div>
                <label style={LS}>Description</label>
                <input style={IS} value={offer.description} onChange={e => update(i, 'description', e.target.value)} placeholder="What it is and what outcome it delivers" />
              </div>
              <div>
                <label style={LS}>Positioning Angle for Content</label>
                <textarea style={{ ...IS, resize: 'none', minHeight: 60 }} rows={3} value={offer.positioning_angle} onChange={e => update(i, 'positioning_angle', e.target.value)} placeholder="How to talk about this offer in content without being salesy. What belief/transformation to sell..." />
              </div>
            </div>
          </div>
        ))}

        <button onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'transparent', border: '1px dashed #222', borderRadius: 10, color: '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
          <Plus size={14} /> Add Offer
        </button>
      </div>
    </div>
  );
}