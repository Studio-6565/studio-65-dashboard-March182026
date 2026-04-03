import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

const AGENTS = [
  {
    id: 'callSheet',
    icon: '📋',
    label: 'Call Sheet Generator',
    color: '#4A9EFF',
    desc: 'Generate a ready-to-send call sheet from any project.',
    placeholder: 'Which project? Any extra details to include?',
    needsProject: true,
  },
  {
    id: 'invoice',
    icon: '💳',
    label: 'Invoice Writer',
    color: '#7BC853',
    desc: 'Draft a professional invoice email for a delivered project.',
    placeholder: 'Which project? Any special payment terms or notes?',
    needsProject: true,
  },
  {
    id: 'pricing',
    icon: '💰',
    label: 'Pricing Advisor',
    color: '#F59E0B',
    desc: 'Get a recommended price range based on your past projects.',
    placeholder: 'Describe the new project: type, duration, crew needed, location...',
    needsProject: false,
  },
  {
    id: 'expenses',
    icon: '🧾',
    label: 'Expense Categorizer',
    color: '#A78BFA',
    desc: 'Paste a receipt or expense description — AI categorizes it.',
    placeholder: 'e.g. "Uber to shoot location $34", "Adobe CC annual $599", "Lunch for 4 crew $87"',
    needsProject: false,
  },
  {
    id: 'crewMatcher',
    icon: '👥',
    label: 'Crew Matcher',
    color: '#F59E0B',
    desc: 'Find the best crew members from your contacts for a project.',
    placeholder: 'Describe what you need: roles, dates, skills required, budget...',
    needsProject: false,
  },
  {
    id: 'onboardingScreener',
    icon: '🔍',
    label: 'Onboarding Screener',
    color: '#4A9EFF',
    desc: 'Get an AI assessment of a pending onboarding request.',
    placeholder: 'Paste the applicant\'s details or describe who you\'re reviewing...',
    needsProject: false,
  },
  {
    id: 'followUp',
    icon: '✉️',
    label: 'Client Follow-up',
    color: '#E81A1A',
    desc: 'Draft follow-up emails for unpaid invoices or delivered projects.',
    placeholder: 'Which client or project? What\'s the reason for follow-up?',
    needsProject: true,
  },
];

