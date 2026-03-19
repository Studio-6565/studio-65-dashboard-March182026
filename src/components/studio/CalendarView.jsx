import React, { useState } from 'react';
import { fmtDateRange, STATUS_STYLE } from '@/lib/studio';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getProjectDates(p) {
  const dates = new Set();
  if (p.date) dates.add(p.date);
  if (p.end_date && p.end_date !== p.date) {
    // fill range
    const start = new Date(p.date);
    const end = new Date(p.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.add(d.toISOString().split('T')[0]);
    }
  }
  (p.extra_dates || []).forEach(d => dates.add(d));
  return dates;
}

function CalendarDay({ date, dateStr, projects, onOpenDetail, isToday, isCurrentMonth }) {
  const dayProjects = projects.filter(p => getProjectDates(p).has(dateStr));

  return (
    <div style={{
      minHeight: 90,
      background: isCurrentMonth ? '#1A1A1A' : '#111',
      border: '1px solid #222',
      borderRadius: 6,
      padding: '6px 8px',
      position: 'relative',
    }}>
      <div style={{
        fontSize: 11,
        fontFamily: '"DM Mono", monospace',
        color: isToday ? '#E81A1A' : isCurrentMonth ? '#888' : '#444',
        fontWeight: isToday ? 700 : 400,
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        {isToday && <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#E81A1A', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{date}</span>}
        {!isToday && date}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {dayProjects.slice(0, 3).map(p => {
          const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
          return (
            <button
              key={p.id}
              onClick={() => onOpenDetail(p)}
              title={`${p.name} · ${p.client}`}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '2px 6px', borderRadius: 3,
                background: st.bg, border: `1px solid ${st.clr}22`,
                color: st.clr, fontSize: 10, fontWeight: 600,
                cursor: 'pointer', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: '"DM Mono", monospace',
              }}
            >
              {p.name}
            </button>
          );
        })}
        {dayProjects.length > 3 && (
          <div style={{ fontSize: 9, color: '#666', fontFamily: '"DM Mono", monospace', paddingLeft: 2 }}>
            +{dayProjects.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

function WeekView({ weekStart, projects, onOpenDetail }) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          const dayProjects = projects.filter(p => getProjectDates(p).has(dateStr));
          return (
            <div key={dateStr} style={{
              minHeight: 140,
              background: isToday ? '#1E1510' : '#1A1A1A',
              border: isToday ? '1px solid #E81A1A44' : '1px solid #222',
              borderRadius: 8,
              padding: '8px',
            }}>
              <div style={{
                fontSize: 13,
                fontFamily: '"DM Mono", monospace',
                color: isToday ? '#E81A1A' : '#666',
                fontWeight: isToday ? 700 : 400,
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 10, color: '#555' }}>{d.toLocaleDateString('en-CA', { weekday: 'short' })} </span>
                {d.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {dayProjects.map(p => {
                  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
                  return (
                    <button
                      key={p.id}
                      onClick={() => onOpenDetail(p)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '4px 8px', borderRadius: 5,
                        background: st.bg, border: `1px solid ${st.clr}33`,
                        color: st.clr, fontSize: 10, fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: '"DM Mono", monospace',
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.start_time && <div style={{ opacity: 0.7, marginTop: 1 }}>⏰ {p.start_time}</div>}
                      <div style={{ opacity: 0.6, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({ projects, onOpenDetail }) {
  const today = new Date();
  const [view, setView] = useState('month'); // 'month' | 'week'
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const todayStr = today.toISOString().split('T')[0];
  const activeProjects = projects.filter(p => !p.archived);

  // Month grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Count busy days this month
  const busyDaysCount = new Set(
    activeProjects.flatMap(p => [...getProjectDates(p)]).filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
  ).size;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {view === 'month' ? `${MONTHS[month]} ${year}` : `${weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </div>
          {view === 'month' && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', padding: '2px 8px', background: '#1E1E1E', borderRadius: 10 }}>{busyDaysCount} busy days</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#1E1E1E', borderRadius: 6, padding: 2, border: '1px solid #333' }}>
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                background: view === v ? '#2A2A2A' : 'transparent',
                color: view === v ? '#fff' : '#666', border: 'none', cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
              }}>{v}</button>
            ))}
          </div>
          <button onClick={view === 'month' ? prevMonth : prevWeek} style={{ width: 28, height: 28, borderRadius: 6, background: '#1E1E1E', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: 14 }}>‹</button>
          <button onClick={() => {
            if (view === 'month') { setMonth(today.getMonth()); setYear(today.getFullYear()); }
            else { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); setWeekStart(d); }
          }} style={{ padding: '4px 10px', borderRadius: 6, background: '#1E1E1E', border: '1px solid #333', color: '#aaa', fontSize: 11, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Today</button>
          <button onClick={view === 'month' ? nextMonth : nextWeek} style={{ width: 28, height: 28, borderRadius: 6, background: '#1E1E1E', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: 14 }}>›</button>
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} style={{ minHeight: 90, background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 6 }} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return (
                <CalendarDay
                  key={dateStr}
                  date={day}
                  dateStr={dateStr}
                  projects={activeProjects}
                  onOpenDetail={onOpenDetail}
                  isToday={dateStr === todayStr}
                  isCurrentMonth={true}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <WeekView weekStart={weekStart} projects={activeProjects} onOpenDetail={onOpenDetail} />
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLE).map(([status, st]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: st.bg, border: `1px solid ${st.clr}` }} />
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}