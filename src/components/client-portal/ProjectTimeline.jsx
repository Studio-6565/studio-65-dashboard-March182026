import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const MONO = '"DM Mono", monospace';

// All stages with metadata
const TIMELINE_STAGES = [
  { key: 'booked',      label: 'Booked',          icon: '📋', desc: 'Project confirmed & scheduled' },
  { key: 'pre_prod',    label: 'Pre-Production',   icon: '🎯', desc: 'Planning, scripting & prep' },
  { key: 'shoot',       label: 'Shoot Day',        icon: '🎬', desc: 'On-location filming' },
  { key: 'editing',     label: 'Editing',          icon: '✂️', desc: 'Post-production & colour grade' },
  { key: 'review',      label: 'Client Review',    icon: '👀', desc: 'Your feedback & revisions' },
  { key: 'delivery',    label: 'Final Delivery',   icon: '📦', desc: 'Files delivered to you' },
  { key: 'complete',    label: 'Complete',         icon: '✅', desc: 'Project wrapped' },
];

// Map project status → which stage index is "current"
const STATUS_TO_STAGE = {
  'Booked':        1, // booked done, pre-prod active
  'In Production': 2, // shoot active
  'In Edit':       3, // editing active
  'Delivered':     5, // delivery done, complete active
  'Invoiced':      6, // fully complete
};

function getStageState(stageIdx, currentIdx) {
  if (stageIdx < currentIdx) return 'done';
  if (stageIdx === currentIdx) return 'active';
  return 'upcoming';
}

function getStageColor(status) {
  const map = {
    'Booked':        '#4A9EFF',
    'In Production': '#F59E0B',
    'In Edit':       '#A78BFA',
    'Delivered':     '#7BC853',
    'Invoiced':      '#7BC853',
  };
  return map[status] || '#4A9EFF';
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export default function ProjectTimeline({ project: p }) {
  const currentIdx = STATUS_TO_STAGE[p.status] ?? 0;
  const accentColor = getStageColor(p.status);
  const totalStages = TIMELINE_STAGES.length;
  const progressPct = Math.round((currentIdx / (totalStages - 1)) * 100);

  // Build date hints from project data
  const dateMilestones = {};
  if (p.date) dateMilestones['shoot'] = fmtDate(p.date);
  if (p.end_date && p.end_date !== p.date) dateMilestones['shoot'] = `${fmtDate(p.date)} – ${fmtDate(p.end_date)}`;

  return (
    <div style={{ padding: '20px 20px', borderTop: '1px solid #141414' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Project Timeline
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: accentColor }}>
          {progressPct}% complete
        </div>
      </div>

      {/* Overall progress bar */}
      <div style={{ height: 3, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: `linear-gradient(90deg, #4A9EFF, ${accentColor})`,
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Stage list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {TIMELINE_STAGES.map((stage, i) => {
          const state = getStageState(i, currentIdx);
          const isLast = i === TIMELINE_STAGES.length - 1;
          const date = dateMilestones[stage.key];

          return (
            <div key={stage.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
              {/* Connector line */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: 11,
                  top: 26,
                  width: 2,
                  height: 'calc(100% - 10px)',
                  background: state === 'done' ? '#7BC853' : '#1A1A1A',
                  transition: 'background 0.3s',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: state === 'done' ? '#7BC853' : state === 'active' ? accentColor : '#111',
                border: `2px solid ${state === 'done' ? '#7BC853' : state === 'active' ? accentColor : '#222'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: state === 'active' ? `0 0 12px ${accentColor}50` : 'none',
                transition: 'all 0.3s',
                zIndex: 1,
              }}>
                {state === 'done' ? (
                  <CheckCircle2 size={13} color="#000" />
                ) : state === 'active' ? (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2A2A2A' }} />
                )}
              </div>

              {/* Label + desc */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 13, fontWeight: state === 'upcoming' ? 400 : 700,
                    color: state === 'done' ? '#7BC853' : state === 'active' ? '#fff' : '#333',
                    transition: 'color 0.3s',
                  }}>
                    {stage.label}
                  </span>
                  {state === 'active' && (
                    <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 4, background: `${accentColor}20`, color: accentColor, fontWeight: 700, border: `1px solid ${accentColor}40` }}>
                      NOW
                    </span>
                  )}
                  {date && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{date}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: state === 'upcoming' ? '#252525' : '#444', marginTop: 2, lineHeight: 1.5 }}>
                  {stage.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}