import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

const ACTIONS = {
  crew: [
    { id: 'bookingMsg', icon: '📣', label: 'Draft Booking Messages', desc: 'WhatsApp/email booking messages for all crew' },
    { id: 'crewMatcher', icon: '👥', label: 'Suggest More Crew', desc: 'Find best crew matches from your contacts' },
  ],
  deliverables: [
    { id: 'followUp', icon: '✉️', label: 'Draft Follow-up Email', desc: 'Client follow-up for pending deliverables' },
    { id: 'postShootEmail', icon: '🙏', label: 'Post-Shoot Follow-up', desc: 'Warm AI-crafted post-shoot email to client' },
  ],
  invoice: [
    { id: 'invoiceEmail', icon: '💳', label: 'Write Invoice Email', desc: 'Professional invoice email for this project' },
    { id: 'followUp', icon: '⚠️', label: 'Draft Overdue Follow-up', desc: 'Payment reminder email for client' },
  ],
  overview: [
    { id: 'callSheet', icon: '📋', label: 'Generate Call Sheet', desc: 'Ready-to-send call sheet for this project' },
  ],
  notes: [
    { id: 'briefSummary', icon: '✦', label: 'Summarize Project', desc: 'AI summary of this project status' },
  ],
};

function buildProjectContext(p) {
  const fmt = n => `$${(n || 0).toFixed(2)}`;
  let ctx = `PROJECT: ${p.name}\nClient: ${p.client}\nDate: ${p.date || 'N/A'}${p.end_date && p.end_date !== p.date ? ` → ${p.end_date}` : ''}\nStatus: ${p.status}\nRevenue: ${fmt(p.revenue)}\nCrew Cost: ${fmt(p.crew_cost)}\nNet: ${fmt(p.net)}\nPaid: ${p.paid ? 'YES' : 'NO'}\nAddress: ${p.address || 'N/A'}\nCall Time: ${p.start_time || 'N/A'}\nWrap: ${p.end_time || 'N/A'}\nPOC: ${p.poc_name || 'N/A'} ${p.poc_phone || ''}\nInvoice #: ${p.invoice_number || 'N/A'}\nInvoice Due: ${p.invoice_due_date || 'N/A'}\nNotes: ${p.notes || 'None'}\n`;
  const crew = (p.crew || []).map(c => `  - ${c.name} (${c.role}): ${fmt(c.cost)} | paid: ${c.paid ? 'YES' : 'NO'} | phone: ${c.phone || 'N/A'} | email: ${c.email || 'N/A'}`).join('\n');
  if (crew) ctx += `Crew:\n${crew}\n`;
  const rentals = (p.rentals || []).map(r => `  - ${r.equipment} from ${r.vendor}: ${fmt(r.cost)}`).join('\n');
  if (rentals) ctx += `Rentals:\n${rentals}\n`;
  const dels = (p.deliverables || []).map(d => `  - ${d.name}: ${d.done ? 'DONE' : 'PENDING'}${d.due ? ` (due ${d.due})` : ''}`).join('\n');
  if (dels) ctx += `Deliverables:\n${dels}\n`;
  return ctx;
}

const PROMPTS = {
  callSheet: (p) => `Generate a clean, ready-to-send call sheet for this project. Include all relevant logistics, crew roles, and shoot details. Format it clearly so it can be copy-pasted into a message.`,
  invoiceEmail: (p) => `Write a professional invoice email to ${p.client} for the project "${p.name}" (${p.date}). Revenue: $${p.revenue}. Invoice #: ${p.invoice_number || 'TBD'}. Due: ${p.invoice_due_date || 'on receipt'}.`,
  followUp: (p) => `Write a firm but polite follow-up email to ${p.client} about "${p.name}". ${!p.paid ? 'The invoice has not been paid yet.' : 'Following up on outstanding deliverables.'} Keep it professional and actionable.`,
  bookingMsg: (p) => `Write individual WhatsApp booking confirmation messages for each crew member listed. Include project name, date, call time, location, role and pay. Keep them friendly and concise.`,
  crewMatcher: (p) => `Based on this project (${p.name}, ${p.date}, roles needed: ${(p.crew || []).map(c => c.role).join(', ') || 'TBD'}), suggest which crew members from the contacts list would be best suited. Explain why.`,
  briefSummary: (p) => `Give a concise status summary of this project. Highlight what's done, what's pending, any financial concerns, and any overdue items. Keep it under 150 words.`,
  postShootEmail: (p) => `Write a warm, personal post-shoot follow-up email from Rathan at Studio 65 to ${p.client} after the project "${p.name}" (shot on ${p.date || 'recently'}). Thank them for a great day on set, briefly mention one or two details from the project context (deliverables, location, crew), let them know what happens next (editing is underway, timeline), and invite them to share any initial thoughts. Sign off warmly. Keep it concise — max 200 words. Do NOT be generic.`,
};

export default function ProjectAIActions({ project, contacts = [], tab }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(null);

  const actions = ACTIONS[tab] || [];
  if (!actions.length) return null;

  const runAction = async (action) => {
    setLoading(action.id);
    const ctx = buildProjectContext(project);
    const contactCtx = contacts.length ? `\nCREW CONTACTS:\n${contacts.filter(c => (c.types||[]).includes('Crew')).map(c => `- ${c.name} | ${c.role || 'N/A'} | ${c.crew_skills || ''} | ${c.rate || ''}`).join('\n')}` : '';
    const prompt = PROMPTS[action.id] ? PROMPTS[action.id](project) : action.label;
    const res = await base44.functions.invoke('studioAgents', {
      agent: action.id,
      prompt,
      context: ctx + contactCtx,
    });
    setLoading(null);
    setResult({ label: action.label, icon: action.icon, text: res.data?.result || res.data?.error || 'No response.' });
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, padding: '10px 12px', background: 'rgba(232,26,26,0.04)', border: '1px solid rgba(232,26,26,0.1)', borderRadius: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', marginRight: 4 }}>✦ AI</span>
        {actions.map(a => (
          <button
            key={a.id}
            onClick={() => runAction(a)}
            disabled={!!loading}
            title={a.desc}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 20,
              fontSize: 11, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              border: '1px solid rgba(232,26,26,0.25)',
              background: loading === a.id ? 'rgba(232,26,26,0.15)' : 'rgba(232,26,26,0.08)',
              color: '#E81A1A', fontFamily: MONO,
              opacity: loading && loading !== a.id ? 0.5 : 1,
            }}
          >
            {loading === a.id ? '⏳' : a.icon} {loading === a.id ? 'Running...' : a.label}
          </button>
        ))}
      </div>

      {result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 680, background: '#111', border: '1px solid #2A2A2A', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{result.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{result.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>AI RESULT · {project.name}</div>
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