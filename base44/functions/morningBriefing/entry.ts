import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const users = await base44.asServiceRole.entities.User.list();
    const admin = users.find(u => u.role === 'admin');
    if (!admin?.email) {
      return Response.json({ skipped: true, reason: 'No admin email' });
    }

    const today = new Date().toISOString().split('T')[0];
    const allProjects = await base44.asServiceRole.entities.Project.list('-date', 500);
    const active = allProjects.filter(p => !p.archived && !p.is_test);

    const todaysShoots = active.filter(p =>
      p.date === today ||
      (p.date && p.end_date && p.date <= today && p.end_date >= today)
    );

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const upcomingShoots = active
      .filter(p => p.date > today && p.date <= futureDateStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    const overdueInvoices = active.filter(p =>
      !p.paid && p.revenue > 0 && ['Invoiced', 'Delivered'].includes(p.status)
    ).sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

    const pendingDeliverables = active
      .filter(p => (p.deliverables || []).some(d => !d.done))
      .map(p => ({ name: p.name, count: (p.deliverables || []).filter(d => !d.done).length }))
      .slice(0, 5);

    const tasks = await base44.asServiceRole.entities.DailyTask.list('order', 50);
    const pendingTasks = tasks.filter(t => !t.done || t.done_date !== today);

    const dateStr = new Date().toLocaleDateString('en-CA', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/Toronto'
    });

    let lines = [`Good morning Rathan! Here's your Studio 65 briefing for ${dateStr}.\n`];

    if (todaysShoots.length > 0) {
      lines.push(`🎬 TODAY'S SHOOTS (${todaysShoots.length})`);
      todaysShoots.forEach(p => {
        let line = `  • ${p.name} — ${p.client}`;
        if (p.start_time) line += ` · ${p.start_time}`;
        if (p.address) line += ` · ${p.address}`;
        lines.push(line);
      });
      lines.push('');
    } else {
      lines.push('✅ No shoots today — a great day to edit, invoice, or prospect.\n');
    }

    if (upcomingShoots.length > 0) {
      lines.push('📅 COMING UP THIS WEEK');
      upcomingShoots.forEach(p => lines.push(`  • ${p.date} — ${p.name} (${p.client})`));
      lines.push('');
    }

    if (overdueInvoices.length > 0) {
      const total = overdueInvoices.reduce((s, p) => s + (p.revenue || 0), 0);
      lines.push(`💸 OUTSTANDING INVOICES (${overdueInvoices.length}) — $${total.toLocaleString()} total`);
      overdueInvoices.slice(0, 5).forEach(p => lines.push(`  • ${p.name} — ${p.client} — $${(p.revenue || 0).toLocaleString()}`));
      lines.push('');
    }

    if (pendingDeliverables.length > 0) {
      lines.push('📦 PENDING DELIVERABLES');
      pendingDeliverables.forEach(d => lines.push(`  • ${d.name} — ${d.count} item${d.count !== 1 ? 's' : ''} left`));
      lines.push('');
    }

    if (pendingTasks.length > 0) {
      lines.push(`✅ DAILY TASKS (${pendingTasks.length} pending)`);
      pendingTasks.slice(0, 8).forEach(t => lines.push(`  ☐ ${t.label}`));
      lines.push('');
    }

    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://studio65.base44.com';
    lines.push(`\n— Studio 65 Automated Briefing\nDashboard: ${appUrl}/dashboard`);

    const subject = todaysShoots.length > 0
      ? `🎬 ${todaysShoots.length} shoot${todaysShoots.length > 1 ? 's' : ''} today — Studio 65 Briefing`
      : overdueInvoices.length > 0
        ? `💸 ${overdueInvoices.length} outstanding invoice${overdueInvoices.length > 1 ? 's' : ''} — Daily Briefing`
        : `📋 Studio 65 Daily Briefing`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: admin.email,
      from_name: 'Studio 65',
      subject,
      body: lines.join('\n'),
    });

    console.log(`Morning briefing sent to ${admin.email}. Shoots today: ${todaysShoots.length}, Invoices: ${overdueInvoices.length}`);
    return Response.json({ success: true, sent_to: admin.email });
  } catch (error) {
    console.error('morningBriefing error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});