import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { audio_url, voice_capture_id, contacts = [], projects = [] } = body;

    if (!audio_url) return Response.json({ error: 'audio_url required' }, { status: 400 });

    // Build custom vocabulary hint for Whisper prompt
    const contactNames = contacts.slice(0, 40).map(c => c.name).join(', ');
    const projectNames = projects.slice(0, 20).map(p => p.name).join(', ');
    const vocabHint = [contactNames, projectNames].filter(Boolean).join(', ');

    // Step 1: Transcribe with Whisper
    console.log('Transcribing audio:', audio_url);
    let transcript = '';
    try {
      transcript = await base44.integrations.Core.TranscribeAudio({ audio_url });
    } catch (err) {
      console.error('Transcription failed:', err.message);
      await base44.asServiceRole.entities.VoiceCapture.update(voice_capture_id, {
        status: 'failed',
        parse_error: 'Transcription failed: ' + err.message
      });
      return Response.json({ error: 'Transcription failed' }, { status: 500 });
    }
    console.log('Transcript:', transcript);

    // Update VoiceCapture with transcript
    if (voice_capture_id && voice_capture_id !== 'null') {
      await base44.asServiceRole.entities.VoiceCapture.update(voice_capture_id, { transcript });
    }

    const today = new Date().toISOString().split('T')[0];

    // Step 2: Parse transcript into tasks/notes
    const parsePrompt = `You are a task parser for a video production studio owner.

Today is ${today}.

Known contacts: ${contactNames || 'none'}
Active projects: ${projectNames || 'none'}
Custom vocabulary: ${vocabHint || 'none'}

Transcript: "${transcript}"

INSTRUCTIONS:
1. Extract ALL distinct action items and notes from this transcript.
2. One voice note can produce multiple tasks.
3. For each item, classify as "task" or "note":
   - task: contains imperative verbs, actionable items, deadlines, reminders
   - note: thinking out loud, observations, no clear action required
4. For each task, fill all fields including a confidence score 0-100.
5. Also check: does this reference an existing task? If so, set is_update=true and describe what to update in update_instruction.
6. If there are absolutely no action items, return one note with the full transcript.

For each task, confidence scoring:
- 90+: clear who, what, when, why
- 70-89: most fields clear, some inference
- 40-69: action clear but missing key context (who? when?)
- <40: very unclear, barely parseable

Return JSON only.`;

    const parsed = await base44.integrations.Core.InvokeLLM({
      prompt: parsePrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_type: { type: 'string' }, // "task" or "note"
                title: { type: 'string' },
                transcript_snippet: { type: 'string' },
                who_asked: { type: 'string' },
                who_asked_contact_id: { type: 'string' },
                client: { type: 'string' },
                client_contact_id: { type: 'string' },
                linked_project_id: { type: 'string' },
                linked_project_name: { type: 'string' },
                type: { type: 'string' },
                effort: { type: 'string' },
                due_date: { type: 'string' },
                priority: { type: 'string' },
                confidence: { type: 'number' },
                is_update: { type: 'boolean' },
                update_instruction: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const items = parsed?.items || [];
    console.log('Parsed items:', items.length);

    let taskCount = 0;
    let needsInputCount = 0;
    let noteCount = 0;
    const createdTaskIds = [];

    for (const item of items) {
      if (item.item_type === 'note') {
        // Save as a note-type task
        await base44.asServiceRole.entities.CaptureTask.create({
          title: item.title || 'Voice note',
          raw_input: transcript,
          transcript,
          transcript_snippet: item.transcript_snippet,
          audio_url,
          type: 'note',
          client: item.client,
          linked_project_id: item.linked_project_id,
          linked_project_name: item.linked_project_name,
          status: 'inbox',
          confidence: item.confidence || 50,
          parse_source: 'voice',
          parse_flag: 'auto-parsed',
          voice_capture_id
        });
        noteCount++;
        continue;
      }

      // It's a task — determine confidence-based routing
      const confidence = item.confidence || 50;
      let status = 'inbox';
      let parse_flag = 'auto-parsed';

      if (confidence >= 70) {
        status = 'inbox';
        parse_flag = 'auto-parsed';
      } else if (confidence >= 40) {
        status = 'inbox';
        parse_flag = 'review';
      } else {
        status = 'needs_input';
        parse_flag = 'needs_input';
        needsInputCount++;
      }

      const created = await base44.asServiceRole.entities.CaptureTask.create({
        title: item.title || 'Untitled task',
        raw_input: transcript,
        transcript,
        transcript_snippet: item.transcript_snippet,
        audio_url,
        who_asked: item.who_asked,
        who_asked_contact_id: item.who_asked_contact_id,
        client: item.client,
        client_contact_id: item.client_contact_id,
        linked_project_id: item.linked_project_id,
        linked_project_name: item.linked_project_name,
        type: item.type || 'admin',
        effort: item.effort,
        due_date: item.due_date,
        priority: item.priority || 'P2',
        status,
        confidence,
        parse_source: 'voice',
        parse_flag,
        voice_capture_id
      });
      createdTaskIds.push(created.id);
      taskCount++;
    }

    // If nothing at all was parsed, save transcript as unparsed note
    if (items.length === 0 && transcript) {
      await base44.asServiceRole.entities.CaptureTask.create({
        title: 'Voice note (unparsed): ' + transcript.slice(0, 80),
        raw_input: transcript,
        transcript,
        audio_url,
        type: 'note',
        status: 'needs_input',
        confidence: 0,
        parse_source: 'voice',
        parse_flag: 'unparsed',
        voice_capture_id
      });
      needsInputCount++;
    }

    // Update VoiceCapture record
    if (voice_capture_id && voice_capture_id !== 'null') {
      await base44.asServiceRole.entities.VoiceCapture.update(voice_capture_id, {
        status: 'parsed',
        transcript,
        task_count: taskCount,
        needs_input_count: needsInputCount,
        note_count: noteCount
      });
    }

    return Response.json({
      success: true,
      transcript,
      task_count: taskCount,
      needs_input_count: needsInputCount,
      note_count: noteCount,
      task_ids: createdTaskIds
    });

  } catch (err) {
    console.error('voiceCapture error:', err.message, err.stack);
    return Response.json({ error: err.message }, { status: 500 });
  }
});