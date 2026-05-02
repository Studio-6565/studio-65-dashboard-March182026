import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Search, Paperclip, Check } from 'lucide-react';
import { Image, FileText, Music, Film, Layers, File } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const TYPE_META = {
  'Logo':          { icon: Image,    color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)' },
  'Font':          { icon: FileText, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  'Sound Effect':  { icon: Music,    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'Music':         { icon: Music,    color: '#7BC853', bg: 'rgba(123,200,83,0.1)' },
  'Intro Bumper':  { icon: Film,     color: '#E81A1A', bg: 'rgba(232,26,26,0.1)' },
  'Outro Bumper':  { icon: Film,     color: '#E81A1A', bg: 'rgba(232,26,26,0.1)' },
  'Overlay':       { icon: Layers,   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'LUT / Preset':  { icon: Layers,   color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  'Template':      { icon: FileText, color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)' },
  'Other':         { icon: File,     color: '#666',    bg: 'rgba(100,100,100,0.1)' },
};

// Stored on EditAssignment as `attached_assets`: array of { id, name, type, file_url, file_name, notes }

export default function AssetAttachPicker({ attachedAssets = [], clientName = '', onChange }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.entities.BrandAsset.filter({ archived: false }, 'name', 500).then(data => {
      setAssets(data);
      setLoading(false);
    });
  }, [open]);

  const attachedIds = new Set((attachedAssets || []).map(a => a.id));

  const toggleAsset = (asset) => {
    if (attachedIds.has(asset.id)) {
      onChange((attachedAssets || []).filter(a => a.id !== asset.id));
    } else {
      onChange([...(attachedAssets || []), {
        id: asset.id, name: asset.name, type: asset.type,
        file_url: asset.file_url, file_name: asset.file_name, notes: asset.notes || '',
      }]);
    }
  };

  const filtered = assets.filter(a => {
    if (search.trim() && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.type.toLowerCase().includes(search.toLowerCase())) return false;
    // Show global assets + client-specific ones
    if (a.client && clientName && a.client.toLowerCase() !== clientName.toLowerCase()) return false;
    return true;
  });

  // Group by type
  const grouped = {};
  filtered.forEach(a => { if (!grouped[a.type]) grouped[a.type] = []; grouped[a.type].push(a); });

  return (
    <div>
      {/* Attached chips */}
      {(attachedAssets || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {(attachedAssets || []).map(a => {
            const meta = TYPE_META[a.type] || TYPE_META['Other'];
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 8px', background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: meta.color, fontFamily: MONO }}>
                <span>{a.type}: {a.name}</span>
                <button onClick={() => onChange((attachedAssets || []).filter(x => x.id !== a.id))} style={{ background: 'none', border: 'none', color: meta.color, cursor: 'pointer', padding: 0, lineHeight: 1, opacity: 0.7 }}><X size={11} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Open picker button */}
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: open ? '#1A1A1A' : 'transparent', border: '1px solid #1E1E1E', borderRadius: 8, color: '#888', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
        <Paperclip size={12} />
        {open ? 'Close' : `Attach Assets${(attachedAssets || []).length > 0 ? ` (${attachedAssets.length})` : ''}`}
      </button>

      {/* Picker panel */}
      {open && (
        <div style={{ marginTop: 10, background: '#080808', border: '1px solid #1A1A1A', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #111' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} color="#333" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" style={{ background: '#0D0D0D', border: '1px solid #111', borderRadius: 8, padding: '8px 10px 8px 28px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 0' }}>
            {loading ? (
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', padding: '24px', textAlign: 'center' }}>Loading assets…</div>
            ) : filtered.length === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#333', padding: '24px', textAlign: 'center' }}>No assets found. Upload in Asset Library first.</div>
            ) : (
              Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type] || TYPE_META['Other'];
                const Icon = meta.icon;
                return (
                  <div key={type}>
                    <div style={{ padding: '6px 14px 4px', fontFamily: MONO, fontSize: 9, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={10} /> {type}
                    </div>
                    {items.map(asset => {
                      const isAttached = attachedIds.has(asset.id);
                      return (
                        <button key={asset.id} onClick={() => toggleAsset(asset)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: isAttached ? meta.bg : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: isAttached ? meta.color + '20' : '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isAttached ? <Check size={13} color={meta.color} /> : <Icon size={13} color={meta.color} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: isAttached ? 700 : 500, color: isAttached ? '#fff' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                            {asset.file_name && <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.file_name}</div>}
                          </div>
                          {isAttached && <div style={{ fontFamily: MONO, fontSize: 9, color: meta.color, flexShrink: 0 }}>Attached</div>}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}