import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { action, portal_password, email, portal_type } = body;

    const base44 = createClientFromRequest(req);

    // ── CLIENT portal: login_by_code ──────────────────────────────────────────
    if (action === 'client_login_by_code') {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ portal_password });
      const clients = contacts.filter(c => !c.is_test && (c.types || []).includes('Client'));
      if (!clients.length) return Response.json({ error: 'Invalid access code' }, { status: 401 });
      const contact = clients[0];
      const data = await _loadClientData(base44, contact);
      return Response.json({ contact, ...data });
    }

    // ── CLIENT portal: check_email ────────────────────────────────────────────
    if (action === 'client_check_email') {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ email: email.toLowerCase() });
      const clients = contacts.filter(c => !c.is_test && (c.types || []).includes('Client'));
      if (!clients.length) return Response.json({ error: 'No client account found with that email. Contact Studio 65 to set up your portal.' }, { status: 404 });
      return Response.json({ contact: clients[0] });
    }

    // ── CLIENT portal: login_by_otp ───────────────────────────────────────────
    if (action === 'client_login_by_otp') {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ email: email.toLowerCase() });
      const clients = contacts.filter(c => !c.is_test && (c.types || []).includes('Client'));
      if (!clients.length) return Response.json({ error: 'No account found' }, { status: 404 });
      const contact = clients[0];
      const data = await _loadClientData(base44, contact);
      return Response.json({ contact, ...data });
    }

    // ── CREW portal: login_by_code ────────────────────────────────────────────
    if (action === 'login_by_code') {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ portal_password });
      const realContacts = contacts.filter(c => !c.is_test);
      if (!realContacts.length) return Response.json({ error: 'Invalid code' }, { status: 401 });
      const contact = realContacts[0];
      const allProjects = await base44.asServiceRole.entities.Project.list('-date', 200);
      const isEditor = (contact.types || []).includes('Editor');
      const myProjects = allProjects.filter(p => {
        if (p.is_test) return false;
        const inCrew = (p.crew || []).some(m => m.name.toLowerCase() === contact.name.toLowerCase());
        const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === contact.name.toLowerCase());
        return inCrew || inRentals || isEditor;
      });
      return Response.json({ contact, projects: myProjects });
    }

    // ── CREW portal: check_email ──────────────────────────────────────────────
    if (action === 'check_email') {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ email: email.toLowerCase() });
      const realContacts = contacts.filter(c => !c.is_test);
      if (!realContacts.length) return Response.json({ error: 'No account found with that email' }, { status: 404 });
      return Response.json({ contact: realContacts[0] });
    }

    // ── CREW portal: login_by_otp ─────────────────────────────────────────────
    if (action === 'login_by_otp') {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ email: email.toLowerCase() });
      const realContacts = contacts.filter(c => !c.is_test);
      if (!realContacts.length) return Response.json({ error: 'No account found' }, { status: 404 });
      const contact = realContacts[0];
      const allProjects = await base44.asServiceRole.entities.Project.list('-date', 200);
      const isEditor = (contact.types || []).includes('Editor');
      const myProjects = allProjects.filter(p => {
        if (p.is_test) return false;
        const inCrew = (p.crew || []).some(m => m.name.toLowerCase() === contact.name.toLowerCase());
        const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === contact.name.toLowerCase());
        return inCrew || inRentals || isEditor;
      });
      return Response.json({ contact, projects: myProjects });
    }

    // ── CLIENT portal: get_projects (used by existing crew portal too) ────────
    if (action === 'get_projects') {
      const { contact_id } = body;
      const contacts = await base44.asServiceRole.entities.Contact.filter({ id: contact_id });
      if (!contacts.length) return Response.json({ error: 'Contact not found' }, { status: 404 });
      const contact = contacts[0];
      const isClient = (contact.types || []).includes('Client');
      if (isClient) {
        const data = await _loadClientData(base44, contact);
        return Response.json({ projects: data.projects });
      }
      const allProjects = await base44.asServiceRole.entities.Project.list('-date', 200);
      const myProjects = allProjects.filter(p => {
        if (p.is_test) return false;
        return (p.crew || []).some(m => m.name.toLowerCase() === contact.name.toLowerCase()) ||
               (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === contact.name.toLowerCase());
      });
      return Response.json({ projects: myProjects });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal auth error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
});

// ── Helper: load all client-scoped data ──────────────────────────────────────
async function _loadClientData(base44, contact) {
  const clientName = contact.name.toLowerCase();
  const [allProjects, messages, contracts] = await Promise.all([
    base44.asServiceRole.entities.Project.list('-date', 200),
    base44.asServiceRole.entities.ClientMessage.filter({ client_name: contact.name }),
    base44.asServiceRole.entities.Contract.filter({ contact_name: contact.name }),
  ]);

  const projects = allProjects.filter(p => {
    if (p.is_test || p.archived) return false;
    return (p.client || '').toLowerCase() === clientName ||
           (p.client_email || '').toLowerCase() === (contact.email || '').toLowerCase();
  });

  // Strip internal financials from projects before sending to client
  const safeProjects = projects.map(p => ({
    id: p.id,
    project_id: p.project_id,
    name: p.name,
    client: p.client,
    status: p.status,
    date: p.date,
    end_date: p.end_date,
    extra_dates: p.extra_dates,
    start_time: p.start_time,
    end_time: p.end_time,
    address: p.address,
    poc_name: p.poc_name,
    poc_phone: p.poc_phone,
    deliverables: p.deliverables,
    invoice_status: p.invoice_status,
    invoice_date: p.invoice_date,
    invoice_due_date: p.invoice_due_date,
    invoice_number: p.invoice_number,
    revenue: p.revenue, // client needs to know what they owe
    paid: p.paid,
    notes: p.notes,
    created_date: p.created_date,
    updated_date: p.updated_date,
    // DO NOT include: crew, crew_cost, rental_cost, rentals, net, expenses, hours, activity
  }));

  const sortedMessages = messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return { projects: safeProjects, messages: sortedMessages, contracts };
}