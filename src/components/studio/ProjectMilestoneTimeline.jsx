import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const MONO = '"DM Mono", monospace';

// Derive milestone dates from project fields
function buildMilestones(project) {
  const shoot = project.date || null;
  const shootEnd = project.end_date || shoot;

  // Pre-prod: 7 days before shoot
  const preProd = shoot ? offsetDate(shoot, -7) : null;
  // Edit starts day after shoot ends
  const editStart = shootEnd ? offsetDate(shootEnd, 1) : null;
  // Review: 5 days after edit start
  const review = editStart ? offsetDate(editStart, 5) : null;
  // Delivery: 3 days after review
  const delivery = review ? offsetDate(review, 3) : null;

  return [
    {
      id: 'preprod',
      label: 'Pre-Production',
      emoji: '📋',
      date: project.milestone_preprod || preProd,
      dateKey: 'milestone_preprod',
      color: '#4A9EFF',
      done: !!project.milestone_preprod_done,
      doneKey: 'milestone_preprod_done',
      description: 'Shot list, crew booking, gear prep',
    },
    {
      id: 'shoot',
      label: 'Shoot Day',
      emoji: '🎬',
      date: project.date || null,
      dateKey: 'date',
      color: '#E81A1A',
      done: ['In Production', 'In Edit', 'Delivered', 'Invoiced'].includes(project.status),
      doneKey: null, // derived from status
      description: project.start_time ? `Call time ${project.start_time}` : 'Production day',
      locked: false,
    },
    {
      id: 'edit',
      label: 'Editing',
      emoji: '✂️',
      date: project.milestone_edit || editStart,
      dateKey: 'milestone_edit',
      color: '#A78BFA',
      done: !!project.milestone_edit_done,
      doneKey: 'milestone_edit_done',
      description: 'Cut, colour grade, audio mix',
    },
    {
      id: 'review',
      label: 'Client Review',
      emoji: '👁️',
      date: project.milestone_review || review,
      dateKey: 'milestone_review',
      color: '#F59E0B',
      done: !!project.milestone_review_done,
      doneKey: 'milestone_review_done',
      description: 'Client feedback & revisions',
    },
    {
      id: 'delivery',
      label: 'Delivery',
      emoji: '🚀',
      date: project.milestone_delivery || delivery,
      dateKey: 'milestone_delivery',
      color: '#7BC853',
      done: project.status === 'Delivered' || project.status === 'Invoiced' || !!project.milestone_delivery_done,
      doneKey: 'milestone_delivery_done',
      description: 'Final files delivered to client',
    },
  ];
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / 86400000);
}

