import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Clock, Loader2, ExternalLink } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const INVOICE_STATUS = {
  draft:          { label: 'Draft',          color: '#555',    bg: 'rgba(100,100,100,0.1)' },
  sent:           { label: 'Sent',           color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)' },
  viewed:         { label: 'Viewed',         color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  paid:           { label: 'Paid',           color: '#7BC853', bg: 'rgba(123,200,83,0.1)' },
  partially_paid: { label: 'Partial',        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  overdue:        { label: 'Overdue',        color: '#E81A1A', bg: 'rgba(232,26,26,0.1)' },
  cancelled:      { label: 'Cancelled',      color: '#444',    bg: 'rgba(60,60,60,0.1)' },
};

function fmt(n) {
  return '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PayButton({ project, contact }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    // Block if running in iframe (preview mode)
    if (window.self !== window.top) {
      alert('Payment checkout only works from the published app, not the preview.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await base44.functions.invoke('createCheckoutSession', {
        project_id: project.id,
        project_name: project.name,
        amount: project.revenue,
        client_name: contact?.name || '',
        client_email: contact?.email || '',
        success_url: `${window.location.origin}/client-portal?payment=success`,
        cancel_url: `${window.location.origin}/client-portal?payment=cancelled`,
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Could not create payment session. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Payment failed to start. Please contact Studio 65.');
    }

    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px',
          background: loading ? '#1A1A1A' : '#E81A1A',
          border: 'none', borderRadius: 10,
          color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: loading ? 'default' : 'pointer',
          width: '100%', justifyContent: 'center',
          transition: 'background 0.2s',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={16} />}
        {loading ? 'Redirecting to payment...' : 'Pay Invoice'}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#E81A1A', textAlign: 'center' }}>{error}</div>}
    </div>
  );
}

export default function ClientInvoicesTab({ projects, contact }) {
  const today = new Date().toISOString().split('T')[0];

  // Check for payment success/cancelled in URL
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');

  const invoiceProjects = projects.filter(p =>
    p.revenue > 0 && (
      (p.invoice_status && p.invoice_status !== 'draft') ||
      p.status === 'Invoiced' ||
      p.paid
    )
  );

  const getStatus = (p) => {
    if (p.paid) return 'paid';
    if (p.invoice_status && p.invoice_status !== 'draft') return p.invoice_status;
    if (p.status === 'Invoiced') {
      if (p.invoice_due_date && p.invoice_due_date < today) return 'overdue';
      return 'sent';
    }
    return 'sent';
  };

  const totalOutstanding = invoiceProjects.filter(p => !p.paid).reduce((s, p) => s + (p.revenue || 0), 0);
  const totalPaid = invoiceProjects.filter(p => p.paid).reduce((s, p) => s + (p.revenue || 0), 0);

  if (invoiceProjects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CreditCard size={24} color="#4A9EFF" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#555', marginBottom: 6 }}>No invoices yet</div>
        <div style={{ fontSize: 13, color: '#333' }}>Invoices will appear here when Studio 65 sends them.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Payment status banners */}
      {paymentStatus === 'success' && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle2 size={20} color="#7BC853" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7BC853' }}>Payment submitted!</div>
            <div style={{ fontSize: 12, color: '#555' }}>Studio 65 will confirm your payment shortly.</div>
          </div>
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} color="#F59E0B" />
          <div style={{ fontSize: 14, color: '#F59E0B' }}>Payment was cancelled. You can try again below.</div>
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Outstanding</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: totalOutstanding > 0 ? '#F59E0B' : '#7BC853' }}>{fmt(totalOutstanding)}</div>
        </div>
        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Total Paid</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7BC853' }}>{fmt(totalPaid)}</div>
        </div>
      </div>

      {/* Invoice list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {invoiceProjects.map(p => {
          const status = getStatus(p);
          const st = INVOICE_STATUS[status] || INVOICE_STATUS.sent;
          const isOverdue = status === 'overdue';
          const canPay = !p.paid && p.revenue > 0;

          return (
            <div
              key={p.id}
              style={{
                background: '#0D0D0D',
                border: `1px solid ${isOverdue ? 'rgba(232,26,26,0.25)' : '#1A1A1A'}`,
                borderRadius: 16, overflow: 'hidden',
              }}
            >
              <div style={{ padding: '18px 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, fontFamily: MONO, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}>
                        {isOverdue ? '! ' : ''}{st.label}
                      </span>
                      {p.invoice_number && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{p.invoice_number}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#444', fontFamily: MONO }}>
                      {p.invoice_date && `Issued ${p.invoice_date}`}
                      {p.invoice_due_date && !p.paid && ` · Due ${p.invoice_due_date}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{fmt(p.revenue)}</div>
                    {!p.paid && <div style={{ fontSize: 11, color: '#555', fontFamily: MONO, marginTop: 2 }}>outstanding</div>}
                  </div>
                </div>

                {/* Status row / Pay button */}
                {p.paid ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(123,200,83,0.05)', border: '1px solid rgba(123,200,83,0.15)', borderRadius: 10 }}>
                    <CheckCircle2 size={16} color="#7BC853" />
                    <span style={{ fontSize: 13, color: '#7BC853', fontWeight: 600 }}>Payment received — thank you!</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isOverdue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(232,26,26,0.06)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 10 }}>
                        <AlertCircle size={15} color="#E81A1A" />
                        <div style={{ fontSize: 13, color: '#E81A1A', fontWeight: 600 }}>This invoice is overdue</div>
                      </div>
                    )}
                    {canPay && <PayButton project={p} contact={contact} />}
                    <div style={{ textAlign: 'center' }}>
                      <a href="mailto:studio65production@gmail.com?subject=Invoice Inquiry" style={{ fontSize: 11, color: '#444', fontFamily: MONO, textDecoration: 'none' }}>
                        Questions? Contact Studio 65 →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}