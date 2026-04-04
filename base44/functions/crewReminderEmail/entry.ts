import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    // Target: shoots that are exactly tomorrow (in Toronto time, UTC-4/5)
    const torontoOffset = -5 * 60; // EST; adjust for DST as needed
    const localNow = new Date(now.getTime() + torontoOffset * 60 * 1000);
    const tomorrow = new Date(localNow);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const projects = await base44.asServiceRole.entities.Project.list('-date', 200);
    const tomorrowProjects = projects.filter(p =>
      !p.archived && p.date === tomorrowStr
    );

    let sent = 0;
    let skipped = 0;

    for (const p of tomorrowProjects) {
      const crew = p.crew || [];
      for (const c of crew) {
        if (!c.email) { skipped++; continue; }
        if (c.avail === 'no') { skipped++; continue; }

        const dateStr = p.end_date && p.end_date !== p.date
          ? `${p.date} – ${p.end_date}`
          : p.date;

        const body = `Hi ${c.name},

This is your 24-hour shoot reminder from Studio 65 🎬

📌 Project: ${p.name}
📅 Date: ${dateStr}${p.start_time ? `\n⏰ Call Time: ${p.start_time}${p.end_time ? ' – ' + p.end_time : ''}` : ''}${p.address ? `\n📍 Location: ${p.address}` : ''}${p.poc_name ? `\n👤 Point of Contact: ${p.poc_name}${p.poc_phone ? ' · ' + p.poc_phone : ''}` : ''}
🎥 Your Role: ${c.role || 'Crew'}
💰 Your Pay: $${c.cost || 0}${p.notes ? `\n\n📝 Notes:\n${p.notes}` : ''}

See you on set tomorrow! 🙌

— Rathan, Studio 65`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: c.email,
          subject: `📸 Shoot Tomorrow — ${p.name}`,
          body,
        });

        sent++;
      }
    }

    return Response.json({
      success: true,
      date_checked: tomorrowStr,
      projects_found: tomorrowProjects.length,
      emails_sent: sent,
      skipped,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});