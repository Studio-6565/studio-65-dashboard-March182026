import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const projects = await base44.asServiceRole.entities.Project.list('-date', 500);
    const today = new Date().toISOString().split('T')[0];

    const overdue = projects.filter(p =>
      !p.archived &&
      !p.paid &&
      p.invoice_due_date &&
      p.invoice_due_date < today &&
      p.revenue > 0
    );

    if (!overdue.length) {
      return Response.json({ message: 'No overdue invoices', count: 0 });
    }

    const lines = overdue.map(p =>
      `• ${p.name} (${p.client}) — $${p.revenue} — Due: ${p.invoice_due_date}`
    ).join('\n');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'studio65production@gmail.com',
      subject: `⚠️ ${overdue.length} Overdue Invoice${overdue.length !== 1 ? 's' : ''} — Studio 65`,
      body: `You have ${overdue.length} overdue invoice${overdue.length !== 1 ? 's' : ''}:\n\n${lines}\n\nLog in to Studio 65 to follow up or mark as paid.`,
    });

    return Response.json({ sent: true, count: overdue.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});