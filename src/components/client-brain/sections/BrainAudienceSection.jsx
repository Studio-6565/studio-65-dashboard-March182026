import React from 'react';
import AiFillButton from '../AiFillButton';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1A1A1A', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };
const TA = (rows = 3) => ({ ...IS, resize: 'none', minHeight: rows * 24 });

export default function BrainAudienceSection({ data = {}, onChange, onAiFill, aiFilling }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>👥 Audience Intelligence</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Who you're talking to and what they care about</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LS}>Primary Demographic</label>
            <textarea style={TA(3)} rows={3} value={data.primary_demo || ''} onChange={e => set('primary_demo', e.target.value)} placeholder="Age range, gender, location, income level, job title..." />
          </div>
          <div>
            <label style={LS}>Psychographic Profile</label>
            <textarea style={TA(3)} rows={3} value={data.psychographic || ''} onChange={e => set('psychographic', e.target.value)} placeholder="Values, lifestyle, interests, beliefs, aspirations..." />
          </div>
        </div>

        <div>
          <label style={LS}>3 Customer Pain Points 😤</label>
          <textarea style={TA(4)} rows={4} value={data.pain_points || ''} onChange={e => set('pain_points', e.target.value)} placeholder="1. [Pain point]\n2. [Pain point]\n3. [Pain point]" />
        </div>

        <div>
          <label style={LS}>3 Customer Desires ✨</label>
          <textarea style={TA(4)} rows={4} value={data.desires || ''} onChange={e => set('desires', e.target.value)} placeholder="1. [Desire / dream outcome]\n2. [Desire]\n3. [Desire]" />
        </div>

        <div>
          <label style={LS}>Common Objections They Hear 🤔</label>
          <textarea style={TA(4)} rows={4} value={data.objections || ''} onChange={e => set('objections', e.target.value)} placeholder="Objections the client's customers raise before buying..." />
        </div>
      </div>
    </div>
  );
}