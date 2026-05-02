import React, { useState, useRef, useEffect } from 'react';

export default function AddressAutocomplete({ value, onChange, style, placeholder = 'e.g. 123 Queen St W, Toronto, ON' }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = (query) => {
    onChange(query);
    clearTimeout(debounce.current);
    if (query.length < 3) { setSuggestions([]); setOpen(false); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=ca,us`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSuggestions(data.map(r => ({
          label: r.display_name,
          short: [r.address?.house_number, r.address?.road, r.address?.city || r.address?.town, r.address?.state, r.address?.country_code?.toUpperCase()].filter(Boolean).join(', '),
        })));
        setOpen(data.length > 0);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const pick = (s) => {
    onChange(s.short || s.label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          style={style}
          value={value}
          onChange={e => search(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {searching && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#555' }}>⏳</div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, marginTop: 4,
          overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); pick(s); }}
              style={{
                width: '100%', padding: '10px 14px', background: 'transparent',
                border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid #2A2A2A' : 'none',
                cursor: 'pointer', textAlign: 'left', color: '#ccc', fontSize: 12,
                lineHeight: 1.5, fontFamily: 'Syne, sans-serif',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.short}</div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: '"DM Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}