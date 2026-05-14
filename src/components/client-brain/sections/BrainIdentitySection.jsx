import React from 'react';
import AiFillButton from '../AiFillButton';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1A1A1A', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };
const TA = (rows = 3) => ({ ...IS, resize: 'none', minHeight: rows * 24 });

export default function BrainIdentitySection({ data = {}, onChange, onAiFill, aiFilling }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>🎯 Brand Identity</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Voice, tone, and positioning</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={LS}>Brand Voice Adjectives (3–5)</label>
          <input style={IS} value={data.brand_voice_adjectives || ''} onChange={e => set('brand_voice_adjectives', e.target.value)} placeholder="e.g. Bold, Energetic, Approachable, Premium, Playful" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LS}>Tone Do's ✅</label>
            <textarea style={TA(4)} rows={4} value={data.tone_dos || ''} onChange={e => set('tone_dos', e.target.value)} placeholder="e.g. Use conversational language, ask questions, celebrate customer wins..." />
          </div>
          <div>
            <label style={LS}>Tone Don'ts ❌</label>
            <textarea style={TA(4)} rows={4} value={data.tone_donts || ''} onChange={e => set('tone_donts', e.target.value)} placeholder="e.g. Avoid jargon, don't be preachy, never use passive voice..." />
          </div>
        </div>

        <div>
          <label style={LS}>Banned Words / Phrases</label>
          <input style={IS} value={data.banned_words || ''} onChange={e => set('banned_words', e.target.value)} placeholder="e.g. cheap, affordable, discount, just, simply..." />
        </div>

        <div>
          <label style={LS}>Signature Phrases</label>
          <textarea style={TA(3)} rows={3} value={data.signature_phrases || ''} onChange={e => set('signature_phrases', e.target.value)} placeholder="e.g. phrases or taglines the brand uses consistently..." />
        </div>

        <div>
          <label style={LS}>Point of View / Positioning (1–2 sentences)</label>
          <textarea style={TA(3)} rows={3} value={data.point_of_view || ''} onChange={e => set('point_of_view', e.target.value)} placeholder="e.g. [Brand] exists to help [audience] achieve [outcome] without [pain point]. We believe [core belief]." />
        </div>
      </div>
    </div>
  );
}