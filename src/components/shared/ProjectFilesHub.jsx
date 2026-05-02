import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Download, Trash2, FileText, Film, Image, Music, Archive, File, Eye, X, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const CATEGORIES = ['All', 'Brand Assets', 'Deliverables', 'Scripts', 'References', 'Raw Footage', 'Contracts', 'Invoices', 'Other'];

const CAT_COLORS = {
  'Brand Assets':  { bg: 'rgba(74,158,255,0.1)',   color: '#4A9EFF',  dot: '#4A9EFF' },
  'Deliverables':  { bg: 'rgba(123,200,83,0.1)',   color: '#7BC853',  dot: '#7BC853' },
  'Scripts':       { bg: 'rgba(167,139,250,0.1)',  color: '#A78BFA',  dot: '#A78BFA' },
  'References':    { bg: 'rgba(245,158,11,0.1)',   color: '#F59E0B',  dot: '#F59E0B' },
  'Raw Footage':   { bg: 'rgba(232,26,26,0.1)',    color: '#E81A1A',  dot: '#E81A1A' },
  'Contracts':     { bg: 'rgba(100,100,100,0.1)',  color: '#888',     dot: '#888' },
  'Invoices':      { bg: 'rgba(245,158,11,0.1)',   color: '#F59E0B',  dot: '#F59E0B' },
  'Other':         { bg: 'rgba(100,100,100,0.08)', color: '#666',     dot: '#555' },
};

// ── File type helpers ─────────────────────────────────────────────────────────
function getFileIcon(mimeType = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return Image;
  if (mimeType.startsWith('video/') || ['mp4','mov','avi','mkv','webm'].includes(ext)) return Film;
  if (mimeType.startsWith('audio/') || ['mp3','wav','aac','m4a'].includes(ext)) return Music;
  if (['pdf','doc','docx','txt','md'].includes(ext) || mimeType.includes('pdf') || mimeType.includes('word')) return FileText;
  if (['zip','rar','7z'].includes(ext)) return Archive;
  return File;
}

function isImage(mimeType = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return mimeType.startsWith('image/') || ['jpg','jpeg','png','gif','webp'].includes(ext);
}

