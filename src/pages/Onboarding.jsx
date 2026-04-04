import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';
const IS = {
  background: '#1E1E1E', border: '1px solid #333', borderRadius: 10,
  padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none',
  width: '100%', fontFamily: 'Syne, sans-serif',
};
const LS = {
  fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase',
  letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 6, display: 'block',
};
const TA = { ...IS, resize: 'vertical', lineHeight: 1.7 };

const TYPE_INFO = {
  Crew: {
    icon: '🎥',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    description: 'Videographers, photographers, sound, lighting, grip & more.',
  },
  Client: {
    icon: '🏢',
    color: '#4A9EFF',
    bg: 'rgba(74,158,255,0.1)',
    border: 'rgba(74,158,255,0.3)',
    description: 'Brands, businesses and individuals looking to book a shoot.',
  },
  Vendor: {
    icon: '🛒',
    color: '#7BC853',
    bg: 'rgba(123,200,83,0.1)',
    border: 'rgba(123,200,83,0.3)',
    description: 'Gear rental companies, studios, suppliers & service providers.',
  },
  Editor: {
    icon: '🎞️',
    color: '#E81A1A',
    bg: 'rgba(232,26,26,0.1)',
    border: 'rgba(232,26,26,0.3)',
    description: 'Video editors, colorists, motion designers & post-production pros.',
  },
  Other: {
    icon: '✨',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.3)',
    description: 'Partners, collaborators, or anyone who doesn\'t fit the above.',
  },
};

