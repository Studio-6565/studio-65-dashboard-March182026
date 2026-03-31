import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

function buildContext(projects, contacts) {
  const fmt = (n) => `$${(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = new Date().toISOString().split('T')[0];

  const projectSummaries = projects.map(p => {
    const crew = (p.crew || []).map(c =>
      `    - ${c.name} (${c.role || 'Crew'}): ${fmt(c.cost)}${c.rate_type === 'hourly' ? `/hr × ${c.hours || 0}h` : ''} | paid: ${c.paid ? 'YES' : 'NO'} | avail: ${c.avail || 'pending'}`
    ).join('\n');

    const rentals = (p.rentals || []).map(r =>
      `    - ${r.equipment} (${r.vendor || 'unknown vendor'}): ${fmt(r.cost)} | paid: ${r.paid ? 'YES' : 'NO'}`
    ).join('\n');

    const deliverables = (p.deliverables || []).map(d =>
      `    - ${d.name}${d.due ? ` (due: ${d.due})` : ''}: ${d.done ? 'DONE' : 'PENDING'}${d.link ? ' [link submitted]' : ''}`
    ).join('\n');

    const crewOwed = (p.crew || []).filter(c => !c.paid).reduce((s, c) => {
      const cost = c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0);
      return s + cost;
    }, 0);

    const overdueDels = (p.deliverables || []).filter(d => !d.done && d.due && d.due < today);

    return `PROJECT: ${p.name}
  ID: ${p.project_id || 'N/A'}
  Client: ${p.client}
  Date: ${p.date || 'N/A'}${p.end_date && p.end_date !== p.date ? ` → ${p.end_date}` : ''}
  Status: ${p.status || 'Booked'}
  Archived: ${p.archived ? 'YES' : 'NO'}
  Invoice Paid: ${p.paid ? 'YES' : 'NO'}
  Revenue: ${fmt(p.revenue)} | Crew Cost: ${fmt(p.crew_cost)} | Rental Cost: ${fmt(p.rental_cost)} | Net: ${fmt(p.net)}
  Margin: ${p.revenue > 0 ? Math.round(((p.net || 0) / p.revenue) * 100) : 0}%
  Crew Owed (unpaid): ${fmt(crewOwed)}
  Overdue Deliverables: ${overdueDels.length > 0 ? overdueDels.map(d => d.name).join(', ') : 'None'}
  Address: ${p.address || 'N/A'}
  Notes: ${p.notes || 'None'}
${crew ? `  Crew:\n${crew}` : '  Crew: None'}
${rentals ? `  Rentals:\n${rentals}` : '  Rentals: None'}
${deliverables ? `  Deliverables:\n${deliverables}` : '  Deliverables: None'}`;
  });

  const contactSummaries = contacts.map(c =>
    `CONTACT: ${c.name} | Types: ${(c.types || []).join(', ')} | Role: ${c.role || 'N/A'} | Rate: ${c.rate || 'N/A'} | Phone: ${c.phone || 'N/A'} | Email: ${c.email || 'N/A'}`
  ).join('\n');

  return `PROJECTS (${projects.length} total):\n${projectSummaries.join('\n\n')}\n\nCONTACTS (${contacts.length} total):\n${contactSummaries}`;
}

export default function StudioAIChat({ projects, contacts }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hey! I\'m your Studio 65 assistant. Ask me anything about your projects, crew, finances, deliverables — or ask me to draft a message.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const context = buildContext(projects || [], contacts || []);
      const res = await base44.functions.invoke('studioAI', { message: msg, context });
      setMessages(m => [...m, { role: 'assistant', text: res.data?.reply || 'Sorry, I couldn\'t get a response.' }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Error: ' + e.message }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const suggestions = [
    'Which projects are unpaid?',
    'What deliverables are overdue?',
    'Who is confirmed for the next shoot?',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 'calc(70px + env(safe-area-inset-bottom))', right: 16, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#333' : '#E81A1A',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(232,26,26,0.4)',
          transition: 'all 0.2s', fontSize: 22,
        }}
        title="Ask Studio 65"
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 'calc(130px + env(safe-area-inset-bottom))', right: 16, zIndex: 999,
          width: 360, maxHeight: '70vh',
          background: '#111', border: '1px solid #2A2A2A', borderRadius: 14,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E1E1E', background: '#0D0D0D', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Ask Studio 65</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginTop: 1 }}>AI assistant · full data access</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#7BC853' }} title="Online" />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  background: m.role === 'user' ? '#E81A1A' : '#1E1E1E',
                  color: '#fff',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '9px 12px',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#1E1E1E', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#E81A1A',
                      animation: 'pulse 1.2s infinite', animationDelay: `${i * 0.2}s`,
                      opacity: 0.7,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions (only at start) */}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{
                    background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8,
                    color: '#666', fontSize: 11, padding: '7px 10px', cursor: 'pointer',
                    textAlign: 'left', fontFamily: MONO, transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => e.target.style.borderColor = '#E81A1A'}
                    onMouseLeave={e => e.target.style.borderColor = '#2A2A2A'}
                  >{s}</button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #1E1E1E', display: 'flex', gap: 8, background: '#0D0D0D' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your studio..."
              style={{
                flex: 1, background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8,
                padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none',
                fontFamily: 'Syne, sans-serif', resize: 'none', lineHeight: 1.4,
                maxHeight: 80, overflowY: 'auto',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, background: input.trim() ? '#E81A1A' : '#222',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, alignSelf: 'flex-end', transition: 'background 0.2s',
              }}
            >↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}