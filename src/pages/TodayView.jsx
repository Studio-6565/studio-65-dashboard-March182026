import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import TodayTaskItem from '@/components/today/TodayTaskItem';
import SchoolDeadlineForm from '@/components/today/SchoolDeadlineForm';
import EodCheckinModal from '@/components/today/EodCheckinModal';
import WeekPlanModal from '@/components/today/WeekPlanModal';
import { Zap, Sun, AlertTriangle, Clock, Eye, GraduationCap, Plus, CalendarDays, Moon, ChevronRight } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const EFFORT_HOURS = { '15min': 0.25, '30min': 0.5, '1hr': 1, 'half-day': 4, 'full-day': 8 };
const AVAILABLE_HOURS = 8;

// Build a unified today item from different sources
function makeItem(type, obj) {
  switch (type) {
    case 'capture':
      return { id: obj.id, itemType: obj.type || 'admin', title: obj.title, priority: obj.priority || 'P2', effort: obj.effort, due_date: obj.due_date, sub: [obj.who_asked !== 'self' && obj.who_asked !== 'unspecified' && obj.who_asked, obj.client].filter(Boolean).join(' → '), roll_count: obj.roll_count || 0, _raw: obj };
    case 'shoot':
      return { id: `shoot_${obj.id}`, itemType: 'shoot', title: `🎬 SHOOT: ${obj.name}`, priority: 'P1', effort: 'full-day', due_date: obj.date, sub: `${obj.client}${obj.start_time ? ' · ' + obj.start_time : ''}${obj.address ? ' · ' + obj.address : ''}`, roll_count: 0, _raw: obj };
    case 'invoice':
      return { id: `inv_${obj.id}`, itemType: 'invoice', title: `Follow up on invoice: ${obj.name}`, priority: 'P1', effort: '15min', due_date: obj.invoice_due_date || obj.date, sub: `${obj.client} · $${obj.revenue || 0}`, roll_count: 0, _raw: obj };
    case 'contract':
      return { id: `ctr_${obj.id}`, itemType: 'contract', title: `Contract pending: ${obj.title}`, priority: 'P2', effort: '15min', due_date: null, sub: obj.contact_name, roll_count: 0, _raw: obj };
    case 'crew_pay':
      return { id: `crew_${obj.pid}_${obj.idx}`, itemType: 'crew_pay', title: `Pay ${obj.name} for ${obj.projectName}`, priority: 'P2', effort: '15min', due_date: obj.due_date || null, sub: `$${obj.cost}`, roll_count: 0, _raw: obj };
    case 'school':
      return { id: `school_${obj.id}`, itemType: 'school', title: obj.title, priority: obj.due_date === new Date().toISOString().split('T')[0] ? 'P1' : 'P2', effort: obj.effort, due_date: obj.due_date, sub: `${obj.course || ''}${obj.weight_pct ? ' · ' + obj.weight_pct + '%' : ''}`, roll_count: 0, _raw: obj };
    default:
      return null;
  }
}

