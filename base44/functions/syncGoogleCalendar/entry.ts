import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load sync state
    const syncStates = await base44.asServiceRole.entities.SyncState.list();
    const syncRecord = syncStates.length > 0 ? syncStates[0] : null;

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${syncRecord.sync_token}`;
    } else {
      url += '&timeMin=' + new Date(Date.now() - 30*24*60*60*1000).toISOString();
    }

    let res = await fetch(url, { headers: authHeader });
    if (res.status === 410) {
      url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100'
        + '&timeMin=' + new Date(Date.now() - 30*24*60*60*1000).toISOString();
      res = await fetch(url, { headers: authHeader });
    }

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
    }

    const allItems = [];
    let pageData = await res.json();
    let newSyncToken = null;

    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;
      
      const nextRes = await fetch(
        url + `&pageToken=${pageData.nextPageToken}`,
        { headers: authHeader }
      );
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    // Save sync token
    if (newSyncToken) {
      if (syncRecord) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { 
          sync_token: newSyncToken,
          last_sync: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.SyncState.create({ 
          sync_token: newSyncToken,
          last_sync: new Date().toISOString()
        });
      }
    }

    return Response.json({ 
      events: allItems.length,
      synced: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});