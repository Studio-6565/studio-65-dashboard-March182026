import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { fmt } from '@/lib/studio';

const MONO = '"DM Mono", monospace';
const SS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO, marginBottom: 5, display: 'block' };

const STATUS_META = {
  pending:            { label: 'Pending',           color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  sent_for_approval:  { label: 'Sent for Approval', color: '#4A9EFF', bg: 'rgba(74,158,255,0.08)', border: 'rgba(74,158,255,0.25)' },
  approved:           { label: 'Approved',          color: '#7BC853', bg: 'rgba(123,200,83,0.08)', border: 'rgba(123,200,83,0.25)' },
  declined:           { label: 'Declined',          color: '#E81A1A', bg: 'rgba(232,26,26,0.08)',  border: 'rgba(232,26,26,0.25)' },
};

const EMPTY_FORM = { description: '', additional_cost: '', additional_hours: '', requested_by: '' };

async function generateChangeOrderPDF(co, project) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const SANS = 'helvetica', COURIER = 'courier';

  // Background
  doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 297, 'F');
  // Header bar
  doc.setFillColor(245, 158, 11); doc.rect(0, 0, 210, 22, 'F');
  doc.setFont(SANS, 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0);
  doc.text('CHANGE ORDER ADDENDUM', 20, 14);
  doc.setFont(COURIER, 'normal'); doc.setFontSize(9);
  doc.text(`CO-${co.id.slice(-6).toUpperCase()}`, 190, 14, { align: 'right' });

  let y = 34;
  // Project info
  doc.setFont(SANS, 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('Studio 65', 20, y);
  doc.setFont(COURIER, 'normal'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
  doc.text('studio65production@gmail.com', 20, y + 6);

  doc.setFont(COURIER, 'bold'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text('CLIENT', 130, y);
  doc.setFont(SANS, 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text(project.client || 'Client', 130, y + 6);

  y += 22;
  // Meta row
  doc.setFillColor(25, 25, 25); doc.roundedRect(18, y, 174, 18, 3, 3, 'F');
  [
    ['Project', project.name || '—'],
    ['Date', new Date().toLocaleDateString('en-CA')],
    ['Requested By', co.requested_by || '—'],
    ['Status', 'Pending Approval'],
  ].forEach(([label, value], i) => {
    const x = 22 + i * 44;
    doc.setFont(COURIER, 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    doc.text(label.toUpperCase(), x, y + 6);
    doc.setFont(COURIER, 'bold'); doc.setFontSize(9); doc.setTextColor(200, 200, 200);
    doc.text(String(value).slice(0, 16), x, y + 13);
  });

  y += 28;
  // Description
  doc.setFont(COURIER, 'bold'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
  doc.text('CHANGE DESCRIPTION', 20, y); y += 8;
  doc.setFillColor(20, 20, 20); doc.roundedRect(18, y, 174, 40, 3, 3, 'F');
  doc.setFont(SANS, 'normal'); doc.setFontSize(11); doc.setTextColor(220, 220, 220);
  const lines = doc.splitTextToSize(co.description, 165);
  lines.slice(0, 5).forEach((line, idx) => {
    doc.text(line, 22, y + 8 + idx * 7);
  });
  y += 50;

  // Financials
  doc.setFont(COURIER, 'bold'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
  doc.text('FINANCIAL IMPACT', 20, y); y += 8;
  [
    ['Additional Cost', `$${Number(co.additional_cost || 0).toLocaleString()}`],
    ...(co.additional_hours ? [['Additional Hours', `${co.additional_hours}h`]] : []),
  ].forEach(([label, val], idx) => {
    const rowY = y + idx * 12;
    if (idx % 2 === 0) { doc.setFillColor(15, 15, 15); doc.rect(18, rowY - 3, 174, 12, 'F'); }
    doc.setFont(SANS, 'normal'); doc.setFontSize(10); doc.setTextColor(180, 180, 180);
    doc.text(label, 22, rowY + 4);
    doc.setFont(COURIER, 'bold'); doc.setFontSize(11); doc.setTextColor(245, 158, 11);
    doc.text(val, 188, rowY + 4, { align: 'right' });
  });
  y += (co.additional_hours ? 2 : 1) * 12 + 16;

  // Signature blocks
  doc.setFillColor(25, 25, 25); doc.roundedRect(18, y, 80, 40, 3, 3, 'F');
  doc.setFillColor(25, 25, 25); doc.roundedRect(110, y, 80, 40, 3, 3, 'F');
  doc.setFont(COURIER, 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  doc.text('STUDIO SIGNATURE', 24, y + 8);
  doc.text('CLIENT SIGNATURE', 116, y + 8);
  doc.setTextColor(60, 60, 60);
  doc.text('x ___________________________', 22, y + 28);
  doc.text('x ___________________________', 114, y + 28);

  y += 50;
  doc.setFont(COURIER, 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
  doc.text('By signing above, both parties agree to the scope and cost changes described in this addendum.', 20, y, { maxWidth: 170 });

  return doc;
}

export default function ChangeOrdersTab({ project, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  const changeOrders = project.change_orders || [];
  const pendingCount = changeOrders.filter(co => co.status === 'pending').length;

  const handleAdd = async () => {
    if (!form.description.trim()) { showToast('Enter a description', 'red'); return; }
    setSaving(true);
    const newCO = {
      id: `co_${Date.now()}`,
      description: form.description.trim(),
      additional_cost: parseFloat(form.additional_cost) || 0,
      additional_hours: parseFloat(form.additional_hours) || 0,
      requested_by: form.requested_by.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const updated = { change_orders: [...changeOrders, newCO] };
    await onUpdate(updated);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    showToast('Change order logged', 'amber');
  };

  const handleSetStatus = async (id, status) => {
    const updated_orders = changeOrders.map(co => {
      if (co.id !== id) return co;
      const next = { ...co, status };
      if (status === 'sent_for_approval') next.sent_at = new Date().toISOString();
      if (status === 'approved') next.approved_at = new Date().toISOString();
      if (status === 'declined') next.declined_at = new Date().toISOString();
      return next;
    });

    const changes = { change_orders: updated_orders };

    // On approval: add cost to revenue and recalculate net
    if (status === 'approved') {
      const co = changeOrders.find(c => c.id === id);
      if (co && co.additional_cost > 0) {
        const newRevenue = (project.revenue || 0) + co.additional_cost;
        changes.revenue = newRevenue;
        changes.net = newRevenue - (project.crew_cost || 0) - (project.rental_cost || 0);
        showToast(`+${fmt(co.additional_cost)} added to project revenue`, 'green');
      }
    }

    await onUpdate(changes);
    showToast(status === 'sent_for_approval' ? 'Sent for client approval' : status === 'approved' ? 'Change order approved ✓' : 'Change order declined', status === 'approved' ? 'green' : status === 'declined' ? 'red' : 'blue');
  };

  const handleSendForApproval = async (co) => {
    setGeneratingPdf(co.id);
    try {
      const doc = await generateChangeOrderPDF(co, project);
      doc.save(`ChangeOrder_${co.id.slice(-6).toUpperCase()}_${project.client || 'Client'}.pdf`);

      // Post to ClientMessage so it shows up in Client Portal Approvals
      await base44.entities.ClientMessage.create({
        project_id: project.id,
        project_name: project.name,
        from: 'studio',
        type: 'approval_request',
        title: `Change Order: ${co.description.slice(0, 60)}${co.description.length > 60 ? '…' : ''}`,
        body: `**Change Order Request**\n\nDescription: ${co.description}\n\nAdditional Cost: ${fmt(co.additional_cost || 0)}${co.additional_hours ? `\nAdditional Hours: ${co.additional_hours}h` : ''}\n\nRequested by: ${co.requested_by || 'Studio'}\n\nPlease review and approve or decline this change order.`,
        approval_status: 'pending',
        change_order_id: co.id,
      });

      await handleSetStatus(co.id, 'sent_for_approval');
      showToast('PDF downloaded + sent for client approval', 'blue');
    } catch (e) {
      showToast('Error generating PDF', 'red');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this change order?')) return;
    const updated_orders = changeOrders.filter(co => co.id !== id);
    await onUpdate({ change_orders: updated_orders });
    showToast('Removed', 'red');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Change Orders</div>
          {pendingCount > 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: '#F59E0B', marginTop: 2 }}>{pendingCount} pending action</div>}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ padding: '9px 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}
        >
          + Log Change Request
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 12 }}>New Change Request</div>
          <div style={{ marginBottom: 10 }}>
            <label style={LL}>Description *</label>
            <textarea
              rows={3}
              style={{ ...SS, resize: 'vertical' }}
              placeholder="Describe the scope change..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={LL}>Additional Cost ($)</label>
              <input style={SS} type="number" placeholder="0" value={form.additional_cost} onChange={e => setForm(f => ({ ...f, additional_cost: e.target.value }))} />
            </div>
            <div>
              <label style={LL}>Additional Hours</label>
              <input style={SS} type="number" placeholder="0" value={form.additional_hours} onChange={e => setForm(f => ({ ...f, additional_hours: e.target.value }))} />
            </div>
            <div>
              <label style={LL}>Requested By</label>
              <input style={SS} placeholder="e.g. Client" value={form.requested_by} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Log Request'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {changeOrders.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📋</div>
          <div style={{ fontFamily: MONO, fontSize: 12 }}>No change orders yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...changeOrders].reverse().map(co => {
            const meta = STATUS_META[co.status] || STATUS_META.pending;
            return (
              <div key={co.id} style={{ background: '#2A2A2A', border: `1px solid ${meta.border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{co.description}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {co.additional_cost > 0 && (
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>+{fmt(co.additional_cost)}</span>
                      )}
                      {co.additional_hours > 0 && (
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#A78BFA' }}>+{co.additional_hours}h</span>
                      )}
                      {co.requested_by && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#555' }}>by {co.requested_by}</span>
                      )}
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>{new Date(co.created_at).toLocaleDateString('en-CA')}</span>
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: MONO, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {meta.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {co.status === 'pending' && (
                    <button
                      onClick={() => handleSendForApproval(co)}
                      disabled={generatingPdf === co.id}
                      style={{ padding: '6px 14px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 7, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, opacity: generatingPdf === co.id ? 0.6 : 1 }}
                    >
                      {generatingPdf === co.id ? '⏳ Generating…' : '📤 Send for Approval'}
                    </button>
                  )}
                  {co.status === 'sent_for_approval' && (
                    <>
                      <button onClick={() => handleSetStatus(co.id, 'approved')} style={{ padding: '6px 14px', background: 'rgba(123,200,83,0.12)', border: '1px solid rgba(123,200,83,0.3)', borderRadius: 7, color: '#7BC853', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
                        ✓ Mark Approved
                      </button>
                      <button onClick={() => handleSetStatus(co.id, 'declined')} style={{ padding: '6px 14px', background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.25)', borderRadius: 7, color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>
                        ✗ Mark Declined
                      </button>
                    </>
                  )}
                  {co.status === 'pending' && (
                    <button onClick={() => handleDelete(co.id)} style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}>
                      Remove
                    </button>
                  )}
                </div>

                {co.status === 'approved' && co.additional_cost > 0 && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 6, fontFamily: MONO, fontSize: 10, color: '#7BC853' }}>
                    ✓ {fmt(co.additional_cost)} added to project revenue
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}