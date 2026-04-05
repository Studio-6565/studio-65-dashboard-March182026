import React, { useState } from 'react';
import StudioModal from './StudioModal';
import { fmt, nextProjectId } from '@/lib/studio';
import { base44 } from '@/api/base44Client';

const STEPS = [
  { key: 'basics',      label: 'Basic Info',           icon: '🎬' },
  { key: 'schedule',    label: 'Schedule & Location',  icon: '📍' },
  { key: 'finances',    label: 'Finances',             icon: '💰' },
  { key: 'crew',        label: 'Crew',                 icon: '👥' },
  { key: 'deliverables',label: 'Deliverables',         icon: '✅' },
];

const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };

const EMPTY_CREW = { name: '', role: '', rate_type: 'flat', cost: '', phone: '' };
const EMPTY_DEL  = { name: '', due: '' };

export default function ProjectWizard({ open, onClose, projects, contacts = [], onSave }) {
  const [step, setStep] = useState(0);

  // Step 1 — basics
  const [name, setName]     = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes]   = useState('');

  // Step 2 — schedule & location
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime]     = useState('');
  const [address, setAddress]     = useState('');
  const [pocName, setPocName]     = useState('');
  const [pocPhone, setPocPhone]   = useState('');

  // Step 3 — finances
  const [revenue, setRevenue]       = useState('');
  const [crewCost, setCrewCost]     = useState('');
  const [rentalCost, setRentalCost] = useState('');
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState(null);
  const [aiPriceLoading, setAiPriceLoading] = useState(false);

  // Step 4 — crew
  const [crew, setCrew]         = useState([]);
  const [crewForm, setCrewForm] = useState(EMPTY_CREW);

  // Step 5 — deliverables
  const [deliverables, setDeliverables] = useState([]);
  const [delForm, setDelForm]           = useState(EMPTY_DEL);

  const rev  = parseFloat(revenue)    || 0;
  const cc   = parseFloat(crewCost)   || 0;
  const rc   = parseFloat(rentalCost) || 0;
  const net  = rev - cc - rc;

  const resetAll = () => {
    setStep(0);
    setName(''); setClient(''); setNotes('');
    setDate(new Date().toISOString().split('T')[0]); setEndDate(''); setStartTime(''); setEndTime('');
    setAddress(''); setPocName(''); setPocPhone('');
    setRevenue(''); setCrewCost(''); setRentalCost('');
    setCrew([]); setCrewForm(EMPTY_CREW);
    setDeliverables([]); setDelForm(EMPTY_DEL);
  };

  const handleClose = () => { resetAll(); onClose(); };

  const addCrew = () => {
    if (!crewForm.name.trim()) return;
    setCrew(c => [...c, { ...crewForm, cost: parseFloat(crewForm.cost) || 0, paid: false, avail: 'pending' }]);
    setCrewForm(EMPTY_CREW);
  };

  const addDel = () => {
    if (!delForm.name.trim()) return;
    setDeliverables(d => [...d, { ...delForm, done: false }]);
    setDelForm(EMPTY_DEL);
  };

  const handleFinish = () => {
    const id = nextProjectId(projects);
    onSave({
      name: name.trim(), client: client.trim(), notes, project_id: id,
      date, end_date: endDate, start_time: startTime, end_time: endTime,
      address, poc_name: pocName, poc_phone: pocPhone,
      revenue: rev, crew_cost: cc, rental_cost: rc, net,
      crew, deliverables, rentals: [], hours: [], expenses: [], shot_list: [],
      status: 'Booked', paid: false, archived: false,
      activity: [{ msg: 'Project created via wizard', ts: new Date().toISOString() }],
    });
    resetAll();
  };

  const canNext = () => {
    if (step === 0) return name.trim() && client.trim();
    return true;
  };

  const clientList = [...new Set(projects.map(p => p.client).filter(Boolean))].sort();
  const contactNames = contacts.map(c => c.name);

  return (
    <StudioModal open={open} onClose={handleClose}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>New Project</div>
            <div style={{ fontSize: 12, color: '#555', fontFamily: '"DM Mono", monospace', marginTop: 2 }}>
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </div>
          </div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#2A2A2A', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Step progress bar */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              onClick={() => i < step && setStep(i)}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= step ? '#E81A1A' : '#2A2A2A',
                cursor: i < step ? 'pointer' : 'default',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              onClick={() => i < step && setStep(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 600, fontFamily: '"DM Mono", monospace',
                background: i === step ? 'rgba(232,26,26,0.12)' : i < step ? 'rgba(123,200,83,0.1)' : '#1E1E1E',
                color: i === step ? '#E81A1A' : i < step ? '#7BC853' : '#444',
                cursor: i < step ? 'pointer' : 'default',
                border: `1px solid ${i === step ? 'rgba(232,26,26,0.3)' : i < step ? 'rgba(123,200,83,0.2)' : '#2A2A2A'}`,
              }}
            >
              {i < step ? '✓' : s.icon} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: Basic Info ── */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', background: 'rgba(232,26,26,0.05)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 10, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            🎬 Let's start with the basics. What's the project and who's it for?
          </div>
          <div>
            <label style={LS}>Project Name *</label>
            <input style={IS} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LG Annual Brand Video" autoFocus />
          </div>
          <div>
            <label style={LS}>Client *</label>
            {contacts.filter(c => (c.types || []).includes('Client')).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  style={IS}
                  value={contacts.filter(c => (c.types || []).includes('Client')).some(c => c.name === client) ? client : ''}
                  onChange={e => {
                    if (!e.target.value) return;
                    const picked = contacts.find(c => c.name === e.target.value);
                    setClient(e.target.value);
                    if (picked) {
                      if (picked.name && !pocName) setPocName(picked.name);
                      if (picked.phone && !pocPhone) setPocPhone(picked.phone);
                    }
                  }}
                >
                  <option value="">— pick from contacts —</option>
                  {contacts.filter(c => (c.types || []).includes('Client')).map(c => (
                    <option key={c.id} value={c.name}>{c.name}{c.client_company ? ` (${c.client_company})` : ''}</option>
                  ))}
                </select>
                <input style={IS} value={client} onChange={e => setClient(e.target.value)} placeholder="or type manually" list="client-list" />
                <datalist id="client-list">{clientList.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            ) : (
              <>
                <input style={IS} value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. ATM Creative" list="client-list" />
                <datalist id="client-list">{clientList.map(c => <option key={c} value={c} />)}</datalist>
              </>
            )}
          </div>
          <div>
            <label style={LS}>Notes / Brief (optional)</label>
            <textarea style={{ ...IS, resize: 'none', lineHeight: 1.6 }} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="High-level brief, mood, goals..." />
          </div>
        </div>
      )}

      {/* ── Step 2: Schedule & Location ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', background: 'rgba(74,158,255,0.05)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 10, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            📍 When and where is the shoot? Add all the logistics here.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LS}>Shoot Date *</label>
              <input style={IS} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={LS}>End Date (multi-day)</label>
              <input style={IS} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label style={LS}>Call Time</label>
              <input style={IS} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label style={LS}>Wrap Time</label>
              <input style={IS} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={LS}>Shoot Address</label>
            <input style={IS} value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 123 Queen St W, Toronto, ON" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LS}>Point of Contact</label>
              <input style={IS} value={pocName} onChange={e => setPocName(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label style={LS}>Their Phone</label>
              <input style={IS} value={pocPhone} onChange={e => setPocPhone(e.target.value)} placeholder="+1 416 555 0100" />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Finances ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', background: 'rgba(123,200,83,0.05)', border: '1px solid rgba(123,200,83,0.15)', borderRadius: 10, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            💰 Set your revenue and expected costs to track profitability from day one.
          </div>
          {/* AI Pricing Suggestion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(232,26,26,0.05)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13 }}>✦</span>
            <span style={{ fontSize: 12, color: '#888', flex: 1 }}>Not sure what to charge?</span>
            <button
              type="button"
              disabled={aiPriceLoading || !name}
              onClick={async () => {
                setAiPriceLoading(true);
                const ctx = projects.filter(p => p.revenue > 0).slice(0, 20).map(p => `- ${p.name} (${p.client}): $${p.revenue}, Net $${p.net}`).join('\n');
                const res = await base44.functions.invoke('studioAgents', {
                  agent: 'pricing',
                  prompt: `Suggest a pricing range for this new project:\nName: ${name}\nClient: ${client}\nDate: ${date}\nAddress: ${address || 'TBD'}\nNotes: ${notes || 'None'}`,
                  context: `PAST PROJECT PRICING DATA:\n${ctx || 'No past data.'}`,
                });
                setAiPriceSuggestion(res.data?.result || 'No response.');
                setAiPriceLoading(false);
              }}
              style={{ padding: '6px 14px', background: aiPriceLoading ? '#222' : 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 20, color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}
            >
              {aiPriceLoading ? '⏳ Loading...' : 'Get AI Suggestion →'}
            </button>
          </div>
          {aiPriceSuggestion && (
            <div style={{ padding: '12px 14px', background: '#111', border: '1px solid rgba(232,26,26,0.2)', borderLeft: '3px solid #E81A1A', borderRadius: 10, fontSize: 12, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#E81A1A', marginBottom: 6, textTransform: 'uppercase' }}>✦ AI PRICING SUGGESTION</div>
              {aiPriceSuggestion}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={LS}>Revenue ($)</label>
              <input style={IS} type="number" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={LS}>Crew Cost ($)</label>
              <input style={IS} type="number" value={crewCost} onChange={e => setCrewCost(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={LS}>Rental Cost ($)</label>
              <input style={IS} type="number" value={rentalCost} onChange={e => setRentalCost(e.target.value)} placeholder="0" />
            </div>
          </div>
          {/* Live net preview */}
          <div style={{ padding: '16px', background: '#1A1A1A', borderRadius: 10, border: '1px solid #2A2A2A' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
              {[['Revenue', fmt(rev), '#fff'], ['Crew', fmt(cc), '#E81A1A'], ['Rental', fmt(rc), '#E81A1A'], ['Net', fmt(net), net >= 0 ? '#7BC853' : '#E81A1A']].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, fontFamily: '"DM Mono", monospace', color: '#555', marginBottom: 4, textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            {rev > 0 && <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#666' }}>
              Margin: <span style={{ color: net >= 0 ? '#7BC853' : '#E81A1A', fontWeight: 700 }}>{rev > 0 ? Math.round((net / rev) * 100) : 0}%</span>
            </div>}
          </div>
        </div>
      )}

      {/* ── Step 4: Crew ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            👥 Add your crew members. You can always edit or add more later.
          </div>

          {/* Existing crew */}
          {crew.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crew.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#666', fontFamily: '"DM Mono", monospace' }}>{c.role}{c.cost ? ` · $${c.cost}${c.rate_type === 'hourly' ? '/hr' : ''}` : ''}</div>
                  </div>
                  <button onClick={() => setCrew(crew.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Add crew form */}
          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Add Crew Member</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={LS}>Name</label>
                <input
                  style={IS}
                  value={crewForm.name}
                  onChange={e => {
                    const val = e.target.value;
                    const match = contacts.find(c => c.name === val);
                    if (match) {
                      setCrewForm(f => ({
                        ...f,
                        name: val,
                        role: match.role || f.role,
                        phone: match.phone || f.phone,
                        cost: match.rate || f.cost,
                        rate_type: match.rate_type || f.rate_type,
                      }));
                    } else {
                      setCrewForm(f => ({ ...f, name: val }));
                    }
                  }}
                  placeholder="Crew name"
                  list="contact-names"
                />
                <datalist id="contact-names">{contactNames.map(n => <option key={n} value={n} />)}</datalist>
              </div>
              <div>
                <label style={LS}>Role</label>
                <input style={IS} value={crewForm.role} onChange={e => setCrewForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. DP, Sound" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={LS}>Rate</label>
                <div style={{ display: 'flex', gap: 0, background: '#1E1E1E', borderRadius: 8, border: '1px solid #333', overflow: 'hidden' }}>
                  {['flat', 'hourly'].map(rt => (
                    <button key={rt} type="button" onClick={() => setCrewForm(f => ({ ...f, rate_type: rt }))}
                      style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: crewForm.rate_type === rt ? '#E81A1A' : 'transparent', color: crewForm.rate_type === rt ? '#fff' : '#666' }}>
                      {rt === 'flat' ? 'Flat' : '$/hr'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={LS}>Amount ($)</label>
                <input style={IS} type="number" value={crewForm.cost} onChange={e => setCrewForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label style={LS}>Phone</label>
                <input style={IS} value={crewForm.phone} onChange={e => setCrewForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 416..." />
              </div>
            </div>
            <button onClick={addCrew} disabled={!crewForm.name.trim()} style={{ padding: '10px 0', background: crewForm.name.trim() ? '#E81A1A' : '#2A2A2A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: crewForm.name.trim() ? 'pointer' : 'default', opacity: crewForm.name.trim() ? 1 : 0.4 }}>
              + Add to Crew
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Deliverables ── */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            ✅ What needs to be delivered? Add your deliverables and due dates.
          </div>

          {deliverables.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deliverables.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7BC853', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{d.name}</div>
                  {d.due && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#555' }}>{d.due}</span>}
                  <button onClick={() => setDeliverables(deliverables.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Add Deliverable</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <div>
                <label style={LS}>Deliverable</label>
                <input style={IS} value={delForm.name} onChange={e => setDelForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2-min highlight reel" onKeyDown={e => e.key === 'Enter' && addDel()} />
              </div>
              <div>
                <label style={LS}>Due Date</label>
                <input style={IS} type="date" value={delForm.due} onChange={e => setDelForm(f => ({ ...f, due: e.target.value }))} />
              </div>
            </div>
            <button onClick={addDel} disabled={!delForm.name.trim()} style={{ padding: '10px 0', background: delForm.name.trim() ? '#E81A1A' : '#2A2A2A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: delForm.name.trim() ? 'pointer' : 'default', opacity: delForm.name.trim() ? 1 : 0.4 }}>
              + Add Deliverable
            </button>
          </div>

          {/* Summary before finish */}
          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', color: '#555', textTransform: 'uppercase', marginBottom: 12 }}>Project Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Project</span><span style={{ fontWeight: 700 }}>{name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Client</span><span>{client}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Date</span><span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11 }}>{date}{endDate ? ' → ' + endDate : ''}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Revenue</span><span style={{ color: '#7BC853', fontWeight: 700 }}>{fmt(rev)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Net</span><span style={{ color: net >= 0 ? '#7BC853' : '#E81A1A', fontWeight: 700 }}>{fmt(net)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Crew</span><span>{crew.length} member{crew.length !== 1 ? 's' : ''}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Deliverables</span><span>{deliverables.length} item{deliverables.length !== 1 ? 's' : ''}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid #2A2A2A' }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ padding: '11px 20px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            style={{ padding: '11px 28px', background: canNext() ? '#E81A1A' : '#2A2A2A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: canNext() ? 'pointer' : 'default', opacity: canNext() ? 1 : 0.5 }}
          >
            Next → {STEPS[step + 1]?.icon}
          </button>
        ) : (
          <button
            onClick={handleFinish}
            style={{ padding: '11px 28px', background: '#7BC853', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
          >
            🚀 Create Project
          </button>
        )}
      </div>
    </StudioModal>
  );
}