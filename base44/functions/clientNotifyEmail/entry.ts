import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data } = await req.json();

  const msg = data;
  if (!msg) return Response.json({ skipped: 'no data' });

  // Find the client's email from Contacts
  const contacts = await base44.asServiceRole.entities.Contact.filter({ portal_password: '' });
  // Search by name
  const allContacts = await base44.asServiceRole.entities.Contact.list('name', 500);
  const clientContact = allContacts.find(c =>
    c.name?.toLowerCase() === msg.client_name?.toLowerCase() &&
    (c.types || []).includes('Client')
  );

  const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.studio65.ca'}/client-portal`;

  // Studio sent something to client — notify client
  if (msg.from === 'studio' && clientContact?.email) {
    const typeLabel = {
      script: 'a script for your review',
      approval_request: 'something that needs your approval',
      file: 'a file',
      message: 'a message',
      idea: 'an update',
    }[msg.type] || 'a message';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: clientContact.email,
      subject: `Studio 65 sent you ${typeLabel}${msg.project_name ? ` — ${msg.project_name}` : ''}`,
      body: `Hi ${msg.client_name?.split(' ')[0] || 'there'},\n\nStudio 65 has sent you ${typeLabel}${msg.project_name ? ` for "${msg.project_name}"` : ''}.\n\n${msg.title ? `Subject: ${msg.title}\n\n` : ''}${msg.body ? `${msg.body}\n\n` : ''}${msg.type === 'approval_request' || msg.type === 'script' ? '⚠️ Your approval is needed. Please log in to respond.\n\n' : ''}View it in your portal:\n${portalUrl}${clientContact.portal_password ? `?code=${clientContact.portal_password}` : ''}\n\n— Studio 65`,
      from_name: 'Studio 65',
    });

    return Response.json({ sent: 'client notified', to: clientContact.email });
  }

  // Client responded (approved/rejected/revision) — notify studio
  if (msg.from === 'client' && msg.approval_status && msg.approval_status !== 'pending') {
    const statusLabel = {
      approved: '✅ Approved',
      rejected: '✗ Rejected',
      revision_requested: '🔄 Revision Requested',
    }[msg.approval_status] || msg.approval_status;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'contact@studio65.ca',
      subject: `${msg.client_name} ${statusLabel} — ${msg.title || msg.project_name || 'a request'}`,
      body: `Client: ${msg.client_name}\nProject: ${msg.project_name || '—'}\nStatus: ${statusLabel}\n\n${msg.approval_note ? `Their note:\n"${msg.approval_note}"\n\n` : ''}Log in to view: https://app.base44.app`,
      from_name: 'Studio 65 Portal',
    });

    return Response.json({ sent: 'studio notified' });
  }

  return Response.json({ skipped: 'no matching condition' });
});