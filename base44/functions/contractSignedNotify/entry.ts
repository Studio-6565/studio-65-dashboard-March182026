import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const contract = payload.data;

    if (!contract || contract.status !== 'signed') {
      return Response.json({ skipped: true });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'studio65production@gmail.com',
      subject: `✍️ Contract Signed: ${contract.title}`,
      body: `A contract has been signed.\n\nContract: ${contract.title}\nSigned by: ${contract.signature_name}\nContact: ${contract.contact_name || '—'}\nProject: ${contract.project_name || '—'}\nSigned at: ${new Date(contract.signed_at).toLocaleString('en-CA')}\n\nLog in to Studio 65 to view the signed contract.`,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});