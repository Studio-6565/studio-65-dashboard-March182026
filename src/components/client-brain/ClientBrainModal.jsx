import React, { useState } from 'react';
import { X, Brain } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import ClientBrainEditor from './ClientBrainEditor';

export default function ClientBrainModal({ client, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (brainData) => {
    setSaving(true);
    const existing = client.client_brain || {};
    // Save version snapshot before overwriting
    const versions = existing.brain_versions || [];
    const newVersion = {
      saved_at: new Date().toISOString(),
      label: `Saved ${new Date().toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      snapshot: JSON.stringify({ ...existing, brain_versions: undefined }),
    };
    const updatedBrain = {
      ...brainData,
      brain_versions: versions.length > 0 ? [newVersion, ...versions].slice(0, 20) : [],
    };
    await base44.entities.Contact.update(client.id, { client_brain: updatedBrain });
    setSaving(false);
    showToast('Client Brain saved', 'green');
    onSaved({ ...client, client_brain: updatedBrain });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'stretch', justifyContent: 'flex-end',
    }}>
      <div style={{
        width: '100%', maxWidth: 860,
        background: '#0A0A0A', borderLeft: '1px solid #1E1E1E',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#0A0A0A', borderBottom: '1px solid #1A1A1A',
          padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={18} color="#A78BFA" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{client.name} — Client Brain</div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#444', marginTop: 1 }}>
                {client.client_company || 'Brand intelligence profile'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', border: '1px solid #222', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, padding: '20px 22px 40px' }}>
          <ClientBrainEditor
            client={client}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}