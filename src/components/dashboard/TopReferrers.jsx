import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const MONO = '"DM Mono", monospace';

function fmt(n) {
  return '$' + (n || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 });
}

export default function TopReferrers({ contacts = [], leads = [], projects = [] }) {
  const navigate = useNavigate();

  const referrers = useMemo(() => {
    const clientContacts = contacts.filter(c => (c.types || []).includes('Client'));

    return clientContacts.map(c => {
      // Leads tagged "Referral" that link back to this contact
      const referredLeads = leads.filter(l =>
        l.notes?.includes('Referral') && l.notes?.includes(c.name)
      );

      // Also count contacts who list this contact as referred_by
      const directReferrals = contacts.filter(rc => rc.referred_by_contact_id === c.id);

      const totalLeads = referredLeads.length + directReferrals.length;
      if (totalLeads === 0) return null;

      // Revenue closed: won leads or projects from referred clients
      const wonLeads = referredLeads.filter(l => l.status === 'won');
      const referredClientNames = directReferrals.map(rc => rc.name);
      const referredProjectRevenue = projects
        .filter(p => referredClientNames.includes(p.client))
        .reduce((s, p) => s + (p.revenue || 0), 0);
      const wonRevenue = wonLeads.reduce((s, l) => s + (l.proposal_value || 0), 0) + referredProjectRevenue;

      return {
        id: c.id,
        name: c.name,
        company: c.client_company || '',
        totalLeads,
        wonRevenue,
        wonCount: wonLeads.length + referredClientNames.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalLeads - a.totalLeads || b.wonRevenue - a.wonRevenue)
    .slice(0, 5);
  }, [contacts, leads, projects]);

  if (referrers.length === 0) return null;

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '14px 16px', marginTop: 16 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
        🏆 Top Referrers
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {referrers.map((r, i) => (
          <div key={r.id}
            onClick={() => navigate('/contacts')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#111', borderRadius: 8, cursor: 'pointer', border: '1px solid #1E1E1E' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
            onMouseLeave={e => e.currentTarget.style.background = '#111'}
          >
            {/* Rank */}
            <div style={{ width: 22, textAlign: 'center', fontFamily: MONO, fontSize: 11, color: i < 3 ? ['#F59E0B','#888','#7B5A3A'][i] : '#444', fontWeight: 700, flexShrink: 0 }}>
              {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
            </div>
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              {r.company && <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, marginTop: 1 }}>{r.company}</div>}
            </div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, flexShrink: 0, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#4A9EFF' }}>{r.totalLeads}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: '#444', textTransform: 'uppercase' }}>leads</div>
              </div>
              {r.wonRevenue > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{fmt(r.wonRevenue)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: '#444', textTransform: 'uppercase' }}>closed</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}