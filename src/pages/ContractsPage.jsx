import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ContractEditor from '@/components/contracts/ContractEditor';
import ContractList from '@/components/contracts/ContractList';

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null); // null = list, 'new' = new, contract obj = edit
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.Contract.list('-created_date', 200),
      base44.entities.Contact.list('name', 200),
      base44.entities.Project.list('-date', 200),
    ]).then(([cs, contacts, ps]) => {
      setContracts(cs);
      setContacts(contacts);
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

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#444', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#E81A1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (editing) {
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

  return (
    <ContractList
      contracts={contracts}
      filterType={filterType}
      onFilterType={setFilterType}
      onNew={() => setEditing('new')}
      onEdit={setEditing}
      onDelete={handleDelete}
      onSend={handleSend}
    />
  );
}