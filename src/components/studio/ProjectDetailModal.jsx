import React, { useState, useEffect, useRef } from 'react';
import StudioModal from './StudioModal';
import WaButton from './WaButton';
import { useHaptic } from '@/hooks/useHaptic';
import { fmt, fmtH, fmtTs, fmtDateRange, crewOwed, rentalsOwed, margin, marginColor, STATUS_STYLE, crewAvailMsg, crewPayMsg, gearAvailMsg, gearPayMsg, addLog, nextInvoiceNumber } from '@/lib/studio';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import SetupTab from './tabs/SetupTab';
import CallSheetTab from './tabs/CallSheetTab';
import RemindersTab from './tabs/RemindersTab';
import CrewRatingsTab from './tabs/CrewRatingsTab';
import ExpensesTab from './tabs/ExpensesTab';
import MarginTab from './tabs/MarginTab';
import EditReviewTab from './tabs/EditReviewTab';
import InvoiceGenerator from './InvoiceGenerator';
import ProjectChat from './ProjectChat';
import ProjectAIActions from './ProjectAIActions';
import CrewAvailabilityCalendar from './CrewAvailabilityCalendar';
import ProjectFilesHub from '@/components/shared/ProjectFilesHub';
import EquipmentChecklist from './tabs/EquipmentChecklist';
import ContentSchedulerPanel from './ContentSchedulerPanel';
import ProjectMilestoneTimeline from './ProjectMilestoneTimeline';
import { generateCallSheetPDF } from './tabs/CallSheetTab';

const SS = { background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };

const DetailTab = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
    background: active ? '#E81A1A' : 'transparent',
    color: active ? '#fff' : '#555',
    fontFamily: '"DM Mono", monospace',
    letterSpacing: '0.01em',
    transition: 'all 0.15s',
    flexShrink: 0,
  }}>{label}</button>
);

