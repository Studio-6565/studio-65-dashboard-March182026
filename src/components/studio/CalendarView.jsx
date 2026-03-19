import React, { useState } from 'react';
import { STATUS_STYLE } from '@/lib/studio';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONO = '"DM Mono", monospace';

function getProjectDates(p) {
  const dates = new Set();
  if (p.date) dates.add(p.date);
  if (p.end_date && p.end_date !== p.date) {
    for (let d = new Date(p.date); d <= new Date(p.end_date); d.setDate(d.getDate() + 1)) {
      dates.add(d.toISOString().split('T')[0]);
    }
  }
  (p.extra_dates || []).forEach(d => dates.add(d));
  return dates;
}

export default function CalendarView({ projects, onOpenDetail }) {
  const today = new Date();
  const [view, setView] = useState('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const todayStr = today.toISOString().split('T')[0];
  const active = projects.filter(p => !p.archived);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const busyDays = new Set(
    active.flatMap(p => [...getProjectDates(p)]).filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
  ).size;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {view === 'month'
              ? `${MONTHS[month]} ${year}`
              : `${weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`}
          </div>
          {view === 'month' && <span style={{ fontFamily: MONO, fontSize: 10, color: '#666', padding: '2px 8px', background: '#1E1E1E', borderRadius: 10 }}>{busyDays} busy days</span>}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#1E1E1E', borderRadius: 6, padding: 2, border: '1px solid #333' }}>
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                background: view === v ? '#2A2A2A' : 'transparent',
                color: view === v ? '#fff' : '#666', border: 'none', cursor: 'pointer', fontFamily: MONO,
              }}>{v}</button>
            ))}
          </div>
          <button onClick={view === 'month' ? prevMonth : prevWeek} style={{ width: 28, height: 28, borderRadius: 6, background: '#1E1E1E', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: 14 }}>‹</button>
          <button onClick={() => {
            if (view === 'month') { setMonth(today.getMonth()); setYear(today.getFullYear()); }
            else { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); setWeekStart(d); }
          }} style={{ padding: '4px 10px', borderRadius: 6, background: '#1E1E1E', border: '1px solid #333', color: '#aaa', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>Today</button>
          <button onClick={view === 'month' ? nextMonth : nextWeek} style={{ width: 28, height: 28, borderRadius: 6, background: '#1E1E1E', border: '1px solid #333', color: '#fff', cursor: 'pointer', fontSize: 14 }}>›</button>
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            {DAYS.map(d => (
              <div key={d} style={{ fontFamily: MONO, fontSize: 9, color: '#555', textAlign: 'center', padding: '3px 0', textTransform: 'uppercase' }}>{d[0]}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} style={{ minHeight: 64, background: '#0D0D0D', border: '1px solid #161616', borderRadius: 5 }} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayProjects = active.filter(p => getProjectDates(p).has(dateStr));
              return (
                <div key={dateStr} style={{ minHeight: 64, background: '#1A1A1A', border: isToday ? '1px solid #E81A1A55' : '1px solid #222', borderRadius: 5, padding: '4px 5px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: isToday ? '#E81A1A' : '#666', fontWeight: isToday ? 700 : 400, marginBottom: 3 }}>
                    {isToday ? <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#E81A1A', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{day}</span> : day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayProjects.slice(0, 2).map(p => {
                      const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
                      return (
                        <button key={p.id} onClick={() => onOpenDetail(p)} title={p.name} style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '1px 4px', borderRadius: 3,
                          background: st.bg, border: `1px solid ${st.clr}22`, color: st.clr,
                          fontSize: 9, fontWeight: 600, cursor: 'pointer', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: MONO,
                        }}>{p.name}</button>
                      );
                    })}
                    {dayProjects.length > 2 && <div style={{ fontSize: 8, color: '#555', fontFamily: MONO, paddingLeft: 2 }}>+{dayProjects.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week view — scrollable on mobile */}
      {view === 'week' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 500 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {weekDays.map(d => (
                <div key={d.toISOString()} style={{ fontFamily: MONO, fontSize: 9, color: '#555', textAlign: 'center', padding: '3px 0', textTransform: 'uppercase' }}>
                  {d.toLocaleDateString('en-CA', { weekday: 'short' })} {d.getDate()}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {weekDays.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const dayProjects = active.filter(p => getProjectDates(p).has(dateStr));
                return (
                  <div key={dateStr} style={{ minHeight: 120, background: isToday ? '#1E1510' : '#1A1A1A', border: isToday ? '1px solid #E81A1A44' : '1px solid #222', borderRadius: 8, padding: 7 }}>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: isToday ? '#E81A1A' : '#666', fontWeight: isToday ? 700 : 400, marginBottom: 5 }}>{d.getDate()}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {dayProjects.map(p => {
                        const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
                        return (
                          <button key={p.id} onClick={() => onOpenDetail(p)} style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', borderRadius: 5,
                            background: st.bg, border: `1px solid ${st.clr}33`, color: st.clr,
                            fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: MONO,
                          }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            {p.start_time && <div style={{ opacity: 0.7 }}>⏰ {p.start_time}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLE).map(([status, st]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: st.bg, border: `1px solid ${st.clr}` }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}