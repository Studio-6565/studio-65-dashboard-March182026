import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id, deliverable_names, send_survey } = await req.json();

    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // Get project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    const project = projects?.[0];
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // Get client contact
    const allContacts = await base44.asServiceRole.entities.Contact.list('name', 500);
    const clientContact = allContacts.find(c =>
      c.name?.toLowerCase() === project.client?.toLowerCase() &&
      (c.types || []).includes('Client')
    );

    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.studio65.ca'}/client-portal`;
    const deliverableList = (deliverable_names || []).join('\n• ');
    const clientFirstName = project.client?.split(' ')[0] || 'there';

    // Send email to client if we have their address
    if (clientContact?.email) {
      const emailBody = `Hi ${clientFirstName},\n\nGreat news — your deliverable${deliverable_names?.length !== 1 ? 's are' : ' is'} ready for ${project.name}!\n\n${deliverableList ? '📦 Ready for you:\n• ' + deliverableList + '\n\n' : ''}Log in to your portal to review, download, and approve:\n${portalUrl}${clientContact.portal_password ? '?code=' + clientContact.portal_password : ''}\n\nLooking forward to your feedback!\n\n— Studio 65`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: clientContact.email,
        from_name: 'Studio 65',
        subject: `✅ Your deliverables are ready — ${project.name}`,
        body: emailBody,
      });
      console.log(`Deliverable email sent to ${clientContact.email}`);
    }

    // Create inbox message for client
    await base44.asServiceRole.entities.ClientMessage.create({
      project_id: project.id,
      project_name: project.name,
      client_name: project.client,
      from: 'studio',
      type: 'message',
      title: `✅ Your deliverables are ready!`,
      body: `Your deliverable${deliverable_names?.length !== 1 ? 's are' : ' is'} ready for review and download.${deliverableList ? '\n\n• ' + deliverableList : ''}`,
      read_by_client: false,
      read_by_studio: true,
    });

    // Optionally create a satisfaction survey
    let surveyId = null;
    if (send_survey && clientContact) {
      const survey = await base44.asServiceRole.entities.ClientSurvey.create({
        project_id: project.id,
        project_name: project.name,
        client_name: project.client,
        client_email: clientContact.email || '',
        status: 'sent',
      });
      surveyId = survey.id;

      // Send survey email
      if (clientContact.email) {
        const surveyUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.studio65.ca'}/client-survey?id=${surveyId}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: clientContact.email,
          from_name: 'Studio 65',
          subject: `How did we do? — ${project.name}`,
          body: `Hi ${clientFirstName},\n\nNow that ${project.name} is wrapped up, we'd love to hear your thoughts!\n\nIt only takes 2 minutes — your feedback helps us improve:\n${surveyUrl}\n\nThank you for choosing Studio 65 🙏\n\n— Rathan, Studio 65`,
        });
        console.log(`Survey email sent to ${clientContact.email}, survey ID: ${surveyId}`);
      }
    }

    return Response.json({ success: true, surveyId, emailSent: !!clientContact?.email });
  } catch (error) {
    console.error('deliverableNotify error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});