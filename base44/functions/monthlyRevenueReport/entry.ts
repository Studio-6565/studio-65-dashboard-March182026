import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const projects = await base44.asServiceRole.entities.Project.list('-date', 500);

    // Get last month's date range
    const now = new Date();
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthName = firstOfLastMonth.toLocaleString('en-CA', { month: 'long', year: 'numeric' });

    const startStr = firstOfLastMonth.toISOString().split('T')[0];
    const endStr   = lastOfLastMonth.toISOString().split('T')[0];

    const monthly = projects.filter(p =>
      !p.archived && p.date && p.date >= startStr && p.date <= endStr
    );

    const totalRevenue = monthly.reduce((s, p) => s + (p.revenue || 0), 0);
    const totalNet     = monthly.reduce((s, p) => s + (p.net || 0), 0);
    const totalCrew    = monthly.reduce((s, p) => s + (p.crew_cost || 0), 0);
    const totalRental  = monthly.reduce((s, p) => s + (p.rental_cost || 0), 0);
    const paid         = monthly.filter(p => p.paid).length;
    const avgMargin    = monthly.length > 0
      ? Math.round(monthly.reduce((s, p) => s + (p.revenue > 0 ? (p.net || 0) / p.revenue * 100 : 0), 0) / monthly.length)
      : 0;

    const projectLines = monthly.length > 0
      ? monthly.map(p => `  • ${p.name} (${p.client}) — $${p.revenue} revenue / $${p.net} net`).join('\n')
      : '  No projects this month.';

    const body = `📊 Monthly Revenue Report — ${monthName}\n\n` +
      `Projects: ${monthly.length} (${paid} paid)\n` +
      `Total Revenue: $${totalRevenue.toLocaleString()}\n` +
      `Total Net:     $${totalNet.toLocaleString()}\n` +
      `Crew Costs:    $${totalCrew.toLocaleString()}\n` +
      `Rental Costs:  $${totalRental.toLocaleString()}\n` +
      `Avg Margin:    ${avgMargin}%\n\n` +
      `Projects this month:\n${projectLines}\n\n` +
      `— Studio 65 Automated Report`;

    // Send to the admin user's registered email
    const users = await base44.asServiceRole.entities.User.list('email', 10);
    const adminUser = users.find(u => u.role === 'admin');
    const toEmail = adminUser?.email || 'studio65production@gmail.com';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject: `📊 Monthly Report — ${monthName} — Studio 65`,
      body,
      from_name: 'Studio 65',
    });

    return Response.json({ sent: true, month: monthName, projects: monthly.length, revenue: totalRevenue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});