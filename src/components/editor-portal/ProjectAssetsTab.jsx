import React from 'react';
import { Image, FileText, Music, Film, Layers, File, Download, ExternalLink } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const TYPE_META = {
  'Logo':          { icon: Image,    color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)',  emoji: '🖼' },
  'Font':          { icon: FileText, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', emoji: '🔤' },
  'Sound Effect':  { icon: Music,    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  emoji: '🔊' },
  'Music':         { icon: Music,    color: '#7BC853', bg: 'rgba(123,200,83,0.1)',  emoji: '🎵' },
  'Intro Bumper':  { icon: Film,     color: '#E81A1A', bg: 'rgba(232,26,26,0.1)',   emoji: '▶️' },
  'Outro Bumper':  { icon: Film,     color: '#E81A1A', bg: 'rgba(232,26,26,0.1)',   emoji: '⏹' },
  'Overlay':       { icon: Layers,   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  emoji: '🎨' },
  'LUT / Preset':  { icon: Layers,   color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', emoji: '🎨' },
  'Template':      { icon: FileText, color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)',  emoji: '📐' },
  'Other':         { icon: File,     color: '#666',    bg: 'rgba(100,100,100,0.1)', emoji: '📎' },
};

function AssetRow({ asset }) {
  const meta = TYPE_META[asset.type] || TYPE_META['Other'];
  const Icon = meta.icon;
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(asset.file_name || '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#0A0A0A', border: '1px solid #111', borderRadius: 12, marginBottom: 8 }}>
      {/* Thumbnail / Icon */}
      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${meta.color}20` }}>
        {isImage ? (
          <img src={asset.file_url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <Icon size={18} color={meta.color} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, fontWeight: 700 }}>{asset.type}</span>
          {asset.file_name && <span style={{ fontFamily: MONO, fontSize: 9, color: '#2A2A2A' }}>{asset.file_name}</span>}
        </div>
        {asset.notes && <div style={{ fontSize: 11, color: '#555', marginTop: 4, lineHeight: 1.5 }}>{asset.notes}</div>}
      </div>

      {/* Download */}
      <a
        href={asset.file_url}
        download={asset.file_name}
        target="_blank"
        rel="noreferrer"
        style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: '#111', border: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
        title={`Download ${asset.name}`}
      >
        <Download size={14} color="#555" />
      </a>
    </div>
  );
}

export default function ProjectAssetsTab({ attachedAssets = [] }) {
  if (!attachedAssets || attachedAssets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, opacity: 0.12, marginBottom: 14 }}>🗂️</div>
        <div style={{ fontSize: 14, color: '#444', marginBottom: 6 }}>No assets attached yet.</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', lineHeight: 1.7 }}>
          Studio 65 will attach brand assets (logos, fonts, bumpers) to this assignment once available.
        </div>
      </div>
    );
  }

  // Group by type
  const grouped = {};
  attachedAssets.forEach(a => {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  });

  // Preferred display order
  const TYPE_ORDER = ['Intro Bumper', 'Outro Bumper', 'Logo', 'Font', 'Music', 'Sound Effect', 'LUT / Preset', 'Overlay', 'Template', 'Other'];
  const sortedTypes = [...Object.keys(grouped)].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a); const ib = TYPE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Project Assets</div>
        <div style={{ fontSize: 13, color: '#555' }}>{attachedAssets.length} asset{attachedAssets.length !== 1 ? 's' : ''} attached by Studio 65</div>
      </div>

      {sortedTypes.map(type => {
        const meta = TYPE_META[type] || TYPE_META['Other'];
        const items = grouped[type];
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <meta.icon size={11} color={meta.color} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{type}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: '#2A2A2A' }}>({items.length})</span>
            </div>
            {items.map((asset, i) => <AssetRow key={asset.id || i} asset={asset} />)}
          </div>
        );
      })}
    </div>
  );
}