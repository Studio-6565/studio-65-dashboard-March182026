import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ContractEditor from '@/components/contracts/ContractEditor';
import ContractList from '@/components/contracts/ContractList';
import RetainerForm from '@/components/retainer/RetainerForm';
import RetainerDashboard from '@/components/retainer/RetainerDashboard';

const MONO = '"DM Mono", monospace';

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [tab, setTab] = useState('contracts'); // 'contracts' | 'retainers'

  useEffect(() => {
    Promise.all([
      base44.entities.Contract.list('-created_date', 200),
      base44.entities.Contact.list('name', 200),
      base44.entities.Project.list('-date', 300),
    ]).then(([cs, cts, ps]) => {
      setContracts(cs);
      setContacts(cts);
      setProjects(ps);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (data) => {
    if (editing === 'new') {
      const created = await base44.entities.Contract.create(data);
      setContracts(prev => [created, ...prev]);
    } else {
      const updated = await base44.entities.Contract.update(editing.id, data);
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contract?')) return;
    await base44.entities.Contract.delete(id);
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  const handleSend = async (contract) => {
    const updated = { ...contract, status: 'sent', sent_at: new Date().toISOString() };
    await base44.entities.Contract.update(contract.id, updated);
    setContracts(prev => prev.map(c => c.id === contract.id ? updated : c));
  };

  const handleEdit = (contract) => {
    setEditing(contract);
    if (contract.type === 'retainer') setTab('retainers');
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#E81A1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Retainer form view
  if (editing && (editing === 'new-retainer' || editing?.type === 'retainer')) {
    return (
      <RetainerForm
        contract={editing === 'new-retainer' ? null : editing}
        contacts={contacts}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  // Standard contract editor view
  if (editing && editing !== 'new-retainer') {
    return (
      <ContractEditor
        contract={editing === 'new' ? null : editing}
        contacts={contacts}
        projects={projects}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const retainers = contracts.filter(c => c.type === 'retainer');
  const activeRetainers = retainers.filter(c => c.status === 'active');

  return (
    <div style={{ fontFamily: 'Syne, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Contracts & Retainers</div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: MONO }}>
            {contracts.filter(c => c.type !== 'retainer').length} contracts · {retainers.length} retainers ({activeRetainers.length} active)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setEditing('new-retainer')}
            style={{ padding: '10px 16px', background: 'rgba(123,200,83,0.12)', border: '1px solid rgba(123,200,83,0.3)', borderRadius: 10, color: '#7BC853', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >+ New Retainer</button>
          <button
            onClick={() => setEditing('new')}
            style={{ padding: '10px 20px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >+ New Contract</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
        {[
          { key: 'contracts', label: '📄 Contracts' },
          { key: 'retainers', label: `📋 Retainer Dashboard${activeRetainers.length > 0 ? ` (${activeRetainers.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            background: tab === t.key ? '#E81A1A' : 'transparent',
            color: tab === t.key ? '#fff' : '#555',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'contracts' && (
        <ContractList
          contracts={contracts.filter(c => c.type !== 'retainer')}
          filterType={filterType}
          onFilterType={setFilterType}
          onNew={() => setEditing('new')}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSend={handleSend}
        />
      )}

      {tab === 'retainers' && (
        <RetainerDashboard
          retainers={retainers}
          projects={projects}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}