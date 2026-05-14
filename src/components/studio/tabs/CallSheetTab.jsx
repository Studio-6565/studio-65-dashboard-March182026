import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fmt, fmtDateRange } from '@/lib/studio';
import { showToast } from '../StudioToast';

const MONO = '"DM Mono", monospace';
const LS = { fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 4, display: 'block' };

function Section({ title, children, accent = '#E81A1A' }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CallSheetPreview({ project, extra }) {
  const p = project;
  const setup = p.setup || {};
  const crew = p.crew || [];
  const rentals = p.rentals || [];
  const deliverables = p.deliverables || [];

  return (
    <div id="call-sheet-print" style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 12, overflow: 'hidden', fontFamily: 'Syne, sans-serif' }}>
      {/* Branded header */}
      <div style={{ background: 'linear-gradient(135deg, #E81A1A 0%, #A01010 100%)', padding: '20px 24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Studio 65 · Call Sheet</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{p.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
              {p.project_id && <span style={{ marginRight: 12 }}>{p.project_id}</span>}
              {p.client && <span>Client: {p.client}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{fmtDateRange(p)}</div>
            {p.start_time && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                📍 Call: {p.start_time}{p.end_time ? ' → Wrap: ' + p.end_time : ''}
              </div>
            )}
            {setup.arrival_time && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: 700 }}>
                🕐 Crew Arrival: {setup.arrival_time}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 24px' }}>
        {/* Location & POC */}
        {(p.address || p.poc_name) && (
          <div style={{ display: 'grid', gridTemplateColumns: p.address && p.poc_name ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 22 }}>
            {p.address && (
              <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '12px 14px' }}>
                <span style={LS}>📍 Location</span>
                <div style={{ fontSize: 13, color: '#ddd', lineHeight: 1.5 }}>{p.address}</div>
                {p.address && (
                  <a href={`https://maps.google.com?q=${encodeURIComponent(p.address)}`} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>Open in Maps →</a>
                )}
              </div>
            )}
            {p.poc_name && (
              <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '12px 14px' }}>
                <span style={LS}>👤 Point of Contact</span>
                <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{p.poc_name}</div>
                {p.poc_phone && <div style={{ fontFamily: MONO, fontSize: 11, color: '#888', marginTop: 3 }}>{p.poc_phone}</div>}
              </div>
            )}
          </div>
        )}

        {/* Camera Setup */}
        {(setup.frame_rate || setup.resolution || setup.codec || setup.camera_orientation || setup.color_profile || setup.gear) && (
          <Section title="Camera & Technical Setup" accent="#4A9EFF">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: setup.gear ? 10 : 0 }}>
              {[
                ['Orientation', setup.camera_orientation],
                ['Frame Rate', setup.frame_rate ? setup.frame_rate + ' fps' : ''],
                ['Resolution', setup.resolution],
                ['Codec', setup.codec],
                ['Color Profile', setup.color_profile],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '7px 12px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ddd' }}>{v}</div>
                </div>
              ))}
            </div>
            {setup.gear && (
              <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{setup.gear}</div>
            )}
          </Section>
        )}

        {/* Crew */}
        {crew.length > 0 && (
          <Section title="Crew" accent="#F59E0B">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {crew.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 14px', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', align: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ marginLeft: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.name}</div>
                      {c.role && <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginTop: 1 }}>{c.role}</div>}
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#888', display: 'flex', gap: 12 }}>
                    {c.phone && <span>📱 {c.phone}</span>}
                    {c.email && <span>✉ {c.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Rentals */}
        {rentals.length > 0 && (
          <Section title="Rentals / Equipment" accent="#7BC853">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rentals.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 14px', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.equipment}</div>
                    {r.vendor && <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', marginTop: 1 }}>via {r.vendor}</div>}
                  </div>
                  {r.phone && <div style={{ fontFamily: MONO, fontSize: 11, color: '#888' }}>📱 {r.phone}</div>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Deliverables */}
        {deliverables.length > 0 && (
          <Section title="Deliverables" accent="#A78BFA">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {deliverables.map((d, i) => (
                <div key={i} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: d.done ? '#7BC853' : '#444' }} />
                  <span style={{ fontSize: 12, color: '#ccc' }}>{d.name}</span>
                  {d.due && <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{d.due}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Shot List */}
        {(p.shot_list || []).length > 0 && (
          <Section title="Shot List" accent="#E81A1A">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(p.shot_list).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#1A1A1A', borderRadius: 6, fontSize: 12, color: s.done ? '#555' : '#ccc' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${s.done ? '#7BC853' : '#333'}`, background: s.done ? 'rgba(123,200,83,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#7BC853' }}>
                    {s.done ? '✓' : ''}
                  </div>
                  <span style={{ textDecoration: s.done ? 'line-through' : 'none' }}>{s.shot}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
        {(p.notes || setup.notes) && (
          <Section title="Notes" accent="#888">
            {setup.notes && <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: setup.notes && p.notes ? 8 : 0 }}>{setup.notes}</div>}
            {p.notes && <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{p.notes}</div>}
          </Section>
        )}

        {/* Extra AI-added content */}
        {extra && (
          <Section title="Additional Info" accent="#4A9EFF">
            <div style={{ background: '#111', border: '1px solid rgba(74,158,255,0.2)', borderLeft: '3px solid #4A9EFF', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{extra}</div>
          </Section>
        )}

        <div style={{ paddingTop: 16, borderTop: '1px solid #1E1E1E', fontFamily: MONO, fontSize: 10, color: '#333', display: 'flex', justifyContent: 'space-between' }}>
          <span>Studio 65 · studio65production@gmail.com</span>
          <span>Generated {new Date().toLocaleDateString('en-CA')}</span>
        </div>
      </div>
    </div>
  );
}

export async function generateCallSheetPDF(p, extraContent = '') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const SANS = 'helvetica';
  const MARGIN = 36;
  let y = 0;

  // Helper: add page if needed
  const checkPage = (needed = 20) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 36) {
      doc.addPage();
      y = 40;
    }
  };

  // Header bar
  doc.setFillColor(232, 26, 26);
  doc.rect(0, 0, W, 70, 'F');
  doc.setFont(SANS, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 180, 180);
  doc.text('STUDIO 65  ·  CALL SHEET', MARGIN, 18);

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(p.name || 'Call Sheet', MARGIN, 40);

  doc.setFont(SANS, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 200, 200);
  const subLine = [p.project_id, p.client ? `Client: ${p.client}` : ''].filter(Boolean).join('  ·  ');
  if (subLine) doc.text(subLine, MARGIN, 54);

  // Date / time top-right
  const dateStr = p.end_date && p.end_date !== p.date
    ? `${p.date} – ${p.end_date}`
    : p.date || '';
  doc.setFont(SANS, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  if (dateStr) doc.text(dateStr, W - MARGIN, 36, { align: 'right' });
  if (p.start_time) {
    doc.setFont(SANS, 'normal');
    doc.setFontSize(8);
    const timeStr = `Call: ${p.start_time}${p.end_time ? '  →  Wrap: ' + p.end_time : ''}`;
    doc.text(timeStr, W - MARGIN, 50, { align: 'right' });
  }
  if (p.setup?.arrival_time) {
    doc.setFontSize(8);
    doc.text(`Crew Arrival: ${p.setup.arrival_time}`, W - MARGIN, 62, { align: 'right' });
  }

  y = 90;

  // Section helper
  const sectionHeader = (title, accent = [232, 26, 26]) => {
    checkPage(22);
    doc.setFillColor(...accent);
    doc.rect(MARGIN, y, 3, 12, 'F');
    doc.setFont(SANS, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text(title.toUpperCase(), MARGIN + 8, y + 9);
    y += 18;
  };

  const labelValue = (label, value, xOffset = MARGIN) => {
    doc.setFont(SANS, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), xOffset, y);
    doc.setFont(SANS, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value, W - xOffset - MARGIN);
    doc.text(lines, xOffset, y + 11);
    y += 11 + lines.length * 11 + 4;
  };

  // Location & POC
  if (p.address || p.poc_name) {
    sectionHeader('Location & Contact', [74, 158, 255]);
    if (p.address) labelValue('Location', p.address);
    if (p.poc_name) labelValue('Point of Contact', p.poc_name + (p.poc_phone ? `  ·  ${p.poc_phone}` : ''));
    y += 6;
  }

  // Crew
  if ((p.crew || []).length > 0) {
    sectionHeader('Crew', [245, 158, 11]);
    p.crew.forEach((c) => {
      checkPage(18);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, 'F');
      doc.setFont(SANS, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      doc.text(c.name || '—', MARGIN + 6, y + 11);
      doc.setFont(SANS, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const roleStr = [c.role, c.phone, c.email].filter(Boolean).join('  ·  ');
      if (roleStr) doc.text(roleStr, MARGIN + 6 + doc.getTextWidth(c.name || '—') + 8, y + 11);
      y += 20;
    });
    y += 4;
  }

  // Camera Setup
  const setup = p.setup || {};
  const setupItems = [
    ['Orientation', setup.camera_orientation],
    ['Frame Rate', setup.frame_rate ? setup.frame_rate + ' fps' : ''],
    ['Resolution', setup.resolution],
    ['Codec', setup.codec],
    ['Color Profile', setup.color_profile],
  ].filter(([, v]) => v);
  if (setupItems.length || setup.gear) {
    sectionHeader('Camera & Technical Setup', [74, 158, 255]);
    setupItems.forEach(([l, v]) => { checkPage(14); labelValue(l, v); });
    if (setup.gear) { checkPage(14); labelValue('Gear', setup.gear); }
    y += 4;
  }

  // Rentals
  if ((p.rentals || []).length > 0) {
    sectionHeader('Rentals / Equipment', [123, 200, 83]);
    p.rentals.forEach((r) => {
      checkPage(18);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, 'F');
      doc.setFont(SANS, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      doc.text(r.equipment || '—', MARGIN + 6, y + 11);
      if (r.vendor || r.phone) {
        doc.setFont(SANS, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text([r.vendor && `via ${r.vendor}`, r.phone].filter(Boolean).join('  ·  '), W - MARGIN - 6, y + 11, { align: 'right' });
      }
      y += 20;
    });
    y += 4;
  }

  // Shot List
  if ((p.shot_list || []).length > 0) {
    sectionHeader('Shot List', [232, 26, 26]);
    (p.shot_list).forEach((s, i) => {
      checkPage(14);
      doc.setFont(SANS, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(s.done ? 150 : 30, s.done ? 150 : 30, s.done ? 150 : 30);
      doc.text(`${i + 1}.  ${s.shot || ''}`, MARGIN + 6, y);
      y += 13;
    });
    y += 6;
  }

  // Deliverables
  if ((p.deliverables || []).length > 0) {
    sectionHeader('Deliverables', [167, 139, 250]);
    (p.deliverables).forEach((d) => {
      checkPage(13);
      doc.setFont(SANS, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(`• ${d.name}${d.due ? `  (due ${d.due})` : ''}`, MARGIN + 6, y);
      y += 13;
    });
    y += 6;
  }

  // Notes
  if (p.notes || setup.notes) {
    sectionHeader('Notes', [100, 100, 100]);
    if (setup.notes) { checkPage(14); labelValue('Setup Notes', setup.notes); }
    if (p.notes) { checkPage(14); labelValue('Project Notes', p.notes); }
    y += 4;
  }

  // Extra AI content
  if (extraContent) {
    sectionHeader('Additional Info', [74, 158, 255]);
    checkPage(14);
    doc.setFont(SANS, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(extraContent, W - MARGIN * 2);
    lines.forEach((line) => { checkPage(12); doc.text(line, MARGIN + 6, y); y += 12; });
    y += 4;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN, ph - 24, W - MARGIN, ph - 24);
    doc.setFont(SANS, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Studio 65  ·  studio65production@gmail.com', MARGIN, ph - 12);
    doc.text(`Page ${i} of ${pageCount}  ·  Generated ${new Date().toLocaleDateString('en-CA')}`, W - MARGIN, ph - 12, { align: 'right' });
  }

  const safeName = (p.name || 'CallSheet').replace(/[^a-z0-9]/gi, '_');
  doc.save(`CallSheet_${safeName}_${p.date || 'undated'}.pdf`);
}

export default function CallSheetTab({ project, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [extraContent, setExtraContent] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const fileRef = useRef();
  const chatEndRef = useRef();

  const p = project;

  const handleGeneratePDF = async () => {
    setPdfLoading(true);
    try {
      await generateCallSheetPDF(p, extraContent);
      showToast('Call sheet PDF downloaded!', 'green');
    } catch (e) {
      showToast('PDF generation failed', 'red');
    }
    setPdfLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await onUpdate({ call_sheet_url: file_url });
    showToast('Call sheet uploaded', 'green');
    setUploading(false);
  };

  const handlePrint = () => window.print();

  const handleAIUpdate = async () => {
    if (!chatMsg.trim()) return;
    const userMsg = chatMsg.trim();
    setChatMsg('');
    setChatHistory(h => [...h, { role: 'user', text: userMsg }]);
    setAiLoading(true);

    const projectSummary = `
Project: ${p.name}
Client: ${p.client}
Date: ${fmtDateRange(p)}
Call Time: ${p.start_time || 'TBD'} | Wrap: ${p.end_time || 'TBD'}
Address: ${p.address || 'TBD'}
POC: ${p.poc_name || '—'} ${p.poc_phone || ''}
Crew: ${(p.crew || []).map(c => `${c.name} (${c.role})`).join(', ') || 'None'}
Rentals: ${(p.rentals || []).map(r => r.equipment).join(', ') || 'None'}
Deliverables: ${(p.deliverables || []).map(d => d.name).join(', ') || 'None'}
Shot List: ${(p.shot_list || []).map(s => s.shot).join(', ') || 'None'}
Notes: ${p.notes || '—'}
Setup: ${JSON.stringify(p.setup || {})}
Current extra content on call sheet: ${extraContent || 'none'}
    `.trim();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are updating a professional call sheet for a video production project. The user wants you to: "${userMsg}"

Here is the current project data:
${projectSummary}

Respond with ONLY the new/updated content to add or replace in the "Additional Info" section of the call sheet. Be concise and formatted (use bullet points or clear sections). Do not repeat info already shown in the call sheet (crew, location, etc.) unless specifically asked. If the user asks to update something specific like notes or schedule, return just that updated text.`,
    });

    const aiText = typeof response === 'string' ? response : response?.text || response?.content || JSON.stringify(response);
    setExtraContent(aiText);
    setChatHistory(h => [...h, { role: 'ai', text: aiText }]);
    setAiLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div>
      {/* Top actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={handleGeneratePDF} disabled={pdfLoading} style={{ padding: '9px 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: pdfLoading ? 0.7 : 1 }}>
          {pdfLoading ? '⏳ Generating...' : '⬇ Generate Call Sheet PDF'}
        </button>
        <button onClick={handlePrint} style={{ padding: '9px 16px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#ccc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🖨 Print
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '9px 16px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : '📎 Upload External'}
        </button>
        {p.call_sheet_url && (
          <a href={p.call_sheet_url} target="_blank" rel="noreferrer" style={{ padding: '9px 16px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 8, color: '#4A9EFF', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            📄 View Uploaded
          </a>
        )}
      </div>

      {/* AI Chat to update call sheet */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>✦ Ask AI to Update Call Sheet</div>

        {chatHistory.length > 0 && (
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatHistory.map((m, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, maxWidth: '85%',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#E81A1A' : '#1E1E1E',
                border: m.role === 'ai' ? '1px solid #2A2A2A' : 'none',
                color: m.role === 'user' ? '#fff' : '#ccc',
                whiteSpace: 'pre-wrap',
              }}>{m.text}</div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAIUpdate()}
            placeholder='e.g. "Add parking instructions" or "Include a dress code note"'
            style={{ flex: 1, background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif' }}
          />
          <button
            onClick={handleAIUpdate}
            disabled={aiLoading || !chatMsg.trim()}
            style={{ padding: '9px 16px', background: aiLoading ? '#333' : '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !chatMsg.trim() ? 0.5 : 1 }}
          >
            {aiLoading ? '⏳' : '→ Add'}
          </button>
          {extraContent && (
            <button onClick={() => { setExtraContent(''); setChatHistory([]); }} style={{ padding: '9px 12px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#666', fontSize: 12, cursor: 'pointer' }}>Clear</button>
          )}
        </div>
      </div>

      {/* The branded call sheet */}
      <CallSheetPreview project={project} extra={extraContent} />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #call-sheet-print, #call-sheet-print * { visibility: visible !important; }
          #call-sheet-print {
            position: fixed; top: 0; left: 0; width: 100%;
            background: #fff !important; color: #000 !important;
            padding: 20px !important; border-radius: 0 !important;
          }
          #call-sheet-print * { color: #000 !important; border-color: #ccc !important; background: #f9f9f9 !important; }
        }
      `}</style>
    </div>
  );
}