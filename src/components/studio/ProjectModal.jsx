import React, { useState, useEffect } from 'react';
import StudioModal from './StudioModal';
import { fmt, nextProjectId } from '@/lib/studio';

export default function ProjectModal({ open, onClose, editingProject, templates, projects, onSave }) {
  const [form, setForm] = useState({
    name: '', client: '', date: new Date().toISOString().split('T')[0], end_date: '',
    extra_dates: [],
    start_time: '', end_time: '', address: '', poc_name: '', poc_phone: '',
    status: 'Booked', revenue: '', crew_cost: '', rental_cost: '',
    track_hours: false,
  });
  const [extraDateInput, setExtraDateInput] = useState('');
  const [deliverables, setDeliverables] = useState([]);
  const [delInput, setDelInput] = useState('');
  const [delDue, setDelDue] = useState('');
  const [selectedTpl, setSelectedTpl] = useState(null);

  const isEdit = !!editingProject;

  useEffect(() => {
    if (editingProject) {
      setForm({
        name: editingProject.name || '',
        client: editingProject.client || '',
        date: editingProject.date || new Date().toISOString().split('T')[0],
        end_date: editingProject.end_date || '',
        extra_dates: editingProject.extra_dates || [],
        start_time: editingProject.start_time || '',
        end_time: editingProject.end_time || '',
        address: editingProject.address || '',
        poc_name: editingProject.poc_name || '',
        poc_phone: editingProject.poc_phone || '',
        status: editingProject.status || 'Booked',
        revenue: editingProject.revenue || '',
        crew_cost: editingProject.crew_cost || '',
        rental_cost: editingProject.rental_cost || '',
        track_hours: editingProject.track_hours || false,
      });
      setDeliverables(JSON.parse(JSON.stringify(editingProject.deliverables || [])));
    } else {
      setForm({ name: '', client: '', date: new Date().toISOString().split('T')[0], end_date: '', extra_dates: [], start_time: '', end_time: '', address: '', poc_name: '', poc_phone: '', status: 'Booked', revenue: '', crew_cost: '', rental_cost: '', track_hours: false });
      setDeliverables([]);
      setSelectedTpl(null);
    }
  }, [editingProject, open]);

  const rev = parseFloat(form.revenue) || 0;
  const crew = parseFloat(form.crew_cost) || 0;
  const rental = parseFloat(form.rental_cost) || 0;
  const net = rev - crew - rental;

  const applyTemplate = (tpl, idx) => {
    setSelectedTpl(idx);
    if (tpl.name && !form.name) setForm(f => ({ ...f, name: tpl.name }));
    setDeliverables(JSON.parse(JSON.stringify(tpl.deliverables || [])));
  };

  const addDel = () => {
    if (!delInput.trim()) return;
    setDeliverables(d => [...d, { name: delInput.trim(), done: false, due: delDue }]);
    setDelInput(''); setDelDue('');
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.client.trim()) return;
    onSave({ ...form, revenue: rev, crew_cost: crew, rental_cost: rental, net, deliverables, extra_dates: form.extra_dates || [] });
  };

  const inputStyle = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };

  return (
    <StudioModal open={open} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{isEdit ? 'Edit Project' : 'New Project'}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2, fontFamily: '"DM Mono", monospace' }}>
            {isEdit ? editingProject?.project_id : 'Next ID: ' + nextProjectId(projects)}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#2A2A2A', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      {/* Template picker */}
      {!isEdit && templates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...labelStyle }}>Start from a template (optional)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {templates.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t, i)} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: selectedTpl === i ? 'rgba(74,158,255,0.1)' : '#1E1E1E',
                border: selectedTpl === i ? '1px solid #4A9EFF' : '1px solid #333',
                color: selectedTpl === i ? '#4A9EFF' : '#fff', cursor: 'pointer'
              }}>{t.name}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Project Name</label>
          <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LG Annual Event" />
        </div>
        <div>
          <label style={labelStyle}>Client</label>
          <input style={inputStyle} value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="e.g. ATM" />
        </div>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>End Date (multi-day)</label>
          <input style={inputStyle} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
        </div>
        {/* Extra non-consecutive dates */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Additional Shoot Dates (non-consecutive)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {(form.extra_dates || []).map((d, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: '"DM Mono", monospace', fontSize: 11, padding: '4px 10px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 6 }}>
                {d}
                <button type="button" onClick={() => setForm(f => ({ ...f, extra_dates: f.extra_dates.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} type="date" value={extraDateInput} onChange={e => setExtraDateInput(e.target.value)} />
            <button type="button" onClick={() => { if (extraDateInput) { setForm(f => ({ ...f, extra_dates: [...(f.extra_dates || []), extraDateInput] })); setExtraDateInput(''); } }} style={{ padding: '0 16px', background: '#2A2A2A', border: '1px solid #444', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Date</button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Call / Start Time</label>
          <input style={inputStyle} type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Wrap / End Time</label>
          <input style={inputStyle} type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Shoot Address</label>
          <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. 123 Queen St W, Toronto, ON" />
        </div>
        <div>
          <label style={labelStyle}>Point of Contact Name</label>
          <input style={inputStyle} value={form.poc_name} onChange={e => setForm(f => ({ ...f, poc_name: e.target.value }))} placeholder="e.g. Sarah Johnson" />
        </div>
        <div>
          <label style={labelStyle}>Point of Contact Phone</label>
          <input style={inputStyle} value={form.poc_phone} onChange={e => setForm(f => ({ ...f, poc_phone: e.target.value }))} placeholder="+1 416 555 0100" />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={{ ...inputStyle }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {['Booked', 'In Production', 'In Edit', 'Delivered', 'Invoiced'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Revenue ($)</label>
          <input style={inputStyle} type="number" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Crew Cost ($)</label>
          <input style={inputStyle} type="number" value={form.crew_cost} onChange={e => setForm(f => ({ ...f, crew_cost: e.target.value }))} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Rental Cost ($)</label>
          <input style={inputStyle} type="number" value={form.rental_cost} onChange={e => setForm(f => ({ ...f, rental_cost: e.target.value }))} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Net (auto)</label>
          <input style={{ ...inputStyle, color: '#7BC853', cursor: 'default' }} value={fmt(net)} readOnly />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.track_hours} onChange={e => setForm(f => ({ ...f, track_hours: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#E81A1A' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>⏱ Track Hours for this project</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>Log time entries per session</div>
            </div>
          </label>
        </div>

        {/* Deliverables */}
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ border: '1px solid #333', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace' }}>Deliverables</span>
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666' }}>{deliverables.length} added</span>
            </div>
            <div style={{ padding: '10px 14px' }}>
              {deliverables.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#2A2A2A', borderRadius: 6, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7BC853', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{d.name}</div>
                  {d.due && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666' }}>{d.due}</span>}
                  <button onClick={() => setDeliverables(d => d.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 15, padding: '0 3px' }}>×</button>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Deliverable</label>
                  <input style={inputStyle} value={delInput} onChange={e => setDelInput(e.target.value)} placeholder="e.g. 2-min highlight reel" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDel(); } }} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input style={inputStyle} type="date" value={delDue} onChange={e => setDelDue(e.target.value)} />
                </div>
                <button onClick={addDel} style={{ height: 38, padding: '0 14px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid #333' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: '9px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {isEdit ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </StudioModal>
  );
}