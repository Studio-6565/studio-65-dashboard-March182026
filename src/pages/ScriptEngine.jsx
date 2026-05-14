import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import ScriptScheduleModal from '@/components/script-engine/ScriptScheduleModal';
import ScriptVersionHistory from '@/components/script-engine/ScriptVersionHistory';
import AngleCard from '@/components/script-engine/AngleCard';
import FullScriptView from '@/components/script-engine/FullScriptView';
import WhyThisScript from '@/components/script-engine/WhyThisScript';
import PerformanceLogger from '@/components/script-engine/PerformanceLogger';
import { Sparkles, Loader2, Brain, ChevronRight, RotateCcw, BarChart2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Twitter/X'];
const DURATIONS = ['15s', '30s', '60s', '90s', '2-3 min', '5+ min'];

const IS = {
  width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 8,
  padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
  fontFamily: 'Syne, sans-serif', boxSizing: 'border-box',
};
const LS = {
  fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase',
  letterSpacing: '0.08em', display: 'block', marginBottom: 6,
};

function ChipGroup({ options, value, onChange, color = '#E81A1A' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: MONO,
            border: active ? `1px solid ${color}50` : '1px solid #1E1E1E',
            background: active ? `${color}14` : 'transparent',
            color: active ? color : '#555', transition: 'all 0.15s',
          }}>{opt}</button>
        );
      })}
    </div>
  );
}

