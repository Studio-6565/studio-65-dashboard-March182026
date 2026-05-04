import React, { useState, useEffect } from 'react';
import { fmt } from '@/lib/studio';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LS = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const INVOICE_STATUSES = [
  { key: 'draft',          label: 'Draft',          color: '#666',    bg: 'rgba(100,100,100,0.12)' },
  { key: 'sent',           label: 'Sent',            color: '#4A9EFF', bg: 'rgba(74,158,255,0.12)' },
  { key: 'viewed',         label: 'Viewed',          color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { key: 'paid',           label: 'Paid',            color: '#7BC853', bg: 'rgba(123,200,83,0.12)' },
  { key: 'partially_paid', label: 'Partially Paid',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { key: 'overdue',        label: 'Overdue',         color: '#E81A1A', bg: 'rgba(232,26,26,0.12)' },
  { key: 'cancelled',      label: 'Cancelled',       color: '#555',    bg: 'rgba(80,80,80,0.12)' },
];

export default function InvoiceGenerator({ project: p, onUpdate }) {
  const [invoiceNum, setInvoiceNum] = useState(p.invoice_number || `INV-${p.project_id || Date.now()}`);
  const [invoiceDate, setInvoiceDate] = useState(p.invoice_date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(p.invoice_due_date || '');
  const [invoiceStatus, setInvoiceStatus] = useState(p.invoice_status || (p.paid ? 'paid' : 'draft'));
  const [studioName, setStudioName] = useState('Studio 65');
  const [studioEmail, setStudioEmail] = useState('studio65production@gmail.com');
  const [studioAddress, setStudioAddress] = useState('Toronto, ON');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceType, setInvoiceType] = useState('final'); // 'final' | 'deposit'
  const [depositPct, setDepositPct] = useState(50);
  const [taxRate, setTaxRate] = useState(13); // HST default
  const [discount, setDiscount] = useState(0);
  const [customLineItems, setCustomLineItems] = useState([]);
  const [newItem, setNewItem] = useState({ desc: '', qty: 1, rate: '' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.studio_name) setStudioName(u.studio_name);
      if (u?.studio_email) setStudioEmail(u.studio_email);
      if (u?.payment_details) setPaymentDetails(u.payment_details);
    });
  }, []);

  // Core line items from project
  const fullAmount = p.revenue || 0;
  const depositAmount = Math.round(fullAmount * depositPct / 100 * 100) / 100;
  const coreItems = invoiceType === 'deposit'
    ? [{ desc: `Deposit (${depositPct}%) — ${p.name}`, qty: 1, rate: depositAmount }]
    : [
        { desc: `Production Services — ${p.name}`, qty: 1, rate: fullAmount },
        ...(p.expenses || []).map(e => ({ desc: `${e.category || 'Expense'}: ${e.desc}`, qty: 1, rate: e.amount || 0 })),
      ];

  const allItems = [...coreItems, ...customLineItems];
  const subtotal = allItems.reduce((s, l) => s + (l.qty || 1) * (l.rate || 0), 0);
  const discountAmt = discount > 0 ? (subtotal * discount) / 100 : 0;
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = taxRate > 0 ? (afterDiscount * taxRate) / 100 : 0;
  const grandTotal = afterDiscount + taxAmt;

  const addCustomItem = () => {
    if (!newItem.desc.trim() || !newItem.rate) return;
    setCustomLineItems(prev => [...prev, { desc: newItem.desc.trim(), qty: parseFloat(newItem.qty) || 1, rate: parseFloat(newItem.rate) || 0 }]);
    setNewItem({ desc: '', qty: 1, rate: '' });
  };

  const removeCustomItem = (i) => {
    setCustomLineItems(prev => prev.filter((_, j) => j !== i));
  };

  const handleSaveAndGenerate = async () => {
    setGenerating(true);

    const isPaid = invoiceStatus === 'paid';
    const updated = {
      ...p,
      invoice_number: invoiceNum,
      invoice_date: invoiceDate,
      invoice_due_date: dueDate,
      invoice_status: invoiceStatus,
      paid: isPaid,
      status: ['draft','sent','viewed'].includes(invoiceStatus) && p.status !== 'Invoiced'
        ? 'Invoiced'
        : p.status === 'Delivered' || p.status === 'Booked' || p.status === 'In Production' || p.status === 'In Edit'
          ? 'Invoiced'
          : p.status,
    };
    await base44.entities.Project.update(p.id, updated);
    onUpdate(updated);
    if (paymentDetails) await base44.auth.updateMe({ payment_details: paymentDetails });

    // Generate PDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const SANS = 'helvetica';
    const COURIER = 'courier';
    let y = 0;

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, 'F');

    // Header
    doc.setFillColor(232, 26, 26);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setFont(SANS, 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(invoiceType === 'deposit' ? 'DEPOSIT INVOICE' : 'INVOICE', 20, 14);
    doc.setFont(COURIER, 'normal'); doc.setFontSize(9); doc.setTextColor(255, 200, 200);
    doc.text(invoiceNum, 190, 14, { align: 'right' });

    y = 32;
    doc.setFont(SANS, 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text(studioName, 20, y);
    doc.setFont(COURIER, 'normal'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(studioEmail, 20, y + 6);
    doc.text(studioAddress, 20, y + 12);

    doc.setFont(COURIER, 'bold'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('BILL TO', 130, y);
    doc.setFont(SANS, 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text(p.client || 'Client', 130, y + 6);
    if (p.poc_name) {
      doc.setFont(COURIER, 'normal'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text(p.poc_name, 130, y + 12);
    }

    y += 26;
    doc.setFillColor(25, 25, 25);
    doc.roundedRect(18, y, 174, 18, 3, 3, 'F');
    const statusInfo = INVOICE_STATUSES.find(s => s.key === invoiceStatus) || INVOICE_STATUSES[0];
    [['Invoice Date', invoiceDate || '—'], ['Due Date', dueDate || 'On Receipt'], ['Project', p.project_id || '—'], ['Status', statusInfo.label.toUpperCase()]].forEach(([label, value], i) => {
      const x = 22 + i * 44;
      doc.setFont(COURIER, 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
      doc.text(label.toUpperCase(), x, y + 6);
      doc.setFont(COURIER, 'bold'); doc.setFontSize(9);
      doc.setTextColor(invoiceStatus === 'paid' ? 123 : invoiceStatus === 'overdue' ? 232 : 200, 200, invoiceStatus === 'paid' ? 83 : 200);
      doc.text(value, x, y + 13);
    });

    y += 26;
    doc.setFont(COURIER, 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('DESCRIPTION', 20, y);
    doc.text('QTY', 130, y, { align: 'right' });
    doc.text('RATE', 158, y, { align: 'right' });
    doc.text('AMOUNT', 188, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(40, 40, 40);
    doc.line(18, y, 192, y);
    y += 5;

    allItems.forEach((item, idx) => {
      if (y > 230) { doc.addPage(); doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 297, 'F'); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(15, 15, 15); doc.rect(18, y - 3, 174, 10, 'F'); }
      const itemTotal = (item.qty || 1) * (item.rate || 0);
      doc.setFont(SANS, 'normal'); doc.setFontSize(10); doc.setTextColor(220, 220, 220);
      const wrappedDesc = doc.splitTextToSize(item.desc, 100);
      doc.text(wrappedDesc[0], 20, y + 3);
      doc.setFont(COURIER, 'normal'); doc.setFontSize(10); doc.setTextColor(180, 180, 180);
      doc.text(String(item.qty || 1), 130, y + 3, { align: 'right' });
      doc.text(fmt(item.rate || 0), 158, y + 3, { align: 'right' });
      doc.setFont(COURIER, 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text(fmt(itemTotal), 188, y + 3, { align: 'right' });
      y += 10;
    });

    y += 4;
    doc.setDrawColor(40, 40, 40);
    doc.line(18, y, 192, y);
    y += 8;

    // Subtotal / discount / tax / total
    const summaryRows = [
      ['SUBTOTAL', fmt(subtotal)],
      ...(discount > 0 ? [[`DISCOUNT (${discount}%)`, `-${fmt(discountAmt)}`]] : []),
      ...(taxRate > 0 ? [[`TAX (${taxRate}%)`, fmt(taxAmt)]] : []),
    ];
    summaryRows.forEach(([label, value]) => {
      doc.setFont(COURIER, 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
      doc.text(label, 130, y); doc.text(value, 188, y, { align: 'right' }); y += 7;
    });

    doc.setFillColor(30, 30, 30);
    doc.roundedRect(120, y, 72, 18, 3, 3, 'F');
    doc.setFont(COURIER, 'normal'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text('TOTAL DUE', 124, y + 7);
    doc.setFont(SANS, 'bold'); doc.setFontSize(15); doc.setTextColor(232, 26, 26);
    doc.text(fmt(grandTotal), 188, y + 13, { align: 'right' });
    y += 24;

    if (invoiceStatus === 'paid') {
      doc.setFillColor(20, 40, 20);
      doc.roundedRect(18, y, 174, 14, 3, 3, 'F');
      doc.setFont(SANS, 'bold'); doc.setFontSize(11); doc.setTextColor(123, 200, 83);
      doc.text('✓ PAID — Thank you!', 105, y + 9, { align: 'center' });
      y += 20;
    }

    if (paymentDetails) {
      doc.setFillColor(18, 30, 18);
      doc.roundedRect(18, y, 174, 20, 3, 3, 'F');
      doc.setFont(COURIER, 'bold'); doc.setFontSize(8); doc.setTextColor(123, 200, 83);
      doc.text('PAYMENT DETAILS', 22, y + 7);
      doc.setFont(SANS, 'normal'); doc.setFontSize(9); doc.setTextColor(180, 220, 160);
      const wrapped = doc.splitTextToSize(paymentDetails, 168);
      wrapped.forEach((ln, i) => { doc.text(ln, 22, y + 13 + i * 5); });
      y += 20 + (wrapped.length - 1) * 5;
    }

    if (notes) {
      y += 10;
      doc.setFont(COURIER, 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
      doc.text('NOTES', 20, y); y += 6;
      doc.setFont(SANS, 'normal'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      const wrappedNotes = doc.splitTextToSize(notes, 170);
      wrappedNotes.forEach(ln => { doc.text(ln, 20, y); y += 5; });
    }

    doc.setFillColor(20, 20, 20); doc.rect(0, 284, 210, 13, 'F');
    doc.setFont(COURIER, 'normal'); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
    doc.text(`${studioName} · ${studioEmail}`, 105, 291, { align: 'center' });

    doc.save(`Invoice_${invoiceNum}_${p.client || 'Client'}.pdf`);
    setGenerating(false);
    showToast('Invoice downloaded!', 'green');
  };

  const curStatus = INVOICE_STATUSES.find(s => s.key === invoiceStatus) || INVOICE_STATUSES[0];

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 14 }}>Invoice Generator</div>

      {/* Invoice Type toggle */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Invoice Type</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: invoiceType === 'deposit' ? 12 : 0 }}>
          {[{ key: 'final', label: '📄 Final Invoice', sub: 'Full amount due' }, { key: 'deposit', label: '💳 Deposit Invoice', sub: 'Upfront partial payment' }].map(t => (
            <button key={t.key} onClick={() => setInvoiceType(t.key)} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${invoiceType === t.key ? (t.key === 'deposit' ? 'rgba(245,158,11,0.4)' : 'rgba(74,158,255,0.4)') : '#222'}`, background: invoiceType === t.key ? (t.key === 'deposit' ? 'rgba(245,158,11,0.08)' : 'rgba(74,158,255,0.08)') : 'transparent', color: invoiceType === t.key ? (t.key === 'deposit' ? '#F59E0B' : '#4A9EFF') : '#444', textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, opacity: 0.7 }}>{t.sub}</div>
            </button>
          ))}
        </div>
        {invoiceType === 'deposit' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>Deposit %</div>
              <input style={IS} type="number" min="1" max="100" value={depositPct} onChange={e => setDepositPct(parseFloat(e.target.value) || 50)} placeholder="50" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
              {[25, 50, 75].map(pct => (
                <button key={pct} onClick={() => setDepositPct(pct)} style={{ padding: '7px 12px', borderRadius: 7, border: `1px solid ${depositPct === pct ? 'rgba(245,158,11,0.4)' : '#222'}`, background: depositPct === pct ? 'rgba(245,158,11,0.12)' : 'transparent', color: depositPct === pct ? '#F59E0B' : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>{pct}%</button>
              ))}
            </div>
            <div style={{ padding: '8px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, marginTop: 16, whiteSpace: 'nowrap' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginBottom: 2 }}>DEPOSIT DUE</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F59E0B' }}>{`$${depositAmount.toLocaleString('en-CA', { minimumFractionDigits: 0 })}`}</div>
            </div>
          </div>
        )}
      </div>

      {/* Studio Info */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Studio Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={LS}>Studio Name</label><input style={IS} value={studioName} onChange={e => setStudioName(e.target.value)} /></div>
          <div><label style={LS}>Email</label><input style={IS} value={studioEmail} onChange={e => setStudioEmail(e.target.value)} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={LS}>Address / City</label><input style={IS} value={studioAddress} onChange={e => setStudioAddress(e.target.value)} /></div>
        </div>
      </div>

      {/* Invoice Details */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Invoice Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label style={LS}>Invoice #</label><input style={IS} value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} /></div>
          <div><label style={LS}>Invoice Date</label><input style={IS} type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
          <div><label style={LS}>Due Date</label><input style={IS} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        </div>
        {/* Invoice Status */}
        <div>
          <label style={LS}>Invoice Status</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {INVOICE_STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => setInvoiceStatus(s.key)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: MONO,
                  background: invoiceStatus === s.key ? s.bg : 'transparent',
                  border: `1px solid ${invoiceStatus === s.key ? s.color : '#333'}`,
                  color: invoiceStatus === s.key ? s.color : '#555',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Line Items</div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 80px 80px', gap: 6, padding: '4px 8px', marginBottom: 6 }}>
          {['Description', 'Qty', 'Rate', 'Total'].map(h => (
            <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {allItems.map((item, i) => {
            const total = (item.qty || 1) * (item.rate || 0);
            const isCustom = i >= coreItems.length;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 80px 80px auto', gap: 6, padding: '8px 10px', background: '#222', borderRadius: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#ccc' }}>{item.desc}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#888', textAlign: 'center' }}>{item.qty || 1}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#888', textAlign: 'right' }}>{fmt(item.rate || 0)}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'right' }}>{fmt(total)}</span>
                {isCustom && (
                  <button onClick={() => removeCustomItem(i - coreItems.length)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add custom line item */}
        <div style={{ background: '#161616', borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', marginBottom: 8, textTransform: 'uppercase' }}>Add Line Item</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px auto', gap: 6, alignItems: 'end' }}>
            <div>
              <input style={{ ...IS, fontSize: 12 }} placeholder="e.g. Additional editing hours" value={newItem.desc} onChange={e => setNewItem(f => ({ ...f, desc: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginBottom: 4 }}>Qty</div>
              <input style={{ ...IS, fontSize: 12 }} type="number" min="1" value={newItem.qty} onChange={e => setNewItem(f => ({ ...f, qty: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', marginBottom: 4 }}>Rate ($)</div>
              <input style={{ ...IS, fontSize: 12 }} type="number" placeholder="0" value={newItem.rate} onChange={e => setNewItem(f => ({ ...f, rate: e.target.value }))} />
            </div>
            <button onClick={addCustomItem} style={{ height: 38, padding: '0 12px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
          </div>
        </div>

        {/* Tax & Discount */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={LS}>Discount (%)</label>
            <input style={IS} type="number" min="0" max="100" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div>
            <label style={LS}>Tax / HST (%)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {[{ label: 'None', val: 0 }, { label: 'HST 13%', val: 13 }, { label: 'GST 5%', val: 5 }, { label: 'GST+PST', val: 12 }].map(t => (
                <button key={t.label} onClick={() => setTaxRate(t.val)} style={{ flex: 1, padding: '5px 4px', borderRadius: 5, border: `1px solid ${taxRate === t.val ? 'rgba(123,200,83,0.4)' : '#222'}`, background: taxRate === t.val ? 'rgba(123,200,83,0.1)' : 'transparent', color: taxRate === t.val ? '#7BC853' : '#555', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, whiteSpace: 'nowrap' }}>{t.label}</button>
              ))}
            </div>
            <input style={IS} type="number" min="0" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </div>

        {/* Totals summary */}
        <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: 10 }}>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#666' }}>Subtotal</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#888' }}>{fmt(subtotal)}</span>
            </div>
          )}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#F59E0B' }}>Discount ({discount}%)</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#F59E0B' }}>-{fmt(discountAmt)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#666' }}>Tax ({taxRate}%)</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#888' }}>{fmt(taxAmt)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 8, marginTop: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#E81A1A' }}>TOTAL DUE</span>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#E81A1A' }}>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div style={{ marginBottom: 10 }}>
        <label style={LS}>Payment Details (e-transfer / bank / PayPal)</label>
        <textarea style={{ ...IS, resize: 'none', minHeight: 52 }} rows={2} value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} placeholder="e.g. E-transfer: studio65production@gmail.com&#10;Bank: TD, Account #12345" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={LS}>Additional Notes (optional)</label>
        <textarea style={{ ...IS, resize: 'none', minHeight: 52 }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Thank you for choosing Studio 65!" />
      </div>

      {/* Status badge preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '9px 12px', background: '#161616', borderRadius: 8, border: '1px solid #222' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>Invoice status:</span>
        <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: MONO, background: curStatus.bg, color: curStatus.color, border: `1px solid ${curStatus.color}44` }}>
          {curStatus.label}
        </span>
      </div>

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