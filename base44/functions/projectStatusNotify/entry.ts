import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fired by entity automation when Project.status changes
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: 'missing data' });
    if (data.status === old_data.status) return Response.json({ skipped: 'status unchanged' });

    const clientName = data.client;
    if (!clientName) return Response.json({ skipped: 'no client' });

    // Find client contact with email
    const allContacts = await base44.asServiceRole.entities.Contact.list('name', 500);
    const clientContact = allContacts.find(c =>
      c.name?.toLowerCase() === clientName.toLowerCase() &&
      (c.types || []).includes('Client') &&
      c.email
    );

    if (!clientContact?.email) return Response.json({ skipped: 'no client email found' });

    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.studio65.ca';
    const portalUrl = `${appUrl}/client-portal${clientContact.portal_password ? `?code=${clientContact.portal_password}` : ''}`;

    const STATUS_MESSAGES = {
      'Booked':        { label: '📅 Booked',         msg: 'Your project has been officially booked. We\'re looking forward to working with you!' },
      'In Production': { label: '🎬 In Production',  msg: 'Your shoot is now in production. Our team is on set capturing everything.' },
      'In Edit':       { label: '✂️ In Edit',         msg: 'Your footage is now in the editing suite. We\'ll have a cut ready for your review soon.' },
      'Delivered':     { label: '✅ Delivered',       msg: 'Your final deliverables have been delivered! Check your portal to download your content.' },
      'Invoiced':      { label: '💳 Invoice Sent',    msg: 'An invoice has been issued for your project. Please check your portal for payment details.' },
    };

    const info = STATUS_MESSAGES[data.status];
    if (!info) return Response.json({ skipped: 'no message configured for status: ' + data.status });

    const firstName = clientContact.name.split(' ')[0];

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: clientContact.email,
      from_name: 'Studio 65',
      subject: `${info.label} — ${data.name}`,
      body: `Hi ${firstName},\n\n${info.msg}\n\nProject: ${data.name}\nStatus: ${data.status}\n\nView your project in your portal:\n${portalUrl}\n\nQuestions? Reply to this email or reach us at studio65production@gmail.com.\n\n— Studio 65`,
    });

    return Response.json({ sent: true, to: clientContact.email, status: data.status });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});