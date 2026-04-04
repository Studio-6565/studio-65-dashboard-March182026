import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { action, portal_password, email } = body;

    const base44 = createClientFromRequest(req);

    if (action === 'login_by_code') {
      try {
        const contacts = await base44.asServiceRole.entities.Contact.filter({ portal_password });
        if (!contacts.length) {
          return Response.json({ error: 'Invalid code' }, { status: 401 });
        }
        const contact = contacts[0];
        const allProjects = await base44.asServiceRole.entities.Project.list('-date', 200);
        const isEditor = (contact.types || []).includes('Editor');
        const myProjects = allProjects.filter(p => {
          const inCrew = (p.crew || []).some(m => m.name.toLowerCase() === contact.name.toLowerCase());
          const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === contact.name.toLowerCase());
          return inCrew || inRentals || isEditor;
        });
        return Response.json({ contact, projects: myProjects });
      } catch (err) {
        console.error('Code login error:', err.message);
        return Response.json({ error: 'Invalid code' }, { status: 401 });
      }
    }

    if (action === 'check_email') {
      try {
        const contacts = await base44.asServiceRole.entities.Contact.filter({ email: email.toLowerCase() });
        if (!contacts.length) {
          return Response.json({ error: 'No account found with that email' }, { status: 404 });
        }
        return Response.json({ contact: contacts[0] });
      } catch (err) {
        console.error('Email check error:', err.message);
        return Response.json({ error: 'No account found with that email' }, { status: 404 });
      }
    }

    if (action === 'login_by_otp') {
      try {
        const contacts = await base44.asServiceRole.entities.Contact.filter({ email: email.toLowerCase() });
        if (!contacts.length) {
          return Response.json({ error: 'No account found' }, { status: 404 });
        }
        const contact = contacts[0];
        const allProjects = await base44.asServiceRole.entities.Project.list('-date', 200);
        const isEditor = (contact.types || []).includes('Editor');
        const myProjects = allProjects.filter(p => {
          const inCrew = (p.crew || []).some(m => m.name.toLowerCase() === contact.name.toLowerCase());
          const inRentals = (p.rentals || []).some(r => (r.vendor || '').toLowerCase() === contact.name.toLowerCase());
          return inCrew || inRentals || isEditor;
        });
        return Response.json({ contact, projects: myProjects });
      } catch (err) {
        console.error('OTP login error:', err.message);
        return Response.json({ error: 'Login failed' }, { status: 500 });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Portal auth error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
});