export default function ProjectMilestoneTimeline({ project, onUpdate }) {
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [editingDate, setEditingDate] = useState(null); // milestone id being edited

  const milestones = buildMilestones(project);

  const update = async (changes) => {
    const updated = { ...project, ...changes };
    onUpdate(updated);
    await base44.entities.Project.update(project.id, updated);
  };

  const toggleDone = async (m) => {
    if (!m.doneKey) return; // status-derived
    await update({ [m.doneKey]: !m.done });
    showToast(m.done ? `${m.label} unmarked` : `${m.label} complete ✓`, m.done ? 'amber' : 'green');
  };

  const handleDateChange = async (m, newDate) => {
    await update({ [m.dateKey]: newDate });
    setEditingDate(null);
    showToast(`${m.label} date updated`, 'blue');
  };

  // Drag to reorder dates
  const handleDragStart = (id) => setDragging(id);
  const handleDrop = async (targetId) => {
    if (!dragging || dragging === targetId) { setDragOver(null); setDragging(null); return; }
    const src = milestones.find(m => m.id === dragging);
    const tgt = milestones.find(m => m.id === targetId);
    if (!src || !tgt || !src.dateKey || !tgt.dateKey) { setDragOver(null); setDragging(null); return; }
    // Swap dates
    const changes = { [src.dateKey]: tgt.date, [tgt.dateKey]: src.date };
    await update(changes);
    showToast('Dates swapped', 'blue');
    setDragOver(null); setDragging(null);
  };

  // Progress: % of milestones done
  const doneCount = milestones.filter(m => m.done).length;
  const progress = Math.round((doneCount / milestones.length) * 100);

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Project Progress
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: progress === 100 ? '#7BC853' : '#fff', fontWeight: 700 }}>
            {doneCount}/{milestones.length} · {progress}%
          </div>
        </div>
        <div style={{ height: 6, background: '#1A1A1A', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: progress === 100 ? '#7BC853' : 'linear-gradient(90deg, #E81A1A, #F59E0B)',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Horizontal connector line */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: 20,
          left: '10%',
          right: '10%',
          height: 2,
          background: '#1E1E1E',
          zIndex: 0,
        }} />
        {/* Filled progress line */}
        <div style={{
          position: 'absolute',
          top: 20,
          left: '10%',
          width: `${Math.max(0, (doneCount - 1) / (milestones.length - 1)) * 80}%`,
          height: 2,
          background: 'linear-gradient(90deg, #E81A1A, #7BC853)',
          zIndex: 1,
          transition: 'width 0.4s ease',
        }} />

        {/* Milestones row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          {milestones.map((m) => {
            const days = daysUntil(m.date);
            const isOverdue = days !== null && days < 0 && !m.done;
            const isToday = days === 0;
            const isSoon = days !== null && days > 0 && days <= 3;
            return (
              <div
                key={m.id}
                draggable={!!m.dateKey}
                onDragStart={() => handleDragStart(m.id)}
                onDragOver={e => { e.preventDefault(); setDragOver(m.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(m.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: m.dateKey ? 'grab' : 'default',
                  opacity: dragging === m.id ? 0.5 : 1,
                }}
              >
                {/* Circle node */}
                <button
                  onClick={() => m.doneKey ? toggleDone(m) : null}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: `2px solid ${m.done ? m.color : dragOver === m.id ? m.color : '#2A2A2A'}`,
                    background: m.done ? m.color + '22' : dragOver === m.id ? m.color + '15' : '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    cursor: m.doneKey ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    boxShadow: m.done ? `0 0 12px ${m.color}40` : isToday ? `0 0 10px ${m.color}60` : 'none',
                    flexShrink: 0,
                  }}
                  title={m.doneKey ? (m.done ? `Mark ${m.label} incomplete` : `Mark ${m.label} complete`) : ''}
                >
                  {m.done ? '✓' : m.emoji}
                </button>

                {/* Label */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.done ? m.color : '#ccc', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </div>

                  {/* Date — click to edit */}
                  {editingDate === m.id ? (
                    <input
                      type="date"
                      defaultValue={m.date || ''}
                      autoFocus
                      onBlur={e => handleDateChange(m, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleDateChange(m, e.target.value); if (e.key === 'Escape') setEditingDate(null); }}
                      style={{
                        background: '#1A1A1A', border: `1px solid ${m.color}`, borderRadius: 5,
                        color: '#fff', fontSize: 9, padding: '2px 4px', outline: 'none',
                        fontFamily: MONO, marginTop: 3, width: 90,
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => m.dateKey && setEditingDate(m.id)}
                      style={{
                        background: 'none', border: 'none', cursor: m.dateKey ? 'pointer' : 'default',
                        padding: 0, marginTop: 2,
                      }}
                    >
                      <div style={{
                        fontFamily: MONO, fontSize: 9,
                        color: isOverdue ? '#E81A1A' : isToday ? '#F59E0B' : isSoon ? '#F59E0B' : '#555',
                      }}>
                        {m.date || '—'}
                      </div>
                      {days !== null && !m.done && (
                        <div style={{
                          fontFamily: MONO, fontSize: 9,
                          color: isOverdue ? '#E81A1A' : isToday ? '#F59E0B' : '#444',
                        }}>
                          {isOverdue ? `${Math.abs(days)}d overdue` : isToday ? 'today' : `in ${days}d`}
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {milestones.map((m) => {
          const days = daysUntil(m.date);
          const isOverdue = days !== null && days < 0 && !m.done;
          return (
            <div
              key={m.id}
              style={{
                background: m.done ? '#0D0D0D' : '#111',
                border: `1px solid ${isOverdue ? 'rgba(232,26,26,0.3)' : m.done ? '#1A1A1A' : '#1E1E1E'}`,
                borderLeft: `3px solid ${m.done ? m.color : isOverdue ? '#E81A1A' : '#2A2A2A'}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: m.done ? 0.65 : 1,
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0 }}>{m.done ? '✅' : m.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: m.done ? '#666' : '#fff', textDecoration: m.done ? 'line-through' : 'none' }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 2 }}>
                  {m.description}
                </div>
              </div>

              {/* Date badge */}
              <div
                onClick={() => m.dateKey && setEditingDate(editingDate === m.id ? null : m.id)}
                style={{
                  fontFamily: MONO, fontSize: 10, padding: '4px 10px',
                  borderRadius: 6,
                  background: isOverdue && !m.done ? 'rgba(232,26,26,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOverdue && !m.done ? 'rgba(232,26,26,0.3)' : '#222'}`,
                  color: isOverdue && !m.done ? '#E81A1A' : '#666',
                  cursor: m.dateKey ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {editingDate === m.id ? (
                  <input
                    type="date"
                    defaultValue={m.date || ''}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onBlur={e => handleDateChange(m, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleDateChange(m, e.target.value); if (e.key === 'Escape') setEditingDate(null); }}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: 10, outline: 'none', fontFamily: MONO, width: 90 }}
                  />
                ) : (
                  <>📅 {m.date || 'Set date'}</>
                )}
              </div>

              {/* Done toggle */}
              {m.doneKey && (
                <button
                  onClick={() => toggleDone(m)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${m.done ? m.color + '50' : '#2A2A2A'}`,
                    background: m.done ? m.color + '18' : 'transparent',
                    color: m.done ? m.color : '#444',
                    fontFamily: MONO,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {m.done ? '✓ Done' : 'Mark Done'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginTop: 14, textAlign: 'center' }}>
        Drag milestones in the diagram to swap dates · Click a date to edit · Click a node to toggle done
      </div>
    </div>
  );
}