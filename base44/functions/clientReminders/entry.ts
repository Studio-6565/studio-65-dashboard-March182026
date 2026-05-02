import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Client Reminder Engine
 * Handles three reminder types:
 *   type = "shoot"       — notify clients about upcoming shoot dates (1 day and 3 days ahead)
 *   type = "invoice"     — remind clients about overdue/upcoming unpaid invoices
 *   type = "deliverable" — notify clients about pending deliverable approvals
 *
 * Can be called by scheduler OR manually from the studio UI (admin only).
 *
 * Payload: { type: "shoot" | "invoice" | "deliverable", preview?: boolean }
 *   preview: true → returns what WOULD be sent, without actually sending
 */

const PORTAL_URL = 'https://studio65-q56h.base44.app/client-portal';
const STUDIO_EMAIL = 'studio65production@gmail.com';

// ── helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function portalLink(contact) {
  return PORTAL_URL + (contact?.portal_password ? `?code=${contact.portal_password}` : '');
}

function buildContactMap(contacts) {
  const map = {};
  for (const c of contacts) {
    if ((c.types || []).includes('Client')) {
      map[c.name.toLowerCase()] = c;
    }
  }
  return map;
}

// ── shoot reminders ───────────────────────────────────────────────────────────

async function sendShootReminders(base44, preview) {
  const projects = await base44.asServiceRole.entities.Project.list('-date', 500);
  const allContacts = await base44.asServiceRole.entities.Contact.list('name', 500);
  const contactMap = buildContactMap(allContacts);

  const results = [];

  for (const p of projects) {
    if (p.archived || !p.date || !p.client) continue;

    const days = daysFromNow(p.date);
    if (days !== 1 && days !== 3) continue; // only 1-day and 3-day ahead

    const contact = contactMap[p.client.toLowerCase()];
    if (!contact?.email && !contact?.phone) continue;

    const dateStr = p.end_date && p.end_date !== p.date ? `${p.date} – ${p.end_date}` : p.date;
    const dayLabel = days === 1 ? 'tomorrow' : 'in 3 days';

    const subject = `📅 Your shoot is ${dayLabel} — ${p.name}`;
    const body = `Hi ${p.client.split(' ')[0]},

Just a heads-up — your shoot with Studio 65 is ${dayLabel}! 🎬

📌 Project: ${p.name}
📅 Date: ${dateStr}${p.start_time ? `\n⏰ Time: ${p.start_time}${p.end_time ? ' – ' + p.end_time : ''}` : ''}${p.address ? `\n📍 Location: ${p.address}` : ''}${p.poc_name ? `\n👤 Point of Contact: ${p.poc_name}${p.poc_phone ? ' · ' + p.poc_phone : ''}` : ''}

If anything has changed or you have questions, don't hesitate to reach out.

View your project portal: ${portalLink(contact)}

— Rathan, Studio 65`;

    const waMsg = `Hi ${p.client.split(' ')[0]}! Rathan here from Studio 65 🎬\n\nJust a reminder — your shoot *${p.name}* is ${dayLabel}! 📅\n\n📅 Date: ${dateStr}${p.start_time ? `\n⏰ Time: ${p.start_time}` : ''}${p.address ? `\n📍 ${p.address}` : ''}\n\nSee you soon! 🙌`;

    results.push({
      project: p.name,
      client: p.client,
      days_ahead: days,
      email: contact.email || null,
      phone: contact.phone || null,
      subject,
      body,
      waMsg,
    });

    if (!preview) {
      if (contact.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: contact.email,
          subject,
          body,
          from_name: 'Studio 65',
        });
      }
    }
  }

  return results;
}

// ── invoice reminders ─────────────────────────────────────────────────────────

