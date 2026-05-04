import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

function Stars({ value, max = 5 }) {
  return (
    <span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? '#F59E0B' : '#2A2A2A', fontSize: 14 }}>★</span>
      ))}
      <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginLeft: 5 }}>{value}/{max}</span>
    </span>
  );
}

function avgRating(surveys, key) {
  const vals = surveys.filter(s => s[key] > 0).map(s => s[key]);
  if (!vals.length) return 0;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export default function SurveyResultsPanel() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    base44.entities.ClientSurvey.list('-created_date', 100).then(s => {
      setSurveys(s);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ color: '#555', fontFamily: MONO, fontSize: 11, padding: 20 }}>Loading surveys...</div>;

  const completed = surveys.filter(s => s.status === 'completed');
  const pending = surveys.filter(s => s.status === 'sent');

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Client Satisfaction</div>
        <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>{completed.length} completed · {pending.length} pending</div>
      </div>

      {/* Aggregate stats */}
      {completed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Overall', key: 'overall_rating' },
            { label: 'Communication', key: 'communication_rating' },
            { label: 'Quality', key: 'quality_rating' },
            { label: 'Turnaround', key: 'turnaround_rating' },
          ].map(({ label, key }) => (
            <div key={key} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>{avgRating(completed, key)}</div>
              <div style={{ fontSize: 9, color: '#444', fontFamily: MONO, marginTop: 2 }}>out of 5</div>
            </div>
          ))}
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Would Recommend</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#7BC853' }}>
              {Math.round(completed.filter(s => s.would_recommend === true).length / completed.length * 100)}%
            </div>
            <div style={{ fontSize: 9, color: '#444', fontFamily: MONO, marginTop: 2 }}>of clients</div>
          </div>
        </div>
      )}

      {surveys.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
          <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 14 }}>📊</div>
          <div style={{ fontSize: 14, color: '#555' }}>No surveys yet. Send one when marking deliverables ready.</div>
        </div>
      )}

      {/* Survey list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {surveys.map(s => (
          <div key={s.id} style={{ background: '#1A1A1A', border: `1px solid ${s.status === 'completed' ? '#1E1E1E' : 'rgba(74,158,255,0.2)'}`, borderRadius: 14, overflow: 'hidden' }}>
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: MONO, fontWeight: 700, background: s.status === 'completed' ? 'rgba(123,200,83,0.15)' : 'rgba(74,158,255,0.12)', color: s.status === 'completed' ? '#7BC853' : '#4A9EFF' }}>
                    {s.status === 'completed' ? 'Completed' : 'Awaiting'}
                  </span>
                  {s.status === 'completed' && s.overall_rating > 0 && <Stars value={s.overall_rating} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.client_name}</div>
                <div style={{ fontSize: 11, color: '#555', fontFamily: MONO, marginTop: 2 }}>{s.project_name}</div>
              </div>
              <span style={{ color: '#444', fontSize: 12 }}>{expanded === s.id ? '▲' : '▼'}</span>
            </button>

            {expanded === s.id && s.status === 'completed' && (
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid #111' }}>
                <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Ratings */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Communication', key: 'communication_rating' },
                      { label: 'Quality', key: 'quality_rating' },
                      { label: 'Turnaround', key: 'turnaround_rating' },
                      { label: 'Would Recommend', key: null },
                    ].map(({ label, key }) => (
                      <div key={label} style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        {key ? <Stars value={s[key] || 0} /> : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: s.would_recommend ? '#7BC853' : '#E81A1A' }}>
                            {s.would_recommend === true ? '👍 Yes' : s.would_recommend === false ? '👎 No' : '—'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Text answers */}
                  {[
                    { key: 'favorite_part', label: '❤️ Favourite Part' },
                    { key: 'improvement', label: '🔧 Improvement' },
                    { key: 'testimonial', label: '💬 Testimonial' },
                  ].filter(({ key }) => s[key]).map(({ key, label }) => (
                    <div key={key} style={{ background: '#111', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>"{s[key]}"</div>
                    </div>
                  ))}

                  {s.completed_at && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', textAlign: 'right' }}>
                      Submitted {new Date(s.completed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {expanded === s.id && s.status === 'sent' && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#555' }}>Survey sent — waiting for client to respond.</div>
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/client-survey?id=${s.id}`;
                    navigator.clipboard?.writeText(url);
                    alert('Survey link copied:\n' + url);
                  }}
                  style={{ padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #333', background: '#111', color: '#666', fontFamily: MONO }}
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}