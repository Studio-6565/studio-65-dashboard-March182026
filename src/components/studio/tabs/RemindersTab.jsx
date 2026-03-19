import React, { useState } from 'react';
import { fmtDateRange } from '@/lib/studio';
import { showToast } from '../StudioToast';

export default function RemindersTab({ project }) {
  const p = project;
  const crew = (p.crew || []).filter(c => c.phone || c.email);
  const [daysOut, setDaysOut] = useState('3');

  const shootDate = p.date ? new Date(p.date) : null;
  const today = new Date();
  const daysUntilShoot = shootDate ? Math.ceil((shootDate - today) / (1000 * 60 * 60 * 24)) : null;

  const availWAMsg = (c) => {
    const dateStr = fmtDateRange(p);
    return `Hi ${c.name}! Just a heads-up — the shoot for *${p.name}* is coming up on *${dateStr}*${p.start_time ? ' at ' + p.start_time : ''}.\n\nAre you still confirmed? Please reply to let me know! 🙏\n\n— Rathan, Studio 65`;
  };

  const availEmailMsg = (c) => {
    const dateStr = fmtDateRange(p);
    const subject = encodeURIComponent(`Reminder: ${p.name} – ${dateStr}`);
    const body = encodeURIComponent(`Hi ${c.name},\n\nThis is a reminder that the shoot for ${p.name} is coming up on ${dateStr}${p.start_time ? ' at ' + p.start_time : ''}.\n\nPlease confirm you're still available!\n\nThanks,\nRathan – Studio 65`);
    return `mailto:${c.email}?subject=${subject}&body=${body}`;
  };

  const callTimeWAMsg = (c) => {
    const dateStr = fmtDateRange(p);
    return `Hi ${c.name}! 🎬 Quick reminder for *${p.name}* on *${dateStr}*:\n\n${p.setup?.arrival_time ? '🕐 *Arrival:* ' + p.setup.arrival_time + '\n' : ''}${p.start_time ? '⏰ *Call Time:* ' + p.start_time + '\n' : ''}${p.address ? '📍 *Location:* ' + p.address + '\n' : ''}${p.poc_name ? '👤 *POC:* ' + p.poc_name + (p.poc_phone ? ' · ' + p.poc_phone : '') + '\n' : ''}\nSee you on set! 🙏`;
  };

  const callTimeEmailMsg = (c) => {
    const dateStr = fmtDateRange(p);
    const subject = encodeURIComponent(`Call Time – ${p.name} – ${dateStr}`);
    const body = encodeURIComponent(`Hi ${c.name},\n\nHere are your call time details for ${p.name} on ${dateStr}:\n\n${p.setup?.arrival_time ? 'Arrival: ' + p.setup.arrival_time + '\n' : ''}${p.start_time ? 'Call Time: ' + p.start_time + '\n' : ''}${p.end_time ? 'Wrap: ' + p.end_time + '\n' : ''}${p.address ? 'Location: ' + p.address + '\n' : ''}${p.poc_name ? 'POC: ' + p.poc_name + (p.poc_phone ? ' · ' + p.poc_phone : '') + '\n' : ''}\nSee you on set!\nRathan – Studio 65`);
    return `mailto:${c.email}?subject=${subject}&body=${body}`;
  };

  const handleBulkWA = (msgFn) => {
    const crewWithPhone = crew.filter(c => c.phone);
    if (!crewWithPhone.length) { showToast('No crew with phone numbers', 'red'); return; }
    crewWithPhone.forEach((c, i) => {
      setTimeout(() => {
        const phone = c.phone.replace(/[^0-9+]/g, '').replace('+', '');
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msgFn(c)), '_blank');
      }, i * 400);
    });
    showToast(`Opening WhatsApp for ${crewWithPhone.length} crew`, 'green');
  };

  const REMINDER_TYPES = [
    {
      id: 'avail',
      label: 'Availability Check',
      desc: 'Remind crew to confirm they\'re still available',
      icon: '✅',
      waMsg: availWAMsg,
      emailFn: availEmailMsg,
    },
    {
      id: 'calltime',
      label: 'Call Time / Logistics',
      desc: 'Send location, arrival time & shoot details',
      icon: '⏰',
      waMsg: callTimeWAMsg,
      emailFn: callTimeEmailMsg,
    },
  ];

  return (
    <div>
      {/* Shoot countdown */}
      {daysUntilShoot !== null && (
        <div style={{ background: '#2A2A2A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 22 }}>📅</div>
          <div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666', marginBottom: 2 }}>Shoot Date</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {daysUntilShoot < 0 ? `${Math.abs(daysUntilShoot)} days ago` : daysUntilShoot === 0 ? 'Today!' : `In ${daysUntilShoot} day${daysUntilShoot !== 1 ? 's' : ''}`}
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#666', fontWeight: 400, marginLeft: 8 }}>{fmtDateRange(p)}</span>
            </div>
          </div>
        </div>
      )}

      {!crew.length ? (
        <div style={{ color: '#555', fontSize: 13, padding: '20px 0' }}>No crew members with contact info found. Add crew with phone/email first.</div>
      ) : (
        <>
          {REMINDER_TYPES.map(rt => (
            <div key={rt.id} style={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{rt.icon} {rt.label}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{rt.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleBulkWA(rt.waMsg)}
                    style={{ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}
                  >
                    📣 All via WA
                  </button>
                </div>
              </div>

              {/* Individual crew */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {crew.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2A2A2A', borderRadius: 8, padding: '9px 12px', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', marginLeft: 6 }}>{c.role}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {c.phone && (
                        <button
                          onClick={() => { const ph = c.phone.replace(/[^0-9+]/g, '').replace('+', ''); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(rt.waMsg(c)), '_blank'); }}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(37,211,102,0.12)', color: '#25D366' }}
                        >WA</button>
                      )}
                      {c.email && (
                        <a
                          href={rt.emailFn(c)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: '"DM Mono", monospace', background: 'rgba(74,158,255,0.1)', color: '#4A9EFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                        >✉</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}