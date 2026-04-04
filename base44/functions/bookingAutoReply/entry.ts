import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    // Support both direct call and entity automation payload
    const booking = payload.booking || payload.data;

    if (!booking?.client_name) {
      return Response.json({ error: 'Missing booking data' }, { status: 400 });
    }

    // Find the client contact to get their email
    const contacts = await base44.asServiceRole.entities.Contact.filter({ name: booking.client_name });
    const contact = contacts[0];
    const email = contact?.email || booking.email;

    if (!email) {
      return Response.json({ skipped: true, reason: 'No email found for client' });
    }

    const shootDate = booking.preferred_date
      ? new Date(booking.preferred_date).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'TBD';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `Booking Request Received — ${booking.project_name || 'Your Project'}`,
      body: `Hi ${booking.client_name.split(' ')[0]},

Thanks for reaching out to Studio 65! 🎬

We've received your booking request and will review it shortly. Here's a summary of what you submitted:

📌 Project: ${booking.project_name || '—'}
🎥 Shoot Type: ${booking.shoot_type || '—'}
📅 Preferred Date: ${shootDate}
📍 Location: ${booking.location || '—'}

We'll be in touch within 1–2 business days to confirm availability and discuss next steps.

In the meantime, feel free to reply to this email if you have any questions.

Looking forward to working with you!

— Rathan
Studio 65
studio65production@gmail.com`,
    });

    return Response.json({ sent: true, to: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});