function Field({ label, children }) {
  return (
    <div>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

function RateToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, background: '#111', borderRadius: 8, border: '1px solid #333', overflow: 'hidden', marginBottom: 8 }}>
      {['flat', 'hourly'].map(rt => (
        <button key={rt} type="button" onClick={() => onChange(rt)}
          style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: MONO, background: value === rt ? '#E81A1A' : 'transparent', color: value === rt ? '#fff' : '#666' }}>
          {rt === 'flat' ? 'Flat Rate' : 'Hourly'}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState('type'); // 'type' | 'form' | 'done'
  const [contactType, setContactType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: '', notes: '', portal_password: '',
    crew_skills: '', crew_rate: '', crew_rate_type: 'flat', crew_experience: '',
    crew_equipment: '', crew_availability: '', crew_instagram: '', crew_portfolio: '',
    client_company: '', client_project_type: '', client_budget: '', client_timeline: '',
    client_how_found: '', client_brief: '',
    vendor_company: '', vendor_offerings: '', vendor_service_area: '', vendor_website: '',
    editor_software: '', editor_style: '', editor_portfolio: '', editor_rate: '', editor_availability: '',
    other_reason: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    await base44.entities.OnboardingRequest.create({
      ...form,
      contact_type: contactType,
      status: 'pending',
    });
    setStep('done');
    setSubmitting(false);
  };

  const ti = TYPE_INFO[contactType] || {};

  // ── Step 1: Pick type ─────────────────────────────────────────────────────
  if (step === 'type') {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 540 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 56, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Join Studio 65</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>Tell us who you are so we can set up your profile correctly.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <a href="/portal" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '18px 20px', borderRadius: 14, textDecoration: 'none',
              background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)',
              color: '#4A9EFF', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
              🎥 Crew / Client Portal Login →
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(TYPE_INFO).map(([type, info]) => (
              <button
                key={type}
                onClick={() => { setContactType(type); setStep('form'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 20px', borderRadius: 14, cursor: 'pointer',
                  background: '#1A1A1A', border: `1px solid #2A2A2A`,
                  textAlign: 'left', width: '100%',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = info.color + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2A2A2A'}
              >
                <div style={{ fontSize: 32, flexShrink: 0 }}>{info.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3, color: info.color }}>{type}</div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{info.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#333', fontSize: 18 }}>→</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
            <button
              onClick={() => base44.auth.redirectToLogin('/projects')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 20px', borderRadius: 14, cursor: 'pointer',
                background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)',
                color: '#E81A1A', fontSize: 15, fontWeight: 700,
                width: '100%', fontFamily: 'Syne, sans-serif',
              }}
            >
              🔐 Admin Dashboard Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Done ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>You're on the list!</div>
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>
            Thanks {form.name.split(' ')[0]}! Your request has been sent to Studio 65.<br />
            We'll review your profile and send you access details within 24 hours.
          </div>
          {form.portal_password && (
            <div style={{ marginTop: 24, padding: '14px 20px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', marginBottom: 4, textTransform: 'uppercase' }}>Your access code (once approved)</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.1em', color: '#fff' }}>{form.portal_password}</div>
            </div>
          )}
          <a href="/" style={{ display: 'inline-block', marginTop: 28, padding: '12px 28px', background: '#E81A1A', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>← Back to Home</a>
        </div>
      </div>
    );
  }

  // ── Step 2: Form by type ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1A1A1A', padding: '0 20px', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="https://media.base44.com/images/public/69bacd1e4d380f864be78403/3193dc328_Editable_Isotype5copy.png" alt="Studio 65" style={{ height: 26 }} />
          <button onClick={() => setStep('type')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: MONO }}>← Back</button>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
        {/* Type badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: ti.bg, border: `1px solid ${ti.border}`, borderRadius: 20, marginBottom: 24 }}>
          <span style={{ fontSize: 16 }}>{ti.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: ti.color }}>{contactType}</span>
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          {contactType === 'Crew' && 'Join the Crew'}
          {contactType === 'Client' && 'Book with Studio 65'}
          {contactType === 'Vendor' && 'Partner with Us'}
          {contactType === 'Editor' && 'Join as an Editor'}
          {contactType === 'Other' && 'Get in Touch'}
        </div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 32, lineHeight: 1.6 }}>
          {contactType === 'Crew' && 'Fill out your details and we\'ll review your application. We\'ll be in touch if there\'s a fit.'}
          {contactType === 'Client' && 'Tell us about your project and we\'ll reach out to discuss how we can bring it to life.'}
          {contactType === 'Vendor' && 'Share what you offer and we\'ll add you to our rolodex of trusted partners.'}
          {contactType === 'Editor' && 'Tell us about your editing style and experience. We\'ll reach out when there\'s a project match.'}
          {contactType === 'Other' && 'Tell us a bit about yourself and why you\'re reaching out.'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Universal fields ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Full Name *">
                <input style={IS} required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" autoFocus />
              </Field>
            </div>
            <Field label="Email *">
              <input style={IS} type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
            </Field>
            <Field label="Phone / WhatsApp">
              <input style={IS} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 416 555 0100" />
            </Field>
          </div>

          <div style={{ height: 1, background: '#1E1E1E' }} />

          {/* ── Crew-specific ── */}
          {contactType === 'Crew' && (
            <>
              <Field label="Primary Role(s)">
                <input style={IS} value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Videographer, DP, Sound Recordist" />
              </Field>
              <Field label="Skills & Specialties">
                <input style={IS} value={form.crew_skills} onChange={e => set('crew_skills', e.target.value)} placeholder="e.g. Color grading, drone, interviews, run-and-gun" />
              </Field>
              <Field label="Years of Experience">
                <input style={IS} value={form.crew_experience} onChange={e => set('crew_experience', e.target.value)} placeholder="e.g. 3 years" />
              </Field>
              <Field label="Gear You Own">
                <textarea style={{ ...TA, minHeight: 70 }} rows={3} value={form.crew_equipment} onChange={e => set('crew_equipment', e.target.value)} placeholder="List your main equipment (cameras, lenses, accessories...)" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                <Field label="Availability">
                  <input style={IS} value={form.crew_availability} onChange={e => set('crew_availability', e.target.value)} placeholder="e.g. Weekends, weekdays" />
                </Field>
                <Field label="Instagram Handle">
                  <input style={IS} value={form.crew_instagram} onChange={e => set('crew_instagram', e.target.value)} placeholder="@yourhandle" />
                </Field>
              </div>
              <Field label="Portfolio / Website">
                <input style={IS} value={form.crew_portfolio} onChange={e => set('crew_portfolio', e.target.value)} placeholder="https://yourportfolio.com" />
              </Field>
              <div>
                <Field label="Day Rate">
                  <RateToggle value={form.crew_rate_type} onChange={v => set('crew_rate_type', v)} />
                  <input style={IS} value={form.crew_rate} onChange={e => set('crew_rate', e.target.value)} placeholder={form.crew_rate_type === 'hourly' ? 'Hourly rate (e.g. 75)' : 'Day rate (e.g. 500)'} />
                </Field>
              </div>
            </>
          )}

          {/* ── Client-specific ── */}
          {contactType === 'Client' && (
            <>
              <Field label="Company / Brand Name">
                <input style={IS} value={form.client_company} onChange={e => set('client_company', e.target.value)} placeholder="e.g. Acme Corp" />
              </Field>
              <Field label="Type of Project">
                <input style={IS} value={form.client_project_type} onChange={e => set('client_project_type', e.target.value)} placeholder="e.g. Brand video, event coverage, headshots" />
              </Field>
              <Field label="Project Brief">
                <textarea style={{ ...TA, minHeight: 90 }} rows={4} value={form.client_brief} onChange={e => set('client_brief', e.target.value)} placeholder="Describe your project, goals, style references, audience..." />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                <Field label="Estimated Budget">
                  <input style={IS} value={form.client_budget} onChange={e => set('client_budget', e.target.value)} placeholder="e.g. $2,000–$5,000" />
                </Field>
                <Field label="Ideal Timeline">
                  <input style={IS} value={form.client_timeline} onChange={e => set('client_timeline', e.target.value)} placeholder="e.g. End of April 2026" />
                </Field>
              </div>
              <Field label="How did you hear about us?">
                <input style={IS} value={form.client_how_found} onChange={e => set('client_how_found', e.target.value)} placeholder="e.g. Instagram, referral from a friend" />
              </Field>
            </>
          )}

          {/* ── Vendor-specific ── */}
          {contactType === 'Vendor' && (
            <>
              <Field label="Company Name">
                <input style={IS} value={form.vendor_company} onChange={e => set('vendor_company', e.target.value)} placeholder="e.g. Toronto Lens Rentals" />
              </Field>
              <Field label="What Do You Offer?">
                <textarea style={{ ...TA, minHeight: 80 }} rows={3} value={form.vendor_offerings} onChange={e => set('vendor_offerings', e.target.value)} placeholder="List gear, services, studio space, etc. with rough pricing if possible..." />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                <Field label="Service Area">
                  <input style={IS} value={form.vendor_service_area} onChange={e => set('vendor_service_area', e.target.value)} placeholder="e.g. GTA, Toronto" />
                </Field>
                <Field label="Website">
                  <input style={IS} value={form.vendor_website} onChange={e => set('vendor_website', e.target.value)} placeholder="https://yoursite.com" />
                </Field>
              </div>
            </>
          )}

          {/* ── Editor-specific ── */}
          {contactType === 'Editor' && (
            <>
              <Field label="Editing Software">
                <input style={IS} value={form.editor_software} onChange={e => set('editor_software', e.target.value)} placeholder="e.g. Premiere Pro, DaVinci Resolve, Final Cut" />
              </Field>
              <Field label="Editing Style">
                <input style={IS} value={form.editor_style} onChange={e => set('editor_style', e.target.value)} placeholder="e.g. Fast-paced, cinematic, documentary, wedding" />
              </Field>
              <Field label="Portfolio / Showreel">
                <input style={IS} value={form.editor_portfolio} onChange={e => set('editor_portfolio', e.target.value)} placeholder="https://vimeo.com/yourshowreel" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                <Field label="Day / Project Rate">
                  <input style={IS} value={form.editor_rate} onChange={e => set('editor_rate', e.target.value)} placeholder="e.g. $300/day or $500/project" />
                </Field>
                <Field label="Availability">
                  <input style={IS} value={form.editor_availability} onChange={e => set('editor_availability', e.target.value)} placeholder="e.g. Weekends, full-time, freelance" />
                </Field>
              </div>
            </>
          )}

          {/* ── Other ── */}
          {contactType === 'Other' && (
            <Field label="Why are you reaching out?">
              <textarea style={{ ...TA, minHeight: 100 }} rows={4} value={form.other_reason} onChange={e => set('other_reason', e.target.value)} placeholder="Tell us a bit about who you are and what you're looking for..." />
            </Field>
          )}

          {/* ── Notes (all types) ── */}
          <Field label="Anything else we should know?">
            <textarea style={{ ...TA, minHeight: 60 }} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional — any extra context..." />
          </Field>

          <div style={{ height: 1, background: '#1E1E1E' }} />

          {/* ── Portal access code ── */}
          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Portal Access (optional)</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
              Choose a personal access code for your {contactType === 'Client' ? 'client portal' : 'crew portal'}. You can log in at any time to see your projects and updates.
            </div>
            <Field label="Choose a code (e.g. yourname2025)">
              <input style={IS} value={form.portal_password} onChange={e => set('portal_password', e.target.value)} placeholder="Leave blank to skip for now" />
            </Field>
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.email.trim()}
            style={{
              width: '100%', padding: '16px 0',
              background: (submitting || !form.name.trim() || !form.email.trim()) ? '#2A2A2A' : '#E81A1A',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              opacity: (submitting || !form.name.trim() || !form.email.trim()) ? 0.5 : 1,
            }}
          >
            {submitting ? 'Submitting...' : `Submit My ${contactType} Profile →`}
          </button>
        </form>
      </main>
    </div>
  );
}