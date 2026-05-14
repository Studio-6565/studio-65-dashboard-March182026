import React, { useMemo } from 'react';
import { fmt } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

function marginColor(m) {
  if (m >= 60) return '#7BC853';
  if (m >= 35) return '#F59E0B';
  if (m >= 0)  return '#E81A1A';
  return '#E81A1A';
}

function Row({ label, est, act, highlight }) {
  return (
    <tr style={{ borderBottom: '1px solid #111' }}
      onMouseEnter={e => e.currentTarget.style.background = '#161616'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '11px 14px', fontSize: 13, color: highlight ? '#fff' : '#aaa', fontWeight: highlight ? 700 : 400 }}>{label}</td>
      <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 12, color: highlight ? '#fff' : '#666', textAlign: 'right', fontWeight: highlight ? 700 : 400 }}>{est !== null ? fmt(est) : <span style={{ color: '#333' }}>—</span>}</td>
      <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 12, color: highlight ? '#fff' : '#aaa', textAlign: 'right', fontWeight: highlight ? 700 : 400 }}>{act !== null ? fmt(act) : <span style={{ color: '#333' }}>—</span>}</td>
    </tr>
  );
}

function DeltaBadge({ est, act, invert }) {
  if (est == null || act == null) return null;
  const diff = act - est;
  // For costs, going over is bad; for revenue/margin, going under is bad
  const isGood = invert ? diff < 0 : diff > 0;
  const color = diff === 0 ? '#555' : isGood ? '#7BC853' : '#E81A1A';
  const sign = diff >= 0 ? '+' : '';
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}30`, marginLeft: 6 }}>
      {sign}{fmt(diff)}
    </span>
  );
}

export default function MarginTab({ project: p, contacts = [] }) {
  const analysis = useMemo(() => {
    const revenue = p.revenue || 0;

    // ── Crew costs ───────────────────────────────────────────────────────────
    const crewItems = (p.crew || []).map(c => {
      // Actual cost logged on crew member
      const actualCost = c.rate_type === 'hourly'
        ? (c.cost || 0) * (c.hours || 0)
        : (c.cost || 0);

      // Estimated cost: try to get rate from Contacts if the crew member
      // doesn't have a cost set, or use hours × contact rate
      let estimatedCost = actualCost;
      if (!actualCost && c.name) {
        const contact = contacts.find(ct =>
          ct.name?.toLowerCase() === c.name?.toLowerCase() && ct.rate
        );
        if (contact) {
          const rate = parseFloat(contact.rate) || 0;
          estimatedCost = contact.rate_type === 'hourly'
            ? rate * (c.hours || 0)
            : rate;
        }
      }

      return { name: c.name, role: c.role, estimated: estimatedCost, actual: actualCost };
    });

    const crewEst  = crewItems.reduce((s, c) => s + c.estimated, 0);
    const crewAct  = crewItems.reduce((s, c) => s + c.actual, 0);

    // Stored crew_cost vs re-calculated actual
    const crewCostActual = p.crew_cost || crewAct;

    // ── Rental / gear costs ──────────────────────────────────────────────────
    const rentalItems = (p.rentals || []).map(r => {
      const cost = (parseFloat(r.cost) || 0) * (parseFloat(r.qty) || 1);
      return { name: r.equipment, vendor: r.vendor, estimated: cost, actual: cost };
    });
    const rentalEst = rentalItems.reduce((s, r) => s + r.estimated, 0);
    const rentalAct = p.rental_cost || rentalItems.reduce((s, r) => s + r.actual, 0);

    // ── Editor / edit assignments ────────────────────────────────────────────
    // EditAssignment records rate from project.crew marked as editors,
    // OR we estimate from contacts with type Editor
    const editorCrew = (p.crew || []).filter(c =>
      ['editor', 'edit', 'post', 'post-production', 'post production', 'colourist', 'colorist']
        .some(kw => (c.role || '').toLowerCase().includes(kw))
    );
    const editorCost = editorCrew.reduce((s, c) => {
      return s + (c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0));
    }, 0);

    // ── Misc expenses ────────────────────────────────────────────────────────
    const miscExpenses = (p.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

    // ── Hours cost (if tracked, use logged hours × an implicit rate) ─────────
    // We don't bill owner hours but it's useful for margin analysis
    const totalHours = (p.hours || []).reduce((s, h) => s + (h.hours || 0), 0);

    // ── Totals ───────────────────────────────────────────────────────────────
    // Estimated = quoted revenue with budgeted costs
    const estimatedCrewCost   = crewEst;
    const estimatedRentalCost = rentalEst;
    const estimatedMisc       = miscExpenses; // no "estimated" for misc — same
    const estimatedTotal      = estimatedCrewCost + estimatedRentalCost + estimatedMisc;
    const estimatedNet        = revenue - estimatedTotal;
    const estimatedMargin     = revenue > 0 ? Math.round((estimatedNet / revenue) * 100) : 0;

    const actualCrewCost      = crewCostActual;
    const actualRentalCost    = rentalAct;
    const actualTotal         = actualCrewCost + actualRentalCost + miscExpenses;
    const actualNet           = revenue - actualTotal;
    const actualMargin        = revenue > 0 ? Math.round((actualNet / revenue) * 100) : 0;

    return {
      revenue,
      crew: { items: crewItems, est: estimatedCrewCost, act: actualCrewCost },
      rental: { items: rentalItems, est: estimatedRentalCost, act: actualRentalCost },
      misc: { amount: miscExpenses },
      editor: { cost: editorCost },
      totalHours,
      estimated: { total: estimatedTotal, net: estimatedNet, margin: estimatedMargin },
      actual:    { total: actualTotal,    net: actualNet,    margin: actualMargin },
    };
  }, [p, contacts]);

  const a = analysis;

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff' }}>

      {/* Top margin summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {/* Estimated */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Quoted / Estimated</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: marginColor(a.estimated.margin), lineHeight: 1, marginBottom: 4 }}>{a.estimated.margin}%</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>Net {fmt(a.estimated.net)} on {fmt(a.revenue)}</div>
        </div>
        {/* Actual */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Actual (as logged)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: marginColor(a.actual.margin), lineHeight: 1, marginBottom: 4 }}>{a.actual.margin}%</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>Net {fmt(a.actual.net)} on {fmt(a.revenue)}</div>
          {a.actual.margin !== a.estimated.margin && (
            <div style={{ marginTop: 6 }}>
              <DeltaBadge est={a.estimated.net} act={a.actual.net} invert={false} />
            </div>
          )}
        </div>
      </div>

      {/* Margin progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: MONO, fontSize: 10, color: '#444' }}>
          <span>0%</span><span style={{ color: '#555' }}>Target 50%</span><span>100%</span>
        </div>
        <div style={{ position: 'relative', height: 8, background: '#1A1A1A', borderRadius: 4, overflow: 'hidden' }}>
          {/* Estimated bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.max(0, Math.min(100, a.estimated.margin))}%`, background: 'rgba(74,158,255,0.3)', borderRadius: 4, transition: 'width 0.4s' }} />
          {/* Actual bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.max(0, Math.min(100, a.actual.margin))}%`, background: marginColor(a.actual.margin), borderRadius: 4, transition: 'width 0.4s' }} />
          {/* 50% target line */}
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: '#333' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(74,158,255,0.3)' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Estimated</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: marginColor(a.actual.margin) }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Actual</span>
          </div>
        </div>
      </div>

      {/* Full breakdown table */}
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#141414' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: MONO, fontSize: 9, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Line Item</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: '#4A9EFF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estimated</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontFamily: MONO, fontSize: 9, color: '#7BC853', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actual</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr style={{ background: 'rgba(74,158,255,0.04)', borderBottom: '1px solid #111' }}>
              <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#4A9EFF' }}>Revenue (Quoted)</td>
              <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 12, color: '#4A9EFF', textAlign: 'right', fontWeight: 700 }}>{fmt(a.revenue)}</td>
              <td style={{ padding: '11px 14px', fontFamily: MONO, fontSize: 12, color: '#4A9EFF', textAlign: 'right', fontWeight: 700 }}>{fmt(a.revenue)}</td>
            </tr>

            {/* Crew section header */}
            <tr style={{ background: '#0A0A0A', borderBottom: '1px solid #111' }}>
              <td colSpan={3} style={{ padding: '7px 14px', fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Crew ({a.crew.items.length} member{a.crew.items.length !== 1 ? 's' : ''})
              </td>
            </tr>
            {a.crew.items.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #0D0D0D' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '9px 14px 9px 22px', fontSize: 12, color: '#888' }}>
                  {c.name}{c.role ? <span style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginLeft: 6 }}>{c.role}</span> : ''}
                </td>
                <td style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 11, color: '#666', textAlign: 'right' }}>{fmt(c.estimated)}</td>
                <td style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 11, color: '#aaa', textAlign: 'right' }}>{fmt(c.actual)}</td>
              </tr>
            ))}
            <Row label="Crew Subtotal" est={a.crew.est} act={a.crew.act} />

            {/* Rentals */}
            {(a.rental.items.length > 0 || a.rental.act > 0) && (
              <>
                <tr style={{ background: '#0A0A0A', borderBottom: '1px solid #111' }}>
                  <td colSpan={3} style={{ padding: '7px 14px', fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Gear / Rentals ({a.rental.items.length})
                  </td>
                </tr>
                {a.rental.items.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0D0D0D' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#111'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '9px 14px 9px 22px', fontSize: 12, color: '#888' }}>
                      {r.name}{r.vendor ? <span style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginLeft: 6 }}>{r.vendor}</span> : ''}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 11, color: '#666', textAlign: 'right' }}>{fmt(r.estimated)}</td>
                    <td style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 11, color: '#aaa', textAlign: 'right' }}>{fmt(r.actual)}</td>
                  </tr>
                ))}
                <Row label="Rental Subtotal" est={a.rental.est} act={a.rental.act} />
              </>
            )}

            {/* Misc Expenses */}
            {a.misc.amount > 0 && (
              <>
                <tr style={{ background: '#0A0A0A', borderBottom: '1px solid #111' }}>
                  <td colSpan={3} style={{ padding: '7px 14px', fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Misc Expenses ({(p.expenses || []).length})
                  </td>
                </tr>
                {(p.expenses || []).map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0D0D0D' }}
                    onMouseEnter={e2 => e2.currentTarget.style.background = '#111'}
                    onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '9px 14px 9px 22px', fontSize: 12, color: '#888' }}>
                      {e.desc}{e.category ? <span style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginLeft: 6 }}>{e.category}</span> : ''}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 11, color: '#666', textAlign: 'right' }}>{fmt(e.amount)}</td>
                    <td style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 11, color: '#aaa', textAlign: 'right' }}>{fmt(e.amount)}</td>
                  </tr>
                ))}
                <Row label="Expenses Subtotal" est={a.misc.amount} act={a.misc.amount} />
              </>
            )}

            {/* Divider */}
            <tr><td colSpan={3} style={{ height: 1, background: '#222' }} /></tr>

            {/* Total Costs */}
            <Row label="Total Costs" est={a.estimated.total} act={a.actual.total} />

            {/* Net Profit */}
            <tr style={{ background: 'rgba(123,200,83,0.04)', borderBottom: '1px solid #111' }}>
              <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 800, color: '#fff' }}>
                Net Profit
                <DeltaBadge est={a.estimated.net} act={a.actual.net} invert={false} />
              </td>
              <td style={{ padding: '13px 14px', fontFamily: MONO, fontSize: 13, color: marginColor(a.estimated.margin), textAlign: 'right', fontWeight: 800 }}>{fmt(a.estimated.net)}</td>
              <td style={{ padding: '13px 14px', fontFamily: MONO, fontSize: 13, color: marginColor(a.actual.margin), textAlign: 'right', fontWeight: 800 }}>{fmt(a.actual.net)}</td>
            </tr>

            {/* Margin % */}
            <tr style={{ background: '#141414' }}>
              <td style={{ padding: '12px 14px', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Margin %</td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: marginColor(a.estimated.margin) }}>{a.estimated.margin}%</span>
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: marginColor(a.actual.margin) }}>{a.actual.margin}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Hours note */}
      {a.totalHours > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA' }}>
            ⏱ {a.totalHours}h logged — not included in cost calculation (owner time). Add an hourly rate if you want to factor it in.
          </div>
        </div>
      )}

      {/* Context tip */}
      <div style={{ marginTop: 10, padding: '10px 14px', background: '#0A0A0A', border: '1px solid #141414', borderRadius: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', lineHeight: 1.6 }}>
          💡 Estimated = budgeted costs at booking · Actual = costs as currently logged. Crew rates pulled from project records; editor costs are crew members with "editor/post" role.
        </div>
      </div>
    </div>
  );
}