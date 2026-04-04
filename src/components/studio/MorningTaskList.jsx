import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const MONO = '"DM Mono", monospace';
const TODAY = new Date().toISOString().split('T')[0];

const DEFAULT_TASKS = [
  'Check emails & messages',
  'Review today\'s shoot schedule',
  'Confirm crew availability',
  'Back up footage from yesterday',
  'Follow up on unpaid invoices',
];

export default function MorningTaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const all = await base44.entities.DailyTask.list('order', 100);

      // Auto-reset tasks completed on a previous day
      const toReset = all.filter(t => t.done && t.done_date && t.done_date < TODAY);
      let current = all;
      if (toReset.length > 0) {
        await Promise.all(toReset.map(t =>
          base44.entities.DailyTask.update(t.id, { ...t, done: false, done_date: null })
        ));
        current = await base44.entities.DailyTask.list('order', 100);
      }

      // Seed defaults only if truly empty (after reset check)
      if (current.length === 0) {
        const created = await Promise.all(
          DEFAULT_TASKS.map((label, i) =>
            base44.entities.DailyTask.create({ label, done: false, order: i })
          )
        );
        setTasks(created);
      } else {
        setTasks(current);
      }
      setLoading(false);
    };
    init();
  }, []);

  const toggle = async (task) => {
    const updated = { ...task, done: !task.done, done_date: !task.done ? TODAY : null };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await base44.entities.DailyTask.update(task.id, updated);
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const created = await base44.entities.DailyTask.create({
      label: newTask.trim(),
      done: false,
      order: tasks.length,
    });
    setTasks(prev => [...prev, created]);
    setNewTask('');
    setAdding(false);
  };

  const deleteTask = async (id) => {
    await base44.entities.DailyTask.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const resetAll = async () => {
    const updates = tasks.filter(t => t.done).map(t => {
      const updated = { ...t, done: false, done_date: null };
      base44.entities.DailyTask.update(t.id, updated);
      return updated;
    });
    setTasks(prev => prev.map(t => updates.find(u => u.id === t.id) || t));
    showToast('Tasks reset', 'blue');
  };

  if (loading) return null;

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const allDone = total > 0 && done === total;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{
      background: allDone ? 'rgba(123,200,83,0.05)' : '#111',
      border: `1px solid ${allDone ? 'rgba(123,200,83,0.2)' : '#1E1E1E'}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 20,
      transition: 'border-color 0.3s',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, userSelect: 'none' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              {allDone ? '✅' : '☀️'} {greeting()}, Rathan
            </span>
            {allDone && (
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853', padding: '2px 8px', background: 'rgba(123,200,83,0.12)', borderRadius: 10 }}>
                All done!
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 8, height: 3, background: '#1E1E1E', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: allDone ? '#7BC853' : '#E81A1A',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', marginTop: 4 }}>{done}/{total} tasks</div>
        </div>
        <span style={{ color: '#444', fontSize: 12 }}>{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <div style={{ borderTop: '1px solid #1A1A1A', padding: '10px 16px 14px' }}>
          {/* Task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {tasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderRadius: 8 }}>
                <button
                  onClick={() => toggle(task)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `1.5px solid ${task.done ? '#7BC853' : '#333'}`,
                    background: task.done ? '#7BC853' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {task.done && <span style={{ fontSize: 11, color: '#000', fontWeight: 800, lineHeight: 1 }}>✓</span>}
                </button>
                <span style={{
                  flex: 1, fontSize: 13,
                  color: task.done ? '#444' : '#ccc',
                  textDecoration: task.done ? 'line-through' : 'none',
                  transition: 'color 0.2s',
                }}>
                  {task.label}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{ background: 'none', border: 'none', color: '#2A2A2A', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1, opacity: 0.5 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* Add task */}
          {adding ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                ref={inputRef}
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setAdding(false); setNewTask(''); } }}
                placeholder="New task..."
                autoFocus
                style={{ flex: 1, background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
              />
              <button onClick={addTask} style={{ padding: '0 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
              <button onClick={() => { setAdding(false); setNewTask(''); }} style={{ padding: '0 12px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setAdding(true)}
                style={{ fontFamily: MONO, fontSize: 11, color: '#555', background: 'none', border: '1px dashed #2A2A2A', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
              >+ Add task</button>
              {done > 0 && (
                <button
                  onClick={resetAll}
                  style={{ fontFamily: MONO, fontSize: 11, color: '#444', background: 'none', border: '1px solid #1E1E1E', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
                >↺ Reset</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}