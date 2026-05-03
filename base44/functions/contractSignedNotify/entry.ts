import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const contract = payload.data;

    if (!contract || contract.status !== 'signed') {
      return Response.json({ skipped: true });
    }

    // Bump linked project status to "In Production"
    if (contract.project_id) {
      try {
        const project = await base44.asServiceRole.entities.Project.filter({ id: contract.project_id });
        const p = project?.[0];
        if (p && p.status === 'Booked') {
          await base44.asServiceRole.entities.Project.update(contract.project_id, {
            status: 'In Production',
            activity: [
              ...(p.activity || []),
              { msg: `📝 Contract signed by ${contract.signature_name} — project moved to In Production`, ts: new Date().toISOString() }
            ],
          });
          console.log(`Project ${contract.project_id} moved to In Production`);
        }
      } catch (e) {
        console.warn('Could not update project status:', e.message);
      }
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
      body: `A contract has been signed — the project has been moved to "In Production".\n\nContract: ${contract.title}\nSigned by: ${contract.signature_name}\nContact: ${contract.contact_name || '—'}\nProject: ${contract.project_name || '—'}\nSigned at: ${new Date(contract.signed_at).toLocaleString('en-CA')}\n\nLog in to Studio 65 to view the signed contract and manage the project:\nhttps://app.studio65.ca`,
    });

    console.log(`Contract signed notification sent to ${toEmail}`);
    return Response.json({ sent: true, to: toEmail });
  } catch (error) {
    console.error('contractSignedNotify error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});