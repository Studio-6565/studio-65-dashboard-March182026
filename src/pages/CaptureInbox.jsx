import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import CaptureBar from '@/components/capture/CaptureBar';
import VoiceCaptureButton from '@/components/capture/VoiceCaptureButton';
import NeedsInputTray from '@/components/capture/NeedsInputTray';
import ClarificationChat from '@/components/capture/ClarificationChat';
import { Zap, CheckCircle2, Clock, Trash2, ArrowRight, CalendarClock, User, MessageSquare, Volume2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const PRIORITY_STYLE = {
  P1: { color: '#E81A1A', bg: 'rgba(232,26,26,0.1)', label: 'P1 Urgent' },
  P2: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'P2 Important' },
  P3: { color: '#555',    bg: 'rgba(100,100,100,0.08)', label: 'P3 Nice-to-have' },
};

const TYPE_EMOJI = {
  deliverable: '📦', decision: '🧠', 'follow-up': '📞',
  errand: '🏃', admin: '📋', note: '📝',
};

const EFFORT_COLOR = {
  '15min': '#7BC853', '30min': '#7BC853',
  '1hr': '#F59E0B', 'half-day': '#F59E0B', 'full-day': '#E81A1A',
};

const CONFIDENCE_COLOR = (c) => c >= 70 ? '#7BC853' : c >= 40 ? '#F59E0B' : '#E81A1A';

function ParseFlag({ task, onClarify }) {
  if (!task.parse_flag || task.parse_flag === 'auto-parsed') return null;

  if (task.parse_flag === 'review') {
    return (
      <button
        onClick={onClarify}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 5,
          color: '#F59E0B', fontSize: 9, fontWeight: 700, cursor: 'pointer',
          fontFamily: MONO,
        }}
      >
        <MessageSquare size={9} /> Review me
      </button>
    );
  }

  if (task.parse_flag === 'unparsed') {
    return (
      <button
        onClick={onClarify}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', background: 'rgba(232,26,26,0.1)',
          border: '1px solid rgba(232,26,26,0.3)', borderRadius: 5,
          color: '#E81A1A', fontSize: 9, fontWeight: 700, cursor: 'pointer',
          fontFamily: MONO,
        }}
      >
        <MessageSquare size={9} /> Clarify
      </button>
    );
  }

  return null;
}

