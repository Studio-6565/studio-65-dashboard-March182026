import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { Clock, ChevronDown, ChevronUp, RotateCcw, CheckCircle, Copy, Pencil, X } from 'lucide-react';

const MONO = '"DM Mono", monospace';

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function VersionRow({ version, isActive, onRevert, onView, isViewing }) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal] = useState(version.label || `v${version.version_number}`);

  const saveLabel = async () => {
    await base44.entities.ScriptVersion.update(version.id, { label: labelVal });
    setEditingLabel(false);
    showToast('Label saved', 'blue');
  };

  return (
    <div style={{
      background: isViewing ? '#1E1E1E' : '#141414',
      border: `1px solid ${isActive ? 'rgba(123,200,83,0.4)' : isViewing ? '#333' : '#1E1E1E'}`,
      borderRadius: 10,
      padding: '12px 14px',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Version badge */}
        <div style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 700,
          color: isActive ? '#7BC853' : '#555',
          background: isActive ? 'rgba(123,200,83,0.1)' : '#1A1A1A',
          border: `1px solid ${isActive ? 'rgba(123,200,83,0.3)' : '#2A2A2A'}`,
          borderRadius: 6, padding: '3px 8px', flexShrink: 0,
        }}>
          v{version.version_number}
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingLabel ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={labelVal}
                onChange={e => setLabelVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditingLabel(false); }}
                autoFocus
                style={{
                  flex: 1, background: '#111', border: '1px solid #333', borderRadius: 6,
                  padding: '4px 8px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif',
                }}
              />
              <button onClick={saveLabel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7BC853', fontSize: 14 }}>✓</button>
              <button onClick={() => setEditingLabel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}><X size={13} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {version.label || `v${version.version_number}`}
              </span>
              <button onClick={() => setEditingLabel(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 0, flexShrink: 0 }}>
                <Pencil size={11} />
              </button>
            </div>
          )}
          <div style={{ fontSize: 10, color: '#444', fontFamily: MONO, marginTop: 2, display: 'flex', gap: 8 }}>
            <span>{timeSince(version.created_date)}</span>
            {version.platform && <span>· {version.platform}</span>}
            {version.goal && <span>· {version.goal}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7BC853', fontFamily: MONO }}>
              <CheckCircle size={12} /> Active
            </div>
          )}
          <button
            onClick={() => onView(version)}
            style={{
              padding: '5px 10px', background: isViewing ? '#2A2A2A' : 'transparent',
              border: '1px solid #2A2A2A', borderRadius: 6,
              color: isViewing ? '#fff' : '#666', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO,
            }}
          >
            {isViewing ? 'Hide' : 'View'}
          </button>
          {!isActive && (
            <button
              onClick={() => onRevert(version)}
              style={{
                padding: '5px 10px', background: 'rgba(232,26,26,0.08)',
                border: '1px solid rgba(232,26,26,0.2)', borderRadius: 6,
                color: '#E81A1A', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <RotateCcw size={11} /> Revert
            </button>
          )}
        </div>
      </div>

      {/* Script preview */}
      {isViewing && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            background: '#0D0D0D', border: '1px solid #222', borderRadius: 8,
            padding: 14, fontSize: 11, lineHeight: 1.8, color: '#aaa',
            whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto', fontFamily: 'monospace',
          }}>
            {version.script_content}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(version.script_content); showToast('Copied!'); }}
            style={{
              marginTop: 8, padding: '6px 12px', background: 'transparent', border: '1px solid #2A2A2A',
              borderRadius: 6, color: '#666', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Copy size={12} /> Copy
          </button>
        </div>
      )}
    </div>
  );
}

export default function ScriptVersionHistory({ projectId, versions, onVersionsChange, onRevertToVersion }) {
  const [open, setOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);

  if (!versions || versions.length === 0) return null;

  const handleRevert = async (version) => {
    if (!confirm(`Revert to v${version.version_number}? This will mark it as the active version.`)) return;
    // Mark all as inactive, then set this one active
    await Promise.all(
      versions.filter(v => v.is_active).map(v =>
        base44.entities.ScriptVersion.update(v.id, { is_active: false })
      )
    );
    await base44.entities.ScriptVersion.update(version.id, { is_active: true });
    onVersionsChange(versions.map(v => ({ ...v, is_active: v.id === version.id })));
    onRevertToVersion(version.script_content);
    showToast(`Reverted to v${version.version_number}`, 'blue');
  };

  const handleView = (version) => {
    setViewingId(prev => prev === version.id ? null : version.id);
  };

  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number);

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#141414', border: '1px solid #1E1E1E', borderRadius: 10,
          color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="#4A9EFF" />
          <span style={{ color: '#ccc' }}>Version History</span>
          <span style={{
            background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 6,
            padding: '2px 7px', fontSize: 10, color: '#666',
          }}>{versions.length}</span>
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedVersions.map(v => (
            <VersionRow
              key={v.id}
              version={v}
              isActive={v.is_active}
              isViewing={viewingId === v.id}
              onRevert={handleRevert}
              onView={handleView}
            />
          ))}
        </div>
      )}
    </div>
  );
}