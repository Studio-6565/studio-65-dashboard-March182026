import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { task_id, user_message, thread_id, contacts = [], projects = [] } = await req.json();

    if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 });

    // Fetch task and existing thread
    const tasks = await base44.asServiceRole.entities.CaptureTask.filter({ id: task_id });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Get or create thread
    let thread = null;
    let threads = [];
    if (thread_id) {
      threads = await base44.asServiceRole.entities.ClarificationThread.filter({ id: thread_id });
      thread = threads[0];
    }
    if (!thread) {
      const existing = await base44.asServiceRole.entities.ClarificationThread.filter({ task_id });
      thread = existing[0];
    }

    const contactNames = contacts.slice(0, 40).map(c => c.name).join(', ');
    const projectNames = projects.slice(0, 20).map(p => p.name).join(', ');

    // Load learned corrections
    const corrections = thread?.learned_corrections || [];
    const correctionHint = corrections.length > 0
      ? '\nLearned corrections: ' + corrections.map(c => `"${c.heard}" → "${c.corrected_to}"`).join(', ')
      : '';

    const today = new Date().toISOString().split('T')[0];

    let aiResponse = '';
    let updatedTaskFields = {};
    let isConfirmed = false;

    if (!user_message) {
      // Opening message — AI introduces itself and asks what's wrong
      const snippet = task.transcript_snippet || task.raw_input || task.title;
      aiResponse = `I heard: "${snippet.slice(0, 200)}"\n\nI parsed this as: **${task.title}** (${task.priority || 'P2'}, ${task.type || 'task'}${task.due_date ? ', due ' + task.due_date : ''}${task.client ? ', for ' + task.client : ''}).\n\nWhat's missing or wrong?`;
    } else {
      // Check if user is confirming
      const confirmWords = ['yes', 'correct', 'right', 'that\'s it', 'perfect', 'looks good', 'confirmed', 'yep', 'ok', 'okay'];
      isConfirmed = confirmWords.some(w => user_message.toLowerCase().trim().startsWith(w) || user_message.toLowerCase().trim() === w);

      if (isConfirmed) {
        aiResponse = 'Got it — task committed. ✓';
        updatedTaskFields = { status: 'inbox', parse_flag: 'auto-parsed', confidence: 100 };
      } else {
        // AI updates the task based on user input
        const prompt = `You are helping clarify a captured task. Today is ${today}.

Known contacts: ${contactNames || 'none'}
Active projects: ${projectNames || 'none'}
${correctionHint}

Current task:
Title: ${task.title}
Priority: ${task.priority}
Type: ${task.type}
Due date: ${task.due_date || 'none'}
Client: ${task.client || 'none'}
Who asked: ${task.who_asked || 'none'}
Original transcript: "${task.transcript_snippet || task.raw_input || ''}"

User correction: "${user_message}"

Instructions:
1. Update the task fields based on the user's correction.
2. Also detect any name corrections (e.g. user says "that's Vithu not Vee-too") — extract as learned_correction.
3. Respond conversationally confirming what you updated. Be brief.
4. Ask one follow-up question only if still unclear.

Return JSON only.`;

        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              updated_fields: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  priority: { type: 'string' },
                  type: { type: 'string' },
                  due_date: { type: 'string' },
                  client: { type: 'string' },
                  who_asked: { type: 'string' },
                  effort: { type: 'string' },
                  linked_project_id: { type: 'string' },
                  linked_project_name: { type: 'string' }
                }
              },
              ai_message: { type: 'string' },
              learned_correction: {
                type: 'object',
                properties: {
                  heard: { type: 'string' },
                  corrected_to: { type: 'string' }
                }
              }
            }
          }
        });

        updatedTaskFields = res?.updated_fields || {};
        aiResponse = res?.ai_message || 'Updated. Anything else?';

        // Save learned correction
        if (res?.learned_correction?.heard && res?.learned_correction?.corrected_to) {
          const existing = corrections.find(c => c.heard === res.learned_correction.heard);
          if (existing) {
            existing.correction_count = (existing.correction_count || 1) + 1;
          } else {
            corrections.push({ ...res.learned_correction, correction_count: 1 });
          }
        }
      }

      // Apply field updates to task
      if (Object.keys(updatedTaskFields).length > 0) {
        await base44.asServiceRole.entities.CaptureTask.update(task_id, updatedTaskFields);
      }
    }

    // Build updated messages array
    const now = new Date().toISOString();
    const existingMessages = thread?.messages || [];
    const newMessages = [...existingMessages];

    if (user_message) {
      newMessages.push({ role: 'user', content: user_message, ts: now });
    }
    newMessages.push({ role: 'ai', content: aiResponse, ts: now });

    // Save or create thread
    if (thread) {
      await base44.asServiceRole.entities.ClarificationThread.update(thread.id, {
        messages: newMessages,
        resolved: isConfirmed,
        learned_corrections: corrections
      });
    } else {
      thread = await base44.asServiceRole.entities.ClarificationThread.create({
        task_id,
        messages: newMessages,
        resolved: isConfirmed,
        learned_corrections: corrections
      });
    }

    return Response.json({
      ai_message: aiResponse,
      thread_id: thread.id,
      resolved: isConfirmed,
      updated_fields: updatedTaskFields
    });

  } catch (err) {
    console.error('clarifyTask error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});