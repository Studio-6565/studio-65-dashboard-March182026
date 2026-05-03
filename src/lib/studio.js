// Shared utility functions for Studio 65

export const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmtH = (h) => (+h).toFixed(1) + ' hrs';

export const crewOwed = (p) => (p.crew || []).filter(c => !c.paid).reduce((s, c) => s + c.cost, 0);
export const rentalsOwed = (p) => (p.rentals || []).filter(r => !r.paid).reduce((s, r) => s + r.cost, 0);
export const margin = (p) => p.revenue > 0 ? Math.round(p.net / p.revenue * 100) : 0;
export const marginColor = (m) => m >= 50 ? '#7BC853' : m >= 25 ? '#F59E0B' : '#E81A1A';
export const marginBg = (m) => m >= 50 ? 'rgba(123,200,83,0.1)' : m >= 25 ? 'rgba(245,158,11,0.12)' : 'rgba(232,26,26,0.1)';

export const STATUS_STYLE = {
  'Booked':             { bg: 'rgba(74,158,255,0.12)',  clr: '#4A9EFF' },
  'In Production':      { bg: 'rgba(245,158,11,0.12)',  clr: '#F59E0B' },
  'In Edit':            { bg: 'rgba(159,100,255,0.12)', clr: '#A78BFA' },
  'Delivered':          { bg: 'rgba(123,200,83,0.12)',  clr: '#7BC853' },
  'Feedback Requested': { bg: 'rgba(245,158,11,0.15)',  clr: '#F59E0B' },
  'Invoiced':           { bg: 'rgba(232,26,26,0.12)',   clr: '#E81A1A' },
};

export const waPhone = (raw) => (raw || '').replace(/[^0-9+]/g, '');
export const waLink = (phone, msg) => {
  const p = waPhone(phone);
  if (!p) { alert('No WhatsApp number saved for this person.'); return; }
  const url = 'https://wa.me/' + p.replace('+', '') + '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
};

export const fmtDateRange = (p) => {
  let base = p.date || '';
  if (p.end_date && p.end_date !== p.date) base = `${p.date} – ${p.end_date}`;
  if (p.extra_dates && p.extra_dates.length) base += ', ' + p.extra_dates.join(', ');
  return base;
};

export const crewAvailMsg = (crew, project) => {
  const dateStr = fmtDateRange(project);
  const timeStr = project.start_time && project.end_time ? `\n⏰ *Time:* ${project.start_time} – ${project.end_time}` : project.start_time ? `\n⏰ *Call Time:* ${project.start_time}` : '';
  const addrStr = project.address ? `\n📍 *Location:* ${project.address}` : '';
  const pocStr = project.poc_name ? `\n👤 *Point of Contact:* ${project.poc_name}${project.poc_phone ? ' · ' + project.poc_phone : ''}` : '';
  return `Hi ${crew.name}! This is Rathan from Studio 65 🎬\n\nI have an upcoming shoot and wanted to check your availability:\n\n📌 *Project:* ${project.name}\n📅 *Date:* ${dateStr}${timeStr}${addrStr}${pocStr}\n🎥 *Your Role:* ${crew.role || 'Crew'}\n\nReply *Y* if you're available or *N* if you're not. Thanks! 🙏`;
};

export const crewPayMsg = (crew, project) =>
  `Hi ${crew.name}! Rathan here from Studio 65 👋\n\nJust flagging that your payment of *${fmt(crew.cost)}* for *${project.name}* (${project.date}) is ready to be processed.\n\nCan you confirm your payment details are still the same so I can get this sorted? Thanks!`;

export const gearAvailMsg = (rental, project) =>
  `Hi${rental.vendor ? ' ' + rental.vendor : ''}! This is Rathan from Studio 65 🎬\n\nI'm looking to rent *${rental.equipment}* for a shoot — *${project.name}* on *${project.date}*.\n\nIs the gear available on that date? What's the best way to book? Thanks!`;

export const gearPayMsg = (rental, project) =>
  `Hi${rental.vendor ? ' ' + rental.vendor : ''}! Rathan from Studio 65 here 👋\n\nJust following up on the rental payment of *${fmt(rental.cost)}* for *${rental.equipment}* used on *${project.name}* (${project.date}).\n\nCan you confirm receipt or let me know if there's anything outstanding? Thanks!`;

export const fmtTs = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
};

export const nextProjectId = (projects) => {
  const nums = projects.map(p => parseInt((p.project_id || '').replace('PR', '')) || 0);
  return 'PR' + String(Math.max(0, ...nums) + 1).padStart(3, '0');
};

export const nextInvoiceNumber = (projects) => {
  const nums = projects.map(p => {
    const n = (p.invoice_number || '').replace(/^INV-?0*/i, '');
    return parseInt(n) || 0;
  });
  const next = Math.max(0, ...nums) + 1;
  return 'INV-' + String(next).padStart(4, '0');
};

export const addLog = (project, msg) => {
  const activity = [...(project.activity || [])];
  activity.unshift({ msg, ts: new Date().toISOString() });
  return activity.slice(0, 100);
};