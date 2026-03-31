import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, context } = await req.json();

    const systemPrompt = `You are "Ask Studio 65" — a smart production assistant for a video/photo production studio called Studio 65. You have full access to the studio's data and help the owner answer questions about projects, crew, finances, deliverables, rentals, and clients.

Be concise, direct, and helpful. Use bullet points and formatting when listing things. When asked to draft messages, write them ready to copy-paste.

Today's date: ${new Date().toISOString().split('T')[0]}

--- STUDIO DATA ---
${context}
--- END STUDIO DATA ---

Answer based on the data above. If something isn't in the data, say so clearly.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nUser question: ${message}`,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({ reply: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});