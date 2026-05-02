import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Trash2, FileText, Film, Image, Music, File, Layers, X, Loader2, Download, Search, Archive } from 'lucide-react';
import { showToast } from '@/components/studio/StudioToast';

const MONO = '"DM Mono", monospace';

const ASSET_TYPES = ['Logo', 'Font', 'Sound Effect', 'Music', 'Intro Bumper', 'Outro Bumper', 'Overlay', 'LUT / Preset', 'Template', 'Other'];

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

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function AssetCard({ asset, onDelete, onArchive }) {
  const meta = TYPE_META[asset.type] || TYPE_META['Other'];
  const Icon = meta.icon;
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(asset.file_name || '');

  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #111', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Preview */}
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {isImage ? (
          <img src={asset.file_url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} color={meta.color} />
          </div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, fontWeight: 700 }}>{asset.type}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', marginBottom: asset.client ? 4 : 0 }}>
          {asset.file_name} {asset.file_size ? `· ${formatBytes(asset.file_size)}` : ''}
        </div>
        {asset.client && <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginBottom: 2 }}>📌 {asset.client}</div>}
        {asset.notes && <div style={{ fontSize: 11, color: '#444', marginTop: 4, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{asset.notes}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderTop: '1px solid #0D0D0D' }}>
        <a href={asset.file_url} download={asset.file_name} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO, textDecoration: 'none' }}>
          <Download size={12} /> Download
        </a>
        <div style={{ width: 1, background: '#0D0D0D' }} />
        <button onClick={() => onArchive(asset)} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: '#333', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO }}>
          <Archive size={12} /> {asset.archived ? 'Restore' : 'Archive'}
        </button>
        <div style={{ width: 1, background: '#0D0D0D' }} />
        <button onClick={() => onDelete(asset)} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: '#333', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [assetType, setAssetType] = useState('Logo');
  const [assetName, setAssetName] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const IS = { background: '#111', border: '1px solid #1A1A1A', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) { setFiles(dropped); if (!assetName) setAssetName(dropped[0].name.replace(/\.[^/.]+$/, '')); }
  }, [assetName]);

  const handleUpload = async () => {
    if (!files.length || !assetName.trim()) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const res = await base44.integrations.Core.UploadFile({ file });
      const record = await base44.entities.BrandAsset.create({
        name: assetName.trim() || file.name,
        type: assetType,
        client: client.trim(),
        file_name: file.name,
        file_url: res.file_url,
        file_type: file.type,
        file_size: file.size,
        notes: notes.trim(),
        archived: false,
      });
      uploaded.push(record);
    }
    setUploading(false);
    onUploaded(uploaded);
    showToast(`${uploaded.length} asset${uploaded.length > 1 ? 's' : ''} uploaded ✓`, 'green');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Upload Brand Asset</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? '#E81A1A' : files.length ? '#7BC853' : '#1E1E1E'}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(232,26,26,0.03)' : 'transparent', transition: 'all 0.2s', marginBottom: 18 }}
        >
          <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => { const f = Array.from(e.target.files); setFiles(f); if (!assetName && f.length) setAssetName(f[0].name.replace(/\.[^/.]+$/, '')); }} />
          {files.length ? (
            <div>
              <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{files.length} file{files.length > 1 ? 's' : ''} selected</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 4 }}>{files.map(f => f.name).join(', ')}</div>
            </div>
          ) : (
            <>
              <Upload size={22} color={dragging ? '#E81A1A' : '#333'} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: dragging ? '#E81A1A' : '#555' }}>Drop files here or click to browse</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#2A2A2A', marginTop: 5 }}>Logos, fonts, audio, video bumpers, LUTs…</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Asset Name *</div>
            <input style={IS} value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Studio 65 Logo — White" />
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
            <select style={IS} value={assetType} onChange={e => setAssetType(e.target.value)}>
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Client (optional — leave blank for global assets)</div>
            <input style={IS} value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Corp (or blank for all projects)" />
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
            <textarea rows={2} style={{ ...IS, resize: 'none' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Usage notes, color codes, sizing…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 10, color: '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleUpload} disabled={uploading || !files.length || !assetName.trim()} style={{ flex: 2, padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!files.length || !assetName.trim() || uploading) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {uploading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
            {uploading ? 'Uploading...' : 'Upload Asset'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AssetLibrary() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    base44.entities.BrandAsset.list('-created_date', 500).then(data => {
      setAssets(data); setLoading(false);
    });
  }, []);

  const handleDelete = async (asset) => {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    await base44.entities.BrandAsset.delete(asset.id);
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    showToast('Asset deleted', 'red');
  };

  const handleArchive = async (asset) => {
    const updated = { ...asset, archived: !asset.archived };
    await base44.entities.BrandAsset.update(asset.id, { archived: updated.archived });
    setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
    showToast(updated.archived ? 'Archived' : 'Restored', 'blue');
  };

  const filtered = assets.filter(a => {
    if (!showArchived && a.archived) return false;
    if (filterType !== 'All' && a.type !== filterType) return false;
    if (search.trim() && !a.name.toLowerCase().includes(search.toLowerCase()) && !(a.client || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeCounts = {};
  assets.filter(a => !a.archived).forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Studio 65</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Asset Library</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginTop: 3 }}>{assets.filter(a => !a.archived).length} assets · logos, fonts, bumpers, SFX</div>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Upload size={14} /> Upload Asset
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} color="#333" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" style={{ background: '#0A0A0A', border: '1px solid #111', borderRadius: 10, padding: '9px 12px 9px 32px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => setShowArchived(v => !v)} style={{ padding: '9px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${showArchived ? 'rgba(245,158,11,0.4)' : '#111'}`, background: 'transparent', color: showArchived ? '#F59E0B' : '#444', fontFamily: MONO }}>
          {showArchived ? '⚠ Archived' : 'Show Archived'}
        </button>
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {['All', ...ASSET_TYPES].map(type => {
          const meta = TYPE_META[type];
          const count = type === 'All' ? assets.filter(a => !a.archived).length : (typeCounts[type] || 0);
          const active = filterType === type;
          return (
            <button key={type} onClick={() => setFilterType(type)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO, border: active ? `1px solid ${meta ? meta.color + '60' : 'rgba(232,26,26,0.4)'}` : '1px solid #111', background: active ? (meta ? meta.bg : 'rgba(232,26,26,0.08)') : 'transparent', color: active ? (meta ? meta.color : '#E81A1A') : '#444', transition: 'all 0.15s' }}>
              {type} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} color="#333" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, opacity: 0.15, marginBottom: 14 }}>🗂️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#444', marginBottom: 8 }}>
            {assets.length === 0 ? 'No assets yet' : `No ${filterType !== 'All' ? filterType + ' ' : ''}assets found`}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', marginBottom: 20, lineHeight: 1.7 }}>
            Upload logos, fonts, bumpers, sound effects and more.<br />Attach them to any editing assignment.
          </div>
          <button onClick={() => setShowUpload(true)} style={{ padding: '11px 24px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Upload First Asset →</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} onArchive={handleArchive} />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={newAssets => setAssets(prev => [...newAssets, ...prev])} />}
    </div>
  );
}