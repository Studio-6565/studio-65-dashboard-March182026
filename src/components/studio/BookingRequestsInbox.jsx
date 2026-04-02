import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const MONO = '"DM Mono", monospace';

const STATUS_STYLE = {
  pending:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '⏳ Pending' },
  reviewing: { bg: 'rgba(74,158,255,0.12)',  color: '#4A9EFF', label: '👀 Reviewing' },
  accepted:  { bg: 'rgba(123,200,83,0.12)',  color: '#7BC853', label: '✓ Accepted' },
  declined:  { bg: 'rgba(232,26,26,0.12)',   color: '#E81A1A', label: '✗ Declined' },
};

export default function BookingRequestsInbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [noteText, setNoteText] = useState({});

  useEffect(() => {
    base44.entities.BookingRequest.list('-created_date', 100).then(r => {
      setRequests(r);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (req, status) => {
    const updated = { ...req, status, studio_note: noteText[req.id] || req.studio_note || '' };
    await base44.entities.BookingRequest.update(req.id, updated);
    setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
    showToast(`Request ${status}`, status === 'accepted' ? 'green' : status === 'declined' ? 'red' : 'blue');
  };

  const saveNote = async (req) => {
    const updated = { ...req, studio_note: noteText[req.id] || '' };
    await base44.entities.BookingRequest.update(req.id, updated);
    setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
    showToast('Note saved', 'blue');
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) return <div style={{ color: '#555', fontFamily: MONO, fontSize: 12, padding: '20px 0' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          Booking Requests
          {pendingCount > 0 && (
            <span style={{ marginLeft: 10, fontFamily: MONO, fontSize: 10, padding: '3px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 700 }}>
              {pendingCount} new
            </span>
          )}
        </div>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#444', fontSize: 13 }}>
          No booking requests yet. Clients can submit them through the client portal.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(req => {
            const st = STATUS_STYLE[req.status] || STATUS_STYLE.pending;
            const isOpen = expandedId === req.id;
            return (
              <div key={req.id} style={{ background: '#1A1A1A', border: `1px solid ${req.status === 'pending' ? 'rgba(245,158,11,0.25)' : '#252525'}`, borderRadius: 12, overflow: 'hidden' }}>
                <div onClick={() => setExpandedId(isOpen ? null : req.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{req.client_name}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', fontFamily: MONO }}>
                      {req.shoot_type || 'Shoot'}{req.project_name ? ` · ${req.project_name}` : ''}
                      {req.preferred_date ? ` · 📅 ${req.preferred_date}` : ''}
                    </div>
                  </div>
                  <span style={{ color: '#444', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #222', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {req.preferred_date && <Detail label="Preferred Date" value={req.preferred_date} />}
                      {req.preferred_date_alt && <Detail label="Alt Date" value={req.preferred_date_alt} />}
                      {req.location && <Detail label="Location" value={req.location} />}
                      {req.budget && <Detail label="Budget" value={req.budget} />}
                    </div>

                    {req.description && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginBottom: 6 }}>Description</div>
                        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{req.description}</div>
                      </div>
                    )}

                    {/* Studio note */}
                    <div>
                      <label style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Internal Note</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          style={{ flex: 1, background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
                          placeholder="Add a note..."
                          value={noteText[req.id] !== undefined ? noteText[req.id] : (req.studio_note || '')}
                          onChange={e => setNoteText(n => ({ ...n, [req.id]: e.target.value }))}
                        />
                        <button onClick={() => saveNote(req)} style={{ padding: '0 14px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Save</button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {req.status !== 'reviewing' && (
                        <button onClick={() => updateStatus(req, 'reviewing')} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(74,158,255,0.15)', color: '#4A9EFF' }}>👀 Mark Reviewing</button>
                      )}
                      {req.status !== 'accepted' && (
                        <button onClick={() => updateStatus(req, 'accepted')} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(123,200,83,0.15)', color: '#7BC853' }}>✓ Accept</button>
                      )}
                      {req.status !== 'declined' && (
                        <button onClick={() => updateStatus(req, 'declined')} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>✗ Decline</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={{ background: '#242424', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}