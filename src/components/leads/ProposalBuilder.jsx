import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { X, Plus, Trash2, FileText, CheckCircle, Send } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const IS = { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' };
const LS = { fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 };

const SHOOT_TYPES = ['Brand Commercial', 'Product Demo', 'Music Video', 'Corporate Video', 'Real Estate', 'Event Coverage', 'Social Content Package', 'Documentary', 'Short Film', 'Other'];
const LINE_CATS = ['Crew', 'Gear', 'Post-Production', 'Expenses', 'Other'];
const PROPOSAL_STATUS_INFO = {
  draft: { label: 'Draft', color: '#666', bg: 'rgba(100,100,100,0.15)' },
  sent: { label: 'Sent', color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)' },
  viewed: { label: 'Viewed', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  accepted: { label: 'Accepted ✓', color: '#7BC853', bg: 'rgba(123,200,83,0.1)' },
  rejected: { label: 'Rejected', color: '#E81A1A', bg: 'rgba(232,26,26,0.1)' },
};

function fmt(n) { return '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function calcTotals(lineItems, markupPct) {
  const subtotal = lineItems.reduce((s, li) => s + (li.total || 0), 0);
  const markupAmount = subtotal * ((markupPct || 0) / 100);
  return { subtotal, markupAmount, grandTotal: subtotal + markupAmount };
}

export default function ProposalBuilder({ lead, open, onClose, onLeadUpdate }) {
  const [contacts, setContacts] = useState([]);
  const [kits, setKits] = useState([]);
  const [view, setView] = useState('list'); // list | build
  const [editingProposal, setEditingProposal] = useState(null); // null = new
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [shootType, setShootType] = useState('');
  const [scope, setScope] = useState('');
  const [terms, setTerms] = useState('Payment due within 14 days of invoice. 50% deposit required to confirm booking. Cancellation within 7 days forfeits deposit.');
  const [markupPct, setMarkupPct] = useState(20);
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    if (open) {
      Promise.all([
        base44.entities.Contact.list('name', 200),
        base44.entities.ShootKit.list('name', 50),
      ]).then(([c, k]) => { setContacts(c); setKits(k); });
    }
  }, [open]);

  const crewContacts = contacts.filter(c => (c.types || []).includes('Crew'));
  const proposals = lead?.proposals || [];

  const openNew = () => {
    setEditingProposal(null);
    setTitle(`Proposal for ${lead.company}`);
    setShootType(lead.project_type || '');
    setScope('');
    setTerms('Payment due within 14 days of invoice. 50% deposit required to confirm booking. Cancellation within 7 days forfeits deposit.');
    setMarkupPct(20);
    setLineItems([]);
    setView('build');
  };

  const openEdit = (p) => {
    setEditingProposal(p);
    setTitle(p.title);
    setShootType(p.shoot_type || '');
    setScope(p.scope || '');
    setTerms(p.terms || '');
    setMarkupPct(p.markup_pct || 0);
    setLineItems(p.line_items || []);
    setView('build');
  };

  const addLineItem = () => {
    setLineItems(li => [...li, { category: 'Crew', label: '', qty: 1, unit_cost: 0, total: 0 }]);
  };

  const updateLineItem = (i, field, val) => {
    setLineItems(li => {
      const updated = [...li];
      updated[i] = { ...updated[i], [field]: val };
      if (field === 'qty' || field === 'unit_cost') {
        const qty = field === 'qty' ? parseFloat(val) || 0 : parseFloat(updated[i].qty) || 0;
        const cost = field === 'unit_cost' ? parseFloat(val) || 0 : parseFloat(updated[i].unit_cost) || 0;
        updated[i].total = qty * cost;
      }
      return updated;
    });
  };

  const removeLineItem = (i) => {
    setLineItems(li => li.filter((_, idx) => idx !== i));
  };

  const addCrewFromContact = (c) => {
    const rate = parseFloat(c.rate) || 0;
    setLineItems(li => [...li, { category: 'Crew', label: `${c.name} — ${c.role || 'Crew'}`, qty: 1, unit_cost: rate, total: rate }]);
  };

  const addKitItems = (kit) => {
    const items = (kit.items || []).map(item => ({
      category: 'Gear',
      label: item.gear_name || item.gear_id,
      qty: item.quantity || 1,
      unit_cost: 0,
      total: 0,
    }));
    setLineItems(li => [...li, ...items]);
  };

  const { subtotal, markupAmount, grandTotal } = calcTotals(lineItems, markupPct);

  const handleSave = async (proposalStatus = 'draft') => {
    if (!title.trim()) { showToast('Add a title', 'red'); return; }
    setSaving(true);

    const proposal = {
      id: editingProposal?.id || `prop_${Date.now()}`,
      title,
      shoot_type: shootType,
      scope,
      terms,
      markup_pct: markupPct,
      line_items: lineItems,
      subtotal,
      markup_amount: markupAmount,
      grand_total: grandTotal,
      proposal_status: proposalStatus,
      created_at: editingProposal?.created_at || new Date().toISOString(),
      ...(proposalStatus === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    };

    const updatedProposals = editingProposal
      ? proposals.map(p => p.id === editingProposal.id ? proposal : p)
      : [...proposals, proposal];

    const updatedLead = {
      ...lead,
      proposals: updatedProposals,
      proposal_value: grandTotal,
      ...(proposalStatus === 'sent' ? { status: 'proposal_sent', proposal_sent_date: new Date().toISOString().split('T')[0] } : {}),
      activity: [...(lead.activity || []), { type: 'proposal', message: `Proposal "${title}" ${proposalStatus === 'sent' ? 'sent' : 'saved'}`, date: new Date().toISOString() }],
    };

    await base44.entities.ClientLead.update(lead.id, updatedLead);
    onLeadUpdate(updatedLead);
    setSaving(false);
    showToast(proposalStatus === 'sent' ? 'Proposal marked as sent' : 'Proposal saved', 'green');
    setView('list');
  };

  const handleStatusChange = async (proposalId, newStatus) => {
    const updatedProposals = proposals.map(p =>
      p.id === proposalId ? { ...p, proposal_status: newStatus, ...(newStatus === 'accepted' ? { accepted_at: new Date().toISOString() } : {}) } : p
    );
    const updatedLead = {
      ...lead,
      proposals: updatedProposals,
      activity: [...(lead.activity || []), { type: 'proposal', message: `Proposal status: ${newStatus}`, date: new Date().toISOString() }],
    };
    await base44.entities.ClientLead.update(lead.id, updatedLead);
    onLeadUpdate(updatedLead);
    showToast(`Proposal marked ${newStatus}`, newStatus === 'accepted' ? 'green' : 'blue');
  };

  const handleAcceptAndCreateProject = async (proposal) => {
    if (!confirm(`Accept proposal "${proposal.title}" and create a project?`)) return;
    setCreatingProject(true);

    // Mark proposal accepted
    await handleStatusChange(proposal.id, 'accepted');

    // Build crew array from crew line items
    const crew = proposal.line_items
      .filter(li => li.category === 'Crew')
      .map(li => ({ name: li.label, role: '', cost: li.unit_cost, rate_type: 'flat', paid: false }));

    // Build rentals from gear line items
    const rentals = proposal.line_items
      .filter(li => li.category === 'Gear')
      .map(li => ({ equipment: li.label, vendor: '', cost: li.unit_cost, qty: li.qty, total_cost: li.total, rate_type: 'flat', paid: false }));

    // Build expenses from misc line items
    const expenses = proposal.line_items
      .filter(li => !['Crew', 'Gear'].includes(li.category))
      .map(li => ({ desc: li.label, category: li.category === 'Post-Production' ? 'Other' : (li.category || 'Other'), amount: li.total, date: new Date().toISOString().split('T')[0] }));

    const crewCost = crew.reduce((s, c) => s + (c.cost || 0), 0);
    const rentalCost = rentals.reduce((s, r) => s + (r.total_cost || 0), 0);
    const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const revenue = proposal.grand_total;
    const net = revenue - crewCost - rentalCost - expenseTotal;

    const project = await base44.entities.Project.create({
      name: `${lead.company} — ${proposal.shoot_type || proposal.title}`,
      client: lead.company,
      status: 'Booked',
      revenue,
      crew_cost: crewCost,
      rental_cost: rentalCost,
      net,
      crew,
      rentals,
      expenses,
      notes: [proposal.scope, proposal.terms].filter(Boolean).join('\n\n'),
      activity: [{ msg: `Project created from proposal: ${proposal.title}`, ts: new Date().toISOString() }],
    });

    // Update lead status to won
    const updatedLead = { ...lead, status: 'won', closed_date: new Date().toISOString().split('T')[0] };
    await base44.entities.ClientLead.update(lead.id, updatedLead);
    onLeadUpdate(updatedLead);

    setCreatingProject(false);
    showToast(`Project created: ${project.name}`, 'green');
    onClose();
  };

  const handleExportPDF = async (proposal) => {
    setExporting(true);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const W = 210, H = 297;
    const RED = [232, 26, 26], BLACK = [10, 10, 10], WHITE = [255, 255, 255], GRAY = [40, 40, 40], MUTED = [120, 120, 120];

    // Background
    doc.setFillColor(...BLACK);
    doc.rect(0, 0, W, H, 'F');

    // Red header bar
    doc.setFillColor(...RED);
    doc.rect(0, 0, W, 36, 'F');

    // Studio name
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('STUDIO 65', 18, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 200, 200);
    doc.text('PRODUCTION PROPOSAL', 18, 30);

    // Proposal title right side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(proposal.title, W - 18, 18, { align: 'right' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 200, 200);
    const ps = PROPOSAL_STATUS_INFO[proposal.proposal_status || 'draft'];
    doc.text(ps.label.toUpperCase(), W - 18, 28, { align: 'right' });

    // Client block
    let y = 50;
    doc.setFillColor(...GRAY);
    doc.roundedRect(14, y, 90, 32, 3, 3, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('PREPARED FOR', 19, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text(lead.company, 19, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(lead.contact_name || '', 19, y + 23);
    doc.text(lead.email || '', 19, y + 29);

    // Date block
    doc.setFillColor(...GRAY);
    doc.roundedRect(110, y, 86, 32, 3, 3, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('DATE', 115, y + 8);
    doc.text('SHOOT TYPE', 155, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(new Date().toLocaleDateString('en-CA'), 115, y + 16);
    doc.text(proposal.shoot_type || '—', 155, y + 16);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('studio65production@gmail.com', 115, y + 26);

    y += 46;

    // Scope
    if (proposal.scope) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...RED);
      doc.text('SCOPE OF WORK', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      const scopeLines = doc.splitTextToSize(proposal.scope, W - 28);
      doc.text(scopeLines, 14, y);
      y += scopeLines.length * 5 + 8;
    }

    // Line items header
    doc.setFillColor(...RED);
    doc.rect(14, y, W - 28, 9, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text('DESCRIPTION', 17, y + 6);
    doc.text('QTY', 122, y + 6);
    doc.text('UNIT COST', 140, y + 6);
    doc.text('TOTAL', W - 20, y + 6, { align: 'right' });
    y += 14;

    // Group by category
    const grouped = {};
    (proposal.line_items || []).forEach(li => {
      const cat = li.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(li);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...RED);
      doc.text(cat.toUpperCase(), 14, y);
      y += 5;

      items.forEach((li, idx) => {
        if (idx % 2 === 0) { doc.setFillColor(20, 20, 20); doc.rect(14, y - 3, W - 28, 8, 'F'); }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.text(doc.splitTextToSize(li.label || '—', 100)[0], 17, y + 2);
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(180, 180, 180);
        doc.text(String(li.qty || 1), 125, y + 2);
        doc.text(fmt(li.unit_cost), 140, y + 2);
        doc.setTextColor(...WHITE);
        doc.text(fmt(li.total), W - 20, y + 2, { align: 'right' });
        y += 8;
        if (y > H - 60) { doc.addPage(); doc.setFillColor(...BLACK); doc.rect(0, 0, W, H, 'F'); y = 20; }
      });
      y += 4;
    });

    y += 4;

    // Totals block
    doc.setFillColor(...GRAY);
    doc.roundedRect(W - 82, y, 68, 38, 3, 3, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('SUBTOTAL', W - 78, y + 8);
    doc.setTextColor(...WHITE);
    doc.text(fmt(proposal.subtotal), W - 18, y + 8, { align: 'right' });
    doc.setTextColor(...MUTED);
    doc.text(`MARKUP (${proposal.markup_pct || 0}%)`, W - 78, y + 17);
    doc.setTextColor(...WHITE);
    doc.text(fmt(proposal.markup_amount), W - 18, y + 17, { align: 'right' });
    doc.setFillColor(...RED);
    doc.rect(W - 82, y + 22, 68, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text('TOTAL', W - 78, y + 32);
    doc.setFontSize(14);
    doc.text(fmt(proposal.grand_total), W - 18, y + 33, { align: 'right' });

    y += 50;

    // Terms
    if (proposal.terms) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...RED);
      doc.text('TERMS & CONDITIONS', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const termLines = doc.splitTextToSize(proposal.terms, W - 28);
      doc.text(termLines, 14, y);
    }

    // Footer
    doc.setFillColor(20, 20, 20);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Studio 65 Production · studio65production@gmail.com', W / 2, H - 6, { align: 'center' });

    doc.save(`Proposal_${lead.company.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    setExporting(false);
    showToast('Proposal PDF exported', 'green');
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {view === 'list' ? `Proposals — ${lead.company}` : (editingProposal ? 'Edit Proposal' : 'New Proposal')}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 1 }}>{lead.contact_name} · {lead.project_type || 'N/A'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {view === 'build' && (
              <button onClick={() => setView('list')} style={{ padding: '7px 14px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#888', fontSize: 12, cursor: 'pointer' }}>← Back</button>
            )}
            {view === 'list' && (
              <button onClick={openNew} style={{ padding: '7px 14px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> New Proposal
              </button>
            )}
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: '#1A1A1A', border: '1px solid #222', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          {/* LIST VIEW */}
          {view === 'list' && (
            <div>
              {proposals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <FileText size={40} color="#222" style={{ marginBottom: 12 }} />
                  <div style={{ color: '#444', marginBottom: 16 }}>No proposals yet.</div>
                  <button onClick={openNew} style={{ padding: '12px 24px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    + Build First Proposal
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {proposals.map(p => {
                    const pst = PROPOSAL_STATUS_INFO[p.proposal_status || 'draft'];
                    return (
                      <div key={p.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 12, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>{p.shoot_type} · Created {new Date(p.created_at).toLocaleDateString('en-CA')}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700, background: pst.bg, color: pst.color }}>{pst.label}</span>
                            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: '#E81A1A' }}>{fmt(p.grand_total)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(p)} style={{ padding: '6px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 7, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => handleExportPDF(p)} disabled={exporting} style={{ padding: '6px 12px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 7, color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {exporting ? '...' : '⬇ Export PDF'}
                          </button>
                          {/* Status transitions */}
                          {p.proposal_status === 'draft' && (
                            <button onClick={() => handleStatusChange(p.id, 'sent')} style={{ padding: '6px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 7, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Send size={11} /> Mark Sent
                            </button>
                          )}
                          {p.proposal_status === 'sent' && (
                            <button onClick={() => handleStatusChange(p.id, 'viewed')} style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7, color: '#F59E0B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Mark Viewed</button>
                          )}
                          {['sent', 'viewed'].includes(p.proposal_status) && (
                            <>
                              <button onClick={() => handleAcceptAndCreateProject(p)} disabled={creatingProject} style={{ padding: '6px 12px', background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 7, color: '#7BC853', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={11} /> Accept → Create Project
                              </button>
                              <button onClick={() => handleStatusChange(p.id, 'rejected')} style={{ padding: '6px 12px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 7, color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                            </>
                          )}
                          {p.proposal_status === 'accepted' && (
                            <button onClick={() => handleAcceptAndCreateProject(p)} disabled={creatingProject} style={{ padding: '6px 12px', background: 'rgba(123,200,83,0.15)', border: '1px solid rgba(123,200,83,0.3)', borderRadius: 7, color: '#7BC853', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              → Create Project
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* BUILD VIEW */}
          {view === 'build' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
              {/* Left: main form */}
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={LS}>Proposal Title</label>
                  <input style={IS} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Social Content Package — Q3 Campaign" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={LS}>Shoot Type</label>
                    <select style={IS} value={shootType} onChange={e => setShootType(e.target.value)}>
                      <option value="">— Select —</option>
                      {SHOOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LS}>Markup %</label>
                    <input type="number" style={IS} value={markupPct} onChange={e => setMarkupPct(parseFloat(e.target.value) || 0)} placeholder="20" />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={LS}>Scope of Work</label>
                  <textarea style={{ ...IS, minHeight: 80, resize: 'vertical' }} value={scope} onChange={e => setScope(e.target.value)} placeholder="Describe the deliverables, shoot days, timeline..." />
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ ...LS, marginBottom: 0 }}>Line Items</label>
                    <button onClick={addLineItem} style={{ padding: '5px 10px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 6, color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={11} /> Add Row
                    </button>
                  </div>

                  {lineItems.length === 0 ? (
                    <div style={{ padding: '20px', border: '1px dashed #222', borderRadius: 8, textAlign: 'center', color: '#444', fontSize: 12 }}>
                      Add line items manually or use quick-add from the right panel
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 90px 80px 30px', gap: 6, marginBottom: 6 }}>
                        {['Category', 'Description', 'Qty', 'Unit Cost', 'Total', ''].map(h => (
                          <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase' }}>{h}</div>
                        ))}
                      </div>
                      {lineItems.map((li, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 90px 80px 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                          <select style={{ ...IS, fontSize: 11, padding: '7px 8px' }} value={li.category} onChange={e => updateLineItem(i, 'category', e.target.value)}>
                            {LINE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input style={{ ...IS, fontSize: 12 }} value={li.label} onChange={e => updateLineItem(i, 'label', e.target.value)} placeholder="Description" />
                          <input type="number" style={{ ...IS, fontSize: 12 }} value={li.qty} onChange={e => updateLineItem(i, 'qty', e.target.value)} />
                          <input type="number" style={{ ...IS, fontSize: 12 }} value={li.unit_cost} onChange={e => updateLineItem(i, 'unit_cost', e.target.value)} placeholder="0" />
                          <div style={{ fontFamily: MONO, fontSize: 12, color: '#7BC853', textAlign: 'right', paddingRight: 4 }}>{fmt(li.total)}</div>
                          <button onClick={() => removeLineItem(i)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>Subtotal</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: '#fff' }}>{fmt(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#555' }}>Markup ({markupPct}%)</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: '#F59E0B' }}>+{fmt(markupAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #222' }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff' }}>TOTAL</span>
                    <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: '#E81A1A' }}>{fmt(grandTotal)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={LS}>Terms & Conditions</label>
                  <textarea style={{ ...IS, minHeight: 80, resize: 'vertical', fontSize: 12 }} value={terms} onChange={e => setTerms(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleSave('draft')} disabled={saving} style={{ flex: 1, padding: '12px 0', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Save Draft
                  </button>
                  <button onClick={() => handleSave('sent')} disabled={saving} style={{ flex: 2, padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Send size={14} /> Save & Mark Sent
                  </button>
                </div>
              </div>

              {/* Right: Quick-add panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Crew from Contacts */}
                <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Crew (from Contacts)</div>
                  {crewContacts.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#444' }}>No crew contacts found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {crewContacts.slice(0, 10).map(c => (
                        <button key={c.id} onClick={() => addCrewFromContact(c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#1A1A1A', border: '1px solid #222', borderRadius: 7, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{c.name}</div>
                            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{c.role || 'Crew'}</div>
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: '#7BC853', fontWeight: 700 }}>${parseFloat(c.rate) || 0}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gear from Shoot Kits */}
                <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Gear Bundles (Shoot Kits)</div>
                  {kits.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#444' }}>No shoot kits found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {kits.map(kit => (
                        <button key={kit.id} onClick={() => addKitItems(kit)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#1A1A1A', border: '1px solid #222', borderRadius: 7, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{kit.name}</div>
                            <div style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>{(kit.items || []).length} items</div>
                          </div>
                          <Plus size={12} color="#4A9EFF" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick post-production */}
                <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Post-Production</div>
                  {[['Edit — Full Day', 500], ['Edit — Half Day', 250], ['Color Grade', 300], ['Motion Graphics', 400], ['Sound Design', 200]].map(([label, cost]) => (
                    <button key={label} onClick={() => setLineItems(li => [...li, { category: 'Post-Production', label, qty: 1, unit_cost: cost, total: cost }])} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: '#1A1A1A', border: '1px solid #222', borderRadius: 7, cursor: 'pointer', marginBottom: 5, fontSize: 12, color: '#fff' }}>
                      <span style={{ flex: 1 }}>{label}</span><span style={{ fontFamily: MONO, fontSize: 10, color: '#A78BFA', marginLeft: 8 }}>${cost}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}