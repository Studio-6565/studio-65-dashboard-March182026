import React, { useEffect, useState } from 'react';

let toastCallback = null;

export const showToast = (msg, type = 'green') => {
  if (toastCallback) toastCallback(msg, type);
};

export default function StudioToast() {
  const [toast, setToast] = useState({ msg: '', type: 'green', visible: false });

  useEffect(() => {
    toastCallback = (msg, type) => {
      setToast({ msg, type, visible: true });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
    };
    return () => { toastCallback = null; };
  }, []);

  const colorMap = {
    green: { border: '#7BC853', color: '#7BC853' },
    red: { border: '#E81A1A', color: '#E81A1A' },
    amber: { border: '#F59E0B', color: '#F59E0B' },
    blue: { border: '#4A9EFF', color: '#4A9EFF' },
  };
  const c = colorMap[toast.type] || colorMap.green;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%',
      transform: `translateX(-50%) translateY(${toast.visible ? '0' : '80px'})`,
      background: '#1E1E1E', border: `1px solid #333`,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: 10, padding: '12px 20px',
      fontSize: 13, fontWeight: 600, color: c.color,
      zIndex: 999, transition: 'transform 0.3s', whiteSpace: 'nowrap',
      fontFamily: 'Syne, sans-serif',
    }}>
      {toast.msg}
    </div>
  );
}