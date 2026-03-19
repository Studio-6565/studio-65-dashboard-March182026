import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '../StudioToast';

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 0, color: s <= (hover || value) ? '#F59E0B' : '#444', transition: 'color 0.1s' }}
        >★</button>
      ))}
    </div>
  );
}

export default function CrewRatingsTab({ project, contacts, onContactsChange }) {
  const p = project;
  const crew = p.crew || [];
  const [ratings, setRatings] = useState({});
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState({});

  const getExistingRating = (crewMember) => {
    const contact = (contacts || []).find(c => c.name.toLowerCase() === crewMember.name.toLowerCase());
    if (!contact) return null;
    return (contact.ratings || []).find(r => r.project_id === p.project_id);
  };

  const handleSaveRating = async (c) => {
    const stars = ratings[c.name];
    if (!stars) { showToast('Select a star rating first', 'red'); return; }
    const contact = (contacts || []).find(ct => ct.name.toLowerCase() === c.name.toLowerCase());
    if (!contact) { showToast(`${c.name} not found in Contacts`, 'amber'); return; }

    setSaving(s => ({ ...s, [c.name]: true }));
    const existingRatings = (contact.ratings || []).filter(r => r.project_id !== p.project_id);
    const newRating = {
      project_id: p.project_id,
      project_name: p.name,
      stars,
      note: notes[c.name] || '',
      date: new Date().toISOString().split('T')[0],
    };
    const updatedRatings = [...existingRatings, newRating];
    await base44.entities.Contact.update(contact.id, { ...contact, ratings: updatedRatings });
    onContactsChange((contacts || []).map(ct => ct.id === contact.id ? { ...ct, ratings: updatedRatings } : ct));
    showToast(`${c.name} rated ${stars}★`, 'green');
    setSaving(s => ({ ...s, [c.name]: false }));
  };

  const avgRating = (crewMember) => {
    const contact = (contacts || []).find(c => c.name.toLowerCase() === crewMember.name.toLowerCase());
    if (!contact || !(contact.ratings || []).length) return null;
    const avg = contact.ratings.reduce((s, r) => s + r.stars, 0) / contact.ratings.length;
    return avg.toFixed(1);
  };

  if (!crew.length) {
    return <div style={{ color: '#555', fontSize: 13, padding: '20px 0' }}>No crew members on this project yet.</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
        Rate crew for this shoot — private notes only
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {crew.map((c, i) => {
          const existing = getExistingRating(c);
          const avg = avgRating(c);
          return (
            <div key={i} style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>{c.role}</div>
                </div>
                {avg && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Overall Avg</div>
                    <div style={{ fontSize: 16, color: '#F59E0B', fontWeight: 700 }}>{avg}★</div>
                  </div>
                )}
              </div>

              {existing && (
                <div style={{ background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#7BC853', textTransform: 'uppercase', marginBottom: 4 }}>Rated for this shoot</div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 16, color: s <= existing.stars ? '#F59E0B' : '#444' }}>★</span>)}
                  </div>
                  {existing.note && <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>{existing.note}</div>}
                </div>
              )}

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>{existing ? 'Update Rating' : 'Rate This Shoot'}</div>
                <StarRating value={ratings[c.name] || 0} onChange={v => setRatings(r => ({ ...r, [c.name]: v }))} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <textarea
                  rows={2}
                  value={notes[c.name] || ''}
                  onChange={e => setNotes(n => ({ ...n, [c.name]: e.target.value }))}
                  placeholder="Private note — e.g. great attitude, arrived late, would book again..."
                  style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', resize: 'none', fontFamily: 'Syne, sans-serif' }}
                />
              </div>
              <button
                onClick={() => handleSaveRating(c)}
                disabled={saving[c.name]}
                style={{ padding: '6px 16px', background: '#E81A1A', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving[c.name] ? 0.7 : 1 }}
              >
                {saving[c.name] ? 'Saving...' : existing ? 'Update Rating' : 'Save Rating'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}