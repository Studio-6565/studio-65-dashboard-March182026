import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const contract = payload.data;

    if (!contract || contract.status !== 'signed') {
      return Response.json({ skipped: true });
    }

    // Get admin user email for studio notification
    const users = await base44.asServiceRole.entities.User.list('email', 10);
    const adminUser = users.find(u => u.role === 'admin');
    const toEmail = adminUser?.email;

    if (!toEmail) return Response.json({ skipped: true, reason: 'No admin user found' });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      from_name: 'Studio 65',
      subject: `✍️ Contract Signed: ${contract.title}`,
      body: `A contract has been signed.\n\nContract: ${contract.title}\nSigned by: ${contract.signature_name}\nContact: ${contract.contact_name || '—'}\nProject: ${contract.project_name || '—'}\nSigned at: ${new Date(contract.signed_at).toLocaleString('en-CA')}\n\nLog in to Studio 65 to view the signed contract:\nhttps://app.studio65.ca`,
    });

    return Response.json({ sent: true, to: toEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});