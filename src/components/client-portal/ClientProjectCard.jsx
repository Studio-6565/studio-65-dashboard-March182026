import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Calendar, Clock, CheckCircle2, ExternalLink, GitBranch } from 'lucide-react';
import ProjectTimeline from './ProjectTimeline';
import PreProductionChecklist from './PreProductionChecklist';

const MONO = '"DM Mono", monospace';

// Map Studio 65 statuses to client-friendly stage names
const STAGE_MAP = {
  'Booked':        { label: 'Booked & Confirmed',  color: '#4A9EFF', step: 2 },
  'In Production': { label: 'In Production',         color: '#F59E0B', step: 4 },
  'In Edit':       { label: 'In Editing',            color: '#A78BFA', step: 5 },
  'Delivered':     { label: 'Delivered',             color: '#7BC853', step: 7 },
  'Invoiced':      { label: 'Invoice Sent',          color: '#F59E0B', step: 8 },
};

const STAGES = [
  'Booked',
  'Pre-Production',
  'Shoot Day',
  'Editing',
  'Client Review',
  'Final Delivery',
  'Invoice',
  'Complete',
];

function stageIndex(status) {
  const map = {
    'Booked': 0,
    'In Production': 2,
    'In Edit': 3,
    'Delivered': 5,
    'Invoiced': 6,
  };
  return map[status] ?? 0;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientProjectCard({ project: p, defaultExpanded = false, contact = null }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const stage = STAGE_MAP[p.status] || STAGE_MAP['Booked'];
  const curStep = stageIndex(p.status);
  const del = p.deliverables || [];
  const doneDel = del.filter(d => d.done).length;
  const pendingDels = del.filter(d => !d.done && d.link);

  return (
    <div style={{
      background: '#0D0D0D',
      border: '1px solid #1A1A1A',
      borderRadius: 18,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '20px 20px 16px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{p.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20, fontFamily: MONO, fontWeight: 700,
                background: `${stage.color}15`, color: stage.color,
                border: `1px solid ${stage.color}30`,
              }}>
                {stage.label}
              </span>
              {p.date && (
                <span style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} />
                  {fmtDate(p.date)}{p.end_date && p.end_date !== p.date ? ` – ${fmtDate(p.end_date)}` : ''}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {p.paid && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(123,200,83,0.1)', color: '#7BC853', fontFamily: MONO, fontWeight: 700 }}>
                PAID
              </span>
            )}
            {expanded ? <ChevronUp size={16} color="#444" /> : <ChevronDown size={16} color="#444" />}
          </div>
        </div>

        {/* Progress pipeline — simplified 5 dots */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 0 }}>
          {STAGES.slice(0, 6).map((s, i) => {
            const done = i < curStep;
            const current = i === curStep;
            return (
              <React.Fragment key={s}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#7BC853' : current ? stage.color : '#1E1E1E',
                  border: `2px solid ${done ? '#7BC853' : current ? stage.color : '#2A2A2A'}`,
                  transition: 'all 0.3s',
                  boxShadow: current ? `0 0 8px ${stage.color}60` : 'none',
                }} />
                {i < 5 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: done ? '#7BC853' : '#1A1A1A',
                    transition: 'background 0.3s',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#333' }}>Booked</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#333' }}>Delivered</span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid #141414' }}>

          {/* Shoot details */}
          {(p.address || p.start_time || p.poc_name) && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #141414' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Shoot Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <MapPin size={14} color="#555" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#bbb' }}>{p.address}</span>
                  </div>
                )}
                {p.start_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} color="#555" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#bbb' }}>{p.start_time}{p.end_time ? ` – ${p.end_time}` : ''}</span>
                  </div>
                )}
                {p.poc_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>👤</span>
                    <span style={{ fontSize: 13, color: '#bbb' }}>{p.poc_name}{p.poc_phone ? ` · ${p.poc_phone}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deliverables */}
          {del.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: p.notes ? '1px solid #141414' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deliverables</div>
                <span style={{ fontFamily: MONO, fontSize: 11, color: doneDel === del.length ? '#7BC853' : '#555' }}>
                  {doneDel}/{del.length} complete
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${del.length ? (doneDel / del.length) * 100 : 0}%`, background: '#7BC853', borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {del.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      border: `2px solid ${d.done ? '#7BC853' : '#2A2A2A'}`,
                      background: d.done ? '#7BC853' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {d.done && <CheckCircle2 size={12} color="#000" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: d.done ? '#555' : '#ddd', textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</div>
                      {d.due && !d.done && <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>Due {d.due}</div>}
                      {d.link && (
                        <a href={d.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: '#4A9EFF', textDecoration: 'none', fontFamily: MONO }}>
                          <ExternalLink size={11} /> View / Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Deliverables ready for review CTA */}
              {pendingDels.length > 0 && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(123,200,83,0.05)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853', marginBottom: 4 }}>
                    🎉 {pendingDels.length} deliverable{pendingDels.length > 1 ? 's' : ''} ready for review
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Click the links above to review and let us know your feedback.</div>
                </div>
              )}
            </div>
          )}

          {/* Invoice */}
          {(p.revenue > 0 || p.status === 'Invoiced') && (
            <div style={{ padding: '14px 20px', borderBottom: p.notes ? '1px solid #141414' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoice</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  {p.revenue > 0 ? `$${p.revenue.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : '—'}
                </div>
                {p.invoice_due_date && !p.paid && (
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', marginTop: 2 }}>Due {p.invoice_due_date}</div>
                )}
              </div>
              <span style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 20, fontFamily: MONO, fontWeight: 700,
                background: p.paid ? 'rgba(123,200,83,0.1)' : 'rgba(245,158,11,0.1)',
                color: p.paid ? '#7BC853' : '#F59E0B',
                border: `1px solid ${p.paid ? 'rgba(123,200,83,0.3)' : 'rgba(245,158,11,0.3)'}`,
              }}>
                {p.paid ? '✓ Paid' : 'Awaiting Payment'}
              </span>
            </div>
          )}

          {/* Client notes */}
          {p.notes && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes from Studio 65</div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.8, fontStyle: 'italic' }}>{p.notes}</div>
            </div>
          )}

          {/* Pre-production checklist — only before shoot */}
          {['Booked', 'In Production'].includes(p.status) && contact && (
            <PreProductionChecklist project={p} contact={contact} />
          )}

          {/* Full timeline */}
          <ProjectTimeline project={p} />
        </div>
      )}
    </div>
  );
}