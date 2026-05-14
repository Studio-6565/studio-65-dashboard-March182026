import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function BrainVersionsPanel({ versions = [], onRestore }) {
  const [expanded, setExpanded] = useState(null);

  if (versions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#333' }}>
        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🕓</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: '#444' }}>No saved versions yet.</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginTop: 6 }}>Every time you click "Save Brain", a snapshot is stored here.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>🕓 Brain History</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{versions.length} snapshot{versions.length !== 1 ? 's' : ''} saved — restore any version</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {versions.map((v, i) => {
          const isOpen = expanded === i;
          return (
            <div key={i} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 10, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isOpen ? <ChevronDown size={13} color="#555" /> : <ChevronRight size={13} color="#555" />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.label || `Version ${versions.length - i}`}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginTop: 2 }}>
                      {new Date(v.saved_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRestore(v.snapshot); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7, color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
                >
                  <RotateCcw size={11} /> Restore
                </button>
              </div>

              {isOpen && v.snapshot && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1A1A1A' }}>
                  <div style={{ marginTop: 10, background: '#0A0A0A', borderRadius: 8, padding: '10px 12px', maxHeight: 200, overflowY: 'auto' }}>
                    <pre style={{ fontFamily: MONO, fontSize: 9, color: '#444', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                      {(() => {
                        try { return JSON.stringify(JSON.parse(v.snapshot), null, 2).slice(0, 1200) + '...'; }
                        catch { return v.snapshot?.slice(0, 400); }
                      })()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}