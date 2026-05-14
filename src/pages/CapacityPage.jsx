import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt } from '@/lib/studio';
import { X } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const DAYS = 60;

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getDayRange() {
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: DAYS }, (_, i) => addDays(today, i));
}

function isDateInProject(dateStr, project) {
  const start = project.date;
  const end = project.end_date || project.date;
  if (!start) return false;
  return dateStr >= start && dateStr <= end;
}

function utilColor(pct) {
  if (pct >= 85) return '#E81A1A';
  if (pct >= 30) return '#F59E0B';
  return '#2A2A2A';
}

function utilTextColor(pct) {
  if (pct >= 85) return '#E81A1A';
  if (pct >= 30) return '#F59E0B';
  return '#444';
}

function Cell({ pct, onClick, isToday }) {
  const bg = pct == null ? '#161616' : pct >= 85 ? 'rgba(232,26,26,0.25)' : pct >= 30 ? 'rgba(245,158,11,0.2)' : '#1A1A1A';
  const border = isToday ? '1px solid rgba(232,26,26,0.5)' : '1px solid transparent';
  return (
    <div
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 4,
        background: bg, border, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'opacity 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {pct != null && pct > 0 && (
        <span style={{ fontSize: 7, fontFamily: MONO, color: utilTextColor(pct), fontWeight: 700 }}>
          {Math.round(pct)}
        </span>
      )}
    </div>
  );
}

function RevenueCell({ amount, maxAmount, onClick, isToday }) {
  const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  const height = Math.max(4, Math.round((pct / 100) * 24));
  return (
    <div
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 4,
        background: '#1A1A1A', cursor: 'pointer',
        border: isToday ? '1px solid rgba(232,26,26,0.5)' : '1px solid transparent',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '2px', flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {amount > 0 && (
        <div style={{ width: 16, height, background: '#4A9EFF', borderRadius: 2 }} />
      )}
    </div>
  );
}