function Section({ title, icon: Icon, color, items, onDone, onSnooze, emptyText }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={14} color={color} />
        <div style={{ fontFamily: MONO, fontSize: 10, color, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', background: '#111', border: '1px solid #1A1A1A', borderRadius: 4, padding: '1px 6px' }}>{items.length}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#2A2A2A', padding: '10px 0' }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <TodayTaskItem key={item.id} item={item} onDone={onDone} onSnooze={onSnooze} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TodayView() {
  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(); in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split('T')[0];

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [schoolDeadlines, setSchoolDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doneIds, setDoneIds] = useState(new Set());
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [showEod, setShowEod] = useState(false);
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const hour = new Date().getHours();

  const load = useCallback(async () => {
    const [ts, ps, cs, sd] = await Promise.all([
      base44.entities.CaptureTask.list('-created_date', 300),
      base44.entities.Project.list('-date', 200),
      base44.entities.Contract.list('-created_date', 100),
      base44.entities.SchoolDeadline.list('due_date', 100),
    ]);
    setTasks(ts);
    setProjects(ps.filter(p => !p.archived && !p.is_test));
    setContracts(cs);
    setSchoolDeadlines(sd.filter(s => !s.done));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Wake snoozed tasks
  useEffect(() => {
    tasks.filter(t => t.status === 'snoozed' && t.snooze_until && t.snooze_until <= today).forEach(t => {
      base44.entities.CaptureTask.update(t.id, { status: 'inbox', snooze_until: null }).then(load);
    });
  }, [tasks, today, load]);

  // Build unified item list
  const allItems = useMemo(() => {
    const items = [];

    // Capture tasks due today or overdue (inbox only)
    tasks.filter(t => t.status === 'inbox' && (t.due_date <= today || !t.due_date) && !doneIds.has(t.id))
      .forEach(t => items.push(makeItem('capture', t)));

    // Today's shoots
    projects.filter(p => p.date === today || (p.date && p.end_date && p.date <= today && p.end_date >= today))
      .forEach(p => items.push(makeItem('shoot', p)));

    // Overdue unpaid invoices
    projects.filter(p => !p.paid && p.status === 'Invoiced' && !doneIds.has(`inv_${p.id}`))
      .forEach(p => items.push(makeItem('invoice', p)));

    // Pending contract signatures
    contracts.filter(c => c.status === 'sent' && !doneIds.has(`ctr_${c.id}`))
      .forEach(c => items.push(makeItem('contract', c)));

    // Unpaid crew with due dates today or past
    projects.forEach(p => {
      (p.crew || []).forEach((c, idx) => {
        if (!c.paid && (c.due_date <= today || !c.due_date) && !doneIds.has(`crew_${p.id}_${idx}`)) {
          items.push(makeItem('crew_pay', { ...c, pid: p.id, idx, projectName: p.name }));
        }
      });
    });

    // School deadlines due today
    schoolDeadlines.filter(s => s.due_date === today && !doneIds.has(`school_${s.id}`))
      .forEach(s => items.push(makeItem('school', s)));

    return items.filter(Boolean);
  }, [tasks, projects, contracts, schoolDeadlines, today, doneIds]);

  // Watch list: items due in next 3 days (not today)
  const watchItems = useMemo(() => {
    const items = [];
    tasks.filter(t => t.status === 'inbox' && t.due_date > today && t.due_date <= in3DaysStr && !doneIds.has(t.id))
      .forEach(t => items.push(makeItem('capture', t)));
    schoolDeadlines.filter(s => s.due_date > today && s.due_date <= in3DaysStr && !doneIds.has(`school_${s.id}`))
      .forEach(s => items.push(makeItem('school', s)));
    projects.filter(p => p.date > today && p.date <= in3DaysStr)
      .forEach(p => items.push(makeItem('shoot', p)));
    return items.filter(Boolean);
  }, [tasks, projects, schoolDeadlines, today, in3DaysStr, doneIds]);

  // Separate P1 / P2 / P3
  const must = allItems.filter(i => i.priority === 'P1');
  const should = allItems.filter(i => i.priority === 'P2');
  const deferred = allItems.filter(i => i.priority === 'P3');

  // Capacity calc
  const totalEffortHours = allItems.reduce((s, i) => s + (EFFORT_HOURS[i.effort] || 0.5), 0);
  const isOvercommitted = totalEffortHours > AVAILABLE_HOURS;

  // Suggest deferrals when overcommitted: push P2s with smallest effort
  const pushSuggestions = useMemo(() => {
    if (!isOvercommitted) return [];
    return [...should].sort((a, b) => (EFFORT_HOURS[a.effort] || 0.5) - (EFFORT_HOURS[b.effort] || 0.5)).slice(0, 3);
  }, [isOvercommitted, should]);

  const handleDone = async (item) => {
    setDoneIds(prev => new Set([...prev, item.id]));
    if (item.itemType === 'school') {
      await base44.entities.SchoolDeadline.update(item._raw.id, { done: true });
    } else if (item._raw?.id && !item.id.includes('_')) {
      await base44.entities.CaptureTask.update(item._raw.id, { status: 'done' });
    }
    showToast('Done ✓', 'green');
    load();
  };

  const handleSnooze = async (item) => {
    if (item._raw?.id && !item.id.includes('_')) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      await base44.entities.CaptureTask.update(item._raw.id, { due_date: tomorrow.toISOString().split('T')[0] });
      showToast('Deferred to tomorrow', 'blue');
      load();
    }
  };

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  // EOD prompt: show button if hour >= 19
  const showEodPrompt = hour >= 19;

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', fontFamily: MONO, fontSize: 12, color: '#333' }}>Loading your day...</div>
  );

  const eodItems = [...must, ...should].map(i => i._raw).filter(i => i?.id && !i.id.includes?.('_'));

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', maxWidth: 700, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
              <Sun size={20} color="#F59E0B" style={{ marginRight: 8, verticalAlign: 'middle' }} />
              {greeting}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{dateLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowWeekPlan(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 9, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
              <CalendarDays size={12} /> Week Plan
            </button>
            <button onClick={() => setShowSchoolForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 9, color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
              <GraduationCap size={12} /> Add Deadline
            </button>
            {showEodPrompt && (
              <button onClick={() => setShowEod(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 9, color: '#F59E0B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
                <Moon size={12} /> End of Day
              </button>
            )}
          </div>
        </div>
      </div>

      {/* School deadline form */}
      {showSchoolForm && (
        <div style={{ marginBottom: 20 }}>
          <SchoolDeadlineForm onSaved={load} onClose={() => setShowSchoolForm(false)} />
        </div>
      )}

      {/* Capacity bar */}
      <div style={{ marginBottom: 20, padding: '12px 16px', background: isOvercommitted ? 'rgba(232,26,26,0.06)' : '#0D0D0D', border: `1px solid ${isOvercommitted ? 'rgba(232,26,26,0.25)' : '#1A1A1A'}`, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: isOvercommitted ? '#E81A1A' : '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
            {isOvercommitted && <AlertTriangle size={10} />}
            {isOvercommitted ? 'OVERCOMMITTED' : 'Capacity'} — {totalEffortHours.toFixed(1)}h / {AVAILABLE_HOURS}h
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{allItems.length} items</div>
        </div>
        <div style={{ height: 5, background: '#1A1A1A', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (totalEffortHours / AVAILABLE_HOURS) * 100)}%`, background: isOvercommitted ? '#E81A1A' : '#7BC853', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
        {isOvercommitted && pushSuggestions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', marginBottom: 5 }}>CONSIDER PUSHING:</div>
            {pushSuggestions.map(item => (
              <div key={item.id} style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginBottom: 2 }}>
                → {item.title} ({item.effort})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Must do today */}
      <Section
        title="Must Do Today"
        icon={AlertTriangle}
        color="#E81A1A"
        items={must}
        onDone={handleDone}
        onSnooze={null}
        emptyText="No P1s today — nice."
      />

      {/* Should do today */}
      <Section
        title="Should Do Today"
        icon={Zap}
        color="#F59E0B"
        items={should}
        onDone={handleDone}
        onSnooze={handleSnooze}
        emptyText="No P2s queued."
      />

      {/* Deferred P3s — collapsed */}
      {deferred.length > 0 && (
        <div style={{ marginBottom: 24, padding: '10px 14px', background: '#0A0A0A', border: '1px solid #111', borderRadius: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {deferred.length} P3 task{deferred.length !== 1 ? 's' : ''} auto-deferred
          </div>
        </div>
      )}

      {/* Watch list */}
      <Section
        title="Watch List — Next 3 Days"
        icon={Eye}
        color="#4A9EFF"
        items={watchItems}
        onDone={handleDone}
        onSnooze={null}
        emptyText="Nothing due in the next 3 days."
      />

      {/* School deadlines (all upcoming) */}
      {schoolDeadlines.filter(s => s.due_date > today).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <GraduationCap size={14} color="#A78BFA" />
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Upcoming School Deadlines</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {schoolDeadlines.filter(s => s.due_date > today).sort((a, b) => a.due_date.localeCompare(b.due_date)).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0D0D0D', border: '1px solid #1A1A1A', borderLeft: '3px solid #A78BFA', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>🎓 {s.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginTop: 3 }}>{s.course || ''}{s.due_time ? ' · ' + s.due_time : ''}{s.weight_pct ? ' · ' + s.weight_pct + '%' : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA' }}>{s.due_date}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginTop: 2 }}>{s.effort}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EOD Check-in prompt (8pm+) */}
      {showEodPrompt && (
        <div onClick={() => setShowEod(true)} style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)'}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', fontWeight: 700, marginBottom: 2 }}>🌙 End of Day Check-In</div>
            <div style={{ fontSize: 12, color: '#555' }}>What got done? What slipped? What was added?</div>
          </div>
          <ChevronRight size={16} color="#F59E0B" />
        </div>
      )}

      {/* Modals */}
      {showEod && <EodCheckinModal items={eodItems} date={today} onClose={() => setShowEod(false)} onCheckedIn={load} />}
      {showWeekPlan && <WeekPlanModal tasks={tasks} projects={projects} schoolDeadlines={schoolDeadlines} onClose={() => setShowWeekPlan(false)} />}
    </div>
  );
}