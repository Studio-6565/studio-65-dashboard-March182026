import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const ROWS = [
  { key: 'identity_used',       label: '🎯 Identity',    color: '#A78BFA' },
  { key: 'audience_insight',    label: '👥 Audience',    color: '#4A9EFF' },
  { key: 'pillar_used',         label: '📌 Pillar',      color: '#F59E0B' },
  { key: 'performance_insight', label: '📊 Performance', color: '#7BC853' },
  { key: 'offer_used',          label: '💼 Offer',       color: '#E81A1A' },
];

export default function WhyThisScript({ scriptData, brain }) {
  const [open, setOpen] = useState(false);
  const why = scriptData?.why_panel || {};
  const angle = scriptData?.angle;

  const hasContent = Object.values(why).some(v => v);
  if (!hasContent && !angle) return null;

  return (
    <div style={{ marginTop: 16, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🧠</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', fontWeight: 700 }}>WHY THIS SCRIPT</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>Brain elements that shaped it</span>
        </div>
        {open ? <ChevronUp size={13} color="#444" /> : <ChevronDown size={13} color="#444" />}
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Angle rationale */}
          {angle?.why_this_client && (
            <div style={{ padding: '10px 12px', background: '#0D0D0D', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginBottom: 5 }}>ANGLE RATIONALE</div>
              <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6 }}>{angle.why_this_client}</div>
              {angle.predicted_driver_reason && (
                <div style={{ fontSize: 11, color: '#555', marginTop: 6, fontStyle: 'italic' }}>
                  Expected to drive {angle.predicted_driver}: {angle.predicted_driver_reason}
                </div>
              )}
            </div>
          )}

          {/* Brain sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROWS.map(row => why[row.key] ? (
              <div key={row.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: row.color, fontWeight: 700, minWidth: 100, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 11, color: '#888', lineHeight: 1.6, flex: 1 }}>{why[row.key]}</span>
              </div>
            ) : null)}
          </div>

          {/* Risk flags */}
          {(angle?.risk_flags || []).length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', marginBottom: 6 }}>⚠ RISK FLAGS</div>
              {(angle.risk_flags || []).map((flag, i) => (
                <div key={i} style={{ fontSize: 11, color: '#E81A1A', opacity: 0.8, lineHeight: 1.7 }}>• {flag}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}