import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Send, Eye, Calendar, CreditCard, CheckSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const REMINDER_TYPES = [
  {
    key: 'shoot',
    Icon: Calendar,
    label: 'Shoot Reminders',
    color: '#4A9EFF',
    bg: 'rgba(74,158,255,0.08)',
    border: 'rgba(74,158,255,0.2)',
    description: 'Emails clients 3 days and 1 day before their scheduled shoot date.',
  },
  {
    key: 'invoice',
    Icon: CreditCard,
    label: 'Invoice Reminders',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    description: 'Notifies clients about outstanding invoices due in 3 days, tomorrow, or overdue.',
  },
  {
    key: 'deliverable',
    Icon: CheckSquare,
    label: 'Approval Reminders',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
    description: 'Reminds clients about scripts or approval requests awaiting their response (24h+).',
  },
];

function ResultRow({ item, type }) {
  if (type === 'shoot') return (
    <div style={{ padding: '10px 14px', background: '#111', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.client} — {item.project}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 3 }}>
        {item.days_ahead === 1 ? '⏰ Tomorrow' : '📅 3 days ahead'} · {item.email || '—'}
      </div>
    </div>
  );

  if (type === 'invoice') return (
    <div style={{ padding: '10px 14px', background: '#111', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.client} — {item.project}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 3 }}>
        ${item.amount?.toLocaleString('en-CA')} · {item.urgency} · {item.email}
      </div>
    </div>
  );

  if (type === 'deliverable') return (
    <div style={{ padding: '10px 14px', background: '#111', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.client} — {item.project}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 3 }}>
        "{item.title}" · pending {item.hours_pending}h · {item.email}
      </div>
    </div>
  );

  return null;
}

function ReminderCard({ type, onRun }) {
  const { key, Icon, label, color, bg, border, description } = type;
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [results, setResults] = useState(null);
  const [mode, setMode] = useState('preview'); // preview | send

  const handleRun = async () => {
    setState('loading');
    try {
      const res = await base44.functions.invoke('clientReminders', { type: key, preview: mode === 'preview' });
      setResults(res.data);
      setState('done');
      if (mode === 'send') onRun(label, res.data?.count || 0);
    } catch (e) {
      setState('error');
    }
  };

  const reset = () => { setState('idle'); setResults(null); };

  return (
    <div style={{ background: '#0D0D0D', border: `1px solid #141414`, borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{description}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[{ v: 'preview', label: '👁 Preview', Icon: Eye }, { v: 'send', label: '📤 Send Now', Icon: Send }].map(opt => (
            <button key={opt.v} onClick={() => { setMode(opt.v); reset(); }} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${mode === opt.v ? color : '#1E1E1E'}`, background: mode === opt.v ? bg : 'transparent', color: mode === opt.v ? color : '#444' }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Run button */}
        {state === 'idle' && (
          <button onClick={handleRun} style={{ width: '100%', padding: '12px 0', background: mode === 'send' ? color : 'transparent', border: `1px solid ${color}`, borderRadius: 10, color: mode === 'send' ? '#000' : color, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {mode === 'preview' ? <><Eye size={14} /> Preview Recipients</> : <><Send size={14} /> Send Reminders</>}
          </button>
        )}

        {state === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', color: '#555', fontSize: 13 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {mode === 'preview' ? 'Checking...' : 'Sending...'}
          </div>
        )}

        {state === 'error' && (
          <div style={{ padding: '12px 14px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 13, color: '#E81A1A', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> Something went wrong.</div>
            <button onClick={reset} style={{ marginTop: 8, fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>← Try again</button>
          </div>
        )}

        {state === 'done' && results && (
          <div>
            {/* Summary */}
            <div style={{ padding: '12px 14px', background: results.count > 0 ? (mode === 'send' ? 'rgba(123,200,83,0.08)' : bg) : 'rgba(100,100,100,0.06)', border: `1px solid ${results.count > 0 ? (mode === 'send' ? 'rgba(123,200,83,0.25)' : border) : '#1A1A1A'}`, borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} color={results.count > 0 ? (mode === 'send' ? '#7BC853' : color) : '#444'} />
              <div style={{ fontSize: 13, fontWeight: 700, color: results.count > 0 ? (mode === 'send' ? '#7BC853' : color) : '#555' }}>
                {results.count === 0
                  ? 'No reminders needed right now'
                  : mode === 'send'
                    ? `${results.count} reminder${results.count !== 1 ? 's' : ''} sent successfully`
                    : `${results.count} client${results.count !== 1 ? 's' : ''} would be notified`}
              </div>
            </div>

            {/* Results list */}
            {results.results?.length > 0 && (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {results.results.map((r, i) => <ResultRow key={i} item={r} type={key} />)}
              </div>
            )}

            <button onClick={reset} style={{ marginTop: 10, width: '100%', padding: '9px 0', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 8, color: '#444', fontSize: 12, cursor: 'pointer' }}>
              ← Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientRemindersPage() {
  const [toast, setToast] = useState(null);

  const handleRan = (label, count) => {
    setToast({ label, count });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Bell size={24} color="#E81A1A" />
          <div style={{ fontSize: 26, fontWeight: 800 }}>Client Reminder System</div>
        </div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          Automated reminders run daily via scheduler. Use this page to preview recipients or manually trigger a reminder type at any time.
        </div>
      </div>

      {/* Automation status banner */}
      <div style={{ padding: '14px 18px', background: 'rgba(123,200,83,0.06)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 14, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7BC853', flexShrink: 0, boxShadow: '0 0 6px #7BC853' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>Automations Active</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Shoot reminders run daily at 9 AM · Invoice reminders at 10 AM · Approval reminders at 11 AM</div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {REMINDER_TYPES.map(type => (
          <ReminderCard key={type.key} type={type} onRun={handleRan} />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1E1E1E', border: '1px solid #333', borderLeft: '3px solid #7BC853', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#7BC853', zIndex: 999, whiteSpace: 'nowrap', fontFamily: 'Syne, sans-serif', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          ✓ {toast.label}: {toast.count} reminder{toast.count !== 1 ? 's' : ''} sent
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}