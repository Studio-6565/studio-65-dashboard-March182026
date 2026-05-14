import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { X, Send, Loader2, Mic, CheckCircle2, Volume2 } from 'lucide-react';
import VoiceCaptureButton from './VoiceCaptureButton';

const MONO = '"DM Mono", monospace';

const PRIORITY_COLOR = { P1: '#E81A1A', P2: '#F59E0B', P3: '#555' };
const CONFIDENCE_COLOR = (c) => c >= 70 ? '#7BC853' : c >= 40 ? '#F59E0B' : '#E81A1A';

export default function ClarificationChat({ task, onClose, onResolved, contacts = [], projects = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [resolved, setResolved] = useState(false);
  const [currentTask, setCurrentTask] = useState(task);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    openThread();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openThread = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('clarifyTask', {
        task_id: task.id,
        contacts: contacts.slice(0, 50).map(c => ({ name: c.name, id: c.id })),
        projects: projects.slice(0, 30).map(p => ({ name: p.name, id: p.id }))
      });
      const d = res.data;
      setMessages([{ role: 'ai', content: d.ai_message, ts: new Date().toISOString() }]);
      if (d.thread_id) setThreadId(d.thread_id);
    } catch (err) {
      showToast('Failed to open thread', 'red');
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await base44.functions.invoke('clarifyTask', {
        task_id: task.id,
        thread_id: threadId,
        user_message: msg,
        contacts: contacts.slice(0, 50).map(c => ({ name: c.name, id: c.id })),
        projects: projects.slice(0, 30).map(p => ({ name: p.name, id: p.id }))
      });
      const d = res.data;

      setMessages(prev => [...prev, { role: 'ai', content: d.ai_message, ts: new Date().toISOString() }]);
      if (d.thread_id) setThreadId(d.thread_id);

      // Update local task fields
      if (d.updated_fields && Object.keys(d.updated_fields).length > 0) {
        setCurrentTask(prev => ({ ...prev, ...d.updated_fields }));
      }

      if (d.resolved) {
        setResolved(true);
        showToast('Task confirmed ✓', 'green');
        setTimeout(() => { onResolved?.(); onClose?.(); }, 1200);
      }
    } catch (err) {
      showToast('Failed to send', 'red');
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#0D0D0D', border: '1px solid #2A2A2A',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -24px 80px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '80vh',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1A1A1A', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Clarify Task
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>

          {/* Current task state */}
          <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{currentTask.title}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {currentTask.priority && (
                <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: PRIORITY_COLOR[currentTask.priority] + '18', color: PRIORITY_COLOR[currentTask.priority], fontWeight: 700 }}>
                  {currentTask.priority}
                </span>
              )}
              {currentTask.type && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{currentTask.type}</span>
              )}
              {currentTask.due_date && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#666' }}>📅 {currentTask.due_date}</span>
              )}
              {currentTask.client && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF' }}>{currentTask.client}</span>
              )}
              {currentTask.confidence != null && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: CONFIDENCE_COLOR(currentTask.confidence) }}>
                  {currentTask.confidence}% confident
                </span>
              )}
            </div>
            {/* Audio playback if available */}
            {task.audio_url && (
              <div style={{ marginTop: 8 }}>
                <audio controls src={task.audio_url} style={{ width: '100%', height: 28, opacity: 0.7 }} />
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 13px',
                borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: m.role === 'user' ? '#E81A1A' : '#1A1A1A',
                border: `1px solid ${m.role === 'user' ? 'transparent' : '#222'}`,
                fontSize: 13, color: '#fff', lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
                {resolved && m === messages[messages.length - 1] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#7BC853', fontFamily: MONO, fontSize: 10 }}>
                    <CheckCircle2 size={12} /> Committed
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 13px', borderRadius: '12px 12px 12px 4px', background: '#1A1A1A', border: '1px solid #222' }}>
                <Loader2 size={14} color="#555" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!resolved && (
          <div style={{ padding: '10px 14px 20px', borderTop: '1px solid #1A1A1A', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Reply or say 'yes, that's right'..."
                disabled={loading}
                style={{
                  flex: 1, background: '#111', border: '1px solid #222',
                  borderRadius: 10, padding: '10px 14px',
                  color: '#fff', fontSize: 13, outline: 'none',
                  fontFamily: 'Syne, sans-serif',
                }}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: input.trim() ? '#E81A1A' : '#1A1A1A',
                  border: '1px solid #222', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: input.trim() ? '#fff' : '#444',
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginTop: 6, textAlign: 'center' }}>
              Say "yes, correct" to commit · Enter to send
            </div>
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}