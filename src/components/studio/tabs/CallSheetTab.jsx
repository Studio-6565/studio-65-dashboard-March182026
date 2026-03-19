import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange } from '@/lib/studio';
import { showToast } from '../StudioToast';

export default function CallSheetTab({ project, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await onUpdate({ call_sheet_url: file_url });
    showToast('Call sheet uploaded', 'green');
    setUploading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const p = project;
  const setup = p.setup || {};
  const crew = p.crew || [];
  const rentals = p.rentals || [];

  return (
    <div>
      {/* Upload section */}
      <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Upload Call Sheet (PDF / Image)</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '8px 16px', background: '#1E1E1E', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '📎 Upload File'}
          </button>
          {p.call_sheet_url && (
            <>
              <a href={p.call_sheet_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                📄 View Uploaded
              </a>
              <button onClick={() => onUpdate({ call_sheet_url: '' })} style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>Remove</button>
            </>
          )}
        </div>
      </div>

      {/* Generated call sheet */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Generated Call Sheet</div>
        <button onClick={handlePrint} style={{ padding: '7px 14px', background: '#1E1E1E', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
      </div>

      <div id="call-sheet-print" style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, padding: 24 }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #E81A1A', paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888', marginTop: 3 }}>{p.project_id} · {p.client}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#fff' }}>📅 {fmtDateRange(p)}</div>
              {setup.arrival_time && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 12, color: '#E81A1A', marginTop: 3 }}>🕐 Arrival: {setup.arrival_time}</div>}
              {p.start_time && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888', marginTop: 2 }}>⏰ Call: {p.start_time}{p.end_time ? ' – Wrap: ' + p.end_time : ''}</div>}
            </div>
          </div>
        </div>

        {/* Location & POC */}
        {(p.address || p.poc_name) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            {p.address && (
              <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Location</div>
                <div style={{ fontSize: 12 }}>📍 {p.address}</div>
              </div>
            )}
            {p.poc_name && (
              <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Point of Contact</div>
                <div style={{ fontSize: 12 }}>👤 {p.poc_name}{p.poc_phone ? ' · ' + p.poc_phone : ''}</div>
              </div>
            )}
          </div>
        )}

        {/* Camera Setup */}
        {(setup.frame_rate || setup.resolution || setup.codec || setup.camera_orientation || setup.color_profile) && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Camera Setup</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['Orientation', setup.camera_orientation], ['Frame Rate', setup.frame_rate ? setup.frame_rate + ' fps' : ''], ['Resolution', setup.resolution], ['Codec', setup.codec], ['Color', setup.color_profile]].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ background: '#2A2A2A', borderRadius: 6, padding: '6px 12px' }}>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gear */}
        {setup.gear && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Gear / Kit</div>
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{setup.gear}</div>
          </div>
        )}

        {/* Crew */}
        {crew.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Crew</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {crew.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2A2A2A', borderRadius: 8, padding: '8px 14px', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginLeft: 8 }}>{c.role}</span>
                  </div>
                  <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888' }}>
                    {c.phone && <span style={{ marginRight: 10 }}>📱 {c.phone}</span>}
                    {c.email && <span>✉ {c.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rentals */}
        {rentals.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Rentals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rentals.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2A2A2A', borderRadius: 8, padding: '8px 14px', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.equipment}</span>
                    {r.vendor && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginLeft: 8 }}>via {r.vendor}</span>}
                  </div>
                  {r.phone && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#888' }}>📱 {r.phone}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {(p.notes || setup.notes) && (
          <div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Notes</div>
            {setup.notes && <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.6, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{setup.notes}</div>}
            {p.notes && <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.notes}</div>}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #333', fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#444', textAlign: 'center' }}>
          Studio 65 · Generated {new Date().toLocaleDateString()}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #call-sheet-print, #call-sheet-print * { visibility: visible !important; }
          #call-sheet-print { position: fixed; top: 0; left: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 20px !important; }
        }
      `}</style>
    </div>
  );
}