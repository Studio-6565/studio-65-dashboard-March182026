import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { Zap, Loader2, X, Mic, Image, ChevronRight } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function CaptureBar({ projects = [], contacts = [], onTaskCreated }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clarify, setClarify] = useState(null); // { question, parsed }
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setClarify(null);
        setInput('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const buildSystemContext = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeProjects = projects.slice(0, 20).map(p => `${p.name} (client: ${p.client}, id: ${p.id})`).join('\n');
    const contactNames = contacts.slice(0, 40).map(c => `${c.name} (id: ${c.id}, types: ${(c.types || []).join(',')})`).join('\n');
    return `Today is ${today}.

Active projects:
${activeProjects || 'none'}

Known contacts:
${contactNames || 'none'}`;
  };

  const parseTask = async (text, clarifyingAnswer = null) => {
    const systemCtx = buildSystemContext();
    const prompt = `You are a task parser for a video production studio. Parse the following natural language input into a structured task.

${systemCtx}

Input: "${text}"
${clarifyingAnswer ? `Clarifying answer: "${clarifyingAnswer}"` : ''}

Instructions:
- Extract a clean title (imperative verb, concise)
- Detect who asked (match to contacts list by first name, else "self" or "unspecified")
- Detect who it's for / client (match to contacts or projects)
- Classify type: deliverable, decision, follow-up, errand, admin
- Estimate effort: 15min, 30min, 1hr, half-day, full-day
- Parse due date from text (e.g. "Friday" = next Friday, "by EOD" = today). If unclear and no clarifyingAnswer, set needs_clarification to true and write one clarifying question.
- Set priority: P1 (urgent+important), P2 (important), P3 (nice-to-have)
- Match linked_project_id if a project name or client clearly maps to one

Return JSON only.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          who_asked: { type: 'string' },
          who_asked_contact_id: { type: 'string' },
          client: { type: 'string' },
          client_contact_id: { type: 'string' },
          linked_project_id: { type: 'string' },
          linked_project_name: { type: 'string' },
          type: { type: 'string' },
          effort: { type: 'string' },
          due_date: { type: 'string' },
          priority: { type: 'string' },
          needs_clarification: { type: 'boolean' },
          clarifying_question: { type: 'string' },
        },
      },
    });
    return res;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const parsed = await parseTask(input);
      if (parsed.needs_clarification && !clarify) {
        setClarify({ question: parsed.clarifying_question, parsed });
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      // Finalize with clarifying answer if present
      const finalParsed = clarify ? await parseTask(input, clarifyAnswer) : parsed;
      await base44.entities.CaptureTask.create({
        ...finalParsed,
        raw_input: input,
        clarifying_question: clarify?.question,
        clarifying_answer: clarifyAnswer || undefined,
        status: 'inbox',
      });
      showToast(`Task captured: ${finalParsed.title}`, 'green');
      onTaskCreated?.();
      setInput('');
      setClarify(null);
      setClarifyAnswer('');
      setOpen(false);
    } catch (err) {
      showToast('Parse failed', 'red');
    }
    setLoading(false);
  };

  const handleClarifySubmit = async (e) => {
    e?.preventDefault();
    if (!clarifyAnswer.trim()) return;
    await handleSubmit();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract all tasks, action items, and to-dos from this image (WhatsApp screenshot, note, etc). Return a single combined natural language description of what needs to be done, who asked, and any deadlines mentioned.`,
        file_urls: [file_url],
      });
      setInput(typeof res === 'string' ? res : res?.text || '');
      setOpen(true);
    } catch {
      showToast('Could not read image', 'red');
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Capture (⌘K)"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 16px', background: '#111', border: '1px solid #1E1E1E',
          borderRadius: 10, color: '#555', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: MONO, transition: 'all 0.15s',
          width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#555'; }}
      >
        <Zap size={13} />
        <span>Capture... <span style={{ opacity: 0.4, fontSize: 10 }}>⌘K</span></span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { setOpen(false); setClarify(null); setInput(''); }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '22%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 620, zIndex: 1001,
        background: '#0D0D0D', border: '1px solid #2A2A2A',
        borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={14} color="#E81A1A" />
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capture</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginLeft: 'auto' }}>⌘K · Esc to close</span>
          <button onClick={() => { setOpen(false); setClarify(null); setInput(''); }} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        {/* Clarifying question */}
        {clarify && (
          <div style={{ padding: '12px 18px', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid #1E1E1E' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', marginBottom: 6 }}>ONE QUESTION</div>
            <div style={{ fontSize: 13, color: '#ccc', marginBottom: 10 }}>{clarify.question}</div>
            <form onSubmit={handleClarifySubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={clarifyAnswer}
                onChange={e => setClarifyAnswer(e.target.value)}
                placeholder="Your answer..."
                style={{ flex: 1, background: '#111', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
              />
              <button type="submit" disabled={loading} style={{ padding: '9px 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronRight size={13} />}
                Commit
              </button>
            </form>
          </div>
        )}

        {/* Main input */}
        {!clarify && (
          <form onSubmit={handleSubmit} style={{ padding: '14px 18px' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={"\"Mathu needs the sponsor deck updated by Friday\" or paste a WhatsApp message..."}
              rows={3}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 15, lineHeight: 1.7, resize: 'none',
                fontFamily: 'Syne, sans-serif', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid #222', borderRadius: 8, color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
                  <Image size={12} /> Screenshot
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#333' }}>Enter to capture · Shift+Enter newline</span>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', background: loading || !input.trim() ? '#1A1A1A' : '#E81A1A',
                    border: 'none', borderRadius: 8, color: loading || !input.trim() ? '#444' : '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
                  }}
                >
                  {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
                  {loading ? 'Parsing...' : 'Capture'}
                </button>
              </div>
            </div>
          </form>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  );
}