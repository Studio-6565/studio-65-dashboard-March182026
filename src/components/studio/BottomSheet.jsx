import React, { useEffect, useRef } from 'react';

/**
 * Mobile-native bottom sheet for selection controls.
 * Props: open, onClose, title, options [{value, label}], value, onChange
 */
export default function BottomSheet({ open, onClose, title, options = [], value, onChange }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleSelect = (v) => {
    onChange(v);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        paddingBottom: 'env(safe-area-inset-bottom)',
        animation: 'fadeInBg 0.2s ease',
      }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1A1A1A',
          borderRadius: '20px 20px 0 0',
          border: '1px solid #2A2A2A',
          overflow: 'hidden',
          animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.06,0.64,1)',
          maxHeight: '75vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333' }} />
        </div>
        {/* Title */}
        {title && (
          <div style={{
            padding: '8px 20px 12px',
            fontSize: 13, fontWeight: 700, color: '#fff',
            borderBottom: '1px solid #222',
            userSelect: 'none',
          }}>{title}</div>
        )}
        {/* Options */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
          {options.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '15px 20px',
                  background: selected ? 'rgba(232,26,26,0.08)' : 'transparent',
                  border: 'none', borderBottom: '1px solid #1E1E1E',
                  cursor: 'pointer', textAlign: 'left',
                  minHeight: 52,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontSize: 14, fontWeight: selected ? 700 : 400,
                  color: selected ? '#E81A1A' : '#fff',
                  fontFamily: 'Syne, sans-serif',
                }}>{opt.label}</span>
                {selected && <span style={{ color: '#E81A1A', fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes fadeInBg { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}