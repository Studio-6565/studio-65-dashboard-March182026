import React, { useState, useEffect, useRef } from 'react';
import StudioModal from './StudioModal';
import WaButton from './WaButton';
import { fmt, fmtH, fmtTs, fmtDateRange, crewOwed, rentalsOwed, margin, marginColor, STATUS_STYLE, crewAvailMsg, crewPayMsg, gearAvailMsg, gearPayMsg, addLog } from '@/lib/studio';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';

const SS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };

const DetailTab = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', background: active ? '#1E1E1E' : 'transparent',
    color: active ? '#fff' : '#666', border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
  }}>{label}</button>
);

export default function ProjectDetailModal({ open, onClose, project, contacts, onUpdate, onDelete, onEdit, onDuplicate, onSaveAsTemplate, onContactsChange }) {
  const [tab, setTab] = useState('overview');
  const [crewForm, setCrewForm] = useState({ name: '', role: '', cost: '', phone: '' });
  const [editingCrewIdx, setEditingCrewIdx] = useState(null);
  const [editingCrewForm, setEditingCrewForm] = useState({});
  const [rentalForm, setRentalForm] = useState({ equipment: '', vendor: '', cost: '', phone: '' });
  const [delForm, setDelForm] = useState({ name: '', due: '' });
  const [hourForm, setHourForm] = useState({ desc: '', person: '', hours: '', date: new Date().toISOString().split('T')[0] });
  const [notes, setNotes] = useState('');
  const noteTimer = useRef(null);

  useEffect(() => {
    if (project) { setNotes(project.notes || ''); setTab('overview'); setEditingCrewIdx(null); }
  }, [project?.id]);

  if (!project) return null;
  const p = project;

  const m = margin(p);
  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
  const cOwed = crewOwed(p);
  const rOwed = rentalsOwed(p);
  const del = p.deliverables || [];

  const update = async (changes) => {
    const updated = { ...p, ...changes, activity: addLog({ ...p, ...changes }, changes._logMsg || 'Project updated') };
    delete updated._logMsg;
    await base44.entities.Project.update(p.id, updated);
    onUpdate(updated);
  };

  const handleTogglePaid = async () => {
    const newPaid = !p.paid;
    const changes = { paid: newPaid, _logMsg: newPaid ? 'Invoice marked as paid' : 'Invoice marked as unpaid' };
    await update(changes);
    showToast(newPaid ? 'Invoice marked paid' : 'Marked unpaid', newPaid ? 'green' : 'red');
  };

  const handleCrewPaid = async (i) => {
    const crew = [...p.crew];
    crew[i] = { ...crew[i], paid: !crew[i].paid };
    await update({ crew, _logMsg: crew[i].name + (crew[i].paid ? ' marked paid' : ' marked unpaid') });
    showToast(crew[i].name + (crew[i].paid ? ' paid ✓' : ' unpaid'), crew[i].paid ? 'green' : 'red');
  };

  const handleRentalPaid = async (i) => {
    const rentals = [...p.rentals];
    rentals[i] = { ...rentals[i], paid: !rentals[i].paid };
    await update({ rentals, _logMsg: rentals[i].equipment + (rentals[i].paid ? ' rental paid' : ' rental unpaid') });
    showToast(rentals[i].equipment + (rentals[i].paid ? ' paid ✓' : ' unpaid'), rentals[i].paid ? 'green' : 'amber');
  };

  const handleToggleDel = async (i) => {
    const deliverables = [...del];
    deliverables[i] = { ...deliverables[i], done: !deliverables[i].done };
    await update({ deliverables, _logMsg: `Deliverable "${deliverables[i].name}" ${deliverables[i].done ? 'complete' : 'incomplete'}` });
  };

  const handleAddCrew = async () => {
    if (!crewForm.name.trim()) { showToast('Enter a name', 'red'); return; }
    const cost = parseFloat(crewForm.cost) || 0;
    const crew = [...(p.crew || []), { name: crewForm.name.trim(), role: crewForm.role.trim(), cost, phone: crewForm.phone.trim(), paid: false }];
    const crew_cost = crew.reduce((s, c) => s + c.cost, 0);
    const net = p.revenue - crew_cost - p.rental_cost;
    await update({ crew, crew_cost, net, _logMsg: `${crewForm.name} added to crew` });
    setCrewForm({ name: '', role: '', cost: '', phone: '' });
    showToast(crewForm.name + ' added to crew');
  };

  const handleDelCrew = async (i) => {
    const crew = p.crew.filter((_, j) => j !== i);
    const crew_cost = crew.reduce((s, c) => s + c.cost, 0);
    await update({ crew, crew_cost, net: p.revenue - crew_cost - p.rental_cost, _logMsg: `Crew member removed` });
  };

  const handleEditCrewStart = (i) => {
    setEditingCrewIdx(i);
    setEditingCrewForm({ ...p.crew[i] });
  };

  const handleEditCrewSave = async () => {
    const crew = [...p.crew];
    crew[editingCrewIdx] = { ...crew[editingCrewIdx], ...editingCrewForm, cost: parseFloat(editingCrewForm.cost) || 0 };
    const crew_cost = crew.reduce((s, c) => s + c.cost, 0);
    await update({ crew, crew_cost, net: p.revenue - crew_cost - p.rental_cost, _logMsg: `${crew[editingCrewIdx].name} crew info updated` });
    setEditingCrewIdx(null);
    showToast('Crew updated', 'blue');
  };

  const crewBookingMsg = (c) => {
    const dateStr = p.end_date && p.end_date !== p.date ? `${p.date} – ${p.end_date}` : p.date;
    const timeStr = p.start_time && p.end_time ? `\n⏰ *Time:* ${p.start_time} – ${p.end_time}` : p.start_time ? `\n⏰ *Call Time:* ${p.start_time}` : '';
    const addrStr = p.address ? `\n📍 *Location:* ${p.address}` : '';
    const pocStr = p.poc_name ? `\n👤 *Point of Contact:* ${p.poc_name}${p.poc_phone ? ' · ' + p.poc_phone : ''}` : '';
    return `Hi ${c.name}! Rathan here from Studio 65 🎬\n\nYou're confirmed for an upcoming shoot! Here are your details:\n\n📌 *Project:* ${p.name}\n📅 *Date:* ${dateStr}${timeStr}${addrStr}${pocStr}\n🎥 *Your Role:* ${c.role || 'Crew'}\n💰 *Your Pay:* ${fmt(c.cost)}${p.notes ? `\n\n📝 *Notes:*\n${p.notes}` : ''}\n\nSee you on set! 🙏`;
  };

  const handleSetAvail = async (i, status) => {
    const crew = [...p.crew];
    crew[i] = { ...crew[i], avail: status };
    await update({ crew, _logMsg: `${crew[i].name} marked ${status === 'yes' ? 'available' : 'unavailable'}` });
    showToast(`${crew[i].name}: ${status === 'yes' ? 'Available ✓' : 'Unavailable ✗'}`, status === 'yes' ? 'green' : 'red');
  };

  const handleNotifyAllCrew = () => {
    const crewWithPhone = (p.crew || []).filter(c => c.phone);
    if (!crewWithPhone.length) { showToast('No crew members have WhatsApp numbers saved', 'red'); return; }
    crewWithPhone.forEach((c, i) => {
      setTimeout(() => {
        const phone = c.phone.replace(/[^0-9+]/g, '').replace('+', '');
        const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(crewBookingMsg(c));
        window.open(url, '_blank');
      }, i * 400);
    });
    showToast(`Opening WhatsApp for ${crewWithPhone.length} crew member(s)`, 'green');
  };

  const handleAddRental = async () => {
    if (!rentalForm.equipment.trim()) { showToast('Enter equipment name', 'red'); return; }
    const cost = parseFloat(rentalForm.cost) || 0;
    const rentals = [...(p.rentals || []), { equipment: rentalForm.equipment.trim(), vendor: rentalForm.vendor.trim(), cost, phone: rentalForm.phone.trim(), paid: false }];
    const rental_cost = rentals.reduce((s, r) => s + r.cost, 0);
    await update({ rentals, rental_cost, net: p.revenue - p.crew_cost - rental_cost, _logMsg: `${rentalForm.equipment} added to rentals` });
    setRentalForm({ equipment: '', vendor: '', cost: '', phone: '' });
    showToast(rentalForm.equipment + ' added');
  };

  const handleDelRental = async (i) => {
    const rentals = p.rentals.filter((_, j) => j !== i);
    const rental_cost = rentals.reduce((s, r) => s + r.cost, 0);
    await update({ rentals, rental_cost, net: p.revenue - p.crew_cost - rental_cost });
  };

  const handleAddDeliverable = async () => {
    if (!delForm.name.trim()) { showToast('Enter a description', 'red'); return; }
    const deliverables = [...del, { name: delForm.name.trim(), done: false, due: delForm.due }];
    await update({ deliverables, _logMsg: `Deliverable added: ${delForm.name}` });
    setDelForm({ name: '', due: '' });
    showToast('Deliverable added');
  };

  const handleDelDeliverable = async (i) => {
    const deliverables = del.filter((_, j) => j !== i);
    await update({ deliverables });
  };

  const handleLogHours = async () => {
    const hrs = parseFloat(hourForm.hours);
    if (!hrs || hrs <= 0) { showToast('Enter valid hours', 'red'); return; }
    const hours = [...(p.hours || []), { desc: hourForm.desc || 'Session', hours: hrs, person: hourForm.person || '—', date: hourForm.date }];
    await update({ hours, _logMsg: `${fmtH(hrs)} logged` });
    setHourForm(f => ({ ...f, desc: '', hours: '', person: '' }));
    showToast(fmtH(hrs) + ' logged', 'amber');
  };

  const handleDelHour = async (i) => {
    const hours = p.hours.filter((_, j) => j !== i);
    await update({ hours });
  };

  const handleSaveNotes = (val) => {
    setNotes(val);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      await base44.entities.Project.update(p.id, { ...p, notes: val });
      onUpdate({ ...p, notes: val });
    }, 600);
  };

  const crewContacts = (contacts || []).filter(c => (c.types || []).includes('Crew'));

  const handleEmailCrew = (c) => {
    if (!c.email) { showToast('No email saved for ' + c.name, 'red'); return; }
    const dateStr = p.end_date && p.end_date !== p.date ? `${p.date} – ${p.end_date}` : p.date;
    const subject = encodeURIComponent(`Shoot Confirmation – ${p.name}`);
    const body = encodeURIComponent(`Hi ${c.name},\n\nYou're confirmed for an upcoming shoot!\n\nProject: ${p.name}\nDate: ${dateStr}${p.start_time ? '\nCall Time: ' + p.start_time : ''}${p.end_time ? '\nWrap: ' + p.end_time : ''}${p.address ? '\nLocation: ' + p.address : ''}${p.poc_name ? '\nPoint of Contact: ' + p.poc_name + (p.poc_phone ? ' · ' + p.poc_phone : '') : ''}\nYour Role: ${c.role || 'Crew'}\nYour Pay: $${c.cost}${p.notes ? '\n\nNotes:\n' + p.notes : ''}\n\nSee you on set!\nRathan – Studio 65`);
    window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSaveCrewToContacts = async (c) => {
    const exists = (contacts || []).find(ct => ct.name.toLowerCase() === c.name.toLowerCase());
    if (exists) { showToast(`${c.name} already in Contacts`, 'amber'); return; }
    const created = await base44.entities.Contact.create({ name: c.name, types: ['Crew'], role: c.role || '', phone: c.phone || '', rate: String(c.cost || '') });
    onContactsChange([...(contacts || []), created]);
    showToast(`${c.name} saved to Contacts`, 'green');
  };

  const handleSaveVendorToContacts = async (r) => {
    const name = r.vendor || r.equipment;
    if (!name) { showToast('No vendor name to save', 'red'); return; }
    const exists = (contacts || []).find(ct => ct.name.toLowerCase() === name.toLowerCase());
    if (exists) { showToast(`${name} already in Contacts`, 'amber'); return; }
    const created = await base44.entities.Contact.create({ name, types: ['Vendor'], phone: r.phone || '', notes: `Equipment: ${r.equipment}` });
    onContactsChange([...(contacts || []), created]);
    showToast(`${name} saved to Contacts`, 'green');
  };

  const tabs = ['overview', 'crew', 'rentals', 'deliverables', 'notes', ...(p.track_hours ? ['hours'] : []), 'activity'];

  return (
    <StudioModal open={open} onClose={onClose} maxWidth={720}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2, fontFamily: '"DM Mono", monospace' }}>{p.project_id} · {p.client} · {fmtDateRange(p)}{p.start_time ? ' · ' + p.start_time : ''}{p.end_time ? '–' + p.end_time : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={onDelete} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Delete</button>
          <button onClick={onDuplicate} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.3)', color: '#7BC853', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Duplicate</button>
          <button onClick={onSaveAsTemplate} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Save as Template</button>
          <button onClick={onEdit} style={{ padding: '6px 14px', borderRadius: 8, background: '#2A2A2A', border: '1px solid #333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#2A2A2A', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: '#2A2A2A', borderRadius: 8, padding: 3, width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(t => <DetailTab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />)}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {[['Revenue', fmt(p.revenue), ''], ['Crew', fmt(p.crew_cost), '#E81A1A'], ['Rental', fmt(p.rental_cost), ''], ['Net', fmt(p.net), '#7BC853']].map(([l, v, c]) => (
              <div key={l} style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c || '#fff' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Profit Margin</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: marginColor(m) }}>{m}%</div>
              </div>
            </div>
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: '"DM Mono", monospace', fontWeight: 600, background: st.bg, color: st.clr }}>{p.status || 'Booked'}</span>
            </div>
          </div>
          {(p.address || p.start_time || p.poc_name) && (
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Shoot Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(p.date || p.end_date) && <div style={{ fontSize: 12 }}>📅 <span style={{ color: '#999' }}>{fmtDateRange(p)}</span></div>}
                {(p.start_time || p.end_time) && <div style={{ fontSize: 12 }}>⏰ <span style={{ color: '#999' }}>{p.start_time}{p.end_time ? ' – ' + p.end_time : ''}</span></div>}
                {p.address && <div style={{ fontSize: 12 }}>📍 <span style={{ color: '#999' }}>{p.address}</span></div>}
                {p.poc_name && <div style={{ fontSize: 12 }}>👤 <span style={{ color: '#999' }}>{p.poc_name}{p.poc_phone ? ' · ' + p.poc_phone : ''}</span></div>}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Client Payment</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#2A2A2A', borderRadius: 8, padding: '12px 14px' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Invoice</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2, fontFamily: '"DM Mono", monospace' }}>{p.paid ? 'Invoice paid ✓' : 'Awaiting payment'}</div>
              </div>
              <button onClick={handleTogglePaid} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace',
                background: p.paid ? 'rgba(232,26,26,0.1)' : 'rgba(123,200,83,0.1)',
                color: p.paid ? '#E81A1A' : '#7BC853',
              }}>{p.paid ? 'Mark Unpaid' : 'Mark Paid'}</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>Crew Owed</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: cOwed > 0 ? '#E81A1A' : '#7BC853' }}>{fmt(cOwed)}</div>
            </div>
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>Rentals Owed</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(rOwed)}</div>
            </div>
            <div style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>Deliverables</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{del.filter(d => d.done).length}/{del.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Crew */}
      {tab === 'crew' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crew Members</div>
            {(p.crew || []).some(c => c.phone) && (
              <button onClick={handleNotifyAllCrew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                📣 Notify All Crew
              </button>
            )}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            {!(p.crew || []).length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No crew added yet.</div> :
              (p.crew || []).map((c, i) => (
                <div key={i} style={{ background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                  {editingCrewIdx === i ? (
                    // Inline edit mode
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                        {[['Name', 'name', 'text'], ['Role', 'role', 'text'], ['Cost ($)', 'cost', 'number'], ['WhatsApp #', 'phone', 'text']].map(([l, k, type]) => (
                          <div key={k}>
                            <label style={LL}>{l}</label>
                            <input style={{ ...SS, background: '#1E1E1E', padding: '7px 10px' }} type={type} value={editingCrewForm[k] || ''} onChange={e => setEditingCrewForm(f => ({ ...f, [k]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleEditCrewSave} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: '#4A9EFF', color: '#fff' }}>Save</button>
                        <button onClick={() => setEditingCrewIdx(null)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#333', border: 'none', color: '#aaa', fontFamily: '"DM Mono", monospace' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.paid ? '#7BC853' : '#E81A1A', flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}{c.phone && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginLeft: 4 }}>{c.phone}</span>}</div>
                        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>{c.role} · {fmt(c.cost)}</div>
                        {/* Availability badge */}
                        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                            background: c.avail === 'yes' ? 'rgba(123,200,83,0.15)' : c.avail === 'no' ? 'rgba(232,26,26,0.12)' : 'rgba(100,100,100,0.12)',
                            color: c.avail === 'yes' ? '#7BC853' : c.avail === 'no' ? '#E81A1A' : '#666'
                          }}>{c.avail === 'yes' ? '✓ Available' : c.avail === 'no' ? '✗ Unavailable' : '— Pending'}</span>
                          <button onClick={() => handleSetAvail(i, 'yes')} title="Mark Available" style={{ padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(123,200,83,0.3)', background: 'transparent', color: '#7BC853' }}>Y</button>
                          <button onClick={() => handleSetAvail(i, 'no')} title="Mark Unavailable" style={{ padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(232,26,26,0.3)', background: 'transparent', color: '#E81A1A' }}>N</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.phone && (
                          <button onClick={() => { const phone = c.phone.replace(/[^0-9+]/g,'').replace('+',''); window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(crewBookingMsg(c)),'_blank'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                            📣 Book
                          </button>
                        )}
                        <WaButton phone={c.phone} message={crewAvailMsg(c, p)} label="Avail?" />
                        <WaButton phone={c.phone} message={crewPayMsg(c, p)} label="Payment" />
                        <button onClick={() => handleEditCrewStart(i)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.12)', color: '#4A9EFF' }}>Edit</button>
                        <button onClick={() => handleCrewPaid(i)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: c.paid ? 'default' : 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: c.paid ? 'rgba(123,200,83,0.18)' : 'rgba(123,200,83,0.1)', color: '#7BC853' }}>{c.paid ? 'Paid ✓' : 'Mark Paid'}</button>
                        <button onClick={() => handleDelCrew(i)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 15, padding: '2px 5px' }}>×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {(p.crew || []).length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid #333' }}>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>Total owed</span>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 500, color: '#E81A1A' }}>{fmt(crewOwed(p))}</span>
              </div>
            )}
          </div>
          {/* Add form — contacts only */}
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Add Crew Member</div>
          {!crewContacts.length ? (
            <div style={{ color: '#666', fontSize: 13, padding: '10px 0' }}>No crew contacts found. Add crew members on the Contacts page first.</div>
          ) : (
            <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 14 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={LL}>Select from Contacts</label>
                <select style={{ ...SS, background: '#1E1E1E' }} onChange={e => {
                  const idx = e.target.value;
                  if (idx === '') { setCrewForm({ name: '', role: '', cost: '', phone: '' }); return; }
                  const c = crewContacts[parseInt(idx)];
                  if (c) setCrewForm({ name: c.name || '', role: c.role || '', cost: c.rate || '', phone: c.phone || '' });
                }}>
                  <option value="">— pick a contact —</option>
                  {crewContacts.map((c, i) => <option key={i} value={i}>{c.name}{c.role ? ' — ' + c.role : ''}{c.rate ? ' ($' + c.rate + ')' : ''}</option>)}
                </select>
              </div>
              {crewForm.name && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={LL}>Role</label>
                    <input style={{ ...SS, background: '#1E1E1E' }} value={crewForm.role} onChange={e => setCrewForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Videographer" />
                  </div>
                  <div>
                    <label style={LL}>Rate / Flat Cost ($)</label>
                    <input style={{ ...SS, background: '#1E1E1E' }} type="number" value={crewForm.cost} onChange={e => setCrewForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label style={LL}>Hours</label>
                    <input style={{ ...SS, background: '#1E1E1E' }} type="number" value={crewForm.hours || ''} onChange={e => setCrewForm(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 8" />
                  </div>
                  <button onClick={handleAddCrew} style={{ height: 38, padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rentals */}
      {tab === 'rentals' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Rental Items</div>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
            {!(p.rentals || []).length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No rental items yet.</div> :
              (p.rentals || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 6, flexWrap: 'wrap' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.paid ? '#7BC853' : '#F59E0B', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.equipment}{r.phone && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginLeft: 4 }}>{r.phone}</span>}</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>{r.vendor || '—'} · {fmt(r.cost)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => handleSaveVendorToContacts(r)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(123,200,83,0.1)', color: '#7BC853' }}>+ Contacts</button>
                    <WaButton phone={r.phone} message={gearAvailMsg(r, p)} label="Avail?" />
                    <WaButton phone={r.phone} message={gearPayMsg(r, p)} label="Payment" />
                    <button onClick={() => handleRentalPaid(i)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: r.paid ? 'default' : 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: r.paid ? 'rgba(123,200,83,0.18)' : 'rgba(245,158,11,0.12)', color: r.paid ? '#7BC853' : '#F59E0B' }}>{r.paid ? 'Paid ✓' : 'Mark Paid'}</button>
                    <button onClick={() => handleDelRental(i)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 15, padding: '2px 5px' }}>×</button>
                  </div>
                </div>
              ))}
            {(p.rentals || []).length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid #333' }}>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>Total owed</span>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 500, color: '#E81A1A' }}>{fmt(rentalsOwed(p))}</span>
              </div>
            )}
          </div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Add Rental Item</div>
          <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              {[['Equipment', 'equipment', 'e.g. Camera', 'text'], ['Vendor', 'vendor', 'e.g. BorrowLenses', 'text'], ['Cost ($)', 'cost', '0', 'number'], ['WhatsApp #', 'phone', '+1 416 555 0100', 'text']].map(([l, k, ph, type]) => (
                <div key={k}>
                  <label style={LL}>{l}</label>
                  <input style={{ ...SS, background: '#1E1E1E' }} type={type} placeholder={ph} value={rentalForm[k]} onChange={e => setRentalForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <button onClick={handleAddRental} style={{ height: 38, padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Deliverables */}
      {tab === 'deliverables' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Deliverables</div>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
            {!del.length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No deliverables yet.</div> :
              del.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={d.done} onChange={() => handleToggleDel(i)} style={{ width: 15, height: 15, accentColor: '#7BC853' }} />
                  </label>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, textDecoration: d.done ? 'line-through' : 'none', color: d.done ? '#666' : '#fff' }}>{d.name}</div>
                    {d.due && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>Due: {d.due}</div>}
                  </div>
                  <button onClick={() => handleDelDeliverable(i)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 15, padding: '2px 5px' }}>×</button>
                </div>
              ))}
          </div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Add Deliverable</div>
          <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={LL}>Description</label>
                <input style={{ ...SS, background: '#1E1E1E' }} placeholder="e.g. 2-min highlight reel" value={delForm.name} onChange={e => setDelForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={LL}>Due Date</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="date" value={delForm.due} onChange={e => setDelForm(f => ({ ...f, due: e.target.value }))} />
              </div>
              <button onClick={handleAddDeliverable} style={{ height: 38, padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Project Notes</div>
          <textarea rows={8} placeholder="Client contacts, shoot location, parking info, special instructions..." value={notes} onChange={e => handleSaveNotes(e.target.value)} style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, lineHeight: 1.6, resize: 'vertical', width: '100%', outline: 'none', fontFamily: 'Syne, sans-serif' }} />
        </div>
      )}

      {/* Hours */}
      {tab === 'hours' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Logged Hours</div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {!(p.hours || []).length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No hours logged yet.</div> :
              (p.hours || []).map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{h.desc || 'Session'}</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>{h.person || '—'} · {h.date || ''}</div>
                  </div>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, color: '#F59E0B' }}>{fmtH(h.hours)}</span>
                  <button onClick={() => handleDelHour(i)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 15, padding: '2px 5px' }}>×</button>
                </div>
              ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid #333', marginTop: 4 }}>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>Total</span>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 500, color: '#F59E0B' }}>{fmtH((p.hours || []).reduce((s, h) => s + h.hours, 0))}</span>
          </div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10, marginTop: 16 }}>Log New Entry</div>
          <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end', marginBottom: 10 }}>
              {[['Description', 'desc', 'e.g. On-site shoot', 'text'], ['Person', 'person', 'e.g. Rathan', 'text'], ['Hours', 'hours', '4', 'number']].map(([l, k, ph, type]) => (
                <div key={k}>
                  <label style={LL}>{l}</label>
                  <input style={{ ...SS, background: '#1E1E1E' }} type={type} step={type === 'number' ? '0.5' : undefined} placeholder={ph} value={hourForm[k]} onChange={e => setHourForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <button onClick={handleLogHours} style={{ height: 38, padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Log</button>
            </div>
            <div>
              <label style={LL}>Date</label>
              <input style={{ ...SS, background: '#1E1E1E', maxWidth: 200 }} type="date" value={hourForm.date} onChange={e => setHourForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Activity Log</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {!(p.activity || []).length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No activity yet.</div> :
              (p.activity || []).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 12px', background: '#2A2A2A', borderRadius: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E81A1A', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13 }}>{e.msg}</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 3 }}>{fmtTs(e.ts)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </StudioModal>
  );
}