// Step indicator
function StepBadge({ num, label, active, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, fontFamily: MONO, flexShrink: 0,
        background: done ? '#7BC853' : active ? '#E81A1A' : '#1A1A1A',
        color: done || active ? '#fff' : '#444',
        border: `1px solid ${done ? '#7BC853' : active ? '#E81A1A' : '#222'}`,
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{ fontFamily: MONO, fontSize: 10, color: active ? '#fff' : done ? '#7BC853' : '#444', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export default function ScriptEngine() {
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);

  // Step 1 — Client & config
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [duration, setDuration] = useState('60s');
  const [additionalContext, setAdditionalContext] = useState('');

  // Step 2 — Signals
  const [signals, setSignals] = useState(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [pastedLinks, setPastedLinks] = useState('');

  // Step 3 — Angles
  const [angles, setAngles] = useState([]);
  const [anglesLoading, setAnglesLoading] = useState(false);
  const [selectedAngleIdx, setSelectedAngleIdx] = useState(null);

  // Step 4 — Script
  const [scriptData, setScriptData] = useState(null); // structured script
  const [scriptLoading, setScriptLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [scheduleModal, setScheduleModal] = useState(null);

  // Step 5 — Performance
  const [showPerformanceLogger, setShowPerformanceLogger] = useState(false);

  // UI
  const [step, setStep] = useState(1);

  const selectedClient = contacts.find(c => c.id === selectedClientId);
  const brain = selectedClient?.client_brain || {};

  useEffect(() => {
    Promise.all([
      base44.entities.Contact.filter({ types: { $in: ['Client'] } }, 'name', 100),
      base44.entities.Project.list('-date', 100),
    ]).then(([cs, ps]) => {
      setContacts(cs.filter(c => (c.types || []).includes('Client')));
      setProjects(ps.filter(p => !p.archived && !p.is_test));
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) { setVersions([]); return; }
    base44.entities.ScriptVersion.filter({ project_id: selectedProjectId }, '-version_number', 20)
      .then(vs => setVersions(vs));
  }, [selectedProjectId]);

  // ── STEP 2: Gather signals ──────────────────────────────────────
  const handleGatherSignals = async () => {
    if (!selectedClientId) { showToast('Pick a client first', 'red'); return; }
    setSignalsLoading(true);
    setSignals(null);

    const competitorHandles = (brain.competitors || []).map(c => c.handle || c.name).filter(Boolean).join(', ');
    const pillars = (brain.content_pillars || []).map(p => p.name).join(', ');
    const painPoints = brain.audience?.pain_points || '';
    const topPosts = brain.performance_memory?.top_posts || '';
    const recentHooks = (brain.performance_memory?.winning_hooks || []).join(', ');

    const [trendRes, competitorRes] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: `Search for trending content in the vertical: "${selectedClient?.client_project_type || selectedClient?.name || 'general business'}" on ${platform} in the last 7 days.
        The client's content pillars are: ${pillars || 'general'}.
        Return ONLY trends relevant to these pillars. Focus on what's getting traction right now.
        Client brand: ${selectedClient?.name}`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            trending_topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, relevance: { type: 'string' }, pillar_match: { type: 'string' } } } },
            trending_formats: { type: 'array', items: { type: 'string' } },
            trending_hooks: { type: 'array', items: { type: 'string' } },
          }
        }
      }),
      competitorHandles ? base44.integrations.Core.InvokeLLM({
        prompt: `Search for top-performing posts from these competitor accounts in the last 30 days: ${competitorHandles}.
        Platform: ${platform}. What hooks, formats, and topics are getting the most engagement?
        ${pastedLinks ? `Also analyze these links the user provided: ${pastedLinks}` : ''}`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            top_performing_hooks: { type: 'array', items: { type: 'string' } },
            top_performing_formats: { type: 'array', items: { type: 'string' } },
            content_gaps: { type: 'array', items: { type: 'string' } },
          }
        }
      }) : Promise.resolve({ top_performing_hooks: [], top_performing_formats: [], content_gaps: [] }),
    ]);

    // Surface unaddressed pain points
    const recentPostsText = topPosts?.slice(0, 2000) || '';
    const painPointsArray = painPoints.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
    const addressedPainPoints = painPointsArray.filter(pp =>
      recentPostsText.toLowerCase().includes(pp.toLowerCase().split(' ')[0])
    );
    const unaddressedPainPoints = painPointsArray.filter(pp => !addressedPainPoints.includes(pp));

    setSignals({
      trends: trendRes,
      competitors: competitorRes,
      recent_hooks: recentHooks ? recentHooks.split(',').map(h => h.trim()).filter(Boolean) : [],
      unaddressed_pain_points: unaddressedPainPoints,
    });

    setSignalsLoading(false);
    setStep(3);
    showToast('Signals gathered — generating angles', 'green');

    // Auto-proceed to angle generation
    handleGenerateAngles({
      trends: trendRes,
      competitors: competitorRes,
      recent_hooks: recentHooks ? recentHooks.split(',').map(h => h.trim()).filter(Boolean) : [],
      unaddressed_pain_points: unaddressedPainPoints,
    });
  };

  // ── STEP 3: Generate angles ──────────────────────────────────────
  const handleGenerateAngles = async (signalsData) => {
    setAnglesLoading(true);
    setAngles([]);
    const s = signalsData || signals;
    const b = brain;

    const brainSummary = `
CLIENT BRAIN for ${selectedClient?.name}:
- Voice: ${b.identity?.brand_voice_adjectives || 'not set'}
- Tone DOs: ${b.identity?.tone_dos || 'not set'}
- Tone DON'Ts: ${b.identity?.tone_donts || 'not set'}
- Banned words: ${b.identity?.banned_words || 'none'}
- Audience: ${b.audience?.primary_demo || 'not set'}
- Pain points: ${b.audience?.pain_points || 'not set'}
- Desires: ${b.audience?.desires || 'not set'}
- Content pillars: ${(b.content_pillars || []).map(p => p.name).join(', ') || 'not set'}
- Winning hooks: ${(b.performance_memory?.winning_hooks || []).join(', ') || 'none logged yet'}
- Winning formats: ${(b.performance_memory?.winning_formats || []).join(', ') || 'none logged yet'}
- Offer stack: ${(b.offer_stack || []).map(o => o.product_name).join(', ') || 'not set'}
- Compliance: ${b.compliance?.required_disclaimers || 'none'}
    `.trim();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class social media strategist. Generate exactly 5 distinct script angles for ${selectedClient?.name} on ${platform} (${duration}).

${brainSummary}

SIGNAL INTELLIGENCE:
- Trending topics (last 7 days): ${JSON.stringify(s?.trends?.trending_topics?.slice(0, 5) || [])}
- Trending formats: ${(s?.trends?.trending_formats || []).join(', ')}
- Competitor winning hooks: ${(s?.competitors?.top_performing_hooks || []).join(', ')}
- Unaddressed pain points: ${(s?.unaddressed_pain_points || []).join(', ')}

${additionalContext ? `Additional brief: ${additionalContext}` : ''}

For each angle, SPECIFICALLY reference which brain element makes it right for this client.
Produce diverse angle types: pain-point, contrarian, educational, trend-tie-in, story.`,
      response_json_schema: {
        type: 'object',
        properties: {
          angles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                hook: { type: 'string', description: 'First 3 seconds, written out verbatim' },
                angle_type: { type: 'string', enum: ['pain-point', 'contrarian', 'educational', 'trend-tie-in', 'story'] },
                why_this_client: { type: 'string', description: 'Reference specific brain elements' },
                predicted_driver: { type: 'string', enum: ['saves', 'shares', 'comments', 'watch-time'] },
                predicted_driver_reason: { type: 'string' },
                risk_flags: { type: 'array', items: { type: 'string' } },
                brain_elements_used: { type: 'array', items: { type: 'string' }, description: 'Which brain fields were referenced' },
              }
            }
          }
        }
      }
    });

    setAngles(result?.angles || []);
    setAnglesLoading(false);
  };

  // ── STEP 4: Generate full script ──────────────────────────────────
  const handleGenerateScript = async (angleIdx) => {
    const angle = angles[angleIdx];
    if (!angle) return;
    setScriptLoading(true);
    setScriptData(null);

    const b = brain;
    const offers = (b.offer_stack || []).map(o => `${o.product_name}: ${o.positioning_angle || o.description}`).join('\n');
    const disclaimers = b.compliance?.required_disclaimers || '';
    const bannedWords = b.identity?.banned_words || '';
    const toneDos = b.identity?.tone_dos || '';
    const toneDonts = b.identity?.tone_donts || '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a complete, production-ready ${platform} video script for ${selectedClient?.name}.

CHOSEN ANGLE:
Hook: "${angle.hook}"
Type: ${angle.angle_type}
Why it works: ${angle.why_this_client}

BRAND CONSTRAINTS:
- Tone DOs: ${toneDos}
- Tone DON'Ts: ${toneDonts}
- Banned words: ${bannedWords}
- Required disclaimers: ${disclaimers}

OFFER STACK (CTA must align to one of these):
${offers || 'No offers defined'}

Duration: ${duration}
Platform: ${platform}

Generate a structured script with distinct timed beats. Each beat should have a type (hook/body/cta), duration, spoken words, b-roll cues, and on-screen text.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          hook_text: { type: 'string', description: 'Verbatim first 3 seconds' },
          beats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                beat_type: { type: 'string', enum: ['hook', 'body', 'transition', 'cta'] },
                timing: { type: 'string', description: 'e.g. 0:00-0:03' },
                spoken: { type: 'string' },
                broll: { type: 'string' },
                on_screen_text: { type: 'string' },
                director_note: { type: 'string' },
              }
            }
          },
          caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' }, description: 'Exactly 5 hashtags' },
          cta_offer: { type: 'string', description: 'Which offer from the stack this CTA points to' },
          why_panel: {
            type: 'object',
            properties: {
              identity_used: { type: 'string' },
              audience_insight: { type: 'string' },
              pillar_used: { type: 'string' },
              performance_insight: { type: 'string' },
              offer_used: { type: 'string' },
            }
          }
        }
      }
    });

    setScriptData({ ...result, angle, angle_idx: angleIdx });
    setStep(4);

    // Save as version
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      const nextNumber = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;
      await Promise.all(versions.filter(v => v.is_active).map(v =>
        base44.entities.ScriptVersion.update(v.id, { is_active: false })
      ));
      const scriptText = result.beats?.map(b =>
        `[${b.timing}] ${b.beat_type.toUpperCase()}\n${b.spoken}\n[B-ROLL: ${b.broll || '—'}]\n[ON SCREEN: ${b.on_screen_text || '—'}]`
      ).join('\n\n');
      const newVersion = await base44.entities.ScriptVersion.create({
        project_id: selectedProjectId,
        project_name: project?.name || '',
        version_number: nextNumber,
        script_content: scriptText,
        platform,
        label: `v${nextNumber} — ${angle.angle_type}`,
        is_active: true,
        selected_ideas: JSON.stringify([angle.hook]),
      });
      setVersions(prev => [newVersion, ...prev.map(v => ({ ...v, is_active: false }))]);
      showToast(`Script v${nextNumber} saved`, 'green');
    }

    setScriptLoading(false);
  };

  // ── STEP 5: Log performance ──────────────────────────────────────
  const handleLogPerformance = async (stats) => {
    if (!selectedClientId) return;
    const b = selectedClient.client_brain || {};
    const pm = b.performance_memory || {};

    // Update winning hooks & formats
    const newHooks = [...(pm.winning_hooks || [])];
    const newFormats = [...(pm.winning_formats || [])];
    if (stats.views > 5000 && scriptData?.hook_text) {
      if (!newHooks.includes(scriptData.hook_text)) newHooks.unshift(scriptData.hook_text);
    }
    if (stats.saves > 100 || stats.shares > 50) {
      const fmt = `${scriptData?.angle?.angle_type} ${platform} ${duration}`;
      if (!newFormats.includes(fmt)) newFormats.unshift(fmt);
    }

    const postEntry = `[${new Date().toLocaleDateString()}] ${scriptData?.title || 'Script'} — ${stats.views?.toLocaleString()} views, ${stats.saves} saves, ${stats.shares} shares, ${stats.comments} comments`;
    const updatedPm = {
      ...pm,
      winning_hooks: newHooks.slice(0, 20),
      winning_formats: newFormats.slice(0, 20),
      top_posts: postEntry + '\n' + (pm.top_posts || '').split('\n').slice(0, 9).join('\n'),
    };

    await base44.entities.Contact.update(selectedClientId, {
      client_brain: { ...b, performance_memory: updatedPm }
    });
    setContacts(prev => prev.map(c => c.id === selectedClientId
      ? { ...c, client_brain: { ...b, performance_memory: updatedPm } }
      : c
    ));
    setShowPerformanceLogger(false);
    showToast('Performance logged & brain updated 🧠', 'green');
  };

  const handleBeatRegenerate = async (beatIdx) => {
    if (!scriptData) return;
    const beat = scriptData.beats[beatIdx];
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Rewrite only this single beat of a ${platform} video script for ${selectedClient?.name}.
      
Beat type: ${beat.beat_type}
Timing: ${beat.timing}
Current version: "${beat.spoken}"

Context: The overall hook is "${scriptData.hook_text}". Tone: ${brain.identity?.tone_dos || 'engaging'}.
Write a fresh version that's more punchy and on-brand. Keep the same timing.`,
      response_json_schema: {
        type: 'object',
        properties: {
          spoken: { type: 'string' },
          broll: { type: 'string' },
          on_screen_text: { type: 'string' },
          director_note: { type: 'string' },
        }
      }
    });

    const newBeats = [...scriptData.beats];
    newBeats[beatIdx] = { ...newBeats[beatIdx], ...result };
    setScriptData(prev => ({ ...prev, beats: newBeats }));
    showToast('Beat regenerated', 'blue');
  };

  const clientsWithBrain = contacts.filter(c => c.client_brain && (
    c.client_brain.identity?.brand_voice_adjectives ||
    c.client_brain.audience?.pain_points ||
    (c.client_brain.content_pillars || []).length > 0
  ));

  const stepsDone = {
    1: !!selectedClientId,
    2: !!signals,
    3: angles.length > 0,
    4: !!scriptData,
  };

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff', maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Brain size={20} color="#A78BFA" />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Script Engine</div>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 4, padding: '3px 7px' }}>Brain-Powered</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Client Brain → Signal Gathering → Angle Selection → Script → Performance Logging</div>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
        {[
          [1, 'Client & Config'],
          [2, 'Signals'],
          [3, 'Pick Angle'],
          [4, 'Script'],
          [5, 'Log Performance'],
        ].map(([num, label]) => (
          <React.Fragment key={num}>
            <StepBadge num={num} label={label} active={step === num} done={stepsDone[num] && step > num} />
            {num < 5 && <ChevronRight size={14} color="#222" style={{ flexShrink: 0, alignSelf: 'center' }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: scriptData ? '380px 1fr' : '1fr', gap: 20 }}>

        {/* LEFT PANEL — Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* STEP 1 — Client + Config */}
          <div style={{ background: '#0A0A0A', border: `1px solid ${stepsDone[1] ? 'rgba(167,139,250,0.2)' : '#141414'}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: stepsDone[1] ? '#A78BFA' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>1</div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#888', fontWeight: 700 }}>CLIENT & CONFIG</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Client (with Brain)</label>
              <select style={IS} value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setSignals(null); setAngles([]); setScriptData(null); setStep(1); }}>
                <option value="">— Select client —</option>
                {clientsWithBrain.map(c => <option key={c.id} value={c.id}>🧠 {c.name}</option>)}
                {contacts.filter(c => !clientsWithBrain.find(cb => cb.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {selectedClient && (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA', marginBottom: 6 }}>BRAIN LOADED</div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.7 }}>
                  {brain.identity?.brand_voice_adjectives && <div>🎯 Voice: {brain.identity.brand_voice_adjectives}</div>}
                  {(brain.content_pillars || []).length > 0 && <div>📌 {brain.content_pillars.length} content pillars</div>}
                  {(brain.offer_stack || []).length > 0 && <div>💼 {brain.offer_stack.length} offers in stack</div>}
                  {(brain.competitors || []).length > 0 && <div>🏁 {brain.competitors.length} competitors tracked</div>}
                  {!(brain.identity?.brand_voice_adjectives) && <div style={{ color: '#555' }}>⚠️ Brain is sparse — open client brain to fill it in</div>}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Link to Project (optional)</label>
              <select style={IS} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                <option value="">— No project —</option>
                {projects.filter(p => !selectedClientId || p.client?.toLowerCase() === selectedClient?.name?.toLowerCase()).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {selectedClientId && <option disabled>─ Other projects ─</option>}
                {selectedClientId && projects.filter(p => p.client?.toLowerCase() !== selectedClient?.name?.toLowerCase()).map(p => <option key={p.id} value={p.id}>{p.name} · {p.client}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Platform</label>
              <ChipGroup options={PLATFORMS} value={platform} onChange={setPlatform} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Duration</label>
              <ChipGroup options={DURATIONS} value={duration} onChange={setDuration} color="#F59E0B" />
            </div>
            <div>
              <label style={LS}>Additional Brief / One-off context</label>
              <textarea style={{ ...IS, resize: 'none' }} rows={3} value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Specific campaign, product launch, event..." />
            </div>
          </div>

          {/* STEP 2 — Signals */}
          <div style={{ background: '#0A0A0A', border: `1px solid ${stepsDone[2] ? 'rgba(74,158,255,0.2)' : '#141414'}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: stepsDone[2] ? '#4A9EFF' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>2</div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#888', fontWeight: 700 }}>SIGNAL GATHERING</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Paste competitor post links (optional)</label>
              <textarea style={{ ...IS, resize: 'none', fontSize: 11 }} rows={2} value={pastedLinks} onChange={e => setPastedLinks(e.target.value)} placeholder="Paste URLs to competitor posts for analysis..." />
            </div>

            <button
              onClick={handleGatherSignals}
              disabled={!selectedClientId || signalsLoading}
              style={{
                width: '100%', padding: '12px 0',
                background: signalsLoading ? '#111' : 'rgba(74,158,255,0.12)',
                border: `1px solid ${signalsLoading ? '#1A1A1A' : 'rgba(74,158,255,0.3)'}`,
                borderRadius: 10, color: signalsLoading ? '#444' : '#4A9EFF',
                fontSize: 12, fontWeight: 700, cursor: selectedClientId && !signalsLoading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: MONO,
                opacity: !selectedClientId ? 0.4 : 1,
              }}
            >
              {signalsLoading
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Gathering signals + generating angles…</>
                : '⚡ Gather Signals & Generate Angles'
              }
            </button>

            {signals && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#4A9EFF', marginBottom: 8 }}>SIGNALS GATHERED</div>
                {(signals.trends?.trending_topics || []).slice(0, 3).map((t, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#555', padding: '4px 0', borderBottom: '1px solid #111' }}>
                    📈 {t.topic} <span style={{ color: '#333' }}>— {t.pillar_match}</span>
                  </div>
                ))}
                {signals.unaddressed_pain_points?.length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(232,26,26,0.06)', borderRadius: 8, fontSize: 11, color: '#E81A1A' }}>
                    💡 {signals.unaddressed_pain_points.length} unaddressed pain point(s) surfaced
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Version history */}
          {versions.length > 0 && (
            <ScriptVersionHistory
              projectId={selectedProjectId}
              versions={versions}
              onVersionsChange={setVersions}
              onRevertToVersion={(content) => showToast('Switch to Script tab to view', 'blue')}
            />
          )}
        </div>

        {/* MIDDLE/RIGHT — Angles + Script */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* STEP 3 — Angle picker */}
          {(anglesLoading || angles.length > 0) && (
            <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: stepsDone[3] ? '#7BC853' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>3</div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#888', fontWeight: 700 }}>PICK AN ANGLE</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#444' }}>{angles.length} options generated</span>
                </div>
                {angles.length > 0 && (
                  <button
                    onClick={() => handleGenerateAngles(signals)}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #1E1E1E', borderRadius: 8, color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <RotateCcw size={11} /> Regenerate
                  </button>
                )}
              </div>

              {anglesLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <Loader2 size={20} color="#A78BFA" style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Crafting angles from brain + signals…</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {angles.map((angle, i) => (
                    <AngleCard
                      key={i}
                      angle={angle}
                      index={i}
                      selected={selectedAngleIdx === i}
                      loading={scriptLoading && selectedAngleIdx === i}
                      onSelect={() => {
                        setSelectedAngleIdx(i);
                        setStep(4);
                        handleGenerateScript(i);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Script */}
          {(scriptLoading || scriptData) && (
            <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E81A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>4</div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#888', fontWeight: 700 }}>FULL SCRIPT</span>
                  {scriptData?.title && <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>— {scriptData.title}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {scriptData && (
                    <>
                      <button
                        onClick={() => setShowPerformanceLogger(true)}
                        style={{ padding: '6px 12px', background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.25)', borderRadius: 8, color: '#7BC853', fontSize: 11, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <BarChart2 size={11} /> Log Performance
                      </button>
                      {selectedProjectId && (
                        <button
                          onClick={() => {
                            const v = versions.find(v => v.is_active);
                            if (v) setScheduleModal(v);
                          }}
                          style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, color: '#F59E0B', fontSize: 11, cursor: 'pointer', fontFamily: MONO }}
                        >
                          Schedule
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {scriptLoading ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <div style={{ animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 12 }}>
                    <Sparkles size={28} color="#E81A1A" />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>Writing script with brain context…</div>
                </div>
              ) : scriptData ? (
                <div style={{ padding: '20px' }}>
                  <FullScriptView scriptData={scriptData} onRegenerateBeat={handleBeatRegenerate} />
                  <WhyThisScript scriptData={scriptData} brain={brain} />
                </div>
              ) : null}
            </div>
          )}

          {/* Empty state */}
          {!anglesLoading && angles.length === 0 && !scriptData && (
            <div style={{ background: '#0A0A0A', border: '1px dashed #141414', borderRadius: 14, padding: '60px 20px', textAlign: 'center' }}>
              <Brain size={36} color="#1E1E1E" style={{ marginBottom: 16 }} />
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#2A2A2A', lineHeight: 2 }}>
                Select a client on the left<br />
                Gather signals to unlock angle generation<br />
                Pick an angle → get a full brain-powered script
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {scheduleModal && (
        <ScriptScheduleModal
          version={scheduleModal}
          projects={projects}
          onScheduled={() => { setScheduleModal(null); showToast('Added to Content Calendar 🗓', 'green'); }}
          onClose={() => setScheduleModal(null)}
        />
      )}

      {showPerformanceLogger && scriptData && (
        <PerformanceLogger
          scriptTitle={scriptData.title}
          onLog={handleLogPerformance}
          onClose={() => setShowPerformanceLogger(false)}
        />
      )}
    </div>
  );
}