function DayPopover({ date, projects, contacts, gear, onClose }) {
  const dateProjects = projects.filter(p => isDateInProject(date, p));
  const allCrew = dateProjects.flatMap(p => (p.crew || []).map(c => ({ ...c, projectName: p.name })));
  const allGear = dateProjects.flatMap(p => (p.rentals || []).map(r => ({ ...r, projectName: p.name })));
  const totalRev = dateProjects.reduce((s, p) => s + (p.revenue || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16,
        padding: '24px', minWidth: 340, maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>
              {new Date(date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {dateProjects.length === 0 ? 'Nothing booked' : `${dateProjects.length} project${dateProjects.length > 1 ? 's' : ''}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {dateProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#444', fontFamily: MONO, fontSize: 12 }}>Free day 🎉</div>
        ) : (
          <>
            {totalRev > 0 && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#1A1A1A', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase' }}>Revenue committed</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#4A9EFF' }}>{fmt(totalRev)}</span>
              </div>
            )}

            {dateProjects.map(p => (
              <div key={p.id} style={{ marginBottom: 12, background: '#1A1A1A', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #E81A1A' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginBottom: 8 }}>{p.client} · {fmt(p.revenue)}</div>
                {(p.crew || []).length > 0 && (
                  <div style={{ fontSize: 11, color: '#888' }}>
                    👥 {p.crew.map(c => c.name).join(', ')}
                  </div>
                )}
              </div>
            ))}

            {allCrew.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>Crew on this day</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allCrew.map((c, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: '#222', borderRadius: 20, fontSize: 11, color: '#aaa' }}>{c.name}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CapacityPage() {
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-date', 500),
      base44.entities.Contact.list('name', 500),
      base44.entities.GearItem.list('name', 500),
    ]).then(([ps, cs, gs]) => {
      setProjects(ps.filter(p => !p.archived && !p.is_test));
      setContacts(cs);
      setGear(gs.filter(g => !g.archived));
      setLoading(false);
    });
  }, []);

  const days = useMemo(() => getDayRange(), []);
  const today = new Date().toISOString().split('T')[0];

  // Total unique crew names across all contacts
  const totalCrewCount = useMemo(() => {
    const crewContacts = contacts.filter(c => (c.types || []).includes('Crew'));
    return Math.max(crewContacts.length, 5); // fallback to at least 5
  }, [contacts]);

  const totalGearCount = useMemo(() => Math.max(gear.length, 1), [gear]);

  // Per-day metrics
  const dayMetrics = useMemo(() => {
    return days.map(d => {
      const dayProjects = projects.filter(p => isDateInProject(d, p));

      // Crew utilisation: unique crew names booked / total crew
      const bookedCrew = new Set(dayProjects.flatMap(p => (p.crew || []).map(c => c.name)));
      const crewPct = (bookedCrew.size / totalCrewCount) * 100;

      // Gear utilisation: total rental line items booked / total gear inventory
      const bookedGearCount = dayProjects.reduce((s, p) => s + (p.rentals || []).length, 0);
      const gearPct = (bookedGearCount / totalGearCount) * 100;

      // Revenue
      const revenue = dayProjects.reduce((s, p) => s + (p.revenue || 0), 0);

      return { date: d, crewPct, gearPct, revenue, crewCount: bookedCrew.size, projectCount: dayProjects.length };
    });
  }, [days, projects, totalCrewCount, totalGearCount]);

  const maxRevenue = useMemo(() => Math.max(...dayMetrics.map(d => d.revenue), 1), [dayMetrics]);

  // Month separators
  const monthGroups = useMemo(() => {
    const groups = [];
    let current = null;
    days.forEach((d, i) => {
      const month = d.slice(0, 7);
      if (month !== current) { groups.push({ month, startIdx: i }); current = month; }
    });
    return groups;
  }, [days]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <div style={{ color: '#444', fontFamily: MONO, fontSize: 12 }}>Loading capacity data...</div>
      </div>
    );
  }

  const rows = [
    { key: 'crew', label: 'Crew %', desc: `${totalCrewCount} total crew`, type: 'pct', getValue: d => d.crewPct },
    { key: 'gear', label: 'Gear %', desc: `${totalGearCount} items`, type: 'pct', getValue: d => d.gearPct },
    { key: 'rev', label: 'Revenue', desc: 'committed per day', type: 'rev', getValue: d => d.revenue },
  ];

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Capacity</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginTop: 4 }}>60-day utilisation — crew, gear & revenue</div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(232,26,26,0.25)', label: '≥85% High load', text: '#E81A1A' },
          { color: 'rgba(245,158,11,0.2)', label: '30–84% Normal', text: '#F59E0B' },
          { color: '#1A1A1A', label: '<30% Light / free', text: '#444' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: '1px solid #333' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: l.text }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: days.length * 32 + 100 }}>

          {/* Month labels */}
          <div style={{ display: 'flex', marginLeft: 110, marginBottom: 4 }}>
            {monthGroups.map((g, i) => {
              const nextStart = monthGroups[i + 1]?.startIdx ?? days.length;
              const width = (nextStart - g.startIdx) * 32;
              return (
                <div key={g.month} style={{ width, flexShrink: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase' }}>
                    {new Date(g.month + '-01').toLocaleString('en', { month: 'short', year: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Day numbers */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 110, flexShrink: 0 }} />
            {days.map(d => {
              const dayNum = parseInt(d.split('-')[2]);
              const isWeekend = [0, 6].includes(new Date(d + 'T12:00:00').getDay());
              return (
                <div key={d} style={{ width: 28, flexShrink: 0, textAlign: 'center', marginRight: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: d === today ? '#E81A1A' : isWeekend ? '#333' : '#444' }}>
                    {dayNum === 1 || d === days[0] ? dayNum : (dayNum % 5 === 0 ? dayNum : '')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {rows.map(row => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              {/* Row label */}
              <div style={{ width: 110, flexShrink: 0, paddingRight: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{row.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginTop: 1 }}>{row.desc}</div>
              </div>

              {/* Cells */}
              <div style={{ display: 'flex', gap: 4 }}>
                {dayMetrics.map(dm => (
                  row.type === 'rev' ? (
                    <RevenueCell
                      key={dm.date}
                      amount={dm.revenue}
                      maxAmount={maxRevenue}
                      isToday={dm.date === today}
                      onClick={() => setSelectedDay(dm.date)}
                    />
                  ) : (
                    <Cell
                      key={dm.date}
                      pct={row.getValue(dm)}
                      isToday={dm.date === today}
                      onClick={() => setSelectedDay(dm.date)}
                    />
                  )
                ))}
              </div>
            </div>
          ))}

          {/* Project spans overlay hint */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 110 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333' }}>Click any cell to see what's booked that day</div>
          </div>

        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, marginTop: 24 }}>
        {[
          { label: 'Busy Days (>30%)', value: dayMetrics.filter(d => d.crewPct >= 30).length, color: '#F59E0B' },
          { label: 'High-Load Days (>85%)', value: dayMetrics.filter(d => d.crewPct >= 85).length, color: '#E81A1A' },
          { label: 'Free Days', value: dayMetrics.filter(d => d.projectCount === 0).length, color: '#7BC853' },
          { label: 'Revenue Committed', value: fmt(dayMetrics.reduce((s, d) => {
            // Only count once per project
            return s;
          }, 0)), color: '#4A9EFF' },
        ].slice(0, 3).map(s => (
          <div key={s.label} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Revenue Committed</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#4A9EFF' }}>
            {fmt(projects.filter(p => {
              const start = p.date;
              const end = p.end_date || p.date;
              if (!start) return false;
              const d60 = addDays(today, 60);
              return start <= d60 && (end >= today);
            }).reduce((s, p) => s + (p.revenue || 0), 0))}
          </div>
        </div>
      </div>

      {selectedDay && (
        <DayPopover
          date={selectedDay}
          projects={projects}
          contacts={contacts}
          gear={gear}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}