function isVideo(mimeType = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return mimeType.startsWith('video/') || ['mp4','mov','webm'].includes(ext);
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Thumbnail / Preview ───────────────────────────────────────────────────────
function FileThumbnail({ file, size = 64, onClick }) {
  const Icon = getFileIcon(file.file_type, file.file_name);
  const isImg = isImage(file.file_type, file.file_name);
  const isVid = isVideo(file.file_type, file.file_name);
  const cat = CAT_COLORS[file.category] || CAT_COLORS['Other'];

  return (
    <button
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
        background: isImg || isVid ? 'transparent' : cat.bg,
        border: `1px solid ${isImg || isVid ? '#1A1A1A' : cat.color + '30'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', position: 'relative',
      }}
    >
      {isImg && (
        <img src={file.thumbnail_url || file.file_url} alt={file.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
      )}
      {isVid && !isImg && (
        <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film size={size * 0.35} color="#E81A1A" />
          <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #fff', marginLeft: 1 }} />
          </div>
        </div>
      )}
      {!isImg && !isVid && <Icon size={size * 0.38} color={cat.color} />}
    </button>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  if (!file) return null;
  const isImg = isImage(file.file_type, file.file_name);
  const isVid = isVideo(file.file_type, file.file_name);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #111', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{file.file_name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>{file.category} · {formatBytes(file.file_size)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer" style={{ padding: '8px 14px', background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Download
          </a>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#111', border: '1px solid #1E1E1E', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'auto' }}>
        {isImg && <img src={file.file_url} alt={file.file_name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain' }} />}
        {isVid && <video src={file.file_url} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />}
        {!isImg && !isVid && (
          <div style={{ textAlign: 'center' }}>
            <File size={64} color="#333" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 15, color: '#666', marginBottom: 20 }}>Preview not available for this file type.</div>
            <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer" style={{ padding: '12px 24px', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFiles, uploading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? '#E81A1A' : '#1E1E1E'}`,
        borderRadius: 16,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: uploading ? 'default' : 'pointer',
        background: dragging ? 'rgba(232,26,26,0.04)' : 'transparent',
        transition: 'all 0.2s',
        marginBottom: 20,
      }}
    >
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => onFiles(Array.from(e.target.files))} />
      {uploading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#666' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Uploading...</span>
        </div>
      ) : (
        <>
          <Upload size={22} color={dragging ? '#E81A1A' : '#333'} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: dragging ? '#E81A1A' : '#555' }}>
            {dragging ? 'Drop files here' : 'Drag & drop files, or click to browse'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginTop: 6 }}>
            Images, videos, PDFs, scripts, brand assets — any file type
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Upload options panel ──────────────────────────────────────────────────────
function UploadPanel({ projectId, projectName, clientName, uploaderRole, uploaderName, onUploaded }) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('Other');

  const handleFiles = (files) => {
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removeFile = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of pendingFiles) {
      const res = await base44.integrations.Core.UploadFile({ file });
      const record = await base44.entities.ProjectFile.create({
        project_id: projectId,
        project_name: projectName,
        client_name: clientName,
        category,
        file_name: file.name,
        file_url: res.file_url,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: uploaderRole,
        uploader_name: uploaderName,
        visible_to_client: true,
      });
      uploaded.push(record);
    }
    setPendingFiles([]);
    setUploading(false);
    onUploaded(uploaded);
  };

  return (
    <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Upload Files</div>

      <DropZone onFiles={handleFiles} uploading={uploading} />

      {pendingFiles.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textTransform: 'uppercase', marginBottom: 8 }}>Category</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.filter(c => c !== 'All').map(c => {
                const cc = CAT_COLORS[c];
                return (
                  <button key={c} onClick={() => setCategory(c)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${category === c ? cc.color + '60' : '#1A1A1A'}`, background: category === c ? cc.bg : 'transparent', color: category === c ? cc.color : '#444', fontFamily: MONO }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {pendingFiles.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0D0D0D', borderRadius: 10, border: '1px solid #141414' }}>
                <File size={14} color="#555" />
                <span style={{ flex: 1, fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>{formatBytes(f.size)}</span>
                <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}><X size={13} /></button>
              </div>
            ))}
          </div>

          <button onClick={handleUpload} disabled={uploading} style={{ width: '100%', padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: uploading ? 0.7 : 1 }}>
            {uploading ? <Loader2 size={15} /> : <Upload size={15} />}
            {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({ file, onPreview, onDelete, isStudio }) {
  const cat = CAT_COLORS[file.category] || CAT_COLORS['Other'];

  return (
    <div style={{ background: '#080808', border: '1px solid #111', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Thumbnail area */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => onPreview(file)}>
        <FileThumbnail file={file} size={56} />
        {/* Preview overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
        >
          <Eye size={20} color="rgba(255,255,255,0.8)" style={{ opacity: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          />
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.file_name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: cat.bg, color: cat.color, fontWeight: 600 }}>{file.category}</span>
          {file.file_size > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: '#333' }}>{formatBytes(file.file_size)}</span>}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#2A2A2A', marginTop: 6 }}>
          {file.uploaded_by === 'client' ? '👤 Client' : '🎬 Studio'} · {new Date(file.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderTop: '1px solid #0D0D0D' }}>
        <button onClick={() => onPreview(file)} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO }}>
          <Eye size={12} /> View
        </button>
        <div style={{ width: 1, background: '#0D0D0D' }} />
        <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO, textDecoration: 'none' }}>
          <Download size={12} /> Save
        </a>
        {(isStudio || file.uploaded_by === 'client') && onDelete && (
          <>
            <div style={{ width: 1, background: '#0D0D0D' }} />
            <button onClick={() => onDelete(file)} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: '#333', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: MONO }}>
              <Trash2 size={12} /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProjectFilesHub({ projectId, projectName, clientName, isStudio = true, uploaderName = 'Studio 65' }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [preview, setPreview] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    base44.entities.ProjectFile.filter({ project_id: projectId }, '-created_date', 200)
      .then(f => {
        // If client, only show visible_to_client files
        const visible = isStudio ? f : f.filter(x => x.visible_to_client !== false);
        setFiles(visible);
        setLoading(false);
      });
  }, [projectId, isStudio]);

  const handleUploaded = (newFiles) => {
    setFiles(prev => [...newFiles, ...prev]);
    setShowUpload(false);
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    await base44.entities.ProjectFile.delete(file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const displayed = activeCategory === 'All' ? files : files.filter(f => f.category === activeCategory);

  // Category counts
  const counts = {};
  files.forEach(f => { counts[f.category] = (counts[f.category] || 0) + 1; });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <Loader2 size={22} color="#333" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Project Files</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginTop: 2 }}>{files.length} file{files.length !== 1 ? 's' : ''} · {projectName}</div>
        </div>
        <button
          onClick={() => setShowUpload(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: showUpload ? '#1A1A1A' : '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          {showUpload ? <X size={13} /> : <Upload size={13} />}
          {showUpload ? 'Cancel' : 'Upload'}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          projectId={projectId}
          projectName={projectName}
          clientName={clientName}
          uploaderRole={isStudio ? 'studio' : 'client'}
          uploaderName={uploaderName}
          onUploaded={handleUploaded}
        />
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.filter(c => c === 'All' || counts[c] > 0 || isStudio).map(cat => {
          const cc = cat === 'All' ? null : CAT_COLORS[cat];
          const active = activeCategory === cat;
          const count = cat === 'All' ? files.length : (counts[cat] || 0);
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: MONO,
                border: active
                  ? `1px solid ${cc ? cc.color + '60' : 'rgba(232,26,26,0.4)'}`
                  : '1px solid #141414',
                background: active
                  ? (cc ? cc.bg : 'rgba(232,26,26,0.08)')
                  : 'transparent',
                color: active ? (cc ? cc.color : '#E81A1A') : '#444',
                transition: 'all 0.15s',
              }}
            >
              {cat} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Files grid */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 14 }}>📁</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#444', marginBottom: 8 }}>
            {files.length === 0 ? 'No files yet' : `No ${activeCategory} files`}
          </div>
          <div style={{ fontSize: 12, color: '#2A2A2A', marginBottom: 20, lineHeight: 1.7 }}>
            {files.length === 0
              ? (isStudio ? 'Upload brand assets, deliverables, scripts, and more.' : 'Studio 65 will upload project files here. You can also upload your own brand assets.')
              : `No files in the "${activeCategory}" category yet.`}
          </div>
          <button onClick={() => setShowUpload(true)} style={{ padding: '10px 20px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Upload Files
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {displayed.map(f => (
            <FileCard
              key={f.id}
              file={f}
              onPreview={setPreview}
              onDelete={isStudio || f.uploaded_by === 'client' ? handleDelete : null}
              isStudio={isStudio}
            />
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}