function AgentCard({ agent, projects, contacts, onResult }) {
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(false);

  const buildContext = () => {
    const fmt = (n) => `$${(n || 0).toFixed(2)}`;
    const today = new Date().toISOString().split('T')[0];

    let ctx = '';

    if (agent.needsProject && selectedProject) {
      const p = projects.find(pr => pr.id === selectedProject);
      if (p) {
        ctx += `SELECTED PROJECT:\nName: ${p.name}\nClient: ${p.client}\nDate: ${p.date || 'N/A'}\nStatus: ${p.status}\nRevenue: ${fmt(p.revenue)}\nCrew Cost: ${fmt(p.crew_cost)}\nRental Cost: ${fmt(p.rental_cost)}\nNet: ${fmt(p.net)}\nPaid: ${p.paid ? 'YES' : 'NO'}\nAddress: ${p.address || 'N/A'}\nNotes: ${p.notes || 'None'}\nStart Time: ${p.start_time || 'N/A'}\nEnd Time: ${p.end_time || 'N/A'}\nPOC: ${p.poc_name || 'N/A'} ${p.poc_phone || ''}\nInvoice Number: ${p.invoice_number || 'N/A'}\nInvoice Due: ${p.invoice_due_date || 'N/A'}\n`;
        const crew = (p.crew || []).map(c => `  - ${c.name} (${c.role || 'Crew'}): ${fmt(c.cost)}${c.rate_type === 'hourly' ? `/hr × ${c.hours || 0}h` : ''} | paid: ${c.paid ? 'YES' : 'NO'} | phone: ${c.phone || 'N/A'} | email: ${c.email || 'N/A'}`).join('\n');
        if (crew) ctx += `Crew:\n${crew}\n`;
        const rentals = (p.rentals || []).map(r => `  - ${r.equipment} from ${r.vendor || 'unknown'}: ${fmt(r.cost)}`).join('\n');
        if (rentals) ctx += `Rentals:\n${rentals}\n`;
        const deliverables = (p.deliverables || []).map(d => `  - ${d.name}: ${d.done ? 'DONE' : 'PENDING'}${d.due ? ` (due ${d.due})` : ''}`).join('\n');
        if (deliverables) ctx += `Deliverables:\n${deliverables}\n`;
        const setup = p.setup || {};
        if (setup.camera_orientation || setup.frame_rate || setup.resolution) {
          ctx += `Camera Setup: ${[setup.camera_orientation, setup.frame_rate, setup.resolution, setup.codec, setup.color_profile].filter(Boolean).join(' | ')}\n`;
          if (setup.gear) ctx += `Gear/Kit:\n${setup.gear}\n`;
        }
      }
    }

    // Always include contacts for crew matcher
    if (agent.id === 'crewMatcher' || agent.id === 'onboardingScreener') {
      const crewContacts = contacts.filter(c => (c.types || []).includes('Crew'));
      if (crewContacts.length) {
        ctx += `\nAVAILABLE CREW CONTACTS:\n`;
        crewContacts.forEach(c => {
          ctx += `- ${c.name} | Role: ${c.role || 'N/A'} | Skills: ${c.crew_skills || 'N/A'} | Rate: ${c.rate || 'N/A'} (${c.rate_type || 'flat'}) | Availability: ${c.crew_availability || 'N/A'} | Phone: ${c.phone || 'N/A'}\n`;
        });
      }
    }

    // For follow-up: include all unpaid/delivered projects
    if (agent.id === 'followUp' && !selectedProject) {
      const relevant = projects.filter(p => !p.paid || p.status === 'Delivered' || p.status === 'Invoiced');
      ctx += `\nRELEVANT PROJECTS FOR FOLLOW-UP:\n`;
      relevant.forEach(p => {
        ctx += `- ${p.name} | Client: ${p.client} | Status: ${p.status} | Paid: ${p.paid ? 'YES' : 'NO'} | Revenue: ${fmt(p.revenue)} | Invoice Due: ${p.invoice_due_date || 'N/A'}\n`;
      });
    }

    // For pricing: include recent projects for reference
    if (agent.id === 'pricing') {
      ctx += `\nPAST PROJECT PRICING DATA:\n`;
      projects.filter(p => p.revenue > 0).slice(0, 20).forEach(p => {
        ctx += `- ${p.name} (${p.client}): Revenue ${fmt(p.revenue)}, Crew ${fmt(p.crew_cost)}, Net ${fmt(p.net)}, Status: ${p.status}\n`;
      });
    }

    return ctx || 'No specific project data.';
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const context = buildContext();
    const res = await base44.functions.invoke('studioAgents', {
      agent: agent.id,
      prompt: prompt.trim(),
      context,
    });
    setLoading(false);
    onResult({ agentLabel: agent.label, icon: agent.icon, result: res.data?.result || res.data?.error || 'No response.' });
    setExpanded(false);
    setPrompt('');
  };

  return (
    <div style={{
      background: '#1A1A1A',
      border: `1px solid ${expanded ? agent.color + '40' : '#222'}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: agent.color + '18', border: `1px solid ${agent.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{agent.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{agent.label}</div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>{agent.desc}</div>
        </div>
        <div style={{ color: '#333', fontSize: 16, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #222', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agent.needsProject && projects.length > 0 && (
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Project (optional)</label>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' }}
              >
                <option value="">— Select a project —</option>
                {projects.filter(p => !p.archived).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.client})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Your Request</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={agent.placeholder}
              style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
          <button
            onClick={handleRun}
            disabled={loading || !prompt.trim()}
            style={{
              width: '100%', padding: '12px 0',
              background: loading || !prompt.trim() ? '#222' : agent.color,
              border: 'none', borderRadius: 10,
              color: loading || !prompt.trim() ? '#555' : '#000',
              fontSize: 13, fontWeight: 800, cursor: loading || !prompt.trim() ? 'default' : 'pointer',
            }}
          >
            {loading ? '⏳ Running...' : `Run ${agent.label} →`}
          </button>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result, onClose, onCopy }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 0 0',
    }}>
      <div style={{
        width: '100%', maxWidth: 680,
        background: '#111', border: '1px solid #2A2A2A',
        borderRadius: '20px 20px 0 0',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{result.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{result.agentLabel}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>AI RESULT</div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(result.result); onCopy(); }}
            style={{ padding: '7px 14px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
          >📋 Copy</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', lineHeight: 1.75, fontSize: 13, color: '#ddd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {result.result}
        </div>
      </div>
    </div>
  );
}

export default function AIAgents({ projects = [], contacts = [] }) {
  const [activeResult, setActiveResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>AI Agents</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          Specialized AI tools for Studio 65 — each one knows your projects, crew, and clients.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AGENTS.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            projects={projects}
            contacts={contacts}
            onResult={setActiveResult}
          />
        ))}
      </div>

      {activeResult && (
        <ResultPanel
          result={activeResult}
          onClose={() => setActiveResult(null)}
          onCopy={handleCopy}
        />
      )}

      {copied && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1E1E1E', border: '1px solid #333', borderLeft: '3px solid #7BC853',
          borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 600,
          color: '#7BC853', zIndex: 1000, fontFamily: MONO, whiteSpace: 'nowrap',
        }}>✓ Copied to clipboard!</div>
      )}
    </div>
  );
}