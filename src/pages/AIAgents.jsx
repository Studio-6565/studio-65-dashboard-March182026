import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

const QUICK_ACTIONS = [
  { icon: '📋', label: 'Generate call sheet', prompt: 'Generate a call sheet for my next upcoming project' },
  { icon: '💳', label: 'Draft invoice email', prompt: 'Write a professional invoice email for my most recent delivered project' },
  { icon: '💰', label: 'Pricing advice', prompt: 'Based on my past projects, what should I charge for a 1-day corporate shoot?' },
  { icon: '👥', label: 'Find crew for next shoot', prompt: 'Who from my contacts would be best for the next upcoming shoot?' },
  { icon: '⚠️', label: 'Overdue deliverables', prompt: 'What deliverables are overdue and what should I do about them?' },
  { icon: '✉️', label: 'Client follow-ups', prompt: 'Which clients need a follow-up and can you draft the emails?' },
  { icon: '📊', label: 'Revenue summary', prompt: 'Give me a financial summary of my studio this year' },
  { icon: '🔍', label: 'Crew hiring tips', prompt: 'Based on my crew contacts, who should I invest in and why?' },
];

function buildContext(projects, contacts) {
  const fmt = n => `$${(n || 0).toFixed(2)}`;
  const today = new Date().toISOString().split('T')[0];

  const projectSummaries = (projects || []).map(p => {
    const crew = (p.crew || []).map(c => `    - ${c.name} (${c.role}): ${fmt(c.cost)} | paid:${c.paid ? 'Y' : 'N'} | avail:${c.avail || 'pending'} | phone:${c.phone || 'N/A'} | email:${c.email || 'N/A'}`).join('\n');
    const rentals = (p.rentals || []).map(r => `    - ${r.equipment} (${r.vendor}): ${fmt(r.cost)} | paid:${r.paid ? 'Y' : 'N'}`).join('\n');
    const dels = (p.deliverables || []).map(d => `    - ${d.name}: ${d.done ? 'DONE' : 'PENDING'}${d.due ? ` (due ${d.due})` : ''}`).join('\n');
    const margin = p.revenue > 0 ? Math.round(((p.net || 0) / p.revenue) * 100) : 0;
    return `PROJECT: ${p.name} | Client: ${p.client} | Date: ${p.date || 'N/A'} | Status: ${p.status} | Paid: ${p.paid ? 'YES' : 'NO'}
  Revenue: ${fmt(p.revenue)} | Net: ${fmt(p.net)} | Margin: ${margin}% | Invoice#: ${p.invoice_number || 'N/A'} | Due: ${p.invoice_due_date || 'N/A'}
  Address: ${p.address || 'N/A'} | Time: ${p.start_time || 'N/A'}-${p.end_time || 'N/A'} | Notes: ${p.notes || 'None'}
${crew ? `  Crew:\n${crew}` : '  Crew: None'}
${rentals ? `  Rentals:\n${rentals}` : '  Rentals: None'}
${dels ? `  Deliverables:\n${dels}` : '  Deliverables: None'}`;
  });

  const contactSummaries = (contacts || []).map(c =>
    `CONTACT: ${c.name} | Types: ${(c.types || []).join(',')} | Role: ${c.role || 'N/A'} | Rate: ${c.rate || 'N/A'} | Skills: ${c.crew_skills || 'N/A'} | Phone: ${c.phone || 'N/A'} | Email: ${c.email || 'N/A'}`
  ).join('\n');

  return `TODAY: ${today}\n\nPROJECTS (${projects?.length || 0}):\n${projectSummaries.join('\n\n')}\n\nCONTACTS (${contacts?.length || 0}):\n${contactSummaries}`;
}

export default function AIAgents({ projects = [], contacts = [] }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hey! I'm your Studio 65 AI assistant — I have full access to all your projects, crew, clients, financials, and deliverables.\n\nWhat can I help you with today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (msg) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text }]);
    setLoading(true);
    const context = buildContext(projects, contacts);
    const res = await base44.functions.invoke('studioAI', { message: text, context });
    setMessages(m => [...m, { role: 'assistant', text: res.data?.reply || 'Sorry, I couldn\'t get a response.' }]);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', maxHeight: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>✦ AI Assistant</div>
        <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>Full access to your projects, crew, clients & finances</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(232,26,26,0.15)', border: '1px solid rgba(232,26,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginRight: 8, marginTop: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: '82%',
              background: m.role === 'user' ? '#E81A1A' : '#1A1A1A',
              color: '#fff',
              borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
              padding: '10px 14px',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: m.role === 'assistant' ? '1px solid #2A2A2A' : 'none',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(232,26,26,0.15)', border: '1px solid rgba(232,26,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>✦</div>
            <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '14px 14px 14px 2px', padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#E81A1A', animation: 'aiPulse 1.2s infinite', animationDelay: `${i * 0.2}s`, opacity: 0.7 }} />
              ))}
            </div>
          </div>
        )}

        {/* Quick actions — only at start */}
        {messages.length === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => send(a.prompt)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                background: '#1A1A1A', border: '1px solid #2A2A2A',
                color: '#888', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'Syne, sans-serif', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#E81A1A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ fontSize: 11, lineHeight: 1.3 }}>{a.label}</span>
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ paddingTop: 12, borderTop: '1px solid #1E1E1E', display: 'flex', gap: 8, background: 'var(--studio-black)' }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask anything about your studio, projects, crew, or finances..."
          style={{
            flex: 1, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10,
            padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none',
            fontFamily: 'Syne, sans-serif', resize: 'none', lineHeight: 1.4,
            maxHeight: 100, overflowY: 'auto', minHeight: 44,
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: input.trim() && !loading ? '#E81A1A' : '#222',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, alignSelf: 'flex-end', transition: 'background 0.2s',
          }}
        >↑</button>
      </div>

      <style>{`@keyframes aiPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}