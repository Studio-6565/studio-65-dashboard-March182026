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
        zIndex: 100, display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', overflowY: 'auto', padding: 0,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1E1E1E', border: '1px solid #333',
        borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth, padding: '20px 16px 32px',
        position: 'relative',
      }}
        className="studio-modal-inner"
      >
        {/* Drag handle for mobile */}
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 16px' }} />
        {children}
      </div>
      <style>{`
        @media (min-width: 640px) {
          .studio-modal-inner {
            border-radius: 16px !important;
            margin: auto !important;
            padding: 28px !important;
          }
          .studio-modal-inner > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}