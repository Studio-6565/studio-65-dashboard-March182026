import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import { Sparkles, X, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const CATEGORIES = ['Travel', 'Food', 'Props', 'Software', 'Printing', 'Other'];

const CAT_COLORS = {
  Travel: '#4A9EFF', Food: '#F59E0B', Props: '#A78BFA',
  Software: '#7BC853', Printing: '#F97316', Other: '#888',
};

const SS = {
  background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8,
  padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
  width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box',
};

// Score how well a project matches the receipt date
function matchProject(projects, receiptDate, amount) {
  if (!projects.length) return null;

  const rDate = new Date(receiptDate + 'T00:00:00');

  const scored = projects
    .filter(p => !p.archived && !p.is_test && p.date)
    .map(p => {
      const pDate = new Date(p.date + 'T00:00:00');
      const endDate = p.end_date ? new Date(p.end_date + 'T00:00:00') : pDate;

      // Days from shoot window
      let daysDiff;
      if (rDate >= pDate && rDate <= endDate) {
        daysDiff = 0; // receipt is within shoot window — perfect
      } else if (rDate < pDate) {
        daysDiff = Math.ceil((pDate - rDate) / 86400000); // before shoot
      } else {
        daysDiff = Math.ceil((rDate - endDate) / 86400000); // after shoot
      }

      // Only consider projects within 7 days of receipt date
      if (daysDiff > 7) return null;

      // Score: closer = better
      const score = 100 - daysDiff * 10;
      return { project: p, score, daysDiff };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

export default function ReceiptScanner({ projects = [], onExpenseAdded, onClose }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | scanning | review | done
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState(null); // { merchant, date, amount, tax, category, desc }
  const [matched, setMatched] = useState(null); // { project, score, daysDiff }
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  // Editable fields after extraction
  const [form, setForm] = useState(null);

  const handleFileSelect = async (file) => {
    if (!file) return;
    // Show preview
    const reader = new FileReader();
    reader.onload = e => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    setStep('scanning');
    setScanning(true);

    // Upload
    const res = await base44.integrations.Core.UploadFile({ file });
    const url = res.file_url;
    setUploadedUrl(url);

    // AI extraction via vision
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert at reading receipts. Carefully analyze this receipt image and extract all key information.

Extract:
- merchant: the business/store name
- date: the transaction date in YYYY-MM-DD format (if year is ambiguous, use current year)
- amount: the TOTAL amount paid (as a number, no currency symbol)
- tax: tax amount if shown (as a number, 0 if not shown)
- category: best match from [Travel, Food, Props, Software, Printing, Other]
- desc: a short 3-7 word description of what was purchased

Return null for any field you cannot confidently read. Do not guess.`,
      file_urls: [url],
      response_json_schema: {
        type: 'object',
        properties: {
          merchant: { type: 'string' },
          date: { type: 'string' },
          amount: { type: 'number' },
          tax: { type: 'number' },
          category: { type: 'string', enum: ['Travel', 'Food', 'Props', 'Software', 'Printing', 'Other'] },
          desc: { type: 'string' },
        },
      },
    });

    setExtracted(result);

    // Auto-fill form from extraction
    const today = new Date().toISOString().split('T')[0];
    const extractedForm = {
      desc: result?.desc || result?.merchant || '',
      category: result?.category || 'Other',
      amount: result?.amount ? String(result.amount) : '',
      tax: result?.tax ? String(result.tax) : '',
      date: result?.date || today,
      merchant: result?.merchant || '',
    };
    setForm(extractedForm);

    // Auto-match to project
    if (result?.date) {
      const match = matchProject(projects, result.date, result.amount);
      setMatched(match);
      setSelectedProjectId(match?.project?.id || '');
    }

    setScanning(false);
    setStep('review');
  };

  const handleSave = async () => {
    if (!form.desc.trim()) { showToast('Add a description', 'red'); return; }
    if (!selectedProjectId) { showToast('Select a project', 'red'); return; }

    setSaving(true);
    const project = projects.find(p => p.id === selectedProjectId);
    const amount = parseFloat(form.amount) || 0;

    const newExpense = {
      desc: form.desc,
      category: form.category,
      amount,
      date: form.date,
      receipt_url: uploadedUrl,
      ...(form.tax ? { tax: parseFloat(form.tax) } : {}),
      ...(form.merchant ? { merchant: form.merchant } : {}),
      scanned_by_ai: true,
    };

    const updatedExpenses = [...(project.expenses || []), newExpense];
    await base44.entities.Project.update(selectedProjectId, {
      expenses: updatedExpenses,
      activity: [
        ...(project.activity || []),
        { msg: `Receipt scanned: ${form.desc} — $${amount}`, ts: new Date().toISOString() },
      ],
    });

    setSaving(false);
    setStep('done');
    showToast(`Receipt linked to "${project.name}"`, 'green');
    onExpenseAdded({ projectId: selectedProjectId, expense: newExpense });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 18,
        width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} color="#E81A1A" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>AI Receipt Scanner</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 1 }}>
                {step === 'upload' && 'Upload a receipt photo to extract data'}
                {step === 'scanning' && 'Reading your receipt...'}
                {step === 'review' && 'Review and confirm extracted data'}
                {step === 'done' && 'Receipt successfully logged!'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', border: '1px solid #222', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '22px' }}>

          {/* STEP: Upload */}
          {step === 'upload' && (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #222', borderRadius: 14, padding: '48px 20px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#E81A1A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
              >
                <Upload size={36} color="#333" style={{ marginBottom: 14 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#888', marginBottom: 6 }}>Drop receipt photo here</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>or tap to take a photo · JPG, PNG, HEIC</div>
              </div>
              <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(232,26,26,0.05)', border: '1px solid rgba(232,26,26,0.1)', borderRadius: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', lineHeight: 1.7 }}>
                  ✦ AI extracts merchant, date, amount & tax<br />
                  ✦ Auto-links to the closest matching project<br />
                  ✦ Receipt image stored for your records
                </div>
              </div>
            </>
          )}

          {/* STEP: Scanning */}
          {step === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              {previewUrl && (
                <img src={previewUrl} alt="Receipt" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 10, marginBottom: 20, objectFit: 'contain', border: '1px solid #1E1E1E' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                <Loader2 size={20} color="#E81A1A" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Scanning receipt...</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>AI is extracting merchant, amount, date & tax</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* STEP: Review */}
          {step === 'review' && form && (
            <div>
              {/* Receipt preview */}
              {previewUrl && (
                <img src={previewUrl} alt="Receipt" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10, marginBottom: 18, border: '1px solid #1E1E1E', background: '#111' }} />
              )}

              {/* Extraction confidence badge */}
              {extracted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '8px 12px', background: 'rgba(123,200,83,0.07)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 8 }}>
                  <Sparkles size={13} color="#7BC853" />
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853' }}>
                    AI extracted {Object.values(extracted).filter(v => v !== null && v !== undefined && v !== '').length} fields — review below
                  </span>
                </div>
              )}

              {/* Editable fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Merchant</label>
                    <input style={SS} value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} placeholder="Store / vendor name" />
                  </div>
                  <div>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Date</label>
                    <input type="date" style={SS} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Description</label>
                  <input style={SS} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="What was purchased..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Amount ($)</label>
                    <input type="number" style={SS} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" step="0.01" />
                  </div>
                  <div>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Tax ($)</label>
                    <input type="number" style={SS} value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} placeholder="0.00" step="0.01" />
                  </div>
                  <div>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Category</label>
                    <select style={SS} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Project matching */}
                <div>
                  <label style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Link to Project *</label>

                  {matched && matched.project && (
                    <div style={{ marginBottom: 8, padding: '10px 12px', background: 'rgba(74,158,255,0.07)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={13} color="#4A9EFF" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: '#4A9EFF' }}>
                          Auto-matched · {matched.daysDiff === 0 ? 'within shoot window' : `${matched.daysDiff} day${matched.daysDiff !== 1 ? 's' : ''} from shoot`}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 2 }}>{matched.project.name}</div>
                      </div>
                    </div>
                  )}

                  <select
                    style={SS}
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">— Select project —</option>
                    {projects
                      .filter(p => !p.archived && !p.is_test)
                      .sort((a, b) => (a.date || '').localeCompare(b.date || '') * -1)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.client} {p.date ? `(${p.date})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving || !selectedProjectId}
                style={{
                  marginTop: 20, width: '100%', padding: '14px 0',
                  background: selectedProjectId && !saving ? '#E81A1A' : '#1A1A1A',
                  border: 'none', borderRadius: 10,
                  color: selectedProjectId && !saving ? '#fff' : '#444',
                  fontSize: 14, fontWeight: 800, cursor: selectedProjectId && !saving ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {saving
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                  : '💾 Add to Project Expenses'
                }
              </button>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <CheckCircle size={48} color="#7BC853" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Receipt Logged!</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#555', marginBottom: 24 }}>
                Expense added to {projects.find(p => p.id === selectedProjectId)?.name || 'project'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setStep('upload'); setPreviewUrl(null); setExtracted(null); setForm(null); setMatched(null); setSelectedProjectId(''); }}
                  style={{ flex: 1, padding: '12px 0', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Scan Another
                </button>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}