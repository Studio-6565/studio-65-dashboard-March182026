import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Calendar, ChevronDown, ChevronUp, Package } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const CAT_COLORS = {
  Camera: '#E81A1A',
  Lens: '#F59E0B',
  Audio: '#7BC853',
  Lighting: '#4A9EFF',
  Drone: '#A78BFA',
  Stabilizer: '#F97316',
  Storage: '#06B6D4',
  Accessories: '#EC4899',
  Other: '#666',
};

function datesBetween(start, end) {
  const dates = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date((end || start) + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getProjectDates(project) {
  const extra = project.extra_dates || [];
  if (project.date && project.end_date && project.end_date !== project.date) {
    return [...new Set([...datesBetween(project.date, project.end_date), ...extra])];
  }
  return [...new Set([project.date, ...extra].filter(Boolean))];
}

// For each gear item, find which projects use it (via rentals or setup.gear text match)
function getGearUsage(gear, projects) {
  const usage = []; // { gear, project, dates: [] }

  gear.forEach(g => {
    const gName = (g.name || '').toLowerCase();
    const gBrand = (g.brand || '').toLowerCase();
    const gModel = (g.model || '').toLowerCase();

    projects.forEach(p => {
      if (p.archived || p.is_test) return;
      if (!p.date) return;

      // Check rentals
      const inRentals = (p.rentals || []).some(r => {
        const eq = (r.equipment || '').toLowerCase();
        return eq.includes(gName) || gName.includes(eq) ||
          (gBrand && eq.includes(gBrand)) || (gModel && eq.includes(gModel));
      });

      // Check setup.gear
      const setupGear = (p.setup?.gear || '').toLowerCase();
      const inSetup = gName.length > 2 && (
        setupGear.includes(gName) ||
        (gBrand.length > 2 && setupGear.includes(gBrand)) ||
        (gModel.length > 2 && setupGear.includes(gModel))
      );

      // Check assigned_project_ids
      const inAssigned = (g.assigned_project_ids || []).includes(p.id);

      if (inRentals || inSetup || inAssigned) {
        usage.push({ gear: g, project: p, dates: getProjectDates(p) });
      }
    });
  });

  return usage;
}

// Find conflicts: same gear item booked on the same date for 2+ projects
function findConflicts(gearUsage) {
  const byGearDate = {}; // gearId_date → [{ gear, project, dates }]

  gearUsage.forEach(entry => {
    entry.dates.forEach(date => {
      const key = `${entry.gear.id}_${date}`;
      if (!byGearDate[key]) byGearDate[key] = [];
      byGearDate[key].push(entry);
    });
  });

  const conflicts = [];
  Object.entries(byGearDate).forEach(([key, entries]) => {
    if (entries.length >= 2) {
      const [gearId, date] = key.split('_');
      conflicts.push({ gearId, date, entries });
    }
  });

  return conflicts.sort((a, b) => a.date.localeCompare(b.date));
}

// Find heavily loaded dates: dates with 3+ projects shooting
function findHeavyDays(projects) {
  const dateCount = {};
  projects.filter(p => !p.archived && !p.is_test && p.date).forEach(p => {
    getProjectDates(p).forEach(d => {
      if (!dateCount[d]) dateCount[d] = [];
      dateCount[d].push(p);
    });
  });
  return Object.entries(dateCount)
    .filter(([, ps]) => ps.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ps]) => ({ date, projects: ps }));
}

