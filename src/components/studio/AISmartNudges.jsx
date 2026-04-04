import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

export default function AISmartNudges({ projects = [] }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    base44.entities.OnboardingRequest.filter({ status: 'pending' }).then(r => setRequests(r || [])).catch(() => {});
  }, []);
  const [dismissed, setDismissed] = useState([]);
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);

  const nudges = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const list = [];

    // Unpaid invoices
    const unpaid = projects.filter(p => !p.archived && !p.paid && (p.status === 'Invoiced' || p.status === 'Delivered'));
    if (unpaid.length > 0) {
      list.push({
        id: 'unpaid',
        icon: '💳',
        color: '#E81A1A',
        msg: `${unpaid.length} unpaid invoice${unpaid.length > 1 ? 's' : ''} — draft follow-up emails?`,
        action: 'Draft Follow-ups',
        agent: 'followUp',
        prompt: `Write concise, professional follow-up emails for these ${unpaid.length} unpaid invoices:\n${unpaid.map(p => `- ${p.name} (${p.client}): $${p.revenue} | Due: ${p.invoice_due_date || 'on receipt'}`).join('\n')}`,
        context: '',
      });
    }

    // Overdue deliverables
    const overdueDels = projects.filter(p => !p.archived && (p.deliverables || []).some(d => !d.done && d.due && d.due < today));
    if (overdueDels.length > 0) {
      list.push({
        id: 'overdue',
        icon: '⚠️',
        color: '#F59E0B',
        msg: `${overdueDels.length} project${overdueDels.length > 1 ? 's' : ''} with overdue deliverables`,
        action: 'Get Summary',
        agent: 'briefSummary',
        prompt: `Summarize the overdue deliverables situation:\n${overdueDels.map(p => `- ${p.name}: ${(p.deliverables || []).filter(d => !d.done && d.due && d.due < today).map(d => d.name + ' (due ' + d.due + ')').join(', ')}`).join('\n')}`,
        context: '',
      });
    }

    // Pending onboarding requests
    const pendingReqs = requests.filter(r => r.status === 'pending');
    if (pendingReqs.length > 0) {
      list.push({
        id: 'onboarding',
        icon: '🔍',
        color: '#4A9EFF',
        msg: `${pendingReqs.length} pending onboarding request${pendingReqs.length > 1 ? 's' : ''} — screen with AI?`,
        action: 'Screen All',
        agent: 'onboardingScreener',
        prompt: `Review these ${pendingReqs.length} onboarding applicants and give a brief hiring recommendation for each:\n${pendingReqs.map(r => `- ${r.name} (${r.contact_type}): ${r.role || r.crew_skills || r.client_project_type || r.vendor_offerings || 'No details'}`).join('\n')}`,
        context: '',
      });
    }

    // Upcoming shoots with no confirmed crew
    const upcoming = projects.filter(p => !p.archived && p.date >= today && p.date <= new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);
    const noConfirmed = upcoming.filter(p => (p.crew || []).length > 0 && !(p.crew || []).some(c => c.avail === 'yes'));
    if (noConfirmed.length > 0) {
      list.push({
        id: 'crew_avail',
        icon: '👥',
        color: '#7BC853',
        msg: `${noConfirmed.length} shoot${noConfirmed.length > 1 ? 's' : ''} this week with no confirmed crew`,
        action: 'Draft Booking Messages',
        agent: 'bookingMsg',
        prompt: `Draft WhatsApp booking messages for crew on these upcoming shoots:\n${noConfirmed.map(p => `- ${p.name} (${p.date}): ${(p.crew || []).map(c => c.name + ' / ' + c.role).join(', ')}`).join('\n')}`,
        context: '',
      });
    }

    return list.filter(n => !dismissed.includes(n.id));
  }, [projects, requests, dismissed]);

  if (!nudges.length) return null;

  const runNudge = async (nudge) => {
    setLoading(nudge.id);
    const res = await base44.functions.invoke('studioAgents', {
      agent: nudge.agent,
      prompt: nudge.prompt,
      context: nudge.context,
    });
    setLoading(null);
    setResult({ label: nudge.action, icon: nudge.icon, text: res.data?.result || res.data?.error || 'No response.' });
  };

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {nudges.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#111', border: `1px solid ${n.color}22`, borderLeft: `3px solid ${n.color}`, borderRadius: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
            <div style={{ flex: 1, minWidth: 140 }}>
              <span style={{ fontSize: 12, color: '#ccc' }}>{n.msg}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => runNudge(n)}
                disabled={!!loading}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${n.color}40`, background: n.color + '15', color: n.color, fontFamily: MONO }}
              >
                {loading === n.id ? '⏳...' : `✦ ${n.action}`}
              </button>
              <button onClick={() => setDismissed(d => [...d, n.id])} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 680, background: '#111', border: '1px solid #2A2A2A', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{result.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{result.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>AI RESULT</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(result.text); }} style={{ padding: '6px 12px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>📋 Copy</button>
              <button onClick={() => setResult(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, lineHeight: 1.75, fontSize: 13, color: '#ddd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result.text}
            </div>
          </div>
        </div>
      )}
    </>
  );
}