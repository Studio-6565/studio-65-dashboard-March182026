import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { type, project_name, project_id, editor_name, version, comment_body, timecode, status } = payload;

    const STUDIO_EMAIL = 'studio65production@gmail.com';

    if (type === 'new_upload') {
      // Notify studio that editor submitted a new cut
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: STUDIO_EMAIL,
        subject: `New Edit Submitted — ${project_name}`,
        body: `Hey Rathan,\n\n${editor_name} just submitted a new cut for ${project_name}.\n\nVersion: ${version || 'unspecified'}\n\nLog in to Studio 65 to review, leave comments, and approve or request revisions.\n\n— Studio 65 Automations`,
      });
    }

    if (type === 'new_comment') {
      // Find editor's email from contacts and notify them
      const contacts = await base44.asServiceRole.entities.Contact.filter({ name: editor_name });
      const editorEmail = contacts[0]?.email;

      if (editorEmail) {
        const timecodeStr = timecode ? ` at ${timecode}` : '';
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: editorEmail,
          subject: `New Feedback on ${project_name} — ${version}`,
          body: `Hi ${editor_name},\n\nStudio 65 left a comment on your edit for ${project_name} (${version})${timecodeStr}:\n\n"${comment_body}"\n\nLog into the crew portal to view and respond to all feedback.\n\n— Studio 65`,
        });
      }
    }

    if (type === 'brief_published') {
      // Find all editors assigned to this project and notify them
      const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      const project = projects[0];
      if (project) {
        const editorCrew = (project.crew || []).filter(c => c.email);
        // Also check contacts with Editor type
        const editorContacts = await base44.asServiceRole.entities.Contact.list('name', 200);
        const editors = editorContacts.filter(c => (c.types || []).includes('Editor') && c.email);
        const allEmails = [...new Set([
          ...editorCrew.map(c => c.email),
          ...editors.map(c => c.email),
        ])];
        await Promise.all(allEmails.map(email =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `📋 Brief Ready — ${project_name}`,
            body: `Hi,\n\nStudio 65 has published the edit brief for ${project_name}.\n\nLog into the portal to view director notes, script, style references, and raw footage links.\n\nPortal: ${Deno.env.get('BASE44_APP_URL') || 'https://studio65.base44.app'}/portal\n\n— Studio 65`,
          })
        ));
      }
    }

    if (type === 'status_change') {
      // Find editor's email and notify them of approval or revision request
      const contacts = await base44.asServiceRole.entities.Contact.filter({ name: editor_name });
      const editorEmail = contacts[0]?.email;

      if (editorEmail) {
        const isApproved = status === 'approved';
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: editorEmail,
          subject: isApproved
            ? `✅ Cut Approved — ${project_name} ${version}`
            : `↺ Revision Requested — ${project_name} ${version}`,
          body: isApproved
            ? `Hi ${editor_name},\n\nYour cut for ${project_name} (${version}) has been approved! 🎉\n\nCheck the portal for any final notes.\n\n— Studio 65`
            : `Hi ${editor_name},\n\nStudio 65 has requested a revision on your cut for ${project_name} (${version}).\n\nPlease log into the portal to review the feedback and submit a new version.\n\n— Studio 65`,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});