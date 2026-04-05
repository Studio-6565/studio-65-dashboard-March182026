import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ContentCalendar() {
  const [briefs, setBriefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.EditBrief.list('-created_date', 200),
      base44.entities.Project.list('-date', 200),
    ]).then(([b, p]) => {
      setBriefs(b);
      setProjects(p);
    }).finally(() => setLoading(false));
  }, []);

  // Merge briefs and projects into calendar items
  const calendarItems = useMemo(() => {
    const items = [];

    // Add EditBrief items (script deadlines)
    briefs.forEach(brief => {
      if (brief.deadline) {
        items.push({
          id: `brief_${brief.id}`,
          type: 'script',
          title: brief.project_name || 'Script Brief',
          date: brief.deadline,
          deadline: brief.deadline,
          color: '#A78BFA',
          description: brief.notes?.slice(0, 50),
          briefId: brief.id,
        });
      }
    });

    // Add Project items (production dates)
    projects.forEach(project => {
      if (project.date) {
        items.push({
          id: `project_${project.id}`,
          type: 'production',
          title: project.name,
          date: project.date,
          endDate: project.end_date,
          color: '#4A9EFF',
          description: `${project.client} • ${project.status}`,
          projectId: project.id,
        });
      }
    });

    return items;
  }, [briefs, projects]);

  // Get calendar days
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevDays = Array.from({ length: firstDay }, (_, i) => null);

  // Get items for a specific date
  const getItemsForDate = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarItems.filter(item => item.date === dateStr || item.endDate === dateStr);
  };

  // Handle drag and drop reschedule
  const handleDragEnd = async (result) => {
    const { draggableId, destination } = result;

    if (!destination) return;

    const [type, id] = draggableId.split('_');
    const dateStr = destination.droppableId;

    try {
      if (type === 'brief') {
        await base44.entities.EditBrief.update(id, { deadline: dateStr });
      } else if (type === 'project') {
        await base44.entities.Project.update(id, { date: dateStr });
      }

      // Refresh data
      const [b, p] = await Promise.all([
        base44.entities.EditBrief.list('-created_date', 200),
        base44.entities.Project.list('-date', 200),
      ]);
      setBriefs(b);
      setProjects(p);
      showToast('Rescheduled successfully!', 'green');
    } catch (error) {
      showToast('Failed to reschedule', 'red');
      console.error(error);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return <div style={{ padding: 40, color: '#555', fontFamily: MONO, fontSize: 12 }}>Loading calendar...</div>;
  }

  const allDays = [...prevDays, ...days];
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ maxWidth: 1400, paddingBottom: 60 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Content Calendar 📅</div>
          <div style={{ fontSize: 13, color: '#666', fontFamily: MONO }}>Drag items to reschedule | Scripts · Production · Deadlines</div>
        </div>

        {/* Calendar controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: '12px 16px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px 8px' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px 8px' }}>
            <ChevronRight size={20} />
          </button>
          <button onClick={goToToday} style={{
            marginLeft: 12, padding: '6px 12px', background: '#E81A1A', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO
          }}>
            Today
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 11, fontFamily: MONO }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#4A9EFF' }} />
            <span style={{ color: '#666' }}>Production</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#A78BFA' }} />
            <span style={{ color: '#666' }}>Script Deadline</span>
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #222' }}>
            {DAYS.map(day => (
              <div key={day} style={{
                padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                fontFamily: MONO, color: '#666', background: '#111', borderRight: '1px solid #222'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weeks.map((week, weekIdx) => (
              <React.Fragment key={weekIdx}>
                {week.map((day, dayIdx) => {
                  const items = day ? getItemsForDate(day) : [];
                  const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                  const isToday = day && new Date().toISOString().split('T')[0] === dateStr;
                  const isOtherMonth = !day || (day && (weekIdx === 0 && dayIdx < firstDay || weekIdx > 3 && day > daysInMonth));

                  return (
                    <Droppable key={dateStr || `empty_${weekIdx}_${dayIdx}`} droppableId={dateStr || 'none'} isDropDisabled={!dateStr}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            minHeight: 100,
                            padding: 8,
                            borderRight: '1px solid #222',
                            borderBottom: '1px solid #222',
                            background: isToday ? 'rgba(232,26,26,0.05)' : isOtherMonth ? '#0A0A0A' : '#111',
                            cursor: 'pointer',
                            ...provided.droppableProps.style,
                          }}
                          onClick={() => day && setSelectedItem(day)}
                        >
                          {day && (
                            <div style={{
                              fontSize: 11, fontWeight: 700, color: isToday ? '#E81A1A' : '#666',
                              marginBottom: 6, fontFamily: MONO
                            }}>
                              {day}
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {items.map((item, idx) => (
                              <Draggable key={item.id} draggableId={item.id} index={idx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      padding: '5px 6px',
                                      borderRadius: 4,
                                      background: item.color + '20',
                                      border: `1px solid ${item.color}40`,
                                      fontSize: 9,
                                      color: item.color,
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      cursor: 'grab',
                                      ...provided.draggableProps.style,
                                    }}
                                    title={item.title}
                                  >
                                    {item.type === 'production' && '📹 '}
                                    {item.type === 'script' && '✍️ '}
                                    {item.title}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>

                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Item details panel */}
        {selectedItem && (
          <div style={{ position: 'fixed', bottom: 20, right: 20, maxWidth: 300, background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 20, zIndex: 100 }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer' }}>×</button>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              {MONTHS[currentDate.getMonth()]} {selectedItem}, {currentDate.getFullYear()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
              {getItemsForDate(selectedItem).length > 0 ? (
                getItemsForDate(selectedItem).map(item => (
                  <div key={item.id} style={{ background: '#111', border: `1px solid ${item.color}40`, borderRadius: 6, padding: 8, borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ fontWeight: 700, color: item.color, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ color: '#888', fontSize: 10 }}>{item.description}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#555', fontFamily: MONO, fontSize: 10 }}>No events scheduled</div>
              )}
            </div>
          </div>
        )}

        {calendarItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#555' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📅</div>
            <div style={{ fontSize: 15 }}>No scripts or production dates scheduled yet.</div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}