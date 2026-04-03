import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const MONO = '"DM Mono", monospace';
const IS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 4, display: 'block' };

const STATUS_STYLE = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: '⏳ Pending' },
  approved: { bg: 'rgba(123,200,83,0.12)',  color: '#7BC853', label: '✓ Approved' },
  denied:   { bg: 'rgba(232,26,26,0.12)',   color: '#E81A1A', label: '✗ Denied' },
};
const TYPE_COLOR = {
  Crew:   '#F59E0B',
  Client: '#4A9EFF',
  Vendor: '#7BC853',
  Other:  '#A78BFA',
};

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderBottom: '1px solid #1E1E1E' }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#ddd', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  );
}

function RequestCard({ req, onUpdate, onApprove, onDeny }) {
  const [expanded, setExpanded] = useState(req.status === 'pending');
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState({ ...req });
  const [saving, setSaving]     = useState(false);

  const ss = STATUS_STYLE[req.status] || STATUS_STYLE.pending;
  const tc = TYPE_COLOR[req.contact_type] || '#888';

  const handleSaveDraft = async () => {
    setSaving(true);
    await base44.entities.OnboardingRequest.update(req.id, draft);
    onUpdate({ ...req, ...draft });
    setEditing(false);
    setSaving(false);
    showToast('Changes saved', 'blue');
  };

  const handleApprove = async () => {
    setSaving(true);
    // Build a Contact from the request
    const contactData = {
      name: draft.name,
      types: [draft.contact_type],
      email: draft.email,
      phone: draft.phone,
      role: draft.role || draft.crew_skills || '',
      notes: draft.notes,
      portal_password: draft.portal_password,
      rate: draft.crew_rate || '',
      rate_type: draft.crew_rate_type || 'flat',
      crew_skills: draft.crew_skills,
      crew_experience: draft.crew_experience,
      crew_equipment: draft.crew_equipment,
      crew_availability: draft.crew_availability,
      crew_instagram: draft.crew_instagram,
      crew_portfolio: draft.crew_portfolio,
      client_company: draft.client_company,
      client_project_type: draft.client_project_type,
      client_budget: draft.client_budget,
      client_how_found: draft.client_how_found,
      vendor_company: draft.vendor_company,
      vendor_service_area: draft.vendor_service_area,
      vendor_website: draft.vendor_website,
      offerings: draft.vendor_offerings
        ? draft.vendor_offerings.split(',').map(s => ({ name: s.trim(), cost: 0 })).filter(o => o.name)
        : [],
    };
    await base44.entities.Contact.create(contactData);
    await base44.entities.OnboardingRequest.update(req.id, { ...draft, status: 'approved' });
    onUpdate({ ...req, ...draft, status: 'approved' });
    onApprove(req.id);
    showToast(draft.name + ' approved & added to contacts!', 'green');
    setSaving(false);
  };

  const handleDeny = async () => {
    if (!confirm('Deny this request?')) return;
    setSaving(true);
    await base44.entities.OnboardingRequest.update(req.id, { status: 'denied' });
    onUpdate({ ...req, status: 'denied' });
    showToast('Request denied', 'red');
    setSaving(false);
  };

  return (
    <div style={{
      background: '#1A1A1A', border: `1px solid ${req.status === 'pending' ? 'rgba(245,158,11,0.2)' : '#222'}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, color: tc }}>
          {req.name?.slice(0, 2).toUpperCase() || '??'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{req.name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, color: tc, background: tc + '18' }}>{req.contact_type}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: ss.bg, color: ss.color }}>{ss.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{req.email}</span>
          </div>
        </div>
        <span style={{ color: '#444', fontSize: 13 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #222', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!editing ? (
            <>
              {/* Read-only detail view */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <DetailRow label="Email" value={req.email} />
                <DetailRow label="Phone" value={req.phone} />
                <DetailRow label="Role" value={req.role} />
                <DetailRow label="Notes" value={req.notes} />
                <DetailRow label="Portal Code" value={req.portal_password} />
                {req.contact_type === 'Crew' && <>
                  <DetailRow label="Skills" value={req.crew_skills} />
                  <DetailRow label="Experience" value={req.crew_experience} />
                  <DetailRow label="Gear Owned" value={req.crew_equipment} />
                  <DetailRow label="Availability" value={req.crew_availability} />
                  <DetailRow label="Rate" value={req.crew_rate ? `$${req.crew_rate} (${req.crew_rate_type})` : null} />
                  <DetailRow label="Instagram" value={req.crew_instagram} />
                  <DetailRow label="Portfolio" value={req.crew_portfolio} />
                </>}
                {req.contact_type === 'Client' && <>
                  <DetailRow label="Company" value={req.client_company} />
                  <DetailRow label="Project Type" value={req.client_project_type} />
                  <DetailRow label="Brief" value={req.client_brief} />
                  <DetailRow label="Budget" value={req.client_budget} />
                  <DetailRow label="Timeline" value={req.client_timeline} />
                  <DetailRow label="How Found Us" value={req.client_how_found} />
                </>}
                {req.contact_type === 'Vendor' && <>
                  <DetailRow label="Company" value={req.vendor_company} />
                  <DetailRow label="Offerings" value={req.vendor_offerings} />
                  <DetailRow label="Service Area" value={req.vendor_service_area} />
                  <DetailRow label="Website" value={req.vendor_website} />
                </>}
                {req.contact_type === 'Other' && <DetailRow label="Reason" value={req.other_reason} />}
                {req.studio_note && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(74,158,255,0.07)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 8 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginBottom: 3 }}>YOUR NOTE</div>
                    <div style={{ fontSize: 12, color: '#ccc' }}>{req.studio_note}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {req.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={handleApprove} disabled={saving} style={{ flex: 1, padding: '11px 0', background: '#7BC853', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', minWidth: 100 }}>✓ Approve & Add</button>
                  <button onClick={() => setEditing(true)} style={{ padding: '11px 16px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 10, color: '#4A9EFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✏ Edit</button>
                  <button onClick={handleDeny} disabled={saving} style={{ padding: '11px 16px', background: 'rgba(232,26,26,0.12)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 10, color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✗ Deny</button>
                </div>
              )}
              {req.status === 'approved' && (
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#7BC853', padding: '8px 12px', background: 'rgba(123,200,83,0.08)', borderRadius: 8 }}>✓ Approved — contact added to your directory</div>
              )}
              {req.status === 'denied' && (
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#E81A1A', padding: '8px 12px', background: 'rgba(232,26,26,0.06)', borderRadius: 8 }}>✗ Request denied</div>
              )}
            </>
          ) : (
            /* Edit form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Editing Request — {draft.name}</div>
              {[
                ['name', 'Full Name'], ['email', 'Email'], ['phone', 'Phone'],
                ['role', 'Role'], ['portal_password', 'Portal Code'],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label style={LS}>{lbl}</label>
                  <input style={IS} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
              {draft.contact_type === 'Crew' && [
                ['crew_skills', 'Skills'], ['crew_experience', 'Experience'],
                ['crew_rate', 'Rate'], ['crew_equipment', 'Gear'],
                ['crew_instagram', 'Instagram'], ['crew_portfolio', 'Portfolio'],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label style={LS}>{lbl}</label>
                  <input style={IS} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
              {draft.contact_type === 'Client' && [
                ['client_company', 'Company'], ['client_project_type', 'Project Type'],
                ['client_budget', 'Budget'], ['client_timeline', 'Timeline'],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label style={LS}>{lbl}</label>
                  <input style={IS} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
              {draft.contact_type === 'Vendor' && [
                ['vendor_company', 'Company'], ['vendor_offerings', 'Offerings'],
                ['vendor_service_area', 'Service Area'], ['vendor_website', 'Website'],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label style={LS}>{lbl}</label>
                  <input style={IS} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={LS}>Your Internal Note</label>
                <textarea style={{ ...IS, resize: 'none', lineHeight: 1.6 }} rows={2} value={draft.studio_note || ''} onChange={e => setDraft(d => ({ ...d, studio_note: e.target.value }))} placeholder="Private note about this person..." />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveDraft} disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); setDraft({ ...req }); }} style={{ padding: '10px 16px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
              {req.status === 'pending' && (
                <button onClick={handleApprove} disabled={saving} style={{ width: '100%', padding: '11px 0', background: '#7BC853', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  ✓ Save & Approve
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OnboardingInbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');

  useEffect(() => {
    base44.entities.OnboardingRequest.list('-created_date', 200).then(r => {
      setRequests(r);
      setLoading(false);
    });
  }, []);

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.OnboardingRequest.subscribe(event => {
      if (event.type === 'create') setRequests(prev => [event.data, ...prev]);
      if (event.type === 'update') setRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
    });
    return unsub;
  }, []);

  const pending  = requests.filter(r => r.status === 'pending').length;
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const onboardingUrl = window.location.origin + '/onboarding';

  if (loading) return <div style={{ color: '#444', fontFamily: MONO, fontSize: 11, padding: 20 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Onboarding Requests</div>
          {pending > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 9px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              {pending} pending
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { navigator.clipboard.writeText(onboardingUrl); showToast('Link copied!', 'blue'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
          >
            🔗 Copy Onboarding Link
          </button>
        </div>
      </div>

      {/* Onboarding link preview */}
      <div style={{ marginBottom: 16, padding: '10px 14px', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>SHARE LINK</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#4A9EFF', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{onboardingUrl}</span>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['pending', 'approved', 'denied', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: MONO, border: filter === s ? '1px solid rgba(232,26,26,0.4)' : '1px solid #2A2A2A',
            background: filter === s ? 'rgba(232,26,26,0.1)' : 'transparent',
            color: filter === s ? '#E81A1A' : '#555',
          }}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pending > 0 ? ` (${pending})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#444' }}>
          <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.25 }}>📥</div>
          <div style={{ fontSize: 13 }}>{requests.length ? 'No requests match this filter.' : 'No onboarding requests yet. Share the link above!'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              onUpdate={updated => setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))}
              onApprove={id => setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))}
              onDeny={id => setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'denied' } : r))}
            />
          ))}
        </div>
      )}
    </div>
  );
}