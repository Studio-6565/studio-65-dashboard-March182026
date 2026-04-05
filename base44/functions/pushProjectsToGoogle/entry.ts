import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Get all active projects
    const projects = await base44.asServiceRole.entities.Project.filter({ archived: false });

    let created = 0;
    let updated = 0;

    for (const project of projects) {
      if (!project.date) continue;

      const startTime = project.start_time || '09:00';
      const [startHour, startMin] = startTime.split(':').map(Number);
      const start = new Date(project.date);
      start.setHours(startHour, startMin, 0);

      const endTime = project.end_time || '17:00';
      const [endHour, endMin] = endTime.split(':').map(Number);
      const end = new Date(project.date);
      end.setHours(endHour, endMin, 0);

      const event = {
        summary: project.name,
        description: `Client: ${project.client}\n${project.address || ''}\nProject Status: ${project.status}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        extendedProperties: {
          private: {
            projectId: project.id
          }
        }
      };

      // Check if event already exists
      const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(project.id)}&privateExtendedProperty=projectId=${project.id}`;
      const searchRes = await fetch(searchUrl, { headers: authHeader });
      const searchData = await searchRes.json();
      const existing = searchData.items?.[0];

      if (existing) {
        // Update existing event
        const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.id}`;
        const updateRes = await fetch(updateUrl, {
          method: 'PUT',
          headers: authHeader,
          body: JSON.stringify(event)
        });
        if (updateRes.ok) updated++;
      } else {
        // Create new event
        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(event)
        });
        if (createRes.ok) created++;
      }
    }

    return Response.json({ 
      created,
      updated,
      total: projects.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});