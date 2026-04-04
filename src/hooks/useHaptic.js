/**
 * useHaptic — triggers native vibration feedback on mobile.
 * Falls back silently on desktop.
 */
export function useHaptic() {
  const vibrate = (pattern = [10]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  return {
    tap:     () => vibrate([10]),       // light tap — navigation, selection
    confirm: () => vibrate([15, 50, 15]), // double pulse — success
    error:   () => vibrate([50, 30, 80]), // heavy buzz — error/delete
    soft:    () => vibrate([6]),          // barely-there — checkbox toggle
  };
}