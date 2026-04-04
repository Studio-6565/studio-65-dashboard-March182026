import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import SignaturePad from '@/components/studio/SignaturePad';

const MONO = '"DM Mono", monospace';

const STATUS_STYLE = {
  draft:    { bg: 'rgba(100,100,100,0.15)', color: '#666',    label: 'Draft' },
  sent:     { bg: 'rgba(74,158,255,0.12)',  color: '#4A9EFF', label: 'Awaiting Signature' },
  signed:   { bg: 'rgba(123,200,83,0.15)',  color: '#7BC853', label: 'Signed' },
  declined: { bg: 'rgba(232,26,26,0.12)',   color: '#E81A1A', label: 'Declined' },
};

function ContractViewer({ contract, onSign, onDecline, onBack }) {
  const [signName, setSignName]       = useState('');
  const [declineReason, setReason]    = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [saving, setSaving]           = useState(false);

  const st = STATUS_STYLE[contract.status] || STATUS_STYLE.draft;
  const canAct = contract.status === 'sent';

  const handleSign = async () => {
    if (!signName.trim()) return;
    setSaving(true);
    await onSign(contract, signName.trim());
    setSaving(false);
  };

  const handleDecline = async () => {
    setSaving(true);
    await onDecline(contract, declineReason.trim());
    setSaving(false);
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 20 }}>← Back to Contracts</button>

      {/* Header */}
      <div style={{ background: '#1A1A1A', border: '1px solid #252525', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{contract.title}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, fontFamily: MONO, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
              {contract.project_name && <span style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>📁 {contract.project_name}</span>}
              {contract.sent_at && <span style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>Sent {new Date(contract.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            </div>
          </div>
          {contract.signed_at && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#7BC853', fontWeight: 700 }}>✓ Signed by {contract.signature_name}</div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>{new Date(contract.signed_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Contract body */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 14, padding: '24px', marginBottom: 20, whiteSpace: 'pre-wrap', fontFamily: MONO, fontSize: 12, lineHeight: 1.9, color: '#bbb', maxHeight: 480, overflowY: 'auto' }}>
        {contract.body || '(No contract body)'}
      </div>

      {/* Action area */}
      {canAct && (
        <div style={{ background: '#1A1A1A', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>✍️ Your Signature Required</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>Sign below — draw your signature or type your name. Either is legally binding.</div>

          {!showDecline ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <SignaturePad value={signName} onChange={setSignName} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSign}
                  disabled={saving || !signName.trim()}
                  style={{ flex: 1, padding: '14px 0', background: '#7BC853', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: !signName.trim() ? 0.5 : 1 }}
                >{saving ? 'Signing...' : '✓ Sign Contract'}</button>
                <button
                  onClick={() => setShowDecline(true)}
                  style={{ padding: '14px 20px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', borderRadius: 10, color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >Decline</button>
              </div>
            </>
          ) : (
            <div>
              <textarea
                rows={3}
                value={declineReason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for declining (optional)..."
                style={{ background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', resize: 'none', marginBottom: 12, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleDecline} disabled={saving} style={{ flex: 1, padding: '13px 0', background: 'rgba(232,26,26,0.15)', border: '1px solid rgba(232,26,26,0.4)', borderRadius: 10, color: '#E81A1A', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? '...' : 'Confirm Decline'}
                </button>
                <button onClick={() => setShowDecline(false)} style={{ padding: '13px 20px', background: '#222', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {contract.status === 'signed' && (
        <div style={{ padding: '16px 20px', background: 'rgba(123,200,83,0.06)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7BC853' }}>✓ This contract has been signed</div>
          <div style={{ fontSize: 12, color: '#666', fontFamily: MONO, marginTop: 4 }}>Signed by {contract.signature_name} on {new Date(contract.signed_at).toLocaleDateString()}</div>
        </div>
      )}

      {contract.status === 'declined' && (
        <div style={{ padding: '16px 20px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E81A1A' }}>✗ Contract Declined</div>
          {contract.decline_reason && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{contract.decline_reason}</div>}
        </div>
      )}
    </div>
  );
}

export default function ClientContractsTab({ contracts, contact, onContractsChange }) {
  const [viewing, setViewing] = useState(null);

  const handleSign = async (contract, signName) => {
    const updated = {
      ...contract,
      status: 'signed',
      signature_name: signName,
      signed_at: new Date().toISOString(),
    };
    await base44.entities.Contract.update(contract.id, updated);
    onContractsChange(prev => prev.map(c => c.id === contract.id ? updated : c));
    setViewing(updated);
  };

  const handleDecline = async (contract, reason) => {
    const updated = {
      ...contract,
      status: 'declined',
      decline_reason: reason,
      declined_at: new Date().toISOString(),
    };
    await base44.entities.Contract.update(contract.id, updated);
    onContractsChange(prev => prev.map(c => c.id === contract.id ? updated : c));
    setViewing(updated);
  };

  if (viewing) {
    return (
      <ContractViewer
        contract={viewing}
        onSign={handleSign}
        onDecline={handleDecline}
        onBack={() => setViewing(null)}
      />
    );
  }

  // Only show sent/signed/declined — not drafts
  const visible = contracts.filter(c => c.status !== 'draft');
  const pending  = visible.filter(c => c.status === 'sent').length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Contracts</div>
        <div style={{ fontSize: 13, color: '#555' }}>
          {visible.length === 0 ? 'No contracts yet.' : `${visible.length} contract${visible.length !== 1 ? 's' : ''}${pending ? ` · ${pending} awaiting your signature` : ''}`}
        </div>
      </div>

      {pending > 0 && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(74,158,255,0.07)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>✍️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4A9EFF' }}>{pending} contract{pending !== 1 ? 's' : ''} awaiting your signature</div>
            <div style={{ fontSize: 12, color: '#666' }}>Please review and sign below</div>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>📄</div>
          <div style={{ fontSize: 14, color: '#666' }}>No contracts have been sent to you yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(c => {
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
            return (
              <button
                key={c.id}
                onClick={() => setViewing(c)}
                style={{ width: '100%', textAlign: 'left', background: '#1A1A1A', border: `1px solid ${c.status === 'sent' ? 'rgba(74,158,255,0.3)' : '#252525'}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: '#fff' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>
                      {c.project_name && `${c.project_name} · `}
                      {c.sent_at && `Sent ${new Date(c.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </div>
                  </div>
                  <span style={{ color: '#444', fontSize: 16, flexShrink: 0 }}>→</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}