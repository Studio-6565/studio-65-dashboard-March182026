import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#0D0D0D', border: '1px solid #222', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LABEL = { fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, display: 'block' };

const SHOOT_TYPES = ['Social media content','Event coverage','Podcast production','Real estate media','Product photography','Brand campaign','Corporate video','Paid ad creative','Website content','Other'];
const PLATFORMS = ['Instagram','TikTok','YouTube','LinkedIn','Website','Meta Ads','Google Ads','Email','Other'];
const DELIVERABLE_OPTS = ['Edited reels','Edited TikToks','YouTube Shorts','Long-form video','Photo gallery','Podcast clips','Event recap','Product photos','Ad creatives','Website assets','Raw footage','Other'];
const BUDGET_OPTS = ['Under $1,000','$1,000–$2,500','$2,500–$5,000','$5,000–$10,000','$10,000+','Not sure yet'];

const STEPS = ['Shoot Type','Project Goal','Dates','Location','Creative','Deliverables','Budget','Review'];

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? 'rgba(232,26,26,0.5)' : '#252525'}`, background: active ? 'rgba(232,26,26,0.1)' : '#0D0D0D', color: active ? '#E81A1A' : '#666', transition: 'all 0.15s', fontFamily: MONO }}>
      {label}
    </button>
  );
}

function ReviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #141414' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', width: 110, flexShrink: 0, paddingTop: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#ccc', flex: 1, lineHeight: 1.5 }}>{Array.isArray(value) ? value.join(', ') : value}</div>
    </div>
  );
}

export default function ShootRequestModal({ contact, projects, onClose, onSubmitted }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    shoot_types: [],
    goal: '', campaign_name: '', audience: '', platforms: [], cta: '', offer: '', inspo: '', notes: '',
    preferred_date: '', backup_date1: '', backup_date2: '', time_window: '', flexible: '', urgent: '',
    venue: '', address: '', city: '', parking: '', room: '', indoor_outdoor: '', permits: '',
    onsite_name: '', onsite_phone: '', onsite_email: '',
    what_captured: '', on_camera: '', must_haves: '', avoid: '', media_type: [], audio: '', lighting: '', drone: '', same_day: '', creative_direction: '',
    deliverables: [],
    budget: '', hard_deadline: '', turnaround: '', tied_to_event: '', need_quote: '', billing_notes: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggle = (key, val) => setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] }));

  const handleSubmit = async () => {
    setSubmitting(true);
    await base44.entities.BookingRequest.create({
      client_name: contact.name,
      project_name: form.campaign_name || form.shoot_types.join(', ') || 'Shoot Request',
      shoot_type: form.shoot_types.join(', '),
      preferred_date: form.preferred_date,
      preferred_date_alt: form.backup_date1,
      location: [form.venue, form.address, form.city].filter(Boolean).join(', '),
      description: [
        form.goal && `Goal: ${form.goal}`,
        form.audience && `Audience: ${form.audience}`,
        form.platforms.length && `Platforms: ${form.platforms.join(', ')}`,
        form.what_captured && `What to capture: ${form.what_captured}`,
        form.deliverables.length && `Deliverables: ${form.deliverables.join(', ')}`,
        form.notes && `Notes: ${form.notes}`,
      ].filter(Boolean).join('\n'),
      budget: form.budget,
      status: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
    if (onSubmitted) onSubmitted();
  };

  if (submitted) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#080808', border: '1px solid #1E1E1E', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={28} color="#7BC853" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Request Sent!</div>
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.8, marginBottom: 28 }}>
            Your shoot request has been sent to Studio 65. We'll review the details and follow up to confirm availability, pricing, and next steps.
          </div>
          <button onClick={onClose} style={{ width: '100%', padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const stepContent = () => {
    switch (step) {
      case 0: return (
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>What type of shoot do you need?</div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>Select all that apply</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SHOOT_TYPES.map(t => <Chip key={t} label={t} active={form.shoot_types.includes(t)} onClick={() => toggle('shoot_types', t)} />)}
          </div>
        </div>
      );
      case 1: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>What are you trying to accomplish?</div>
          <div><label style={LABEL}>Main Goal</label><input style={IS} placeholder="e.g. Drive sign-ups for our summer campaign" value={form.goal} onChange={e => set('goal', e.target.value)} /></div>
          <div><label style={LABEL}>Campaign Name (optional)</label><input style={IS} placeholder="e.g. Summer 2026" value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} /></div>
          <div><label style={LABEL}>Target Audience</label><input style={IS} placeholder="e.g. Women 25–40, Toronto" value={form.audience} onChange={e => set('audience', e.target.value)} /></div>
          <div>
            <label style={LABEL}>Platforms</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map(p => <Chip key={p} label={p} active={form.platforms.includes(p)} onClick={() => toggle('platforms', p)} />)}
            </div>
          </div>
          <div><label style={LABEL}>Main Call-to-Action</label><input style={IS} placeholder="e.g. Visit our website, book a consultation" value={form.cta} onChange={e => set('cta', e.target.value)} /></div>
          <div><label style={LABEL}>Inspiration / References (optional)</label><input style={IS} placeholder="Links, brands you love, mood..." value={form.inspo} onChange={e => set('inspo', e.target.value)} /></div>
          <div><label style={LABEL}>Additional Notes</label><textarea style={{ ...IS, resize: 'none' }} rows={3} placeholder="Anything else we should know..." value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
      );
      case 2: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>When would you like to shoot?</div>
          <div style={{ padding: '12px 16px', background: 'rgba(74,158,255,0.05)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 12, fontSize: 13, color: '#4A9EFF', lineHeight: 1.7 }}>
            ℹ️ Submitting this request does not confirm your shoot date. Studio 65 will review availability and follow up to confirm.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Preferred Date</label><input type="date" style={IS} value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} /></div>
            <div><label style={LABEL}>Backup Date 1</label><input type="date" style={IS} value={form.backup_date1} onChange={e => set('backup_date1', e.target.value)} /></div>
            <div><label style={LABEL}>Backup Date 2</label><input type="date" style={IS} value={form.backup_date2} onChange={e => set('backup_date2', e.target.value)} /></div>
            <div><label style={LABEL}>Preferred Time Window</label><input style={IS} placeholder="e.g. 9am–1pm" value={form.time_window} onChange={e => set('time_window', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>Is the date flexible?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Yes','No'].map(v => <Chip key={v} label={v} active={form.flexible === v} onClick={() => set('flexible', v)} />)}
              </div>
            </div>
            <div>
              <label style={LABEL}>Is this urgent?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Yes','No'].map(v => <Chip key={v} label={v} active={form.urgent === v} onClick={() => set('urgent', v)} />)}
              </div>
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Where is the shoot?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Venue / Business Name</label><input style={IS} placeholder="e.g. The Drake Hotel" value={form.venue} onChange={e => set('venue', e.target.value)} /></div>
            <div><label style={LABEL}>City</label><input style={IS} placeholder="e.g. Toronto" value={form.city} onChange={e => set('city', e.target.value)} /></div>
          </div>
          <div><label style={LABEL}>Address</label><input style={IS} placeholder="Street address" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Room / Unit</label><input style={IS} placeholder="e.g. Suite 302" value={form.room} onChange={e => set('room', e.target.value)} /></div>
            <div>
              <label style={LABEL}>Indoor or Outdoor?</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Indoor','Outdoor','Both'].map(v => <Chip key={v} label={v} active={form.indoor_outdoor === v} onClick={() => set('indoor_outdoor', v)} />)}
              </div>
            </div>
          </div>
          <div><label style={LABEL}>Parking Notes</label><input style={IS} placeholder="e.g. Street parking available" value={form.parking} onChange={e => set('parking', e.target.value)} /></div>
          <div><label style={LABEL}>On-Site Contact Name</label><input style={IS} value={form.onsite_name} onChange={e => set('onsite_name', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>On-Site Phone</label><input style={IS} value={form.onsite_phone} onChange={e => set('onsite_phone', e.target.value)} /></div>
            <div><label style={LABEL}>On-Site Email</label><input style={IS} type="email" value={form.onsite_email} onChange={e => set('onsite_email', e.target.value)} /></div>
          </div>
        </div>
      );
      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Creative details</div>
          <div><label style={LABEL}>What needs to be captured?</label><textarea style={{ ...IS, resize: 'none' }} rows={2} placeholder="Key moments, products, spaces..." value={form.what_captured} onChange={e => set('what_captured', e.target.value)} /></div>
          <div><label style={LABEL}>Who / What is on camera?</label><input style={IS} placeholder="e.g. CEO, product line, event guests" value={form.on_camera} onChange={e => set('on_camera', e.target.value)} /></div>
          <div><label style={LABEL}>Must-have shots</label><input style={IS} placeholder="Shots you definitely need" value={form.must_haves} onChange={e => set('must_haves', e.target.value)} /></div>
          <div><label style={LABEL}>Shots to avoid</label><input style={IS} placeholder="Anything off-limits" value={form.avoid} onChange={e => set('avoid', e.target.value)} /></div>
          <div>
            <label style={LABEL}>Media Type Needed</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Photo','Video','Both'].map(v => <Chip key={v} label={v} active={form.media_type.includes(v)} onClick={() => toggle('media_type', v)} />)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Audio needed?','audio'],['Lighting needed?','lighting'],['Drone needed?','drone'],['Same-day edits?','same_day'],['Creative direction from Studio 65?','creative_direction']].map(([lbl, key]) => (
              <div key={key}>
                <label style={LABEL}>{lbl}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Yes','No'].map(v => <Chip key={v} label={v} active={form[key] === v} onClick={() => set(key, v)} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 5: return (
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>What final assets do you need?</div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>Select all that apply</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DELIVERABLE_OPTS.map(d => <Chip key={d} label={d} active={form.deliverables.includes(d)} onClick={() => toggle('deliverables', d)} />)}
          </div>
        </div>
      );
      case 6: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Budget & Timeline</div>
          <div>
            <label style={LABEL}>Estimated Budget</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {BUDGET_OPTS.map(b => <Chip key={b} label={b} active={form.budget === b} onClick={() => set('budget', b)} />)}
            </div>
          </div>
          <div><label style={LABEL}>Desired Turnaround Time</label><input style={IS} placeholder="e.g. Within 7 days" value={form.turnaround} onChange={e => set('turnaround', e.target.value)} /></div>
          <div>
            <label style={LABEL}>Is this tied to a launch or event date?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Yes','No'].map(v => <Chip key={v} label={v} active={form.tied_to_event === v} onClick={() => set('tied_to_event', v)} />)}
            </div>
          </div>
          <div>
            <label style={LABEL}>Do you need a quote before confirming?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Yes','No'].map(v => <Chip key={v} label={v} active={form.need_quote === v} onClick={() => set('need_quote', v)} />)}
            </div>
          </div>
          <div><label style={LABEL}>Billing Notes (optional)</label><input style={IS} placeholder="e.g. Net 30, purchase order required" value={form.billing_notes} onChange={e => set('billing_notes', e.target.value)} /></div>
        </div>
      );
      case 7: return (
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Review your request</div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>Check everything looks right before sending.</div>
          <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 16, padding: '4px 16px', marginBottom: 20 }}>
            <ReviewRow label="Shoot Type" value={form.shoot_types} />
            <ReviewRow label="Goal" value={form.goal} />
            <ReviewRow label="Campaign" value={form.campaign_name} />
            <ReviewRow label="Audience" value={form.audience} />
            <ReviewRow label="Platforms" value={form.platforms} />
            <ReviewRow label="Preferred Date" value={form.preferred_date} />
            <ReviewRow label="Backup Dates" value={[form.backup_date1, form.backup_date2].filter(Boolean).join(' / ')} />
            <ReviewRow label="Time Window" value={form.time_window} />
            <ReviewRow label="Flexible" value={form.flexible} />
            <ReviewRow label="Urgent" value={form.urgent} />
            <ReviewRow label="Location" value={[form.venue, form.address, form.city].filter(Boolean).join(', ')} />
            <ReviewRow label="Media Type" value={form.media_type} />
            <ReviewRow label="Deliverables" value={form.deliverables} />
            <ReviewRow label="Budget" value={form.budget} />
            <ReviewRow label="Turnaround" value={form.turnaround} />
            <ReviewRow label="Notes" value={form.notes} />
          </div>
          <div style={{ padding: '14px 16px', background: 'rgba(74,158,255,0.04)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 12, fontSize: 13, color: '#4A9EFF', lineHeight: 1.7, marginBottom: 20 }}>
            ℹ️ Your request doesn't confirm a booking. Studio 65 will follow up to confirm availability, pricing, and next steps.
          </div>
        </div>
      );
      default: return null;
    }
  };

  const canNext = () => {
    if (step === 0) return form.shoot_types.length > 0;
    return true;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #111', background: '#080808', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </div>
          {/* Progress bar */}
          <div style={{ width: 180, height: 3, background: '#1A1A1A', borderRadius: 2 }}>
            <div style={{ width: `${((step + 1) / STEPS.length) * 100}%`, height: '100%', background: '#E81A1A', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#111', border: '1px solid #1E1E1E', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {stepContent()}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #111', background: '#080808', display: 'flex', gap: 10, flexShrink: 0 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ padding: '14px 20px', background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, color: '#888', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{ flex: 1, padding: '14px 0', background: canNext() ? '#E81A1A' : '#1A1A1A', border: 'none', borderRadius: 12, color: canNext() ? '#fff' : '#444', fontSize: 15, fontWeight: 700, cursor: canNext() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {submitting ? 'Sending...' : 'Submit Request'}
          </button>
        )}
      </div>
    </div>
  );
}