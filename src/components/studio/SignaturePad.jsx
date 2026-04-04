import React, { useRef, useState, useEffect } from 'react';

const MONO = '"DM Mono", monospace';

export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState(value || '');

  useEffect(() => {
    if (value && mode === 'type') setTypedName(value);
  }, [value]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = (e) => {
    e?.preventDefault();
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    onChange(canvas.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange('');
  };

  const handleTypeChange = (val) => {
    setTypedName(val);
    onChange(val);
  };

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, background: '#111', borderRadius: 8, padding: 3, marginBottom: 10, width: 'fit-content' }}>
        {[{ key: 'draw', label: '✏ Draw' }, { key: 'type', label: 'Aa Type' }].map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: mode === m.key ? '#2A2A2A' : 'transparent',
              color: mode === m.key ? '#fff' : '#555',
              fontFamily: MONO,
            }}
          >{m.label}</button>
        ))}
      </div>

      {mode === 'draw' ? (
        <div>
          <div
            style={{ position: 'relative', background: '#0A0A0A', border: '1px solid #333', borderRadius: 10, overflow: 'hidden', cursor: 'crosshair', touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              width={500}
              height={120}
              style={{ display: 'block', width: '100%', height: 120 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasDrawn && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none', color: '#333', fontFamily: MONO, fontSize: 12,
              }}>
                Sign here ↑
              </div>
            )}
          </div>
          {hasDrawn && (
            <button onClick={clear} style={{ marginTop: 6, background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
              ↺ Clear signature
            </button>
          )}
        </div>
      ) : (
        <div>
          <input
            value={typedName}
            onChange={e => handleTypeChange(e.target.value)}
            placeholder="Type your full legal name"
            style={{
              background: '#0A0A0A', border: '1px solid #333', borderRadius: 10,
              padding: '16px 18px', color: '#fff', fontSize: 24,
              outline: 'none', width: '100%', fontFamily: 'cursive',
              letterSpacing: '0.03em',
            }}
          />
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 5 }}>
            Typing your name is legally equivalent to a handwritten signature
          </div>
        </div>
      )}
    </div>
  );
}