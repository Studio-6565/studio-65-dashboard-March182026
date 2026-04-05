import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data, event } = body;

    if (!data && !event) return Response.json({ skipped: true });

    const p = data;
    const projectId = event?.entity_id;

    // Check all conditions:
    // 1. Client has paid (paid === true)
    // 2. All crew members are paid
    // 3. All rentals are paid
    // 4. All deliverables are done
    const clientPaid = p.paid === true;
    const crewAllPaid = (p.crew || []).length === 0 || (p.crew || []).every(c => c.paid === true);
    const rentalsAllPaid = (p.rentals || []).length === 0 || (p.rentals || []).every(r => r.paid === true);
    const deliverablesAllDone = (p.deliverables || []).length > 0 && (p.deliverables || []).every(d => d.done === true);

    if (clientPaid && crewAllPaid && rentalsAllPaid && deliverablesAllDone && !p.archived) {
      const id = projectId || p.id;
      const activity = [...(p.activity || []), { msg: 'Auto-archived: all requirements met', ts: new Date().toISOString() }];
      await base44.asServiceRole.entities.Project.update(id, { archived: true, activity });
      console.log(`Auto-archived project: ${p.name} (${p.id})`);
      return Response.json({ archived: true, project: p.name });
    }

    return Response.json({ skipped: true, reason: 'Conditions not fully met' });
  } catch (error) {
    console.error('Auto-archive error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});