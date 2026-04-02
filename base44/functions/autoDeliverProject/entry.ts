import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data } = await req.json();

  const project = data;
  if (!project) return Response.json({ skipped: 'no data' });

  // Check if all deliverables are done
  const deliverables = project.deliverables || [];
  if (deliverables.length === 0) return Response.json({ skipped: 'no deliverables' });

  const allDone = deliverables.every(d => d.done);
  if (!allDone) return Response.json({ skipped: 'not all done' });

  // Already delivered or invoiced — don't downgrade
  if (project.status === 'Delivered' || project.status === 'Invoiced') {
    return Response.json({ skipped: 'already delivered' });
  }

  await base44.asServiceRole.entities.Project.update(project.id, { status: 'Delivered' });

  return Response.json({ updated: true, project_id: project.id });
});