export default function ProjectDetailModal({ open, onClose, project, contacts, projects = [], retainers = [], onUpdate, onDelete, onEdit, onDuplicate, onSaveAsTemplate, onContactsChange, inline = false }) {
  const [tab, setTab] = useState('overview');
  const [crewForm, setCrewForm] = useState({ name: '', role: '', cost: '', hours: '', rate_type: 'flat', phone: '', email: '' });
  const [editingCrewIdx, setEditingCrewIdx] = useState(null);
  const [editingCrewForm, setEditingCrewForm] = useState({});
  const [rentalForm, setRentalForm] = useState({ equipment: '', vendor: '', cost: '', rate_type: 'flat', qty: 1, phone: '', email: '', pickup_date: '', return_date: '', notes: '' });
  const [delForm, setDelForm] = useState({ name: '', due: '' });
  const [hourForm, setHourForm] = useState({ desc: '', person: '', hours: '', date: new Date().toISOString().split('T')[0] });
  const [notes, setNotes] = useState('');
  const [quickInvoiceLoading, setQuickInvoiceLoading] = useState(false);
  const noteTimer = useRef(null);
  const haptic = useHaptic();

  useEffect(() => {
    if (project) { setNotes(project.notes || ''); setTab('overview'); setEditingCrewIdx(null); }
  }, [project?.id]);

  const [selectedCrewForCalendar, setSelectedCrewForCalendar] = useState(null);
  const [shootSub, setShootSub] = useState('crew');
  const [postSub, setPostSub] = useState('deliverables');
  const [financeSub, setFinanceSub] = useState('invoice');
  const [notesSub, setNotesSub] = useState('notes');

  if (!project) return null;
  const p = project;

  const m = margin(p);
  const st = STATUS_STYLE[p.status] || STATUS_STYLE['Booked'];
  const cOwed = crewOwed(p);
  const rOwed = rentalsOwed(p);
  const del = p.deliverables || [];

  const update = async (changes) => {
    const logMsg = changes._logMsg || 'Project updated';
    const { _logMsg, ...cleanChanges } = changes;
    const updated = { ...p, ...cleanChanges, activity: addLog({ ...p, ...cleanChanges }, logMsg) };
    onUpdate(updated); // optimistic update first
    await base44.entities.Project.update(p.id, updated);
  };

  const handleTogglePaid = async () => {
    haptic.confirm();
    const newPaid = !p.paid;
    const changes = { paid: newPaid, _logMsg: newPaid ? 'Invoice marked as paid' : 'Invoice marked as unpaid' };
    await update(changes);
    showToast(newPaid ? 'Invoice marked paid' : 'Marked unpaid', newPaid ? 'green' : 'red');
  };

  const handleQuickInvoice = async () => {
    haptic.confirm();
    setQuickInvoiceLoading(true);
    const invoiceNum = p.invoice_number || nextInvoiceNumber(projects);
    const invoiceDate = p.invoice_date || new Date().toISOString().split('T')[0];
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const SANS = 'helvetica', COURIER = 'courier';
    let y = 0;
    doc.setFillColor(10,10,10); doc.rect(0,0,210,297,'F');
    doc.setFillColor(232,26,26); doc.rect(0,0,210,22,'F');
    doc.setFont(SANS,'bold'); doc.setFontSize(14); doc.setTextColor(255,255,255);
    doc.text('INVOICE', 20, 14);
    doc.setFont(COURIER,'normal'); doc.setFontSize(9); doc.setTextColor(255,200,200);
    doc.text(invoiceNum, 190, 14, { align: 'right' });
    y = 32;
    doc.setFont(SANS,'bold'); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text('Studio 65', 20, y);
    doc.setFont(COURIER,'normal'); doc.setFontSize(9); doc.setTextColor(150,150,150);
    doc.text('studio65production@gmail.com', 20, y+6);
    doc.text('Toronto, ON', 20, y+12);
    doc.setFont(COURIER,'bold'); doc.setFontSize(8); doc.setTextColor(100,100,100);
    doc.text('BILL TO', 130, y);
    doc.setFont(SANS,'bold'); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text(p.client || 'Client', 130, y+6);
    y += 26;
    doc.setFillColor(25,25,25); doc.roundedRect(18,y,174,18,3,3,'F');
    [['Invoice Date', invoiceDate],['Due Date','On Receipt'],['Project',p.project_id||'—'],['Status',p.paid?'PAID':'OUTSTANDING']].forEach(([label,value],i) => {
      const x = 22 + i*44;
      doc.setFont(COURIER,'normal'); doc.setFontSize(7); doc.setTextColor(80,80,80);
      doc.text(label.toUpperCase(), x, y+6);
      doc.setFont(COURIER,'bold'); doc.setFontSize(9); doc.setTextColor(200,200,200);
      doc.text(value, x, y+13);
    });
    y += 26;
    const lineItems = [
      { desc: `Production Services — ${p.name}`, amount: p.revenue || 0 },
      ...(p.expenses||[]).map(e => ({ desc: `${e.category||'Expense'}: ${e.desc}`, amount: e.amount||0 })),
    ];
    const grandTotal = lineItems.reduce((s,l) => s+l.amount, 0);
    doc.setFont(COURIER,'normal'); doc.setFontSize(8); doc.setTextColor(100,100,100);
    doc.text('DESCRIPTION', 20, y); y += 10;
    lineItems.forEach((item,idx) => {
      if (idx%2===0) { doc.setFillColor(15,15,15); doc.rect(18,y-3,174,10,'F'); }
      doc.setFont(SANS,'normal'); doc.setFontSize(10); doc.setTextColor(220,220,220);
      doc.text(doc.splitTextToSize(item.desc,130)[0], 20, y+3);
      doc.setFont(COURIER,'bold'); doc.setFontSize(10); doc.setTextColor(255,255,255);
      doc.text(fmt(item.amount), 188, y+3, { align: 'right' });
      y += 10;
    });
    y += 6;
    doc.setFillColor(30,30,30); doc.roundedRect(120,y,72,18,3,3,'F');
    doc.setFont(COURIER,'normal'); doc.setFontSize(9); doc.setTextColor(150,150,150);
    doc.text('TOTAL DUE', 124, y+7);
    doc.setFont(SANS,'bold'); doc.setFontSize(15); doc.setTextColor(232,26,26);
    doc.text(fmt(grandTotal), 188, y+13, { align: 'right' });
    doc.save(`Invoice_${invoiceNum}_${p.client||'Client'}.pdf`);
    await base44.entities.Project.update(p.id, { ...p, invoice_number: invoiceNum, invoice_date: invoiceDate });
    onUpdate({ ...p, invoice_number: invoiceNum, invoice_date: invoiceDate });
    setQuickInvoiceLoading(false);
    showToast('Invoice downloaded!', 'green');
  };

  const handleCrewPaid = async (i) => {
    haptic.confirm();
    const crew = [...p.crew];
    crew[i] = { ...crew[i], paid: !crew[i].paid };
    await update({ crew, _logMsg: crew[i].name + (crew[i].paid ? ' marked paid' : ' marked unpaid') });
    showToast(crew[i].name + (crew[i].paid ? ' paid ✓' : ' unpaid'), crew[i].paid ? 'green' : 'red');
  };

  const handleRentalPaid = async (i) => {
    const rentals = [...p.rentals];
    rentals[i] = { ...rentals[i], paid: !rentals[i].paid };
    const rental_cost = rentals.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
    await update({ rentals, rental_cost, net: p.revenue - p.crew_cost - rental_cost, _logMsg: rentals[i].equipment + (rentals[i].paid ? ' rental paid' : ' rental unpaid') });
    showToast(rentals[i].equipment + (rentals[i].paid ? ' paid ✓' : ' unpaid'), rentals[i].paid ? 'green' : 'amber');
  };

  const handleToggleDel = async (i) => {
    const deliverables = [...del];
    deliverables[i] = { ...deliverables[i], done: !deliverables[i].done };
    await update({ deliverables, _logMsg: `Deliverable "${deliverables[i].name}" ${deliverables[i].done ? 'complete' : 'incomplete'}` });
  };

  const crewTotal = (c) => {
    if (c.rate_type === 'hourly') return (parseFloat(c.cost) || 0) * (parseFloat(c.hours) || 0);
    return parseFloat(c.cost) || 0;
  };

  const handleAddCrew = async () => {
    if (!crewForm.name.trim()) { showToast('Enter a name', 'red'); return; }
    const rate = parseFloat(crewForm.cost) || 0;
    const hours = crewForm.rate_type === 'hourly' ? (parseFloat(crewForm.hours) || 0) : undefined;
    
    // Check for double-booking
    const existingProjects = (projects || []).filter(proj => {
      if (proj.id === p.id) return false; // Exclude current project
      const projStart = new Date(proj.date);
      const projEnd = new Date(proj.end_date || proj.date);
      const crewStart = new Date(p.date);
      const crewEnd = new Date(p.end_date || p.date);
      return projStart <= crewEnd && projEnd >= crewStart && (proj.crew || []).some(c => c.name.toLowerCase() === crewForm.name.trim().toLowerCase());
    });
    
    if (existingProjects.length > 0) {
      showToast(`${crewForm.name} is already booked on ${existingProjects.length} overlapping project(s)`, 'amber');
    }
    
    const newMember = { name: crewForm.name.trim(), role: crewForm.role.trim(), rate_type: crewForm.rate_type || 'flat', cost: rate, ...(hours !== undefined ? { hours } : {}), phone: crewForm.phone.trim(), email: (crewForm.email || '').trim(), paid: false };
    const crew = [...(p.crew || []), newMember];
    const crew_cost = crew.reduce((s, c) => s + crewTotal(c), 0);
    const net = p.revenue - crew_cost - p.rental_cost;
    await update({ crew, crew_cost, net, _logMsg: `${crewForm.name} added to crew` });
    setCrewForm({ name: '', role: '', cost: '', hours: '', rate_type: 'flat', phone: '', email: '' });
    showToast(crewForm.name + ' added to crew');
  };

  const handleDelCrew = async (i) => {
    haptic.error();
    const crew = p.crew.filter((_, j) => j !== i);
    const crew_cost = crew.reduce((s, c) => s + crewTotal(c), 0);
    await update({ crew, crew_cost, net: p.revenue - crew_cost - p.rental_cost, _logMsg: `Crew member removed` });
  };

  const handleEditCrewStart = (i) => {
    setEditingCrewIdx(i);
    setEditingCrewForm({ ...p.crew[i] });
  };

  const handleEditCrewSave = async () => {
    const crew = [...p.crew];
    crew[editingCrewIdx] = { ...crew[editingCrewIdx], ...editingCrewForm, cost: parseFloat(editingCrewForm.cost) || 0, hours: parseFloat(editingCrewForm.hours) || undefined };
    const crew_cost = crew.reduce((s, c) => s + crewTotal(c), 0);
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
    haptic.soft();
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
    const qty = parseFloat(rentalForm.qty) || 1;
    const newRental = {
      equipment: rentalForm.equipment.trim(),
      vendor: rentalForm.vendor.trim(),
      cost,
      qty,
      total_cost: cost * qty,
      rate_type: rentalForm.rate_type || 'flat',
      phone: rentalForm.phone.trim(),
      email: rentalForm.email.trim(),
      pickup_date: rentalForm.pickup_date || '',
      return_date: rentalForm.return_date || '',
      notes: rentalForm.notes.trim(),
      paid: false,
    };
    const rentals = [...(p.rentals || []), newRental];
    const rental_cost = rentals.reduce((s, r) => s + ((parseFloat(r.cost) || 0) * (parseFloat(r.qty) || 1)), 0);
    await update({ rentals, rental_cost, net: p.revenue - p.crew_cost - rental_cost, _logMsg: `${rentalForm.equipment} added to rentals` });
    setRentalForm({ equipment: '', vendor: '', cost: '', rate_type: 'flat', qty: 1, phone: '', email: '', pickup_date: '', return_date: '', notes: '' });
    showToast(rentalForm.equipment + ' added');
  };

  const handleEmailRental = (r, type) => {
    const email = r.email;
    if (!email) { showToast('No email saved for this vendor', 'red'); return; }
    const dateStr = fmtDateRange(p);
    let subject, body;
    if (type === 'avail') {
      subject = encodeURIComponent(`Gear Availability Check – ${p.name}`);
      body = encodeURIComponent(`Hi${r.vendor ? ' ' + r.vendor : ''},\n\nI'm looking to rent ${r.equipment} for an upcoming shoot.\n\nProject: ${p.name}\nDate: ${dateStr}${p.start_time ? '\nTime: ' + p.start_time : ''}${p.address ? '\nLocation: ' + p.address : ''}\n\nIs the gear available on that date? What's the best way to book?\n\nThanks!\nRathan – Studio 65`);
    } else {
      subject = encodeURIComponent(`Rental Payment – ${r.equipment} – ${p.name}`);
      body = encodeURIComponent(`Hi${r.vendor ? ' ' + r.vendor : ''},\n\nFollowing up on the rental payment of $${r.cost} for ${r.equipment} used on ${p.name} (${dateStr}).\n\nCan you confirm receipt or let me know if there's anything outstanding?\n\nThanks!\nRathan – Studio 65`);
    }
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleEmailCrewAvail = (c) => {
    if (!c.email) { showToast('No email saved for ' + c.name, 'red'); return; }
    const dateStr = fmtDateRange(p);
    const subject = encodeURIComponent(`Availability Check – ${p.name}`);
    const body = encodeURIComponent(`Hi ${c.name},\n\nI have an upcoming shoot and wanted to check your availability.\n\nProject: ${p.name}\nDate: ${dateStr}${p.start_time ? '\nCall Time: ' + p.start_time : ''}${p.end_time ? '\nWrap: ' + p.end_time : ''}${p.address ? '\nLocation: ' + p.address : ''}\nRole: ${c.role || 'Crew'}\n\nPlease reply to confirm if you're available.\n\nThanks!\nRathan – Studio 65`);
    window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleEmailCrewPayment = (c) => {
    if (!c.email) { showToast('No email saved for ' + c.name, 'red'); return; }
    const subject = encodeURIComponent(`Payment – ${p.name}`);
    const body = encodeURIComponent(`Hi ${c.name},\n\nJust flagging that your payment of $${c.cost} for ${p.name} (${p.date}) is ready to be processed.\n\nCan you confirm your payment details are still the same so I can get this sorted?\n\nThanks!\nRathan – Studio 65`);
    window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleDelRental = async (i) => {
    const rentals = p.rentals.filter((_, j) => j !== i);
    const rental_cost = rentals.reduce((s, r) => s + ((parseFloat(r.cost) || 0) * (parseFloat(r.qty) || 1)), 0);
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

  const shootSubTab = ['crew', 'rentals', 'equipment', 'setup', 'call sheet', 'reminders'];
  const postSubTab = ['deliverables', 'content schedule', 'edit', 'ratings'];
  const financeSubTab = ['invoice', 'expenses', 'margin', ...(p.track_hours ? ['hours'] : [])];
  const notesSubTab = ['notes', 'crew chat', 'activity'];

  const tabs = ['overview', 'timeline', 'shoot', 'post', 'finance', 'files', 'notes & log'];

  const handleStatusChange = async (newStatus) => {
    await update({ status: newStatus, _logMsg: `Status changed to ${newStatus}` });
    // Auto-send survey when project is marked Delivered
    if (newStatus === 'Delivered' && p.status !== 'Delivered') {
      const allContacts = contacts || [];
      const clientContact = allContacts.find(c =>
        c.name?.toLowerCase() === p.client?.toLowerCase() &&
        (c.types || []).includes('Client')
      );
      if (clientContact?.email) {
        base44.functions.invoke('deliverableNotify', {
          project_id: p.id,
          deliverable_names: [],
          send_survey: true,
        }).then(() => showToast('Survey auto-sent to client 📧', 'blue')).catch(() => {});
      }
    }
  };

  return (
    <StudioModal open={open} onClose={onClose} maxWidth={720} inline={inline}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2, fontFamily: '"DM Mono", monospace' }}>{p.project_id} · {p.client} · {fmtDateRange(p)}{p.start_time ? ' · ' + p.start_time : ''}{p.end_time ? '–' + p.end_time : ''}</div>
          </div>
          {!inline && <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#2A2A2A', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>×</button>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onEdit} style={{ padding: '6px 14px', borderRadius: 8, background: '#2A2A2A', border: '1px solid #333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={onDuplicate} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.3)', color: '#7BC853', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Duplicate</button>
          <button onClick={onSaveAsTemplate} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Template</button>
          <button onClick={async () => { await update({ archived: !p.archived, _logMsg: p.archived ? 'Project unarchived' : 'Project archived' }); showToast(p.archived ? 'Project unarchived' : 'Project archived', p.archived ? 'blue' : 'green'); }} style={{ padding: '6px 12px', borderRadius: 6, background: p.archived ? 'rgba(74,158,255,0.1)' : 'rgba(100,100,100,0.1)', border: p.archived ? '1px solid rgba(74,158,255,0.3)' : '1px solid rgba(100,100,100,0.3)', color: p.archived ? '#4A9EFF' : '#888', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>{p.archived ? 'Unarchive' : 'Archive'}</button>
          <button onClick={onDelete} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.3)', color: '#E81A1A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}>Delete</button>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 10, overflowX: 'auto', paddingBottom: 4, borderBottom: '1px solid #1E1E1E', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {tabs.map(t => <DetailTab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />)}
      </div>

      {/* Sub-tabs */}
      {tab === 'shoot' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {shootSubTab.map(t => (
            <button key={t} onClick={() => setShootSub(t)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${shootSub === t ? '#444' : '#2A2A2A'}`, background: shootSub === t ? '#2A2A2A' : 'transparent', color: shootSub === t ? '#fff' : '#555', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
          <button
            onClick={async () => {
              try { await generateCallSheetPDF(p); showToast('Call sheet PDF downloaded!', 'green'); }
              catch { showToast('PDF generation failed', 'red'); }
            }}
            style={{ marginLeft: 'auto', padding: '4px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(232,26,26,0.4)', background: 'rgba(232,26,26,0.1)', color: '#E81A1A', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}
          >⬇ Call Sheet PDF</button>
        </div>
      )}
      {tab === 'post' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {postSubTab.map(t => (
            <button key={t} onClick={() => setPostSub(t)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${postSub === t ? '#444' : '#2A2A2A'}`, background: postSub === t ? '#2A2A2A' : 'transparent', color: postSub === t ? '#fff' : '#555', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      )}
      {tab === 'finance' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {financeSubTab.map(t => (
            <button key={t} onClick={() => setFinanceSub(t)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${financeSub === t ? '#444' : '#2A2A2A'}`, background: financeSub === t ? '#2A2A2A' : 'transparent', color: financeSub === t ? '#fff' : '#555', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      )}
      {tab === 'notes & log' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {notesSubTab.map(t => (
            <button key={t} onClick={() => setNotesSub(t)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${notesSub === t ? '#444' : '#2A2A2A'}`, background: notesSub === t ? '#2A2A2A' : 'transparent', color: notesSub === t ? '#fff' : '#555', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      )}

      {/* Timeline tab */}
      {tab === 'timeline' && (
        <ProjectMilestoneTimeline project={p} onUpdate={onUpdate} />
      )}

      {/* AI Actions */}
      <ProjectAIActions project={p} contacts={contacts} tab={tab === 'shoot' ? shootSub : tab === 'post' ? postSub : tab === 'finance' ? financeSub : tab === 'notes & log' ? notesSub : tab} />

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
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
            <select
              value={p.status || 'Booked'}
              onChange={e => handleStatusChange(e.target.value)}
              style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, fontFamily: '"DM Mono", monospace', cursor: 'pointer', outline: 'none' }}
            >
              {['Booked','In Production','In Edit','Delivered','Feedback Requested','Invoiced'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
              <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleTogglePaid} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace',
                background: p.paid ? 'rgba(232,26,26,0.1)' : 'rgba(123,200,83,0.1)',
                color: p.paid ? '#E81A1A' : '#7BC853',
              }}>{p.paid ? 'Mark Unpaid' : 'Mark Paid'}</button>
              <button onClick={handleQuickInvoice} disabled={quickInvoiceLoading} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace',
                background: 'rgba(74,158,255,0.1)', color: '#4A9EFF',
                opacity: quickInvoiceLoading ? 0.6 : 1,
              }}>{quickInvoiceLoading ? '⏳' : '⬇ Invoice PDF'}</button>
            </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
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

          {/* Retainer tagging */}
          {retainers.length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: p.retainer_contract_id ? 'rgba(123,200,83,0.05)' : '#111', border: `1px solid ${p.retainer_contract_id ? 'rgba(123,200,83,0.25)' : '#1E1E1E'}`, borderRadius: 10 }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>📋 Retainer</div>
              {p.retainer_contract_id ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{p.retainer_contract_name}</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', marginTop: 2 }}>
                      Hours logged this project: {(p.hours || []).reduce((s, h) => s + (h.hours || 0), 0).toFixed(1)}h deducted from bucket
                    </div>
                  </div>
                  <button
                    onClick={() => update({ retainer_contract_id: '', retainer_contract_name: '', _logMsg: 'Unlinked from retainer' })}
                    style={{ padding: '5px 12px', background: 'rgba(232,26,26,0.08)', border: '1px solid rgba(232,26,26,0.2)', borderRadius: 6, color: '#E81A1A', fontSize: 11, cursor: 'pointer', fontFamily: '"DM Mono", monospace' }}
                  >Unlink</button>
                </div>
              ) : (
                <div>
                  <select
                    defaultValue=""
                    onChange={async e => {
                      const r = retainers.find(r => r.id === e.target.value);
                      if (r) await update({ retainer_contract_id: r.id, retainer_contract_name: r.title, _logMsg: `Tagged to retainer: ${r.title}` });
                    }}
                    style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}
                  >
                    <option value="">— Tag to a retainer —</option>
                    {retainers.filter(r => r.status === 'active').map(r => (
                      <option key={r.id} value={r.id}>{r.title}{r.contact_name ? ` · ${r.contact_name}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SHOOT sub-tabs */}
      {tab === 'shoot' && shootSub === 'crew' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <CrewAvailabilityCalendar projects={projects || []} selectedCrew={selectedCrewForCalendar} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crew Members</div>
              {(p.crew || []).length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(123,200,83,0.15)', color: '#7BC853' }}>✓ {(p.crew || []).filter(c => c.avail === 'yes').length}</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(232,26,26,0.12)', color: '#E81A1A' }}>✗ {(p.crew || []).filter(c => c.avail === 'no').length}</span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(100,100,100,0.12)', color: '#666' }}>⏳ {(p.crew || []).filter(c => !c.avail || c.avail === 'pending').length}</span>
                </div>
              )}
            </div>
            {(p.crew || []).some(c => c.phone) && (
              <button onClick={handleNotifyAllCrew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                📣 Notify All Crew
              </button>
            )}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            {!(p.crew || []).length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No crew added yet.</div> :
              (p.crew || []).map((c, i) => (
                <div key={i} style={{
                  background: c.avail === 'yes' ? 'rgba(123,200,83,0.06)' : c.avail === 'no' ? 'rgba(232,26,26,0.06)' : '#2A2A2A',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                  border: `1px solid ${c.avail === 'yes' ? 'rgba(123,200,83,0.2)' : c.avail === 'no' ? 'rgba(232,26,26,0.18)' : 'transparent'}`,
                }}>
                  {editingCrewIdx === i ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                        {[['Name', 'name', 'text'], ['Role', 'role', 'text'], ['WhatsApp #', 'phone', 'text']].map(([l, k, type]) => (
                          <div key={k}>
                            <label style={LL}>{l}</label>
                            <input style={{ ...SS, background: '#1E1E1E', padding: '7px 10px' }} type={type} value={editingCrewForm[k] || ''} onChange={e => setEditingCrewForm(f => ({ ...f, [k]: e.target.value }))} />
                          </div>
                        ))}
                        <div>
                          <label style={LL}>Rate Type</label>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {['flat', 'hourly'].map(rt => (
                              <button key={rt} onClick={() => setEditingCrewForm(f => ({ ...f, rate_type: rt }))} style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: (editingCrewForm.rate_type || 'flat') === rt ? '#4A9EFF' : '#2A2A2A', color: (editingCrewForm.rate_type || 'flat') === rt ? '#fff' : '#666' }}>{rt === 'flat' ? 'Flat' : 'Hourly'}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={LL}>{(editingCrewForm.rate_type || 'flat') === 'hourly' ? 'Rate ($/hr)' : 'Flat Fee ($)'}</label>
                          <input style={{ ...SS, background: '#1E1E1E', padding: '7px 10px' }} type="number" value={editingCrewForm.cost || ''} onChange={e => setEditingCrewForm(f => ({ ...f, cost: e.target.value }))} />
                        </div>
                        {(editingCrewForm.rate_type || 'flat') === 'hourly' && (
                          <div>
                            <label style={LL}>Hours</label>
                            <input style={{ ...SS, background: '#1E1E1E', padding: '7px 10px' }} type="number" value={editingCrewForm.hours || ''} onChange={e => setEditingCrewForm(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 8" />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleEditCrewSave} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: '#4A9EFF', color: '#fff' }}>Save</button>
                        <button onClick={() => setEditingCrewIdx(null)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#333', border: 'none', color: '#aaa', fontFamily: '"DM Mono", monospace' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', borderLeft: `3px solid ${c.avail === 'yes' ? '#7BC853' : c.avail === 'no' ? '#E81A1A' : '#444'}`, paddingLeft: 10, marginLeft: -12 }}>
                       <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.paid ? '#7BC853' : '#E81A1A', flexShrink: 0, marginTop: 5 }} />

                       <div style={{ flex: 1, minWidth: 140 }}>
                         <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                           <span>{c.name}{c.phone && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginLeft: 4 }}>{c.phone}</span>}</span>
                           <button 
                             onClick={() => setSelectedCrewForCalendar(selectedCrewForCalendar === c.name ? null : c.name)}
                             style={{ padding: '3px 8px', fontSize: 9, background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 4, color: '#4A9EFF', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                           >
                             {selectedCrewForCalendar === c.name ? 'Hide' : 'View'} Cal
                           </button>
                         </div>
                        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>
                          {c.role} ·{' '}
                          {c.rate_type === 'hourly'
                            ? <span>{fmt(c.cost)}/hr × {c.hours || 0}h = <span style={{ color: '#fff' }}>{fmt(crewTotal(c))}</span></span>
                            : <span>{fmt(c.cost)}</span>
                          }
                        </div>
                        {c.portal_note && (
                          <div style={{ marginTop: 5, padding: '5px 9px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 6, fontSize: 11, color: '#aaa', lineHeight: 1.4 }}>
                            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#4A9EFF' }}>NOTE: </span>{c.portal_note}
                          </div>
                        )}
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, padding: '3px 9px', borderRadius: 4, fontWeight: 700, background: c.avail === 'yes' ? 'rgba(123,200,83,0.18)' : c.avail === 'no' ? 'rgba(232,26,26,0.15)' : 'rgba(100,100,100,0.12)', color: c.avail === 'yes' ? '#7BC853' : c.avail === 'no' ? '#E81A1A' : '#666', border: `1px solid ${c.avail === 'yes' ? 'rgba(123,200,83,0.3)' : c.avail === 'no' ? 'rgba(232,26,26,0.25)' : '#333'}` }}>
                            {c.avail === 'yes' ? '✓ Confirmed' : c.avail === 'no' ? '✗ Declined' : '⏳ Awaiting'}
                          </span>
                          <button onClick={() => handleSetAvail(i, c.avail === 'yes' ? 'pending' : 'yes')} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${c.avail === 'yes' ? '#7BC853' : 'rgba(123,200,83,0.3)'}`, background: c.avail === 'yes' ? 'rgba(123,200,83,0.2)' : 'transparent', color: '#7BC853' }}>Y</button>
                          <button onClick={() => handleSetAvail(i, c.avail === 'no' ? 'pending' : 'no')} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${c.avail === 'no' ? '#E81A1A' : 'rgba(232,26,26,0.3)'}`, background: c.avail === 'no' ? 'rgba(232,26,26,0.15)' : 'transparent', color: '#E81A1A' }}>N</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.phone && <button onClick={() => { const phone = c.phone.replace(/[^0-9+]/g,'').replace('+',''); window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(crewBookingMsg(c)),'_blank'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>📣 Book WA</button>}
                        {c.email && <button onClick={() => handleEmailCrew(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>📣 Book ✉</button>}
                        <WaButton phone={c.phone} message={crewAvailMsg(c, p)} label="Avail? WA" />
                        {c.email && <button onClick={() => handleEmailCrewAvail(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>Avail? ✉</button>}
                        <WaButton phone={c.phone} message={crewPayMsg(c, p)} label="Pay WA" />
                        {c.email && <button onClick={() => handleEmailCrewPayment(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>Pay ✉</button>}
                        <button onClick={() => handleEditCrewStart(i)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.12)', color: '#4A9EFF' }}>Edit</button>
                        <button onClick={() => handleCrewPaid(i)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: c.paid ? 'default' : 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: c.paid ? 'rgba(123,200,83,0.18)' : 'rgba(123,200,83,0.1)', color: '#7BC853' }}>{c.paid ? 'Paid ✓' : 'Mark Paid'}</button>
                        <button onClick={() => { if (confirm(`Remove ${c.name} from crew?`)) handleDelCrew(i); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(232,26,26,0.15)', color: '#E81A1A' }}>Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {(p.crew || []).length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid #333' }}>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666' }}>Total owed</span>
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, fontWeight: 500, color: '#E81A1A' }}>{fmt((p.crew || []).filter(c => !c.paid).reduce((s, c) => s + crewTotal(c), 0))}</span>
              </div>
            )}
          </div>
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
                  if (c) setCrewForm({ name: c.name || '', role: c.role || '', cost: c.rate || '', phone: c.phone || '', email: c.email || '' });
                }}>
                  <option value="">— pick a contact —</option>
                  {crewContacts.map((c, i) => <option key={i} value={i}>{c.name}{c.role ? ' — ' + c.role : ''}{c.rate ? ' ($' + c.rate + ')' : ''}</option>)}
                </select>
              </div>
              {crewForm.name && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={LL}>Role</label>
                      <input style={{ ...SS, background: '#1E1E1E' }} value={crewForm.role} onChange={e => setCrewForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Videographer" />
                    </div>
                    <div>
                      <label style={LL}>Rate Type</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['flat', 'hourly'].map(rt => (
                          <button key={rt} onClick={() => setCrewForm(f => ({ ...f, rate_type: rt }))} style={{ flex: 1, height: 36, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: crewForm.rate_type === rt ? '#4A9EFF' : '#1E1E1E', color: crewForm.rate_type === rt ? '#fff' : '#666' }}>{rt === 'flat' ? 'Flat Fee' : 'Hourly'}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: crewForm.rate_type === 'hourly' ? '1fr 1fr auto auto' : '1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={LL}>{crewForm.rate_type === 'hourly' ? 'Rate ($/hr)' : 'Flat Fee ($)'}</label>
                      <input style={{ ...SS, background: '#1E1E1E' }} type="number" value={crewForm.cost} onChange={e => setCrewForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
                    </div>
                    {crewForm.rate_type === 'hourly' && (
                      <div>
                        <label style={LL}>Hours</label>
                        <input style={{ ...SS, background: '#1E1E1E' }} type="number" value={crewForm.hours} onChange={e => setCrewForm(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 8" />
                      </div>
                    )}
                    {crewForm.rate_type === 'hourly' && crewForm.cost && crewForm.hours && (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(123,200,83,0.08)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 8, height: 36 }}>
                        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#7BC853', whiteSpace: 'nowrap' }}>{fmt((parseFloat(crewForm.cost) || 0) * (parseFloat(crewForm.hours) || 0))}</span>
                      </div>
                    )}
                    <button onClick={handleAddCrew} style={{ height: 38, padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'shoot' && shootSub === 'rentals' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Rental Items</div>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
            {!(p.rentals || []).length ? <div style={{ color: '#666', fontSize: 13, padding: '8px 0' }}>No rental items yet.</div> :
              (p.rentals || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 6, flexWrap: 'wrap' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.paid ? '#7BC853' : '#F59E0B', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.equipment}{r.phone && <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: '#666', marginLeft: 4 }}>{r.phone}</span>}</div>
                    <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginTop: 2 }}>
                      {r.vendor || '—'} · {r.qty && r.qty > 1 ? `${r.qty}×` : ''}{fmt(r.cost)}{r.rate_type && r.rate_type !== 'flat' ? ` (${r.rate_type})` : ''}
                      {r.qty && r.qty > 1 ? <span style={{ color: '#fff', marginLeft: 4 }}>= {fmt((parseFloat(r.cost)||0)*(parseFloat(r.qty)||1))}</span> : ''}
                    </div>
                    {(r.pickup_date || r.return_date) && <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#555', marginTop: 2 }}>📅 {r.pickup_date ? 'Pickup: ' + r.pickup_date.replace('T', ' ') : ''}{r.return_date ? ' · Return: ' + r.return_date.replace('T', ' ') : ''}</div>}
                    {r.notes && <div style={{ fontSize: 11, color: '#666', marginTop: 3, fontStyle: 'italic' }}>{r.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => handleSaveVendorToContacts(r)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(123,200,83,0.1)', color: '#7BC853' }}>+ Contacts</button>
                    <WaButton phone={r.phone} message={gearAvailMsg(r, p)} label="Avail? WA" />
                    {r.email && <button onClick={() => handleEmailRental(r, 'avail')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>Avail? ✉</button>}
                    <WaButton phone={r.phone} message={gearPayMsg(r, p)} label="Pay WA" />
                    {r.email && <button onClick={() => handleEmailRental(r, 'pay')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.1)', color: '#4A9EFF' }}>Pay ✉</button>}
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
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Add Rental Vendor</div>
          {(contacts || []).some(c => (c.types || []).includes('Vendor') && (c.offerings || []).length > 0) && (
            <div style={{ marginBottom: 14 }}>
              <label style={LL}>Quick-add from vendor</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(contacts || []).filter(c => (c.types || []).includes('Vendor') && (c.offerings || []).length > 0).map(c =>
                  c.offerings.map((o, oi) => (
                    <button key={`${c.id}-${oi}`} onClick={() => setRentalForm(f => ({ ...f, equipment: o.name, vendor: c.name, cost: String(o.cost || ''), phone: c.phone || '', email: c.email || '' }))} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(123,200,83,0.25)', background: 'rgba(123,200,83,0.08)', color: '#7BC853', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap' }}>
                      {o.name}{o.cost > 0 ? ` · $${o.cost}` : ''} <span style={{ opacity: 0.5, fontSize: 9 }}>({c.name})</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          <div style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10, marginBottom: 10 }}>
              {[['Rental Item', 'equipment', 'e.g. Sony FX6', 'text'], ['Vendor', 'vendor', 'e.g. BorrowLenses', 'text']].map(([l, k, ph, type]) => (
                <div key={k}>
                  <label style={LL}>{l}</label>
                  <input style={{ ...SS, background: '#1E1E1E' }} type={type} placeholder={ph} value={rentalForm[k]} onChange={e => setRentalForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={LL}>Qty</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="number" min="1" placeholder="1" value={rentalForm.qty} onChange={e => setRentalForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div>
                <label style={LL}>Rate Type</label>
                <div style={{ display: 'flex', gap: 0, background: '#1E1E1E', borderRadius: 8, border: '1px solid #333', overflow: 'hidden' }}>
                  {[['flat', 'Flat'], ['daily', 'Daily'], ['hourly', 'Hourly'], ['project', 'Project']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setRentalForm(f => ({ ...f, rate_type: v }))}
                      style={{ flex: 1, padding: '8px 4px', fontSize: 9, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: rentalForm.rate_type === v ? '#E81A1A' : 'transparent', color: rentalForm.rate_type === v ? '#fff' : '#666', whiteSpace: 'nowrap' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={LL}>Cost ($)</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="number" placeholder="0" value={rentalForm.cost} onChange={e => setRentalForm(f => ({ ...f, cost: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={LL}>Pickup Date/Time</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="datetime-local" value={rentalForm.pickup_date} onChange={e => setRentalForm(f => ({ ...f, pickup_date: e.target.value }))} />
              </div>
              <div>
                <label style={LL}>Return Date/Time</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="datetime-local" value={rentalForm.return_date} onChange={e => setRentalForm(f => ({ ...f, return_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={LL}>WhatsApp #</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="text" placeholder="+1 416 555 0100" value={rentalForm.phone} onChange={e => setRentalForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={LL}>Email</label>
                <input style={{ ...SS, background: '#1E1E1E' }} type="email" placeholder="vendor@example.com" value={rentalForm.email} onChange={e => setRentalForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={LL}>Notes</label>
              <input style={{ ...SS, background: '#1E1E1E' }} placeholder="Pickup instructions, serial #, special requirements..." value={rentalForm.notes} onChange={e => setRentalForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={handleAddRental} style={{ width: '100%', height: 38, background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add Rental</button>
          </div>
        </div>
      )}

      {/* POST sub-tabs */}
      {tab === 'post' && postSub === 'deliverables' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Deliverables</div>
            {del.filter(d => d.done).length > 0 && (
              <button
                onClick={async () => {
                  const readyNames = del.filter(d => d.done).map(d => d.name);
                  const sendSurvey = confirm('Also send a satisfaction survey to the client?');
                  showToast('Notifying client...', 'blue');
                  const res = await base44.functions.invoke('deliverableNotify', {
                    project_id: p.id,
                    deliverable_names: readyNames,
                    send_survey: sendSurvey,
                  });
                  if (res.data?.success) {
                    showToast('Client notified' + (res.data.surveyId ? ' + survey sent' : '') + ' ✓', 'green');
                    await update({ status: 'Delivered', _logMsg: 'Deliverables marked ready — client notified' });
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(123,200,83,0.12)', color: '#7BC853' }}
              >
                📣 Notify Client →
              </button>
            )}
          </div>
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
                    {d.link && <a href={d.link} target="_blank" rel="noreferrer" style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#4A9EFF', marginTop: 2, display: 'block' }}>📎 View Submission</a>}
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

      {/* NOTES & LOG sub-tabs */}
      {tab === 'notes & log' && notesSub === 'notes' && (
        <div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Project Notes</div>
          <textarea rows={8} placeholder="Client contacts, shoot location, parking info, special instructions..." value={notes} onChange={e => handleSaveNotes(e.target.value)} style={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, lineHeight: 1.6, resize: 'vertical', width: '100%', outline: 'none', fontFamily: 'Syne, sans-serif' }} />
        </div>
      )}

      {/* FINANCE sub-tabs */}
      {tab === 'finance' && financeSub === 'hours' && (
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 10, alignItems: 'end', marginBottom: 10 }}>
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

      {tab === 'files' && (
        <div>
          {/* Share Review Link */}
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(74,158,255,0.05)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#4A9EFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Client Deliverable Review</div>
              <div style={{ fontSize: 12, color: '#555' }}>Share a review link so your client can approve deliverables & leave timestamped comments.</div>
            </div>
            <button
              onClick={() => {
                const token = btoa(`${p.id}:${p.client}`);
                const url = `${window.location.origin}/deliverable-review?project_id=${p.id}&client_name=${encodeURIComponent(p.client)}&token=${token}`;
                navigator.clipboard.writeText(url).then(() => showToast('Review link copied! 🔗', 'blue'));
              }}
              style={{ padding: '8px 16px', background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 8, color: '#4A9EFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Mono", monospace', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              📋 Copy Review Link
            </button>
          </div>
          <ProjectFilesHub
            projectId={p.id}
            projectName={p.name}
            clientName={p.client}
            isStudio={true}
            uploaderName="Studio 65"
          />
        </div>
      )}

      {tab === 'finance' && financeSub === 'expenses' && <ExpensesTab project={p} onUpdate={update} allProjects={projects} />}
      {tab === 'finance' && financeSub === 'margin' && <MarginTab project={p} contacts={contacts} />}
      {tab === 'finance' && financeSub === 'invoice' && <InvoiceGenerator project={p} onUpdate={onUpdate} />}
      {tab === 'shoot' && shootSub === 'equipment' && <EquipmentChecklist project={p} onUpdate={update} />}
      {tab === 'shoot' && shootSub === 'setup' && <SetupTab project={p} onUpdate={update} />}
      {tab === 'shoot' && shootSub === 'reminders' && <RemindersTab project={p} />}
      {tab === 'shoot' && shootSub === 'call sheet' && <CallSheetTab project={p} onUpdate={update} />}
      {tab === 'post' && postSub === 'content schedule' && <ContentSchedulerPanel project={p} contacts={contacts} />}
      {tab === 'post' && postSub === 'ratings' && <CrewRatingsTab project={p} contacts={contacts} onContactsChange={onContactsChange} />}
      {tab === 'post' && postSub === 'edit' && <EditReviewTab project={p} contacts={contacts} />}
      {tab === 'notes & log' && notesSub === 'crew chat' && <ProjectChat project={p} studioName="Studio 65" />}

      {tab === 'notes & log' && notesSub === 'activity' && (
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