async function sendInvoiceReminders(base44, preview) {
  const projects = await base44.asServiceRole.entities.Project.list('-date', 500);
  const allContacts = await base44.asServiceRole.entities.Contact.list('name', 500);
  const contactMap = buildContactMap(allContacts);

  const today = new Date().toISOString().split('T')[0];
  const results = [];

  for (const p of projects) {
    if (p.archived || p.paid || !p.revenue || p.revenue <= 0) continue;
    if (!['Invoiced', 'Delivered'].includes(p.status)) continue;

    const contact = contactMap[p.client?.toLowerCase()];
    if (!contact?.email) continue;

    let triggerReason = null;
    let urgencyLabel = '';

    if (p.invoice_due_date) {
      const days = daysFromNow(p.invoice_due_date);
      if (days === 3) { triggerReason = 'due_soon'; urgencyLabel = 'due in 3 days'; }
      else if (days === 1) { triggerReason = 'due_tomorrow'; urgencyLabel = 'due tomorrow'; }
      else if (days < 0) { triggerReason = 'overdue'; urgencyLabel = `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`; }
    } else if (!p.invoice_due_date && p.status === 'Invoiced') {
      // no due date but invoiced — gentle reminder
      triggerReason = 'outstanding';
      urgencyLabel = 'outstanding';
    }

    if (!triggerReason) continue;

    const subject = triggerReason === 'overdue'
      ? `⚠️ Invoice overdue — ${p.name}`
      : `📋 Invoice reminder — ${p.name}`;

    const body = `Hi ${p.client?.split(' ')[0] || 'there'},

This is a friendly reminder regarding your invoice for *${p.name}*.

💰 Amount: $${p.revenue.toLocaleString('en-CA')}
📋 Invoice #: ${p.invoice_number || '—'}${p.invoice_due_date ? `\n📅 Due Date: ${p.invoice_due_date} (${urgencyLabel})` : `\n📅 Status: ${urgencyLabel}`}

If you've already processed this payment, please disregard this message. If you have any questions, feel free to reach out.

View your portal: ${portalLink(contact)}

Thank you!
— Rathan, Studio 65`;

    results.push({
      project: p.name,
      client: p.client,
      reason: triggerReason,
      urgency: urgencyLabel,
      amount: p.revenue,
      email: contact.email,
    });

    if (!preview) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: contact.email,
        subject,
        body,
        from_name: 'Studio 65',
      });
    }
  }

  return results;
}

// ── deliverable approval reminders ───────────────────────────────────────────

async function sendDeliverableReminders(base44, preview) {
  const messages = await base44.asServiceRole.entities.ClientMessage.list('-created_date', 500);
  const allContacts = await base44.asServiceRole.entities.Contact.list('name', 500);
  const contactMap = buildContactMap(allContacts);

  const results = [];
  const seen = new Set(); // avoid double-notifying same client for same project

  for (const msg of messages) {
    if (msg.from !== 'studio') continue;
    if (!['script', 'approval_request'].includes(msg.type)) continue;
    if (msg.approval_status && msg.approval_status !== 'pending') continue;

    // Only remind if it's been pending for at least 24 hours
    const createdAt = new Date(msg.created_date);
    const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) continue;

    const dedupeKey = `${msg.client_name}_${msg.project_id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const contact = contactMap[msg.client_name?.toLowerCase()];
    if (!contact?.email) continue;

    const subject = `⏳ Your approval is needed — ${msg.project_name || msg.title}`;
    const body = `Hi ${msg.client_name?.split(' ')[0] || 'there'},

A reminder that Studio 65 is waiting for your response on:

📋 "${msg.title || 'Review Request'}"${msg.project_name ? `\n🎬 Project: ${msg.project_name}` : ''}
⏱ Sent: ${new Date(msg.created_date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}

Please log in to your portal to review and approve (or request changes):
${portalLink(contact)}

This helps keep your project on schedule — thank you!

— Rathan, Studio 65`;

    results.push({
      client: msg.client_name,
      project: msg.project_name,
      title: msg.title,
      hours_pending: Math.round(hoursAgo),
      email: contact.email,
    });

    if (!preview) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: contact.email,
        subject,
        body,
        from_name: 'Studio 65',
      });
    }
  }

  return results;
}

// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require admin for manual calls; scheduler calls won't have a user
    let isScheduler = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // No user = called by scheduler, allow through
      isScheduler = true;
    }

    const { type, preview = false } = await req.json().catch(() => ({}));

    if (!type) {
      return Response.json({ error: 'Missing type. Use: shoot | invoice | deliverable' }, { status: 400 });
    }

    let results;
    if (type === 'shoot') {
      results = await sendShootReminders(base44, preview);
    } else if (type === 'invoice') {
      results = await sendInvoiceReminders(base44, preview);
    } else if (type === 'deliverable') {
      results = await sendDeliverableReminders(base44, preview);
    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    return Response.json({
      success: true,
      type,
      preview,
      count: results.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});