import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

function HoursBar({ pct }) {
  const color = pct >= 90 ? '#E81A1A' : pct >= 70 ? '#F59E0B' : '#7BC853';
  return (
    <div style={{ height: 6, background: '#1A1A1A', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
    </div>
  );
}

function AlertBadge({ children, color }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '3px 8px',
      borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}33`,
      display: 'inline-block',
    }}>{children}</span>
  );
}

function ProjectRow({ project, onUnlink }) {
  const hoursLogged = (project.hours || []).reduce((s, h) => s + (h.hours || 0), 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0D0D0D', borderRadius: 8, border: '1px solid #1A1A1A' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>
          {project.date || 'No date'} · {hoursLogged}h logged
        </div>
      </div>
      <button
        onClick={() => onUnlink(project)}
        style={{ padding: '4px 10px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.15)', borderRadius: 6, color: '#E81A1A', fontSize: 10, cursor: 'pointer', fontFamily: MONO, flexShrink: 0 }}
      >Unlink</button>
    </div>
  );
}

export default function RetainerDashboard({ retainers, projects, onEdit }) {
  const [expandedId, setExpandedId] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const retainerData = useMemo(() => {
    return retainers.map(r => {
      // Projects linked to this retainer
      const linked = projects.filter(p => p.retainer_contract_id === r.id);

      // Hours used this month: sum hours[] entries dated this month
      const hoursThisMonth = linked.reduce((sum, p) => {
        const pHours = (p.hours || [])
          .filter(h => (h.date || '').startsWith(thisMonth))
          .reduce((s, h) => s + (h.hours || 0), 0);
        return sum + pHours;
      }, 0);

      const bucket = r.retainer_monthly_hours || 0;
      const remaining = Math.max(0, bucket - hoursThisMonth);
      const pct = bucket > 0 ? (hoursThisMonth / bucket) * 100 : 0;

      // Days to renewal
      let daysToRenewal = null;
      if (r.retainer_renewal_date) {
        const diff = Math.ceil((new Date(r.retainer_renewal_date) - new Date()) / 86400000);
        daysToRenewal = diff;
      }

      const alertOverHours = pct >= 90;
      const alertRenewal = daysToRenewal !== null && daysToRenewal <= 14 && daysToRenewal >= 0;
      const expired = daysToRenewal !== null && daysToRenewal < 0;

      return { retainer: r, linked, hoursThisMonth, remaining, pct, daysToRenewal, alertOverHours, alertRenewal, expired };
    });
  }, [retainers, projects, thisMonth]);

  const handleUnlink = async (project) => {
    await base44.entities.Project.update(project.id, { retainer_contract_id: '', retainer_contract_name: '' });
  };

  if (!retainers.length) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444' }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📋</div>
        <div style={{ fontSize: 15, color: '#666', marginBottom: 8 }}>No retainer contracts yet</div>
        <div style={{ fontSize: 13, color: '#444' }}>Create a Retainer type contract to start tracking monthly hours.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {retainerData.map(({ retainer: r, linked, hoursThisMonth, remaining, pct, daysToRenewal, alertOverHours, alertRenewal, expired }) => {
        const isExpanded = expandedId === r.id;
        return (
          <div key={r.id} style={{
            background: '#111', border: `1px solid ${alertOverHours || alertRenewal ? '#E81A1A33' : '#1E1E1E'}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            {/* Main row */}
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{r.title}</span>
                    {r.status === 'active' && !expired && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(123,200,83,0.12)', color: '#7BC853', border: '1px solid rgba(123,200,83,0.2)', fontWeight: 700 }}>ACTIVE</span>}
                    {expired && <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(232,26,26,0.12)', color: '#E81A1A', border: '1px solid rgba(232,26,26,0.2)', fontWeight: 700 }}>EXPIRED</span>}
                    {alertOverHours && <AlertBadge color="#E81A1A">⚠ {Math.round(pct)}% USED</AlertBadge>}
                    {alertRenewal && <AlertBadge color="#F59E0B">⏰ {daysToRenewal}d TO RENEWAL</AlertBadge>}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>
                    {r.contact_name && `${r.contact_name}`}
                    {r.retainer_monthly_fee && ` · $${r.retainer_monthly_fee?.toLocaleString()}/mo`}
                    {r.retainer_auto_renew ? ' · Auto-renews' : ''}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Hours stat */}
                  <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', minWidth: 100 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Hours Used</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: pct >= 90 ? '#E81A1A' : pct >= 70 ? '#F59E0B' : '#fff' }}>
                      {hoursThisMonth.toFixed(1)}<span style={{ fontSize: 11, color: '#555' }}>/{r.retainer_monthly_hours || 0}h</span>
                    </div>
                    <HoursBar pct={pct} />
                  </div>

                  {/* Remaining */}
                  <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', minWidth: 90 }}>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Remaining</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: remaining === 0 ? '#E81A1A' : '#7BC853' }}>{remaining.toFixed(1)}h</div>
                  </div>

                  {/* Days to renewal */}
                  {daysToRenewal !== null && (
                    <div style={{ background: '#1A1A1A', border: `1px solid ${alertRenewal ? 'rgba(245,158,11,0.3)' : '#222'}`, borderRadius: 10, padding: '10px 14px', minWidth: 90 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>Renewal</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: expired ? '#E81A1A' : alertRenewal ? '#F59E0B' : '#fff' }}>
                        {expired ? 'Expired' : `${daysToRenewal}d`}
                      </div>
                      {r.retainer_renewal_date && (
                        <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginTop: 2 }}>
                          {new Date(r.retainer_renewal_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    style={{ padding: '8px 14px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: MONO }}
                  >{isExpanded ? '▲ Hide' : `▼ Projects (${linked.length})`}</button>
                  <button
                    onClick={() => onEdit(r)}
                    style={{ padding: '8px 14px', background: '#222', border: '1px solid #333', borderRadius: 8, color: '#aaa', fontSize: 12, cursor: 'pointer', fontFamily: MONO }}
                  >Edit</button>
                </div>
              </div>
            </div>

            {/* Expanded projects */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #1A1A1A', padding: '14px 18px', background: '#0A0A0A' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Linked Projects — {thisMonth}
                </div>
                {linked.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>No projects linked. Tag a project to this retainer from the project list.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {linked.map(p => (
                      <ProjectRow key={p.id} project={p} onUnlink={handleUnlink} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}