import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import VoiceCaptureButton from './VoiceCaptureButton';

// Renders a floating mic button triggered globally by ⌘M
export default function GlobalVoiceCapture() {
  const [visible, setVisible] = useState(false);
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        setVisible(v => !v);
        // Lazy-load context
        if (projects.length === 0) {
          base44.entities.Project.list('-date', 50).then(ps => setProjects(ps.filter(p => !p.archived)));
          base44.entities.Contact.list('name', 100).then(setContacts);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [projects.length]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 90, right: 24, zIndex: 900,
    }}>
      <div style={{
        background: '#0D0D0D', border: '1px solid #2A2A2A',
        borderRadius: 14, padding: '12px 16px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555' }}>⌘M · Voice</div>
        <VoiceCaptureButton
          projects={projects}
          contacts={contacts}
          onTasksCreated={(result) => {
            setVisible(false);
          }}
          size="normal"
        />
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 4, fontSize: 14 }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}