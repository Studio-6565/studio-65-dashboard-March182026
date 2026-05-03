import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Package, ChevronDown, ChevronUp } from 'lucide-react';

const MONO = '"DM Mono", monospace';

// Does date range [aStart, aEnd] overlap with [bStart, bEnd]?
function overlaps(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ conflict }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      fontFamily: MONO, fontSize: 9, fontWeight: 700,
      background: conflict ? 'rgba(232,26,26,0.1)' : 'rgba(123,200,83,0.1)',
      color: conflict ? '#E81A1A' : '#7BC853',
      border: `1px solid ${conflict ? 'rgba(232,26,26,0.3)' : 'rgba(123,200,83,0.3)'}`,
    }}>
      {conflict
        ? <><AlertTriangle size={9} /> CONFLICT</>
        : <><CheckCircle2 size={9} /> OK</>
      }
    </span>
  );
}

// All rental line-items across all projects, normalised
function extractRentals(projects) {
  const items = [];
  for (const project of projects) {
    for (const r of project.rentals || []) {
      if (!r.equipment) continue;
      items.push({
        equipment: r.equipment,
        vendor: r.vendor || '',
        pickup: r.pickup_date || '',
        returnDate: r.return_date || '',
        projectId: project.id,
        projectName: project.name,
        projectDate: project.date || '',
        client: project.client || '',
        status: project.status || '',
        cost: r.cost || 0,
        qty: r.qty || 1,
        notes: r.notes || '',
      });
    }
  }
  return items;
}

// Group rental line-items by normalised equipment name (case-insensitive)
function groupByEquipment(rentals) {
  const map = {};
  for (const r of rentals) {
    const key = r.equipment.trim().toLowerCase();
    if (!map[key]) map[key] = { label: r.equipment.trim(), bookings: [] };
    map[key].bookings.push(r);
  }
  return Object.values(map);
}

// Find conflicting pairs within a group
function detectConflicts(bookings) {
  const conflicts = new Set();
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (a.projectId === b.projectId) continue; // same project — not a conflict
      if (overlaps(a.pickup, a.returnDate, b.pickup, b.returnDate)) {
        conflicts.add(i);
        conflicts.add(j);
      }
    }
  }
  return conflicts;
}

function BookingRow({ booking, isConflict }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px',
      background: isConflict ? 'rgba(232,26,26,0.04)' : 'rgba(123,200,83,0.02)',
      border: `1px solid ${isConflict ? 'rgba(232,26,26,0.15)' : '#141414'}`,
      borderRadius: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{booking.projectName}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{booking.client}</span>
          <span style={{
            fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4,
            background: 'rgba(74,158,255,0.1)', color: '#4A9EFF',
          }}>{booking.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {booking.pickup && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>
              📦 Pickup: <span style={{ color: '#aaa' }}>{fmtDate(booking.pickup)}</span>
            </span>
          )}
          {booking.returnDate && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>
              ↩ Return: <span style={{ color: '#aaa' }}>{fmtDate(booking.returnDate)}</span>
            </span>
          )}
          {!booking.pickup && !booking.returnDate && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>No dates set</span>
          )}
          {booking.qty > 1 && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA' }}>×{booking.qty}</span>
          )}
          {booking.vendor && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>via {booking.vendor}</span>
          )}
        </div>
      </div>
      {isConflict && <AlertTriangle size={15} color="#E81A1A" style={{ flexShrink: 0, marginTop: 2 }} />}
    </div>
  );
}

function EquipmentCard({ group }) {
  const conflicts = detectConflicts(group.bookings);
  const hasConflict = conflicts.size > 0;
  const [open, setOpen] = useState(hasConflict); // auto-expand conflicting items

  return (
    <div style={{
      background: '#0D0D0D',
      border: `1px solid ${hasConflict ? 'rgba(232,26,26,0.3)' : '#1A1A1A'}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: hasConflict ? 'rgba(232,26,26,0.1)' : 'rgba(100,100,100,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {hasConflict
            ? <AlertTriangle size={16} color="#E81A1A" />
            : <Package size={16} color="#555" />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{group.label}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>
              {group.bookings.length} booking{group.bookings.length !== 1 ? 's' : ''}
            </span>
            <StatusBadge conflict={hasConflict} />
            {hasConflict && (
              <span style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A' }}>
                {conflicts.size} overlapping
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp size={14} color="#444" /> : <ChevronDown size={14} color="#444" />}
      </button>

      {/* Bookings */}
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Conflict callout */}
          {hasConflict && (
            <div style={{ padding: '10px 14px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#E81A1A', marginBottom: 2 }}>
                ⚠️ Scheduling conflict detected
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                Highlighted bookings have overlapping pickup/return windows across different projects.
              </div>
            </div>
          )}
          {group.bookings.map((b, i) => (
            <BookingRow key={i} booking={b} isConflict={conflicts.has(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RentalAvailabilityDashboard({ projects }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'conflicts' | 'upcoming'
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const allRentals = useMemo(() => extractRentals(projects), [projects]);
  const grouped = useMemo(() => groupByEquipment(allRentals), [allRentals]);

  const totalConflicts = useMemo(() =>
    grouped.filter(g => detectConflicts(g.bookings).size > 0).length,
    [grouped]
  );

  const totalBookings = allRentals.length;
  const upcomingCount = allRentals.filter(r => r.pickup >= today).length;

  const displayed = grouped
    .filter(g => {
      if (search) return g.label.toLowerCase().includes(search.toLowerCase());
      if (filter === 'conflicts') return detectConflicts(g.bookings).size > 0;
      if (filter === 'upcoming') return g.bookings.some(b => b.pickup >= today || b.returnDate >= today);
      return true;
    })
    .sort((a, b) => {
      // Conflicts first
      const aC = detectConflicts(a.bookings).size > 0;
      const bC = detectConflicts(b.bookings).size > 0;
      if (aC && !bC) return -1;
      if (!aC && bC) return 1;
      return a.label.localeCompare(b.label);
    });

  if (allRentals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 20px' }}>
        <div style={{ fontSize: 40, opacity: 0.15, marginBottom: 14 }}>🔧</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#444', marginBottom: 6 }}>No rentals tracked yet</div>
        <div style={{ fontSize: 12, color: '#333' }}>Add rental items with pickup/return dates to your projects to see availability here.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Bookings',    value: totalBookings,  color: '#fff' },
          { label: 'Upcoming Pickups',  value: upcomingCount,  color: '#4A9EFF' },
          { label: 'Conflicts',         value: totalConflicts, color: totalConflicts > 0 ? '#E81A1A' : '#7BC853' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search equipment..."
          style={{ flex: 1, minWidth: 140, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif' }}
        />
        {[
          { key: 'all',       label: 'All' },
          { key: 'conflicts', label: `⚠ Conflicts${totalConflicts > 0 ? ` (${totalConflicts})` : ''}` },
          { key: 'upcoming',  label: '📅 Upcoming' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '8px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: MONO,
            border: filter === f.key ? '1px solid rgba(232,26,26,0.5)' : '1px solid #2A2A2A',
            background: filter === f.key ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
            color: filter === f.key ? '#E81A1A' : '#555',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Equipment groups */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#444', fontFamily: MONO, fontSize: 11 }}>
          No equipment matches the current filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(g => <EquipmentCard key={g.label} group={g} />)}
        </div>
      )}
    </div>
  );
}