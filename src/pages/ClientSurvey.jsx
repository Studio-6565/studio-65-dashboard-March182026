import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

function Star({ filled, onClick, size = 32 }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px', fontSize: size }}>
      <span style={{ color: filled ? '#F59E0B' : '#333', transition: 'color 0.15s' }}>★</span>
    </button>
  );
}

function StarRow({ label, value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: 32, lineHeight: 1 }}
          >
            <span style={{ color: n <= (hover || value) ? '#F59E0B' : '#2A2A2A', transition: 'color 0.1s' }}>★</span>
          </button>
        ))}
        {value > 0 && <span style={{ fontFamily: MONO, fontSize: 11, color: '#555', marginLeft: 8, alignSelf: 'center' }}>{value}/5</span>}
      </div>
    </div>
  );
}

export default function ClientSurveyPage() {
  const params = new URLSearchParams(window.location.search);
  const surveyId = params.get('id');

  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    overall_rating: 0,
    communication_rating: 0,
    quality_rating: 0,
    turnaround_rating: 0,
    would_recommend: null,
    favorite_part: '',
    improvement: '',
    testimonial: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!surveyId) { setLoading(false); return; }
    base44.entities.ClientSurvey.filter({ id: surveyId }).then(res => {
      const s = res?.[0];
      if (s) {
        setSurvey(s);
        if (s.status === 'completed') setSubmitted(true);
      }
      setLoading(false);
    });
  }, [surveyId]);

  const handleSubmit = async () => {
    if (!form.overall_rating) return;
    setSubmitting(true);
    const updated = {
      ...survey,
      ...form,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    await base44.entities.ClientSurvey.update(surveyId, updated);
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#444', fontFamily: MONO, fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  if (!surveyId || !survey) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', color: '#444' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <div style={{ fontSize: 15, color: '#666' }}>Survey not found or link expired.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Syne, sans-serif', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #111', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 26 }} />
        <div style={{ width: 1, height: 18, background: '#1E1E1E' }} />
        <span style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>Project Feedback</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🙏</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>Thank you!</div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.8, maxWidth: 320, margin: '0 auto' }}>
              Your feedback means a lot to us. We'll use it to keep improving our work.
            </div>
            {survey?.project_name && (
              <div style={{ marginTop: 24, padding: '14px 20px', background: '#111', border: '1px solid #1E1E1E', borderRadius: 14, display: 'inline-block' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Project</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{survey.project_name}</div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Studio 65
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>
                How did we do,<br />{survey.client_name?.split(' ')[0]}?
              </div>
              {survey.project_name && (
                <div style={{ fontSize: 13, color: '#555', fontFamily: MONO }}>Project: {survey.project_name}</div>
              )}
            </div>

            {/* Star ratings */}
            <div style={{ background: '#0D0D0D', border: '1px solid #111', borderRadius: 16, padding: '24px 20px', marginBottom: 16 }}>
              <StarRow label="Overall Experience" value={form.overall_rating} onChange={v => setForm(f => ({ ...f, overall_rating: v }))} />
              <StarRow label="Communication" value={form.communication_rating} onChange={v => setForm(f => ({ ...f, communication_rating: v }))} />
              <StarRow label="Creative Quality" value={form.quality_rating} onChange={v => setForm(f => ({ ...f, quality_rating: v }))} />
              <StarRow label="Turnaround Time" value={form.turnaround_rating} onChange={v => setForm(f => ({ ...f, turnaround_rating: v }))} />
            </div>

            {/* Would recommend */}
            <div style={{ background: '#0D0D0D', border: '1px solid #111', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                Would you recommend Studio 65?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ val: true, label: '👍 Yes, definitely!', color: '#7BC853' }, { val: false, label: '👎 Not right now', color: '#E81A1A' }].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setForm(f => ({ ...f, would_recommend: opt.val }))}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', border: `1px solid ${form.would_recommend === opt.val ? opt.color + '60' : '#1A1A1A'}`,
                      background: form.would_recommend === opt.val ? opt.color + '18' : '#111',
                      color: form.would_recommend === opt.val ? opt.color : '#555',
                      transition: 'all 0.15s',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Open questions */}
            <div style={{ background: '#0D0D0D', border: '1px solid #111', borderRadius: 16, padding: '20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'favorite_part', label: 'What was your favourite part?', placeholder: 'The editing style, communication, turnaround...' },
                { key: 'improvement', label: 'What could we improve?', placeholder: 'Anything we can do better next time...' },
                { key: 'testimonial', label: 'Leave a testimonial (optional)', placeholder: 'We\'d love to share your words with others...' },
              ].map(q => (
                <div key={q.key}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{q.label}</div>
                  <textarea
                    rows={3}
                    value={form[q.key]}
                    onChange={e => setForm(f => ({ ...f, [q.key]: e.target.value }))}
                    placeholder={q.placeholder}
                    style={{ width: '100%', background: '#111', border: '1px solid #1A1A1A', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Syne, sans-serif', lineHeight: 1.6, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.overall_rating}
              style={{
                width: '100%', padding: '16px 0', background: '#E81A1A', border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 15, fontWeight: 800, cursor: !form.overall_rating ? 'default' : 'pointer',
                opacity: !form.overall_rating ? 0.5 : 1, letterSpacing: '-0.01em',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback →'}
            </button>
            {!form.overall_rating && (
              <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 8 }}>
                Please rate your overall experience to submit
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}