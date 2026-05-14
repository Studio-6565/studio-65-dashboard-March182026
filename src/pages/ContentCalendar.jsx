import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight, X, Zap, Calendar, Film, FileText, Plus } from 'lucide-react';
import { showToast } from '@/components/studio/StudioToast';
import ScriptScheduleModal from '@/components/script-engine/ScriptScheduleModal';

const MONO = '"DM Mono", monospace';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const LEGEND = [
  { color: '#4A9EFF', label: 'Shoot Day', icon: '📹' },
  { color: '#7BC853', label: 'Publish Date', icon: '🚀' },
  { color: '#A78BFA', label: 'Script Deadline', icon: '✍️' },
  { color: '#F59E0B', label: 'Script Version', icon: '⚡' },
];

export default function ContentCalendar() {
  const [briefs, setBriefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [scriptVersions, setScriptVersions] = useState([]);
  const [scheduledScripts, setScheduledScripts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null); // { version, date }
  const [activeFilter, setActiveFilter] = useState('all'); // all | shoots | scripts | published

  const loadData = async () => {
    const [b, p, sv, ss] = await Promise.all([
      base44.entities.EditBrief.list('-created_date', 200),
      base44.entities.Project.list('-date', 200),
      base44.entities.ScriptVersion.list('-created_date', 200),
      base44.entities.ContentSchedule.list('-scheduled_date', 200),
    ]);
    setBriefs(b);
    setProjects(p.filter(x => !x.archived && !x.is_test));
    setScriptVersions(sv);
    setScheduledScripts(ss);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Build a project map for quick lookup
  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  // Merge all calendar items
  const calendarItems = useMemo(() => {
    const items = [];

    // Shoot dates
    projects.forEach(project => {
      if (project.date && (activeFilter === 'all' || activeFilter === 'shoots')) {
        items.push({
          id: `project_${project.id}`,
          type: 'production',
          title: project.name,
          date: project.date,
          color: '#4A9EFF',
          description: `${project.client} · ${project.status}`,
          projectId: project.id,
          emoji: '📹',
        });
      }
      if (project.end_date && project.end_date !== project.date && (activeFilter === 'all' || activeFilter === 'shoots')) {
        items.push({
          id: `project_end_${project.id}`,
          type: 'production',
          title: project.name,
          date: project.end_date,
          color: '#4A9EFF',
          description: `${project.client} · Wrap`,
          projectId: project.id,
          emoji: '🎬',
        });
      }
    });

    // Script deadlines from EditBrief
    briefs.forEach(brief => {
      if (brief.deadline && (activeFilter === 'all' || activeFilter === 'scripts')) {
        items.push({
          id: `brief_${brief.id}`,
          type: 'script_deadline',
          title: brief.project_name || 'Script Deadline',
          date: brief.deadline,
          color: '#A78BFA',
          description: brief.notes?.slice(0, 60),
          briefId: brief.id,
          emoji: '✍️',
        });
      }
    });

    // Scheduled content (ContentSchedule)
    scheduledScripts.forEach(s => {
      if (s.scheduled_date && (activeFilter === 'all' || activeFilter === 'published')) {
        items.push({
          id: `schedule_${s.id}`,
          type: 'publish',
          title: s.title,
          date: s.scheduled_date,
          color: '#7BC853',
          description: `${s.client_name} · ${s.platform}`,
          scheduleId: s.id,
          platform: s.platform,
          emoji: '🚀',
        });
      }
    });

    // Script versions with project dates (show as "pending schedule" markers)
    scriptVersions.forEach(sv => {
      const proj = projectMap[sv.project_id];
      if (!proj || !proj.date) return;
      const alreadyScheduled = scheduledScripts.some(s => s.project_id === sv.project_id);
      if (!alreadyScheduled && (activeFilter === 'all' || activeFilter === 'scripts')) {
        items.push({
          id: `version_${sv.id}`,
          type: 'script_version',
          title: sv.label || sv.project_name,
          date: proj.date,
          color: '#F59E0B',
          description: `v${sv.version_number} · ${sv.platform || 'Script'}`,
          versionId: sv.id,
          version: sv,
          project: proj,
          emoji: '⚡',
        });
      }
    });

    return items;
  }, [briefs, projects, scriptVersions, scheduledScripts, activeFilter, projectMap]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const getDateStr = (day) =>
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getItemsForDate = (day) => {
    if (!day) return [];
    const dateStr = getDateStr(day);
    return calendarItems.filter(item => item.date === dateStr);
  };

  const handleDragEnd = async (result) => {
    const { draggableId, destination } = result;
    if (!destination || !destination.droppableId || destination.droppableId === 'none') return;

    const dateStr = destination.droppableId;
    const [type, id] = draggableId.split('_');

    try {
      if (type === 'brief') {
        await base44.entities.EditBrief.update(id, { deadline: dateStr });
      } else if (type === 'project') {
        await base44.entities.Project.update(id, { date: dateStr });
      } else if (type === 'schedule') {
        await base44.entities.ContentSchedule.update(id, { scheduled_date: dateStr });
      }
      await loadData();
      showToast('Rescheduled!', 'green');
    } catch {
      showToast('Failed to reschedule', 'red');
    }
  };

  const handleScheduleScript = (version, date) => {
    setScheduleModal({ version, date });
  };

  const handleScheduled = async () => {
    await loadData();
    setScheduleModal(null);
    showToast('Script scheduled!', 'green');
  };

  const allDays = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#444', fontFamily: MONO, fontSize: 12 }}>
      Loading calendar...
    </div>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ maxWidth: 1400, paddingBottom: 60, fontFamily: 'Syne, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Content Calendar</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 4 }}>Shoots · Scripts · Publishing deadlines — drag to reschedule</div>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'shoots', label: '📹 Shoots' },
              { key: 'scripts', label: '⚡ Scripts' },
              { key: 'published', label: '🚀 Published' },
            ].map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: MONO, border: `1px solid ${activeFilter === f.key ? '#E81A1A' : '#222'}`,
                background: activeFilter === f.key ? 'rgba(232,26,26,0.1)' : 'transparent',
                color: activeFilter === f.key ? '#E81A1A' : '#555', transition: 'all 0.15s',
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            style={{ width: 32, height: 32, borderRadius: 8, background: '#111', border: '1px solid #222', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            style={{ width: 32, height: 32, borderRadius: 8, background: '#111', border: '1px solid #222', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
            Today
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, color: '#666' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 14, overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1A1A1A' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, fontFamily: MONO, color: '#444', background: '#0D0D0D', borderRight: '1px solid #1A1A1A' }}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weeks.map((week, wi) => (
              <React.Fragment key={wi}>
                {week.map((day, di) => {
                  const items = getItemsForDate(day);
                  const dateStr = day ? getDateStr(day) : '';
                  const isToday = dateStr === todayStr;
                  const isSelected = selectedDay === dateStr;

                  return (
                    <Droppable key={dateStr || `e_${wi}_${di}`} droppableId={dateStr || 'none'} isDropDisabled={!dateStr}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          onClick={() => day && setSelectedDay(isSelected ? null : dateStr)}
                          style={{
                            minHeight: 90,
                            padding: '6px 6px 6px 8px',
                            borderRight: '1px solid #1A1A1A',
                            borderBottom: '1px solid #1A1A1A',
                            background: snapshot.isDraggingOver
                              ? 'rgba(232,26,26,0.06)'
                              : isSelected
                                ? 'rgba(74,158,255,0.05)'
                                : isToday
                                  ? 'rgba(232,26,26,0.04)'
                                  : !day ? '#0A0A0A' : 'transparent',
                            cursor: day ? 'pointer' : 'default',
                            transition: 'background 0.1s',
                          }}
                        >
                          {day && (
                            <div style={{
                              fontSize: 11, fontWeight: isToday ? 800 : 600,
                              color: isToday ? '#E81A1A' : '#555',
                              marginBottom: 5, fontFamily: MONO,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                              <span style={isToday ? { background: '#E81A1A', color: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 } : {}}>{day}</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {items.slice(0, 3).map((item, idx) => (
                              <Draggable key={item.id} draggableId={item.id} index={idx} isDragDisabled={item.type === 'script_version'}>
                                {(prov, snap) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (item.type === 'script_version') handleScheduleScript(item.version, dateStr);
                                    }}
                                    style={{
                                      padding: '3px 6px',
                                      borderRadius: 4,
                                      background: item.color + '18',
                                      border: `1px solid ${item.color}35`,
                                      fontSize: 9, color: item.color, fontWeight: 600,
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      cursor: item.type === 'script_version' ? 'pointer' : 'grab',
                                      fontFamily: MONO,
                                      ...prov.draggableProps.style,
                                    }}
                                    title={item.type === 'script_version' ? 'Click to schedule this script' : item.title}
                                  >
                                    {item.emoji} {item.title}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {items.length > 3 && (
                              <div style={{ fontSize: 9, color: '#444', fontFamily: MONO, padding: '1px 4px' }}>+{items.length - 3} more</div>
                            )}
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

        {/* Day detail panel */}
        {selectedDay && (
          <DayDetailPanel
            dateStr={selectedDay}
            items={calendarItems.filter(i => i.date === selectedDay)}
            projects={projects}
            scriptVersions={scriptVersions}
            onClose={() => setSelectedDay(null)}
            onScheduleScript={handleScheduleScript}
            onDataChange={loadData}
          />
        )}

        {/* Schedule modal */}
        {scheduleModal && (
          <ScriptScheduleModal
            version={scheduleModal.version}
            defaultDate={scheduleModal.date}
            projects={projects}
            onScheduled={handleScheduled}
            onClose={() => setScheduleModal(null)}
          />
        )}
      </div>
    </DragDropContext>
  );
}

// ── Day detail side panel ──────────────────────────────────────────────────────
function DayDetailPanel({ dateStr, items, projects, scriptVersions, onClose, onScheduleScript, onDataChange }) {
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const date = new Date(dateStr + 'T00:00:00');
  const label = date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  // Scripts available to schedule on this day (linked to projects shooting around this date)
  const unscheduledVersions = scriptVersions.filter(sv => {
    const proj = projects.find(p => p.id === sv.project_id);
    return proj && !items.some(i => i.versionId === sv.id);
  }).slice(0, 10);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 340,
      background: '#0D0D0D', border: '1px solid #1A1A1A', borderLeft: '1px solid #222',
      zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{label}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>{items.length} event{items.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', border: '1px solid #222', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      {/* Events */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333', fontFamily: MONO, fontSize: 11 }}>Nothing scheduled</div>
        )}

        {items.map(item => (
          <div key={item.id} style={{
            background: '#111', border: `1px solid ${item.color}25`, borderLeft: `3px solid ${item.color}`,
            borderRadius: 10, padding: '12px 14px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {item.emoji} {item.title}
            </div>
            {item.description && <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{item.description}</div>}
            <div style={{ fontFamily: MONO, fontSize: 9, color: item.color, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {item.type === 'production' && 'Shoot Day'}
              {item.type === 'script_deadline' && 'Script Deadline'}
              {item.type === 'publish' && `Publish · ${item.platform || ''}`}
              {item.type === 'script_version' && 'Script (unscheduled)'}
            </div>
          </div>
        ))}

        {/* Schedule a script */}
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowSchedulePicker(v => !v)} style={{
            width: '100%', padding: '10px 14px', background: 'transparent', border: '1px dashed #222',
            borderRadius: 10, color: '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO,
          }}>
            <Plus size={13} /> Schedule a Script on this day
          </button>

          {showSchedulePicker && unscheduledVersions.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unscheduledVersions.map(sv => (
                <button key={sv.id} onClick={() => { onScheduleScript(sv, dateStr); setShowSchedulePicker(false); }} style={{
                  textAlign: 'left', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8,
                  padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>⚡ {sv.label || sv.project_name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>v{sv.version_number} · {sv.platform || 'Script'}</div>
                </button>
              ))}
            </div>
          )}
          {showSchedulePicker && unscheduledVersions.length === 0 && (
            <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: '#444', textAlign: 'center', padding: '10px 0' }}>
              No unscheduled scripts available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}