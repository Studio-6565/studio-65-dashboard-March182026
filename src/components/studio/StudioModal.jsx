import React, { useEffect } from 'react';

export default function StudioModal({ open, onClose, children, maxWidth = 660 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 100, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', overflowY: 'auto', padding: '32px 16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1E1E1E', border: '1px solid #333', borderRadius: 16,
        width: '100%', maxWidth, padding: 28, position: 'relative',
        margin: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}