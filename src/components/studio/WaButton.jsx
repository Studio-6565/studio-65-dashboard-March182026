import React from 'react';
import { waLink } from '@/lib/studio';

const WaSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 11, height: 11, flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.057 23.882l6.197-1.453A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.347l-.356-.211-3.679.863.925-3.585-.232-.368A9.818 9.818 0 1112 21.818z"/>
  </svg>
);

export default function WaButton({ phone, message, label }) {
  return (
    <button
      onClick={() => waLink(phone, message)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
        cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace',
        background: 'rgba(37,211,102,0.12)', color: '#25D366',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#25D366'; e.currentTarget.style.color = '#000'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.12)'; e.currentTarget.style.color = '#25D366'; }}
    >
      <WaSvg /> {label}
    </button>
  );
}