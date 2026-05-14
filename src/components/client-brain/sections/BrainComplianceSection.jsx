import React from 'react';
import AiFillButton from '../AiFillButton';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1A1A1A', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO, marginBottom: 5, display: 'block' };

export default function BrainComplianceSection({ data = {}, onChange, onAiFill, aiFilling }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>⚖️ Compliance & Legal</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Regulated language, required disclaimers, restricted content</div>
        </div>
        <AiFillButton onClick={onAiFill} loading={aiFilling} />
      </div>

      <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', marginBottom: 4 }}>⚠️ Common regulated industries</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#666' }}>Mortgage / Finance · Medical / Health · Legal · Insurance · Real Estate · Supplements · Crypto</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={LS}>Regulated Industry / Type</label>
          <input style={IS} value={data.regulated_industry || ''} onChange={e => set('regulated_industry', e.target.value)} placeholder="e.g. Mortgage lending, healthcare supplement, licensed financial advice..." />
        </div>

        <div>
          <label style={LS}>Required Disclaimers (copy-paste ready)</label>
          <textarea
            style={{ ...IS, resize: 'vertical', minHeight: 120 }}
            rows={5}
            value={data.required_disclaimers || ''}
            onChange={e => set('required_disclaimers', e.target.value)}
            placeholder="Paste exact disclaimer text that must appear on content. e.g. 'This is not financial advice. Past performance is not indicative of future results...'"
          />
        </div>

        <div>
          <label style={LS}>Restricted / Prohibited Language</label>
          <textarea
            style={{ ...IS, resize: 'vertical', minHeight: 100 }}
            rows={4}
            value={data.restricted_language || ''}
            onChange={e => set('restricted_language', e.target.value)}
            placeholder="Words or claims they cannot make. e.g. 'guaranteed results', 'cure', 'risk-free', specific rate promises..."
          />
        </div>
      </div>
    </div>
  );
}