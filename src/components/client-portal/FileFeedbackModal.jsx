import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2, CheckCircle2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function FileFeedbackModal({ file, contact, projectName, projectId, onClose, onSubmitted }) {
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setSending(true);

    const pName = projectName || file.project_name || '';
    const pId = projectId || file.project_id || '';

    // 1. Create ClientMessage so it appears in the studio inbox
    const msg = await base44.entities.ClientMessage.create({
      project_id: pId,
      project_name: pName,
      client_name: contact.name,
      from: 'client',
      type: 'message',
      title: `📋 Change Request: ${file.file_name}`,
      body: `**File:** ${file.file_name}\n**Category:** ${file.category}\n\n**Requested Changes:**\n${notes.trim()}`,
      approval_status: 'revision_requested',
      read_by_studio: false,
      read_by_client: true,
    });

    // 2. Update project status to "Feedback Requested"
    if (pId) {
      try {
        await base44.entities.Project.update(pId, {
          status: 'Feedback Requested',
          activity: [
            { msg: `📋 ${contact.name} requested changes on "${file.file_name}"`, ts: new Date().toISOString() }
          ],
        });
      } catch (e) {
        console.warn('Could not update project status:', e.message);
      }
    }

    // 3. Trigger studio email notification via backend function
    try {
      await base44.functions.invoke('clientNotifyEmail', { event: { type: 'update' }, data: msg });
    } catch (e) {
      // Fallback: direct email
      try {
        await base44.integrations.Core.SendEmail({
          to: 'studio65production@gmail.com',
          subject: `📋 Change Request: "${file.file_name}" — ${contact.name}`,
          body: `Hi Studio 65,\n\n${contact.name} has requested changes on a delivered file.\n\n📁 File: ${file.file_name}\n📂 Category: ${file.category}\n🎬 Project: ${pName || 'N/A'}\n\n📝 What needs fixing:\n${notes.trim()}\n\nProject status has been updated to "Feedback Requested".\n\n— Studio 65 Client Portal`,
        });
      } catch {}
    }

    setSending(false);
    setDone(true);
    setTimeout(() => { onSubmitted?.(); onClose(); }, 1800);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: '20px 20px 0 0', padding: '28px 24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Request Changes</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 3 }}>{file.file_name}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#111', border: '1px solid #1E1E1E', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={40} color="#7BC853" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#7BC853' }}>Request sent!</div>
            <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Studio 65 has been notified.</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              What needs to be fixed?
            </div>
            <textarea
              autoFocus
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what changes you'd like — be as specific as possible (e.g. 'The colour grade is too warm', 'Logo placement should be top-left')..."
              style={{
                width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 12,
                padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none',
                resize: 'vertical', fontFamily: 'Syne, sans-serif', lineHeight: 1.7,
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={sending || !notes.trim()}
              style={{
                marginTop: 14, width: '100%', padding: '13px 0',
                background: '#E81A1A', border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: (sending || !notes.trim()) ? 'default' : 'pointer',
                opacity: (sending || !notes.trim()) ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              {sending ? 'Sending...' : 'Send to Studio 65'}
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </button>
          </>
        )}
      </div>
    </div>
  );
}