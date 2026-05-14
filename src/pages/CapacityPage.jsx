import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

function getDays(count = 60) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function dayLabel(d) {
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function isDateInProject(dateStr, p) {
  const start = p.date;
  const end = p.end_date || p.date;
  if (!start) return false;
  return dateStr >= start && dateStr <= end;
}

function utilColor(pct) {
  if (pct === null || pct === undefined) return '#1A1A1A';
  if (pct >= 85) return 'rgba(232,26,26,0.75)';
  if (pct >= 50) return 'rgba(245,158,11,0.65)';
  if (pct >= 30) return 'rgba(123,200,83,0.6)';
  return '#252525';
}

function utilTextColor(pct) {
  if (pct === null || pct === undefined) return '#333';
  if (pct >= 30) return '#fff';
  return '#444';
}

export default function CapacityPage() {
  const [projects, setProjects] = useState([]);
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-date', 300),
      base44.entities.GearItem.list('name', 300),
    ]).then(([ps, gs]) => {
      setProjects(ps.filter(p => !p.is_test && !p.archived));
      setGear(gs.filter(g => !g.archived));
      setLoading(false);
    });
  }, []);

  const days = useMemo(() => getDays(60), []);

  const data = useMemo(() => {
    const totalGear = gear.length;

    // Unique crew names across all projects (as a rough "total available crew pool")
    const allCrewNames = new Set();
    projects.forEach(p => (p.crew || []).forEach(c => c.name && allCrewNames.add(c.name)));
    const totalCrew = Math.max(allCrewNames.size, 1);

    return days.map(day => {
      const dateStr = fmtDate(day);

      // Projects active on this day
      const activeProjects = projects.filter(p => isDateInProject(dateStr, p));

      // Crew utilization: unique crew members booked this day / total crew pool
      const bookedCrewNames = new Set();
      activeProjects.forEach(p => (p.crew || []).forEach(c => c.name && bookedCrewNames.add(c.name)));
      const crewPct = totalCrew > 0 ? Math.round((bookedCrewNames.size / totalCrew) * 100) : 0;

      // Gear utilization: gear items assigned to projects active today / total gear
      const bookedGearNames = new Set();
      activeProjects.forEach(p => (p.rentals || []).forEach(r => r.equipment && bookedGearNames.add(r.equipment)));
      const gearPct = totalGear > 0 ? Math.round((bookedGearNames.size / totalGear) * 100) : 0;

      // Revenue committed: sum of revenues for active projects
      const revenue = activeProjects.reduce((s, p) => s + (p.revenue || 0), 0);

      return { dateStr, day, activeProjects, crewPct, gearPct, revenue, bookedCrewNames: [...bookedCrewNames], bookedGearNames: [...bookedGearNames] };
    });
  }, [days, projects, gear]);

  const maxRevenue = useMemo(() => Math.max(...data.map(d => d.revenue), 1), [data]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <Loader2 size={22} color="#E81A1A" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const selected = selectedDay ? data.find(d => d.dateStr === selectedDay) : null;

  const ROW_H = 40;
  const CELL_W = 38;
  const LABEL_W = 120;

  const rows = [
    { key: 'crew', label: 'Crew Util %', getValue: d => d.crewPct, format: v => `${v}%` },
    { key: 'gear', label: 'Gear Util %', getValue: d => d.gearPct, format: v => `${v}%` },
    { key: 'rev', label: 'Revenue $', getValue: d => d.revenue, format: v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : v > 0 ? `$${v}` : '' },
  ];

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Capacity Planner</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginTop: 4 }}>60-day crew, gear & revenue utilisation</div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['≥85% — Overloaded', 'rgba(232,26,26,0.75)'],
          ['50–84% — Busy', 'rgba(245,158,11,0.65)'],
          ['30–49% — Active', 'rgba(123,200,83,0.6)'],
          ['<30% — Quiet', '#252525'],
        ].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: '1px solid #333' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div style={{ overflowX: 'auto', paddingBottom: 12, marginBottom: 24 }}>
        <div style={{ minWidth: LABEL_W + CELL_W * days.length }}>
          {/* Day headers */}
          <div style={{ display: 'flex', marginBottom: 4 }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} />
            {data.map((d, i) => {
              const isToday = d.dateStr === fmtDate(new Date());
              const isMon = d.day.getDay() === 1;
              const showLabel = i === 0 || isMon;
              return (
                <div
                  key={d.dateStr}
                  style={{
                    width: CELL_W, flexShrink: 0, textAlign: 'center',
                    fontFamily: MONO, fontSize: 9,
                    color: isToday ? '#E81A1A' : '#444',
                    fontWeight: isToday ? 700 : 400,
                    paddingBottom: 2,
                    borderBottom: isToday ? '2px solid #E81A1A' : '1px solid transparent',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  {showLabel ? dayLabel(d.day) : (isToday ? '·' : '')}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {rows.map(row => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              {/* Row label */}
              <div style={{ width: LABEL_W, flexShrink: 0, fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', paddingRight: 12 }}>
                {row.label}
              </div>
              {/* Cells */}
              {data.map(d => {
                const val = row.getValue(d);
                const pct = row.key === 'rev' ? Math.round((val / maxRevenue) * 100) : val;
                const bg = row.key === 'rev'
                  ? (val > 0 ? `rgba(74,158,255,${0.15 + (val / maxRevenue) * 0.6})` : '#1A1A1A')
                  : utilColor(pct);
                const isToday = d.dateStr === fmtDate(new Date());
                const isSelected = d.dateStr === selectedDay;

                return (
                  <div
                    key={d.dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : d.dateStr)}
                    style={{
                      width: CELL_W, height: ROW_H, flexShrink: 0,
                      background: bg,
                      border: isSelected ? '2px solid #fff' : isToday ? '1px solid rgba(232,26,26,0.5)' : '1px solid #111',
                      borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: d.activeProjects.length > 0 ? 'pointer' : 'default',
                      fontSize: 9, fontFamily: MONO, fontWeight: 700,
                      color: row.key === 'rev' ? (val > 0 ? '#4A9EFF' : '#222') : utilTextColor(pct),
                      transition: 'opacity 0.1s',
                      boxSizing: 'border-box',
                    }}
                    title={`${dayLabel(d.day)} — ${row.label}: ${row.format(val)}`}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.opacity = '0.75'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {val > 0 ? row.format(val) : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail panel */}
      {selected && (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{dayLabel(selected.day)}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', marginTop: 2 }}>
                {selected.activeProjects.length} project{selected.activeProjects.length !== 1 ? 's' : ''} · Crew: {selected.crewPct}% · Gear: {selected.gearPct}%
              </div>
            </div>
            <button onClick={() => setSelectedDay(null)} style={{ background: '#1E1E1E', border: 'none', borderRadius: 8, color: '#666', fontSize: 18, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {selected.activeProjects.length === 0 ? (
            <div style={{ color: '#444', fontFamily: MONO, fontSize: 12 }}>No projects scheduled.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selected.activeProjects.map(p => (
                <div key={p.id} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', marginTop: 3 }}>{p.client} · {p.date}{p.end_date && p.end_date !== p.date ? ` → ${p.end_date}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#4A9EFF' }}>${(p.revenue || 0).toLocaleString()}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>{p.status}</div>
                    </div>
                  </div>
                  {(p.crew || []).length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(p.crew || []).map((c, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontFamily: MONO }}>
                          {c.name}{c.role ? ` · ${c.role}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {(p.rentals || []).length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(p.rentals || []).map((r, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.15)', color: '#4A9EFF', fontFamily: MONO }}>
                          🎥 {r.equipment}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {selected.activeProjects.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
              {[
                ['Crew Booked', `${selected.bookedCrewNames.length} people`, '#F59E0B'],
                ['Gear Items', `${selected.bookedGearNames.length} items`, '#4A9EFF'],
                ['Revenue', `$${selected.revenue.toLocaleString()}`, '#7BC853'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary table */}
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 14 }}>Busiest Days (next 60)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Date', 'Projects', 'Crew %', 'Gear %', 'Revenue'].map(h => (
                  <th key={h} style={{ padding: '6px 14px', textAlign: 'left', fontFamily: MONO, fontSize: 9, color: '#444', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #141414', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data]
                .filter(d => d.activeProjects.length > 0)
                .sort((a, b) => b.crewPct - a.crewPct)
                .slice(0, 10)
                .map(d => (
                  <tr
                    key={d.dateStr}
                    onClick={() => setSelectedDay(d.dateStr === selectedDay ? null : d.dateStr)}
                    style={{ borderBottom: '1px solid #0D0D0D', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#111'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: MONO, fontSize: 11, color: '#aaa' }}>{dayLabel(d.day)}</td>
                    <td style={{ padding: '10px 14px', fontFamily: MONO, fontSize: 11, color: '#666' }}>{d.activeProjects.length}</td>
                    <td style={{ padding: '10px 14px', fontFamily: MONO, fontSize: 11, color: d.crewPct >= 85 ? '#E81A1A' : d.crewPct >= 50 ? '#F59E0B' : '#7BC853', fontWeight: 700 }}>{d.crewPct}%</td>
                    <td style={{ padding: '10px 14px', fontFamily: MONO, fontSize: 11, color: d.gearPct >= 85 ? '#E81A1A' : d.gearPct >= 50 ? '#F59E0B' : '#7BC853', fontWeight: 700 }}>{d.gearPct}%</td>
                    <td style={{ padding: '10px 14px', fontFamily: MONO, fontSize: 12, color: '#4A9EFF', fontWeight: 700 }}>${d.revenue.toLocaleString()}</td>
                  </tr>
                ))
              }
              {data.filter(d => d.activeProjects.length > 0).length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px 14px', color: '#333', fontFamily: MONO, fontSize: 12, textAlign: 'center' }}>No projects in the next 60 days.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}