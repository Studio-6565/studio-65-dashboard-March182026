import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function CrewAvailabilityCalendar({ projects, selectedCrew, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build a map of which crew members are booked on which dates
  const crewBookings = {};
  projects.forEach(p => {
    if (!p.date) return;
    const dateStr = p.date;
    const endDateStr = p.end_date || p.date;
    
    (p.crew || []).forEach(c => {
      if (!crewBookings[c.name]) crewBookings[c.name] = new Set();
      
      // Add all dates in range
      let current = new Date(dateStr);
      const end = new Date(endDateStr);
      while (current <= end) {
        crewBookings[c.name].add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
  });

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isDateBooked = (day) => {
    if (!selectedCrew || !day) return false;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return crewBookings[selectedCrew]?.has(dateStr) || false;
  };

  const getProjectsOnDate = (day) => {
    if (!selectedCrew || !day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return projects.filter(p => {
      const pStart = new Date(p.date);
      const pEnd = new Date(p.end_date || p.date);
      const checkDate = new Date(dateStr);
      return checkDate >= pStart && checkDate <= pEnd && (p.crew || []).some(c => c.name === selectedCrew);
    });
  };

  const monthYear = currentMonth.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  return (
    <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px 8px' }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {monthYear}
        </div>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px 8px' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {!selectedCrew && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#666', fontSize: 12 }}>
          Select a crew member to view availability
        </div>
      )}

      {selectedCrew && (
        <>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#666', fontFamily: MONO, padding: '6px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {days.map((day, i) => {
              const booked = isDateBooked(day);
              const projectsOnDay = getProjectsOnDate(day);
              const hasDoubleBook = projectsOnDay.length > 1;

              return (
                <div
                  key={i}
                  onClick={() => day && onSelectDate ? onSelectDate(day) : null}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: day && !booked ? 'pointer' : booked ? 'default' : 'default',
                    background: !day ? 'transparent' : booked ? (hasDoubleBook ? 'rgba(232,26,26,0.25)' : 'rgba(232,26,26,0.08)') : '#1E1E1E',
                    border: `1px solid ${!day ? 'transparent' : booked ? (hasDoubleBook ? 'rgba(232,26,26,0.6)' : 'rgba(232,26,26,0.25)') : '#333'}`,
                    color: booked ? '#E81A1A' : '#fff',
                    position: 'relative',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (day && booked) {
                      e.currentTarget.style.background = hasDoubleBook ? 'rgba(232,26,26,0.35)' : 'rgba(232,26,26,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (day && booked) {
                      e.currentTarget.style.background = hasDoubleBook ? 'rgba(232,26,26,0.25)' : 'rgba(232,26,26,0.08)';
                    }
                  }}
                >
                  {day && (
                    <>
                      <span>{day}</span>
                      {hasDoubleBook && (
                        <div style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#E81A1A',
                        }} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: '#1E1E1E', border: '1px solid #333' }} />
              <span style={{ color: '#666' }}>Available</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.25)' }} />
              <span style={{ color: '#666' }}>Booked</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(232,26,26,0.25)', border: '1px solid rgba(232,26,26,0.6)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 1, right: 1, width: 3, height: 3, borderRadius: '50%', background: '#E81A1A' }} />
              </div>
              <span style={{ color: '#E81A1A', fontWeight: 700 }}>⚠ Double-booked</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}