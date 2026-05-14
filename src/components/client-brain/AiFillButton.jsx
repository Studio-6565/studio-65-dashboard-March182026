import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AiFillButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        background: loading ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.12)',
        border: '1px solid rgba(167,139,250,0.3)',
        borderRadius: 20, color: '#A78BFA',
        fontSize: 11, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: '"DM Mono", monospace',
        whiteSpace: 'nowrap',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.15s',
      }}
    >
      <Sparkles size={12} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
      {loading ? 'Filling…' : 'AI Fill'}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}