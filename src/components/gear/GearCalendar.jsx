import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const MONO = '"DM Mono", monospace';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function GearCalendar({ gear }) {
  const [projects, setProjects] = useState([]);
  const [today] = useState(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    base44.entities.Project.list('-date', 200).then(ps => setProjects(ps.filter(p => !p.archived)));
  }, []);

  const gearNames = gear.map(g => g.name.toLowerCase());

  // Find projects that use gear (from rentals or setup.gear notes)
  const gearProjects = projects.filter(p => {
    const rentalNames = (p.rentals || []).map(r => r.equipment.toLowerCase());
    const setupGear = (p.setup?.gear || '').toLowerCase();
    return rentalNames.some(r => gearNames.some(g => r.includes(g) || g.includes(r))) ||
           gearNames.some(g => setupGear.includes(g));
  });

  // Map date → projects
  const dateMap = {};
  gearProjects.forEach(p => {
    const dates = [p.date, p.end_date, ...(p.extra_dates || [])].filter(Boolean);
    dates.forEach(d => {
      if (!dateMap[d]) dateMap[d] = [];
      if (!dateMap[d].find(x => x.id === p.id)) dateMap[d].push(p);
    });
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const fmtDate = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedDateStr = selectedDay ? fmtDate(viewYear, viewMonth, selectedDay) : null;
  const selectedProjects = selectedDateStr ? (dateMap[selectedDateStr] || []) : [];

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', marginBottom: 12 }}>
        Projects using your gear — {Object.keys(dateMap).length} booked date(s)
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 6, color: '#aaa', padding: '5px 12px', cursor: 'pointer', fontSize: 14 }}>‹</button>
        <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'center' }}>
          {MONTHS[viewMonth]} {viewYear}
        </div>
        <button onClick={nextMonth} style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 6, color: '#aaa', padding: '5px 12px', cursor: 'pointer', fontSize: 14 }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ fontFamily: MONO, fontSize: 9, color: '#444', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = fmtDate(viewYear, viewMonth, day);
          const bookedProjects = dateMap[dateStr] || [];
          const isBooked = bookedProjects.length > 0;
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              style={{
                aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isSelected ? '#E81A1A' : isBooked ? 'rgba(232,26,26,0.15)' : '#111',
                border: isToday ? '1px solid #E81A1A' : isBooked ? '1px solid rgba(232,26,26,0.3)' : '1px solid transparent',
                color: isSelected ? '#fff' : isBooked ? '#E81A1A' : '#666',
                fontFamily: MONO, fontSize: 12, fontWeight: isBooked ? 700 : 400,
                position: 'relative',
                transition: 'all 0.1s',
              }}
            >
              {day}
              {isBooked && !isSelected && (
                <div style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: '#E81A1A',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ marginTop: 16, background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>
            {MONTHS[viewMonth]} {selectedDay} — {selectedProjects.length ? `${selectedProjects.length} project(s) using gear` : 'Gear available'}
          </div>
          {selectedProjects.length === 0 ? (
            <div style={{ fontSize: 12, color: '#7BC853' }}>✓ All gear available on this date</div>
          ) : (
            selectedProjects.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1A1A1A' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>{p.client}</div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', fontWeight: 700 }}>BOOKED</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}