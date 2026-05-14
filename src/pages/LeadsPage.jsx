import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import LeadCard from '@/components/leads/LeadCard';
import LeadModal from '@/components/leads/LeadModal';
import LeadMetrics from '@/components/leads/LeadMetrics';
import ProposalBuilder from '@/components/leads/ProposalBuilder';
import { Plus } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [proposalLead, setProposalLead] = useState(null);

  const loadLeads = useCallback(async () => {
    const data = await base44.entities.ClientLead.list('-created_date', 200);
    setLeads(data);
  }, []);

  useEffect(() => {
    loadLeads().finally(() => setLoading(false));
  }, [loadLeads]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.ClientLead.subscribe((event) => {
      if (event.type === 'create') {
        setLeads((prev) => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setLeads((prev) => prev.map((l) => (l.id === event.id ? event.data : l)));
      } else if (event.type === 'delete') {
        setLeads((prev) => prev.filter((l) => l.id !== event.id));
      }
    });
    return unsub;
  }, []);

  const handleCreate = async (data) => {
    await base44.entities.ClientLead.create(data);
    loadLeads();
  };

  const handleUpdate = async (data) => {
    await base44.entities.ClientLead.update(editingLead.id, data);
    setEditingLead(null);
    loadLeads();
  };

  const handleStatusChange = async (id, status) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const updated = {
      ...lead,
      status,
      closed_date: ['won', 'lost'].includes(status) ? new Date().toISOString().split('T')[0] : lead.closed_date,
      activity: [
        ...(lead.activity || []),
        { type: 'status_change', message: `Status changed to ${status}`, date: new Date().toISOString() },
      ],
    };
    await base44.entities.ClientLead.update(id, updated);
  };

  const handleLeadUpdate = (updatedLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    if (proposalLead?.id === updatedLead.id) setProposalLead(updatedLead);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await base44.entities.ClientLead.delete(id);
  };

  const filteredLeads =
    filter === 'all'
      ? leads
      : leads.filter((l) => {
          if (filter === 'overdue') return l.follow_up_date && new Date(l.follow_up_date) < new Date();
          return l.status === filter;
        });

  const statusGroups = {
    prospect: leads.filter((l) => l.status === 'prospect'),
    proposal_sent: leads.filter((l) => l.status === 'proposal_sent'),
    negotiating: leads.filter((l) => l.status === 'negotiating'),
    won: leads.filter((l) => l.status === 'won'),
    lost: leads.filter((l) => l.status === 'lost'),
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center', color: '#444' }}>Loading leads...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Sales Pipeline</div>
          <div style={{ fontSize: 13, color: '#666' }}>Track leads from prospect to close</div>
        </div>
        <button
          onClick={() => {
            setEditingLead(null);
            setModalOpen(true);
          }}
          style={{
            padding: '12px 18px',
            background: '#E81A1A',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
          }}
        >
          <Plus size={16} /> New Lead
        </button>
      </div>

      <LeadMetrics leads={leads} />

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'All Leads' },
          { value: 'prospect', label: 'Prospects' },
          { value: 'proposal_sent', label: 'Proposals' },
          { value: 'negotiating', label: 'Negotiating' },
          { value: 'won', label: '✓ Won' },
          { value: 'overdue', label: '⚠️ Overdue' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '9px 14px',
              background: filter === f.value ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
              border: `1px solid ${filter === f.value ? 'rgba(232,26,26,0.35)' : '#2A2A2A'}`,
              borderRadius: 10,
              color: filter === f.value ? '#E81A1A' : '#666',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: MONO,
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban Pipeline View */}
      {filter === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { key: 'prospect', label: '🎯 Prospect', count: statusGroups.prospect.length },
            { key: 'proposal_sent', label: '📨 Proposal Sent', count: statusGroups.proposal_sent.length },
            { key: 'negotiating', label: '💬 Negotiating', count: statusGroups.negotiating.length },
            { key: 'won', label: '✅ Won', count: statusGroups.won.length },
          ].map((col) => (
            <div key={col.key} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: 12, padding: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: MONO,
                }}
              >
                <span>{col.label}</span>
                <span style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '4px 8px', borderRadius: 6, fontSize: 10, color: '#666', fontWeight: 500 }}>
                  {col.count}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {statusGroups[col.key].map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onEdit={() => { setEditingLead(lead); setModalOpen(true); }}
                    onBuildProposal={setProposalLead}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View for filters */}
      {filter !== 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filteredLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444' }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📭</div>
              <div>No leads in this category</div>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onEdit={() => {
                  setEditingLead(lead);
                  setModalOpen(true);
                }}
              />
            ))
          )}
        </div>
      )}

      <LeadModal
        open={modalOpen}
        lead={editingLead}
        onClose={() => {
          setModalOpen(false);
          setEditingLead(null);
        }}
        onSave={editingLead ? handleUpdate : handleCreate}
      />
    </div>
  );
}