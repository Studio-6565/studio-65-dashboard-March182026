import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Film, Users, Backpack } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fmtDateRange } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

export default function GlobalSearch({ projects, contacts }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [gear, setGear]       = useState([]);
  const inputRef              = useRef(null);
  const navigate              = useNavigate();

  // Load gear once when opened
  useEffect(() => {
    if (open && gear.length === 0) {
      base44.entities.GearItem.list('name', 200).then(setGear);
    }
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const q = query.toLowerCase().trim();

  const matchedProjects = !q ? [] : projects.filter(p =>
    !p.archived && (
      (p.name || '').toLowerCase().includes(q) ||
      (p.client || '').toLowerCase().includes(q) ||
      (p.project_id || '').toLowerCase().includes(q)
    )
  ).slice(0, 5);

  const matchedContacts = !q ? [] : contacts.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.role || '').toLowerCase().includes(q)
  ).slice(0, 5);

  const matchedGear = !q ? [] : gear.filter(g =>
    !g.archived && (
      (g.name || '').toLowerCase().includes(q) ||
      (g.brand || '').toLowerCase().includes(q) ||
      (g.model || '').toLowerCase().includes(q)
    )
  ).slice(0, 5);

  const hasResults = matchedProjects.length + matchedContacts.length + matchedGear.length > 0;

  const goTo = (path) => { setOpen(false); setQuery(''); navigate(path); };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#1E1E1E', border: '1px solid #2A2A2A',
          borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
          color: '#666', fontSize: 13, fontFamily: 'Syne, sans-serif',
          minWidth: 180,
        }}
      >
        <Search size={14} />
        <span>Search...</span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, color: '#444' }}>⌘K</span>
      </button>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
      {/* Backdrop */}
      <div onClick={() => { setOpen(false); setQuery(''); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />

      {/* Panel */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #222' }}>
          <Search size={18} color="#666" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, contacts, gear..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontFamily: 'Syne, sans-serif' }}
          />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}><X size={16} /></button>}
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {!q && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontFamily: MONO, fontSize: 12 }}>
              Start typing to search across your studio...
            </div>
          )}

          {q && !hasResults && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontFamily: MONO, fontSize: 12 }}>
              No results for "{query}"
            </div>
          )}

          {matchedProjects.length > 0 && (
            <Section label="Projects" Icon={Film}>
              {matchedProjects.map(p => (
                <ResultRow key={p.id} onClick={() => goTo(`/projects/${p.id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 1 }}>{p.client} · {fmtDateRange(p)}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', flexShrink: 0 }}>{p.status}</span>
                </ResultRow>
              ))}
            </Section>
          )}

          {matchedContacts.length > 0 && (
            <Section label="Contacts" Icon={Users}>
              {matchedContacts.map(c => (
                <ResultRow key={c.id} onClick={() => goTo('/contacts')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 1 }}>{(c.types || []).join(', ')}{c.role ? ' · ' + c.role : ''}</div>
                  </div>
                </ResultRow>
              ))}
            </Section>
          )}

          {matchedGear.length > 0 && (
            <Section label="Gear" Icon={Backpack}>
              {matchedGear.map(g => (
                <ResultRow key={g.id} onClick={() => goTo('/gear')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 1 }}>{g.category}{g.brand ? ' · ' + g.brand : ''}</div>
                  </div>
                </ResultRow>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, Icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px 6px', fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <Icon size={11} />
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#222'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </div>
  );
}