function TaskCard({ task, onUpdate, contacts, projects }) {
  const [expanded, setExpanded] = useState(false);
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const p = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.P2;
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'done';
  const isVoice = task.parse_source === 'voice';

  const markDone = async (e) => {
    e.stopPropagation();
    await base44.entities.CaptureTask.update(task.id, { status: 'done' });
    onUpdate();
  };

  const snooze = async (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    await base44.entities.CaptureTask.update(task.id, { status: 'snoozed', snooze_until: d.toISOString().split('T')[0] });
    onUpdate();
    showToast(`Snoozed ${days}d`, 'blue');
  };

  const del = async (e) => {
    e.stopPropagation();
    if (!confirm('Delete task?')) return;
    await base44.entities.CaptureTask.delete(task.id);
    onUpdate();
  };

  return (
    <>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          background: task.status === 'done' ? '#0A0A0A' : '#0D0D0D',
          border: `1px solid ${isOverdue ? 'rgba(232,26,26,0.3)' : task.parse_flag === 'review' ? 'rgba(245,158,11,0.2)' : task.status === 'done' ? '#111' : '#1A1A1A'}`,
          borderLeft: `3px solid ${task.status === 'done' ? '#1A1A1A' : p.color}`,
          borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
          opacity: task.status === 'done' ? 0.5 : 1,
          transition: 'border-color 0.15s',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button
            onClick={markDone}
            style={{ flexShrink: 0, marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', color: task.status === 'done' ? '#7BC853' : '#333', padding: 0 }}
          >
            <CheckCircle2 size={16} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {isVoice && <span style={{ fontSize: 10 }}>🎙️</span>}
              <span style={{ fontSize: 13, fontWeight: task.status === 'done' ? 400 : 700, color: task.status === 'done' ? '#444' : '#fff', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                {TYPE_EMOJI[task.type] || '📋'} {task.title}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: p.bg, color: p.color, fontWeight: 700 }}>{task.priority}</span>
              {task.type && <span style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{task.type}</span>}
              {task.effort && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: EFFORT_COLOR[task.effort] || '#555' }}>~{task.effort}</span>
              )}
              {task.confidence != null && task.parse_source === 'voice' && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: CONFIDENCE_COLOR(task.confidence) }}>{task.confidence}%</span>
              )}
              <ParseFlag task={task} onClarify={(e) => { e?.stopPropagation?.(); setClarifyOpen(true); }} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
              {task.who_asked && task.who_asked !== 'self' && task.who_asked !== 'unspecified' && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#555', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <User size={9} /> {task.who_asked} asked
                </span>
              )}
              {task.client && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF' }}>→ {task.client}</span>
              )}
              {task.linked_project_name && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA' }}>📁 {task.linked_project_name}</span>
              )}
              {task.due_date && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: isOverdue ? '#E81A1A' : '#666', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CalendarClock size={9} /> {task.due_date}{isOverdue ? ' ⚠ overdue' : ''}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={(e) => { e.stopPropagation(); snooze(1); }} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 6, color: '#555', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>+1d</button>
            <button onClick={(e) => { e.stopPropagation(); snooze(7); }} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 6, color: '#555', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>+1w</button>
            <button onClick={del} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 6, color: '#444', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={10} />
            </button>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1A1A1A' }}>
            {task.transcript_snippet && (
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{task.transcript_snippet}"
              </div>
            )}
            {!task.transcript_snippet && task.raw_input && (
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{task.raw_input}"
              </div>
            )}
            {task.audio_url && (
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Volume2 size={11} color="#555" />
                <audio controls src={task.audio_url} style={{ height: 28, opacity: 0.7 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setClarifyOpen(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 7, color: '#4A9EFF', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
              >
                <MessageSquare size={11} /> Clarify with AI
              </button>
              <button
                onClick={async (e) => { e.stopPropagation(); await base44.entities.CaptureTask.update(task.id, { status: 'converted' }); onUpdate(); showToast('Marked as converted', 'blue'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 7, color: '#4A9EFF', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
              >
                <ArrowRight size={11} /> Convert to Project Task
              </button>
            </div>
          </div>
        )}
      </div>

      {clarifyOpen && (
        <ClarificationChat
          task={task}
          contacts={contacts}
          projects={projects}
          onClose={() => setClarifyOpen(false)}
          onResolved={() => { setClarifyOpen(false); onUpdate(); }}
        />
      )}
    </>
  );
}

export default function CaptureInbox() {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('inbox');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const load = useCallback(async () => {
    const [ts, cs, ps] = await Promise.all([
      base44.entities.CaptureTask.list('-created_date', 300),
      base44.entities.Contact.list('name', 100),
      base44.entities.Project.list('-date', 100),
    ]);
    setTasks(ts);
    setContacts(cs);
    setProjects(ps.filter(p => !p.archived && !p.is_test));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Wake snoozed tasks
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    tasks.filter(t => t.status === 'snoozed' && t.snooze_until && t.snooze_until <= today).forEach(t => {
      base44.entities.CaptureTask.update(t.id, { status: 'inbox', snooze_until: null });
    });
  }, [tasks]);

  // Separate needs_input tray
  const needsInputTasks = tasks.filter(t => t.status === 'needs_input');

  const filtered = tasks.filter(t => {
    if (t.status === 'needs_input') return false; // shown separately
    if (filter === 'inbox' && t.status !== 'inbox') return false;
    if (filter === 'snoozed' && t.status !== 'snoozed') return false;
    if (filter === 'done' && t.status !== 'done') return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  // Sort: P1 first, then by due_date
  const sorted = [...filtered].sort((a, b) => {
    const pOrder = { P1: 0, P2: 1, P3: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    return 0;
  });

  const inboxCount = tasks.filter(t => t.status === 'inbox').length;
  const reviewCount = tasks.filter(t => t.status === 'inbox' && t.parse_flag === 'review').length;

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#333', fontFamily: MONO, fontSize: 12 }}>Loading...</div>
  );

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', maxWidth: 800, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Zap size={20} color="#E81A1A" />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Capture Inbox</div>
          {inboxCount > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 8px', background: 'rgba(232,26,26,0.12)', color: '#E81A1A', borderRadius: 6, fontWeight: 700 }}>{inboxCount}</span>
          )}
          {needsInputTasks.length > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 8px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B', borderRadius: 6, fontWeight: 700 }}>{needsInputTasks.length} need input</span>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Natural language capture · ⌘K text · 🎙 voice</div>
      </div>

      {/* Capture area — text + large voice button */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>
          <CaptureBar projects={projects} contacts={contacts} onTaskCreated={load} />
        </div>
        <VoiceCaptureButton
          projects={projects}
          contacts={contacts}
          onTasksCreated={() => load()}
          size="normal"
        />
      </div>

      {/* NEEDS INPUT TRAY — always at top */}
      {needsInputTasks.length > 0 && (
        <NeedsInputTray
          tasks={needsInputTasks}
          contacts={contacts}
          projects={projects}
          onUpdate={load}
        />
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          ['inbox', `Inbox${inboxCount > 0 ? ` (${inboxCount})` : ''}`],
          ['snoozed', 'Snoozed'],
          ['done', 'Done'],
          ['all', 'All']
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, border: `1px solid ${filter === k ? '#E81A1A' : '#1E1E1E'}`, background: filter === k ? 'rgba(232,26,26,0.1)' : 'transparent', color: filter === k ? '#E81A1A' : '#555' }}>{l}</button>
        ))}
        <div style={{ width: 1, height: 18, background: '#1E1E1E' }} />
        {['all', 'deliverable', 'decision', 'follow-up', 'errand', 'admin', 'note'].map(k => (
          <button key={k} onClick={() => setTypeFilter(k)} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: MONO, border: `1px solid ${typeFilter === k ? '#4A9EFF' : '#1A1A1A'}`, background: typeFilter === k ? 'rgba(74,158,255,0.08)' : 'transparent', color: typeFilter === k ? '#4A9EFF' : '#444' }}>{k === 'all' ? 'All types' : `${TYPE_EMOJI[k] || ''} ${k}`}</button>
        ))}
        <div style={{ width: 1, height: 18, background: '#1E1E1E' }} />
        {['all', 'P1', 'P2', 'P3'].map(k => (
          <button key={k} onClick={() => setPriorityFilter(k)} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: MONO, border: `1px solid ${priorityFilter === k ? '#F59E0B' : '#1A1A1A'}`, background: priorityFilter === k ? 'rgba(245,158,11,0.08)' : 'transparent', color: priorityFilter === k ? '#F59E0B' : '#444' }}>{k === 'all' ? 'All priority' : k}</button>
        ))}
        {reviewCount > 0 && (
          <>
            <div style={{ width: 1, height: 18, background: '#1E1E1E' }} />
            <button style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: MONO, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', cursor: 'default' }}>
              ⚠ {reviewCount} need review
            </button>
          </>
        )}
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, opacity: 0.07, marginBottom: 12 }}>⚡</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', lineHeight: 2 }}>
            {filter === 'inbox' ? 'Nothing in inbox.\nPress ⌘K or the mic button to capture.' : 'Nothing here.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(t => (
            <TaskCard key={t.id} task={t} onUpdate={load} contacts={contacts} projects={projects} />
          ))}
        </div>
      )}
    </div>
  );
}