import { useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh hook for scrollable containers.
 * Returns { containerRef, isRefreshing, pullProgress }
 */
export function usePullToRefresh(onRefresh, threshold = 64) {
  const containerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) { setPullProgress(0); return; }
      const prog = Math.min(dy / threshold, 1);
      setPullProgress(prog);
      if (prog > 0 && el.scrollTop === 0) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullProgress >= 1) {
        setIsRefreshing(true);
        setPullProgress(0);
        try { await onRefresh(); } catch {}
        setIsRefreshing(false);
      } else {
        setPullProgress(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pullProgress, threshold]);

  return { containerRef, isRefreshing, pullProgress };
}