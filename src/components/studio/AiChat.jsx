import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, margin } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

function buildContext(projects, contacts) {
  const today = new Date().toISOString().split('T')[0];

  const projectSummaries = projects.map(p => {
    const crewOwed = (p.crew || []).filter(c => !c.paid).reduce((s, c) => {
      const total = c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0);
      return s + total;
    }, 0);
    const overdueDeliverables = (p.deliverables || []).filter(d => !d.done && d.due && d.due < today);
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      date: p.date,
      end_date: p.end_date,
      status: p.status,
      revenue: p.revenue,
      crew_cost: p.crew_cost,
      rental_cost: p.rental_cost,
      net: p.net,
      margin: margin(p),
      paid: p.paid,
      archived: p.archived,
      crew: (p.crew || []).map(c => ({
        name: c.name,
        role: c.role,
        cost: c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0),
        rate: c.cost,
        rate_type: c.rate_type,
        hours: c.hours,
        paid: c.paid,
        avail: c.avail,
      })),
      rentals: (p.rentals || []).map(r => ({ equipment: r.equipment, vendor: r.vendor, cost: r.cost, paid: r.paid })),
      deliverables: (p.deliverables || []).map(d => ({ name: d.name, done: d.done, due: d.due })),
      crew_owed: crewOwed,
      overdue_deliverables: overdueDeliverables.map(d => d.name),
      notes: p.notes,
    };
  });

  return `You are "Studio 65 AI Assistant" — a smart production management assistant for a video/photo production company called Studio 65, run by Rathan.

TODAY'S DATE: ${today}

APP DATA (live):
${JSON.stringify({ projects: projectSummaries, contacts: contacts.map(c => ({ name: c.name, types: c.types, role: c.role, phone: c.phone, email: c.email, rate: c.rate })) }, null, 2)}

You have full read access to all project data. Answer questions accurately using this data.
- For financial questions, use exact numbers from the data.
- For WhatsApp message drafts, format them clearly starting with "Hi [name]!" and signing off as "Rathan – Studio 65".
- Be concise and direct. Use bullet points where helpful.
- Currency is in dollars ($). 
- If asked about a specific person's owed amount, sum across ALL projects where they appear unpaid.`;
}

export default function AiChat({ projects, contacts, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm your Studio 65 AI assistant. Ask me anything about your projects, crew, finances, or deliverables — or ask me to draft messages." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const systemContext = buildContext(projects, contacts);
    const conversationHistory = newMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nCONVERSATION:\n${conversationHistory}\n\nAssistant:`,
      model: 'claude_sonnet_4_6',
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const suggestions = [
    "Which projects are unpaid?",
    "What deliverables are overdue?",
    "Who's confirmed for the next shoot?",
    "What's my total revenue this year?",
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
      padding: '0 16px 16px 0',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, height: '70vh', maxHeight: 640,
          background: '#0F0F0F', border: '1px solid #2A2A2A', borderRadius: 14,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E81A1A', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Ask Studio 65</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginTop: 1 }}>AI — full data access</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '10px 13px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: m.role === 'user' ? '#E81A1A' : '#1E1E1E',
                fontSize: 13, lineHeight: 1.55, color: '#fff',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                border: m.role === 'assistant' ? '1px solid #2A2A2A' : 'none',
              }}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 4px', background: '#1E1E1E', border: '1px solid #2A2A2A', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#E81A1A', opacity: 0.7, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions (only show when just the initial message) */}
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{
                  textAlign: 'left', padding: '8px 12px', background: 'transparent',
                  border: '1px solid #2A2A2A', borderRadius: 8, color: '#888',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                  onMouseEnter={e => { e.target.style.borderColor = '#444'; e.target.style.color = '#ccc'; }}
                  onMouseLeave={e => { e.target.style.borderColor = '#2A2A2A'; e.target.style.color = '#888'; }}
                >{s}</button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #1E1E1E', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about your projects..."
            disabled={loading}
            style={{
              flex: 1, background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8,
              padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
              fontFamily: 'Syne, sans-serif', opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: 38, height: 38, borderRadius: 8, background: input.trim() && !loading ? '#E81A1A' : '#2A2A2A',
              border: 'none', color: '#fff', fontSize: 16, cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >↑</button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  );
}