function ConflictCard({ conflict, gear, expanded, onToggle }) {
  const gearItem = gear.find(g => g.id === conflict.gearId);
  if (!gearItem) return null;
  const color = CAT_COLORS[gearItem.category] || '#666';

  return (
    <div style={{
      background: '#0D0D0D',
      border: '1px solid rgba(232,26,26,0.25)',
      borderLeft: '3px solid #E81A1A',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '12px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E81A1A', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{gearItem.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', display: 'flex', gap: 8 }}>
            <span style={{ color }}>{gearItem.category}</span>
            <span>·</span>
            <span style={{ color: '#E81A1A' }}>⚠ Double-booked on {conflict.date}</span>
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 4, padding: '3px 7px', flexShrink: 0 }}>
          {conflict.entries.length} projects
        </div>
        {expanded ? <ChevronUp size={14} color="#555" /> : <ChevronDown size={14} color="#555" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(232,26,26,0.1)' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 12, marginBottom: 8 }}>
            Conflicting Shoots
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conflict.entries.map(e => (
              <div key={e.project.id} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{e.project.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>{e.project.client} · {e.project.status}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', fontWeight: 700 }}>{e.project.date}</div>
                  {e.project.end_date && e.project.end_date !== e.project.date && (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>→ {e.project.end_date}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(232,26,26,0.05)', border: '1px solid rgba(232,26,26,0.1)', borderRadius: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A' }}>
              💡 Resolution: Rent a second {gearItem.name}, stagger shoot times, or reassign to another project date.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeavyDayCard({ day, expanded, onToggle }) {
  const severity = day.projects.length >= 4 ? '#E81A1A' : '#F59E0B';
  const label = day.projects.length >= 4 ? 'Critical' : 'Busy';

  return (
    <div style={{
      background: '#0D0D0D',
      border: `1px solid ${severity}30`,
      borderLeft: `3px solid ${severity}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: severity, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{day.date}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>
            {day.projects.length} simultaneous shoots
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: severity, background: `${severity}14`, border: `1px solid ${severity}30`, borderRadius: 4, padding: '3px 7px', flexShrink: 0 }}>
          {label}
        </div>
        {expanded ? <ChevronUp size={14} color="#555" /> : <ChevronDown size={14} color="#555" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${severity}15` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {day.projects.map(p => (
              <div key={p.id} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>{p.client}</div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>
                  {p.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Horizontal timeline strip for the next 60 days
function TimelineStrip({ gear, projects }) {
  const today = new Date();
  const days = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const gearUsage = useMemo(() => getGearUsage(gear, projects), [gear, projects]);
  const conflicts = useMemo(() => findConflicts(gearUsage), [gearUsage]);
  const conflictDates = new Set(conflicts.map(c => c.date));

  // Date → projects shooting
  const dateProjects = {};
  projects.filter(p => !p.archived && !p.is_test && p.date).forEach(p => {
    getProjectDates(p).forEach(d => {
      if (!dateProjects[d]) dateProjects[d] = [];
      dateProjects[d].push(p);
    });
  });

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ minWidth: 560 }}>
        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
            {week.map(date => {
              const ps = dateProjects[date] || [];
              const isConflict = conflictDates.has(date);
              const count = ps.length;
              const isToday = date === today.toISOString().split('T')[0];

              let bg = '#111';
              let border = '#1A1A1A';
              let textColor = '#444';

              if (isConflict) { bg = 'rgba(232,26,26,0.18)'; border = '#E81A1A'; textColor = '#E81A1A'; }
              else if (count >= 3) { bg = 'rgba(245,158,11,0.15)'; border = 'rgba(245,158,11,0.4)'; textColor = '#F59E0B'; }
              else if (count >= 2) { bg = 'rgba(245,158,11,0.08)'; border = 'rgba(245,158,11,0.2)'; textColor = '#F59E0B'; }
              else if (count === 1) { bg = 'rgba(74,158,255,0.08)'; border = 'rgba(74,158,255,0.2)'; textColor = '#4A9EFF'; }

              if (isToday) border = '#fff';

              const dayNum = parseInt(date.split('-')[2]);
              const monthNum = parseInt(date.split('-')[1]);

              return (
                <div
                  key={date}
                  title={`${date}${ps.length ? ': ' + ps.map(p => p.name).join(', ') : ' — free'}${isConflict ? ' ⚠ GEAR CONFLICT' : ''}`}
                  style={{
                    flex: 1, height: 40, borderRadius: 6,
                    background: bg, border: `1px solid ${border}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: count > 0 ? 'pointer' : 'default',
                    transition: 'opacity 0.1s',
                  }}
                >
                  {dayNum === 1 && (
                    <div style={{ fontFamily: MONO, fontSize: 7, color: '#444', lineHeight: 1 }}>
                      {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNum]}
                    </div>
                  )}
                  <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: count > 0 ? 700 : 400, color: textColor }}>
                    {dayNum}
                  </div>
                  {count > 0 && (
                    <div style={{ fontFamily: MONO, fontSize: 7, color: isConflict ? '#E81A1A' : textColor, opacity: 0.8 }}>
                      {isConflict ? '⚠' : count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { color: '#4A9EFF', label: '1 shoot' },
            { color: '#F59E0B', label: '2–3 shoots' },
            { color: '#E81A1A', label: 'Gear conflict ⚠' },
            { color: '#fff', label: 'Today' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, color: '#555' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, border: `1px solid ${l.color}`, background: `${l.color}20` }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GearBookingDashboard({ gear, projects }) {
  const [expandedConflict, setExpandedConflict] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [activeSection, setActiveSection] = useState('conflicts'); // conflicts | heavy | all-gear

  const activeGear = gear.filter(g => !g.archived);
  const gearUsage = useMemo(() => getGearUsage(activeGear, projects), [activeGear, projects]);
  const conflicts = useMemo(() => findConflicts(gearUsage), [gearUsage]);
  const heavyDays = useMemo(() => findHeavyDays(projects), [projects]);

  // Upcoming gear bookings (next 30 days)
  const today = new Date().toISOString().split('T')[0];
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

  const upcomingUsage = gearUsage.filter(u =>
    u.dates.some(d => d >= today && d <= thirtyDaysStr)
  );

  // Unique gear items with upcoming bookings
  const bookedGearIds = new Set(upcomingUsage.map(u => u.gear.id));
  const unusedGear = activeGear.filter(g => !bookedGearIds.has(g.id));

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Booking Dashboard</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>
          Gear & studio conflicts cross-referenced with shoot dates
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Gear Conflicts', value: conflicts.length, color: conflicts.length > 0 ? '#E81A1A' : '#7BC853', icon: conflicts.length > 0 ? '⚠' : '✓' },
          { label: 'Busy Days', value: heavyDays.length, color: heavyDays.length > 0 ? '#F59E0B' : '#7BC853', icon: '📅' },
          { label: 'Gear In Use (30d)', value: bookedGearIds.size, color: '#4A9EFF', icon: '🎒' },
          { label: 'Idle Gear', value: unusedGear.length, color: '#555', icon: '💤' },
        ].map(k => (
          <div key={k.label} style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.icon} {k.value}</div>
          </div>
        ))}
      </div>

      {/* 60-day timeline */}
      <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={15} color="#4A9EFF" />
          60-Day Production Timeline
        </div>
        <TimelineStrip gear={activeGear} projects={projects} />
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#111', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[
          { key: 'conflicts', label: `⚠ Conflicts (${conflicts.length})` },
          { key: 'heavy', label: `📅 Busy Days (${heavyDays.length})` },
          { key: 'all-gear', label: `🎒 Gear Schedule` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveSection(t.key)} style={{
            flex: 1, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: activeSection === t.key ? '#E81A1A' : 'transparent',
            color: activeSection === t.key ? '#fff' : '#555',
            fontFamily: MONO, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Conflicts panel */}
      {activeSection === 'conflicts' && (
        <div>
          {conflicts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14 }}>
              <CheckCircle size={32} color="#7BC853" style={{ marginBottom: 12, opacity: 0.6 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#7BC853', marginBottom: 6 }}>No conflicts detected</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>
                All gear assignments look clean. Gear items appear in conflicts when the same piece<br />
                of equipment is linked to two or more projects on the same date.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conflicts.map((c, i) => (
                <ConflictCard
                  key={`${c.gearId}_${c.date}`}
                  conflict={c}
                  gear={activeGear}
                  expanded={expandedConflict === i}
                  onToggle={() => setExpandedConflict(expandedConflict === i ? null : i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Heavy days panel */}
      {activeSection === 'heavy' && (
        <div>
          {heavyDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14 }}>
              <CheckCircle size={32} color="#7BC853" style={{ marginBottom: 12, opacity: 0.6 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#7BC853', marginBottom: 6 }}>No busy days detected</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>Days with 2+ simultaneous shoots will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {heavyDays.map((d, i) => (
                <HeavyDayCard
                  key={d.date}
                  day={d}
                  expanded={expandedDay === i}
                  onToggle={() => setExpandedDay(expandedDay === i ? null : i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All gear schedule panel */}
      {activeSection === 'all-gear' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeGear.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#444', fontFamily: MONO, fontSize: 11 }}>
              No gear in inventory yet.
            </div>
          )}
          {activeGear.map(g => {
            const bookings = gearUsage.filter(u => u.gear.id === g.id && u.dates.some(d => d >= today));
            const color = CAT_COLORS[g.category] || '#666';
            return (
              <div key={g.id} style={{ background: '#0A0A0A', border: `1px solid #141414`, borderLeft: `3px solid ${bookings.length > 0 ? color : '#1E1E1E'}`, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: bookings.length > 0 ? '#fff' : '#555' }}>{g.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2, display: 'flex', gap: 8 }}>
                      <span style={{ color }}>{g.category}</span>
                      {g.brand && <span>· {g.brand}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {bookings.length === 0 ? (
                      <div style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>💤 Idle</div>
                    ) : (
                      <div style={{ fontFamily: MONO, fontSize: 10, color, fontWeight: 700 }}>
                        {bookings.length} upcoming shoot{bookings.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                {bookings.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {bookings.slice(0, 5).map(b => (
                      <div key={b.project.id} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: `${color}12`, border: `1px solid ${color}25`, color, fontFamily: MONO,
                      }}>
                        {b.project.name.length > 20 ? b.project.name.slice(0, 18) + '…' : b.project.name} · {b.project.date}
                      </div>
                    ))}
                    {bookings.length > 5 && (
                      <div style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, color: '#444', fontFamily: MONO, background: '#111', border: '1px solid #1A1A1A' }}>
                        +{bookings.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}