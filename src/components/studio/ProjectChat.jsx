import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

export default function ProjectChat({ project, studioName = 'Studio 65' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.DirectMessage.filter({ project_id: project.id }).then(msgs => {
      setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      setLoading(false);
    });
  }, [project.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.project_id !== project.id) return;
      if (event.type === 'create') setMessages(prev => [...prev, event.data]);
      if (event.type === 'update') setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
    });
    return unsub;
  }, [project.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = await base44.entities.DirectMessage.create({
      project_id: project.id,
      project_name: project.name,
      from_name: studioName,
      from_role: 'studio',
      body: input.trim(),
      read_by_crew: false,
    });
    setMessages(prev => [...prev, msg]);
    setInput('');
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480, background: '#111', border: '1px solid #252525', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E1E1E', background: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7BC853', flexShrink: 0 }} />
        <div style={{ fontSize: 13, fontWeight: 700 }}>Crew Chat — {project.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginLeft: 'auto' }}>{messages.length} messages</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ color: '#444', fontFamily: MONO, fontSize: 12, textAlign: 'center', paddingTop: 40 }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#333', fontFamily: MONO, fontSize: 12, textAlign: 'center', paddingTop: 40 }}>No messages yet. Start the conversation.</div>
        ) : (
          messages.map(msg => {
            const isStudio = msg.from_role === 'studio';
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isStudio ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginBottom: 3, textAlign: isStudio ? 'right' : 'left' }}>
                    {msg.from_name} · {new Date(msg.created_date).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6, background: isStudio ? '#E81A1A' : '#1E1E1E', color: isStudio ? '#fff' : '#ddd', border: isStudio ? 'none' : '1px solid #2A2A2A' }}>
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1E1E1E', background: '#1A1A1A', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Message the crew..."
          style={{ flex: 1, background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{ padding: '0 18px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!input.trim() || sending) ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >Send</button>
      </div>
    </div>
  );
}