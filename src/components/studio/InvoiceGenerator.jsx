import React, { useState, useEffect } from 'react';
import { fmt } from '@/lib/studio';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

export default function InvoiceGenerator({ project: p, onUpdate }) {
  const [invoiceNum, setInvoiceNum] = useState(p.invoice_number || `INV-${p.project_id || Date.now()}`);
  const [invoiceDate, setInvoiceDate] = useState(p.invoice_date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(p.invoice_due_date || '');
  const [studioName, setStudioName] = useState('Studio 65');
  const [studioEmail, setStudioEmail] = useState('studio65production@gmail.com');
  const [studioAddress, setStudioAddress] = useState('Toronto, ON');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Load saved studio profile
  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.studio_name) setStudioName(u.studio_name);
      if (u?.studio_email) setStudioEmail(u.studio_email);
      if (u?.studio_phone) setStudioAddress(prev => u.studio_phone ? `${prev} · ${u.studio_phone}` : prev);
      if (u?.payment_details) setPaymentDetails(u.payment_details);
    });
  }, []);

  const totalExpenses = (p.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const lineItems = [
    { desc: `Production Services — ${p.name}`, amount: p.revenue || 0 },
    ...(p.expenses || []).map(e => ({ desc: `${e.category || 'Expense'}: ${e.desc}`, amount: e.amount || 0 })),
  ];
  const grandTotal = lineItems.reduce((s, l) => s + l.amount, 0);

  const handleSaveAndGenerate = async () => {
    setGenerating(true);
    // Save invoice fields to project, auto-progress to Invoiced
    const updated = {
      ...p,
      invoice_number: invoiceNum,
      invoice_date: invoiceDate,
      invoice_due_date: dueDate,
      status: p.status === 'Delivered' || p.status === 'Booked' || p.status === 'In Production' || p.status === 'In Edit' ? 'Invoiced' : p.status,
    };
    await base44.entities.Project.update(p.id, updated);
    onUpdate(updated);
    // Save payment details for future invoices
    if (paymentDetails) await base44.auth.updateMe({ payment_details: paymentDetails });

    // Generate PDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const SANS = 'helvetica';
    const COURIER = 'courier';
    let y = 0;

    // Background
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, 'F');

    // Red header bar
    doc.setFillColor(232, 26, 26);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setFont(SANS, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', 20, 14);
    doc.setFont(COURIER, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 200, 200);
    doc.text(invoiceNum, 190, 14, { align: 'right' });

    y = 32;

    // Studio info (left) + Client info (right)
    doc.setFont(SANS, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(studioName, 20, y);
    doc.setFont(COURIER, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(studioEmail, 20, y + 6);
    doc.text(studioAddress, 20, y + 12);

    // Bill To (right side)
    doc.setFont(COURIER, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('BILL TO', 130, y);
    doc.setFont(SANS, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(p.client || 'Client', 130, y + 6);
    if (p.poc_name) {
      doc.setFont(COURIER, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(p.poc_name, 130, y + 12);
    }

    y += 26;

    // Invoice meta row
    doc.setFillColor(25, 25, 25);
    doc.roundedRect(18, y, 174, 18, 3, 3, 'F');
    const metaItems = [
      ['Invoice Date', invoiceDate || '—'],
      ['Due Date', dueDate || 'On Receipt'],
      ['Project', p.project_id || '—'],
      ['Status', p.paid ? 'PAID' : 'OUTSTANDING'],
    ];
    metaItems.forEach(([label, value], i) => {
      const x = 22 + i * 44;
      doc.setFont(COURIER, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(label.toUpperCase(), x, y + 6);
      doc.setFont(COURIER, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(value === 'PAID' ? 123 : value === 'OUTSTANDING' ? 232 : 200, value === 'PAID' ? 200 : 200, value === 'PAID' ? 83 : 200);
      doc.text(value, x, y + 13);
    });

    y += 26;

    // Project description
    doc.setFont(COURIER, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('DESCRIPTION', 20, y);
    y += 6;
    doc.setFillColor(18, 18, 18);
    doc.rect(18, y, 174, 0.5, 'F');
    y += 4;

    // Line items header
    doc.setFont(COURIER, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('ITEM', 20, y);
    doc.text('AMOUNT', 188, y, { align: 'right' });
    y += 6;

    doc.setDrawColor(40, 40, 40);
    doc.line(18, y, 192, y);
    y += 5;

    // Line items
    lineItems.forEach((item, idx) => {
      if (y > 240) { doc.addPage(); doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 297, 'F'); y = 20; }
      const even = idx % 2 === 0;
      if (even) {
        doc.setFillColor(15, 15, 15);
        doc.rect(18, y - 3, 174, 10, 'F');
      }
      doc.setFont(SANS, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(220, 220, 220);
      const wrappedDesc = doc.splitTextToSize(item.desc, 130);
      doc.text(wrappedDesc, 20, y + 3);
      doc.setFont(COURIER, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(fmt(item.amount), 188, y + 3, { align: 'right' });
      y += Math.max(10, wrappedDesc.length * 6);
    });

    y += 4;
    doc.setDrawColor(40, 40, 40);
    doc.line(18, y, 192, y);
    y += 8;

    // Total box
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(120, y, 72, 18, 3, 3, 'F');
    doc.setFont(COURIER, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('TOTAL DUE', 124, y + 7);
    doc.setFont(SANS, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(232, 26, 26);
    doc.text(fmt(grandTotal), 188, y + 13, { align: 'right' });

    if (p.paid) {
      y += 22;
      doc.setFillColor(123, 200, 83, 0.15);
      doc.roundedRect(18, y, 174, 14, 3, 3, 'F');
      doc.setFont(SANS, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(123, 200, 83);
      doc.text('✓ PAID — Thank you!', 105, y + 9, { align: 'center' });
    }

    // Payment details box
    if (paymentDetails) {
      y += p.paid ? 20 : 26;
      doc.setFillColor(18, 30, 18);
      doc.roundedRect(18, y, 174, 4 + Math.ceil(paymentDetails.length / 60) * 5 + 8, 3, 3, 'F');
      doc.setFont(COURIER, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(123, 200, 83);
      doc.text('PAYMENT DETAILS', 22, y + 7);
      doc.setFont(SANS, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 220, 160);
      const wrappedPay = doc.splitTextToSize(paymentDetails, 168);
      wrappedPay.forEach((ln, i) => { doc.text(ln, 22, y + 13 + i * 5); });
      y += 4 + wrappedPay.length * 5 + 8;
    }

    // Notes
    if (notes) {
      y += 10;
      doc.setFont(COURIER, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('NOTES', 20, y);
      y += 6;
      doc.setFont(SANS, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const wrappedNotes = doc.splitTextToSize(notes, 170);
      wrappedNotes.forEach(ln => { doc.text(ln, 20, y); y += 5; });
    }

    // Footer
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 284, 210, 13, 'F');
    doc.setFont(COURIER, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(`${studioName} · ${studioEmail}`, 105, 291, { align: 'center' });

    doc.save(`Invoice_${invoiceNum}_${p.client || 'Client'}.pdf`);
    setGenerating(false);
    showToast('Invoice downloaded!', 'green');
  };

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 14 }}>Invoice Generator</div>

      {/* Studio info */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Studio Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={LS}>Studio Name</label><input style={IS} value={studioName} onChange={e => setStudioName(e.target.value)} /></div>
          <div><label style={LS}>Email</label><input style={IS} value={studioEmail} onChange={e => setStudioEmail(e.target.value)} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={LS}>Address / City</label><input style={IS} value={studioAddress} onChange={e => setStudioAddress(e.target.value)} /></div>
        </div>
      </div>

      {/* Invoice details */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Invoice Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div><label style={LS}>Invoice #</label><input style={IS} value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} /></div>
          <div><label style={LS}>Invoice Date</label><input style={IS} type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
          <div><label style={LS}>Due Date</label><input style={IS} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        </div>
      </div>

      {/* Line items preview */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Line Items</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lineItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#222', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: '#ccc', flex: 1 }}>{item.desc}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff', marginLeft: 12, flexShrink: 0 }}>{fmt(item.amount)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 8, marginTop: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#E81A1A' }}>TOTAL DUE</span>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#E81A1A' }}>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div style={{ marginBottom: 10 }}>
        <label style={LS}>Payment Details (e-transfer / bank / PayPal)</label>
        <textarea style={{ ...IS, resize: 'none', minHeight: 52 }} rows={2} value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} placeholder="e.g. E-transfer: studio65production@gmail.com&#10;Bank: TD, Account #12345, Transit #67890" />
      </div>

      {/* Optional notes */}
      <div style={{ marginBottom: 14 }}>
        <label style={LS}>Additional Notes (optional)</label>
        <textarea style={{ ...IS, resize: 'none', minHeight: 52 }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Thank you for choosing Studio 65!" />
      </div>

      {p.status !== 'Invoiced' && (
        <div style={{ marginBottom: 12, padding: '9px 12px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, fontSize: 11, color: '#4A9EFF', fontFamily: MONO }}>
          ℹ️ Generating will auto-update project status to <strong>Invoiced</strong>
        </div>
      )}

      <button
        onClick={handleSaveAndGenerate}
        disabled={generating}
        style={{ width: '100%', padding: '12px 0', background: generating ? '#333' : '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: generating ? 'default' : 'pointer', transition: 'background 0.2s' }}
      >
        {generating ? 'Generating PDF...' : '⬇ Download Invoice PDF'}
      </button>
    </div>
  );
}