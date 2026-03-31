import React from 'react';

export default function PullRefreshIndicator({ progress, isRefreshing }) {
  const visible = progress > 0 || isRefreshing;
  if (!visible) return null;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: 44,
      opacity: isRefreshing ? 1 : Math.min(progress * 1.5, 1),
      transform: `translateY(${isRefreshing ? 0 : (progress - 1) * 20}px)`,
      transition: isRefreshing ? 'opacity 0.2s' : 'none',
    }}>
      {isRefreshing ? (
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid #333', borderTopColor: '#E81A1A',
          animation: 'spinRefresh 0.7s linear infinite',
        }} />
      ) : (
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `2px solid rgba(232,26,26,${progress})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: `rgba(232,26,26,${progress})`,
          transform: `rotate(${progress * 360}deg)`,
        }}>↓</div>
      )}
      <style>{`@keyframes spinRefresh { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}