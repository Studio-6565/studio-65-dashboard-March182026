import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import ScriptVersionHistory from '@/components/script-engine/ScriptVersionHistory';
import TrendIntelPanel from '@/components/script-engine/TrendIntelPanel';
import { Sparkles, Zap, Copy, ChevronDown, ChevronUp, RotateCcw, CheckCircle2, ArrowLeft, Send, Flame } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const PLATFORMS = [
  { value: 'tiktok',     label: 'TikTok',           emoji: '🎵' },
  { value: 'instagram',  label: 'Instagram Reels',   emoji: '📸' },
  { value: 'youtube',    label: 'YouTube Shorts',    emoji: '▶️' },
  { value: 'linkedin',   label: 'LinkedIn',          emoji: '💼' },
  { value: 'facebook',   label: 'Facebook',          emoji: '👥' },
];

const GOALS = [
  { value: 'viral',       label: 'Go Viral',         emoji: '🔥' },
  { value: 'engagement',  label: 'Max Engagement',   emoji: '💬' },
  { value: 'leads',       label: 'Generate Leads',   emoji: '🎯' },
  { value: 'awareness',   label: 'Brand Awareness',  emoji: '📣' },
  { value: 'sales',       label: 'Drive Sales',      emoji: '💰' },
  { value: 'education',   label: 'Educate',          emoji: '🎓' },
];

const TONES = [
  { value: 'authentic',     label: 'Raw & Authentic' },
  { value: 'entertaining',  label: 'Entertaining' },
  { value: 'educational',   label: 'Educational' },
  { value: 'professional',  label: 'Professional' },
  { value: 'controversial', label: 'Bold / Controversial' },
  { value: 'storytelling',  label: 'Storytelling' },
];

const DURATIONS = [
  { value: '15s', label: '15s' },
  { value: '30s', label: '30s' },
  { value: '60s', label: '60s' },
  { value: '90s', label: '90s' },
  { value: '3min', label: '3 min' },
];

function Sel({ label, options, value, onChange }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: MONO, border: `1px solid ${value === o.value ? '#E81A1A' : '#222'}`,
            background: value === o.value ? 'rgba(232,26,26,0.12)' : 'transparent',
            color: value === o.value ? '#E81A1A' : '#555', transition: 'all 0.15s',
          }}>
            {o.emoji && <span style={{ marginRight: 5 }}>{o.emoji}</span>}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Animated loading bar
function AILoadingBar({ label }) {
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 16 }}>✦</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: '#444', marginBottom: 20 }}>Scanning trends · Analysing patterns · Crafting scripts</div>
      <div style={{ height: 2, background: '#111', borderRadius: 2, overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent, #E81A1A, transparent)', borderRadius: 2, animation: 'sweep 1.4s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }`}</style>
    </div>
  );
}

// Parsed script card — splits the AI output into individual scripts
function ScriptCard({ script, index, onCopy }) {
  const [expanded, setExpanded] = useState(index === 0);
  const lines = script.trim().split('\n');
  const title = lines[0]?.replace(/^#+\s*/, '').replace(/\*\*/g, '') || `Script ${index + 1}`;
  const body = lines.slice(1).join('\n').trim();

  return (
    <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,26,26,0.1)', border: '1px solid rgba(232,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#E81A1A' }}>{String(index + 1).padStart(2, '0')}</span>
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</span>
        {expanded ? <ChevronUp size={14} color="#555" /> : <ChevronDown size={14} color="#555" />}
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ background: '#060606', border: '1px solid #111', borderRadius: 10, padding: '14px 16px', fontSize: 13, lineHeight: 1.85, color: '#bbb', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', marginBottom: 10 }}>
            {body || script}
          </div>
          <button onClick={() => onCopy(script)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent',
            border: '1px solid #222', borderRadius: 8, color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: MONO,
          }}>
            <Copy size={12} /> Copy Script
          </button>
        </div>
      )}
    </div>
  );
}

// Split AI output into individual scripts
function parseScripts(raw) {
  const sections = raw.split(/\n(?=#{1,3}\s|SCRIPT\s*\d|---)/g).filter(s => s.trim().length > 60);
  return sections.length > 1 ? sections : [raw];
}

export default function ScriptEngine() {
  const [step, setStep] = useState('home'); // home | configure | generating | ideas | writing | output
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);

  const [config, setConfig] = useState({
    platform: 'tiktok',
    goal: 'viral',
    tone: 'authentic',
    duration: '30s',
    numScripts: 3,
    niche: '',
    extraContext: '',
  });

  const [trendData, setTrendData] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [selectedIdeas, setSelectedIdeas] = useState([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [generatingScripts, setGeneratingScripts] = useState(false);
  const [scriptOutput, setScriptOutput] = useState('');
  const [parsedScripts, setParsedScripts] = useState([]);

  useEffect(() => {
    base44.entities.Project.list('-date', 100)
      .then(p => { setProjects(p.filter(x => !x.archived && !x.is_test)); })
      .finally(() => setLoading(false));
  }, []);

  const selectProject = async (p) => {
    setSelectedProject(p);
    const vs = await base44.entities.ScriptVersion.filter({ project_id: p.id }, '-version_number', 30);
    setVersions(vs);
    // Auto-fill niche from project context
    setConfig(c => ({ ...c, niche: p.client || '' }));
    setStep('configure');
  };

  // Step 1: Fetch real-time trend intelligence from the web
  const fetchTrends = async () => {
    setLoadingTrends(true);
    setTrendData(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a viral content strategist with access to real-time social media intelligence.

Search and analyze what is currently TRENDING RIGHT NOW (May 2026) across:
- TikTok ${config.platform === 'tiktok' ? '(primary focus)' : ''}
- Instagram Reels ${config.platform === 'instagram' ? '(primary focus)' : ''}
- YouTube Shorts ${config.platform === 'youtube' ? '(primary focus)' : ''}
- LinkedIn ${config.platform === 'linkedin' ? '(primary focus)' : ''}
- Traditional media (TV ads, billboards, radio formats that are working)
- Viral ad campaigns from top brands

Context:
- Platform focus: ${config.platform}
- Client/Niche: ${config.niche || selectedProject?.client || 'video production studio'}
- Project: ${selectedProject?.name}
- Goal: ${config.goal}

Provide:
1. Top 5 trending audio/music vibes or formats on ${config.platform} RIGHT NOW
2. Top 5 content formats/structures going viral this week
3. Top 3 storytelling patterns dominating feeds (e.g., "hot take," "myth bust," "transformation")
4. What types of hooks are stopping thumbs in ${config.niche || 'this niche'} specifically
5. 3 brands/creators KILLING IT right now with their content style — what they're doing
6. What's OVERSATURATED / to avoid right now

Be specific, current, and actionable. No generic advice.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            audio_trends: { type: 'array', items: { type: 'string' } },
            content_formats: { type: 'array', items: { type: 'string' } },
            storytelling_patterns: { type: 'array', items: { type: 'string' } },
            hook_styles: { type: 'array', items: { type: 'string' } },
            winning_creators: { type: 'array', items: { type: 'string' } },
            avoid: { type: 'array', items: { type: 'string' } },
          }
        },
        model: 'gemini_3_flash',
      });
      setTrendData(res);
    } catch (e) {
      showToast('Trend scan failed — generating from AI knowledge', 'amber');
      setTrendData({});
    } finally {
      setLoadingTrends(false);
    }
  };

  // Step 2: Generate ideas informed by trend data
  const generateIdeas = async () => {
    setGeneratingIdeas(true);
    setStep('generating');
    try {
      const trendContext = trendData ? `
LIVE TREND INTELLIGENCE (fetched from the web):
- Trending formats: ${(trendData.content_formats || []).join(' | ')}
- Hot hook styles: ${(trendData.hook_styles || []).join(' | ')}
- Storytelling patterns working: ${(trendData.storytelling_patterns || []).join(' | ')}
- Winning creators/brands: ${(trendData.winning_creators || []).join(' | ')}
- Currently oversaturated (AVOID): ${(trendData.avoid || []).join(' | ')}
` : '';

      const res = await base44.functions.invoke('studioAgents', {
        agent: 'scriptEngine',
        prompt: `You are a world-class viral content strategist for Studio 65, a premium video production company.

Generate 6 HIGHLY SPECIFIC, data-driven content ideas for:
- Project: ${selectedProject?.name}
- Client/Brand: ${config.niche || selectedProject?.client}
- Platform: ${config.platform}
- Goal: ${config.goal}
- Tone: ${config.tone}
- Target Duration: ${config.duration}
${config.extraContext ? `- Additional context: ${config.extraContext}` : ''}

${trendContext}

For EACH idea, provide:
**IDEA TITLE** (punchy, 5 words max)
Hook: [The first 1-2 seconds — what stops the scroll]
Angle: [What makes this unique / the specific take]
Format: [e.g., POV, talking head, B-roll montage, text overlay, duet style]
Why it'll work: [Specific reason tied to current trends or psychology]
Viral factor: ⚡ / ⚡⚡ / ⚡⚡⚡

Make ideas SPECIFIC to the client/niche — no generic, templated content. Each idea should feel like it was created for THIS brand specifically.`,
        context: '',
      });

      const raw = res.data?.result || '';
      // Split by double newline + **IDEA or numbered list
      const blocks = raw.split(/\n(?=\*\*[A-Z]|\d+\.\s|\*\*\d)/).filter(b => b.trim().length > 40);
      const parsed = blocks.length > 2 ? blocks.slice(0, 6) : raw.split('\n\n').filter(b => b.trim().length > 40).slice(0, 6);
      setIdeas(parsed.map((text, i) => ({ id: i, text: text.trim(), selected: false })));
      setStep('ideas');
    } catch (e) {
      showToast('Failed to generate ideas', 'red');
      setStep('configure');
    } finally {
      setGeneratingIdeas(false);
    }
  };

  // Step 3: Write full scripts for selected ideas
  const writeScripts = async () => {
    const selected = ideas.filter(i => i.selected);
    if (!selected.length) { showToast('Select at least one idea', 'amber'); return; }

    setGeneratingScripts(true);
    setStep('writing');
    try {
      const trendContext = trendData ? `
LIVE PLATFORM INTELLIGENCE:
- Audio/vibe: ${(trendData.audio_trends || []).slice(0, 3).join(', ')}
- Formats performing: ${(trendData.content_formats || []).slice(0, 3).join(', ')}
- Proven hook styles: ${(trendData.hook_styles || []).slice(0, 4).join(' | ')}
` : '';

      const res = await base44.functions.invoke('studioAgents', {
        agent: 'scriptEngine',
        prompt: `You are an elite viral scriptwriter. Write ${selected.length} production-ready script${selected.length > 1 ? 's' : ''} for Studio 65.

CLIENT: ${config.niche || selectedProject?.client}
PROJECT: ${selectedProject?.name}
PLATFORM: ${config.platform}
GOAL: ${config.goal}
TONE: ${config.tone}
DURATION: ${config.duration}

${trendContext}

IDEAS TO DEVELOP:
${selected.map((idea, i) => `\n--- IDEA ${i + 1} ---\n${idea.text}`).join('\n')}

SCRIPT FORMAT FOR EACH:
## Script [N]: [Title]

**[HOOK — 0:00-0:02]**
[Exact opening words/action — must be scroll-stopping]

**[SETUP — 0:02-0:08]**
[Context, relatable premise]

**[BODY — 0:08-end minus 5s]**
[Core content — value, story, or entertainment]

**[PATTERN INTERRUPT]**
[Unexpected twist or visual change to re-engage]

**[CTA — final 3-5s]**
[Specific, frictionless call to action]

---
**DIRECTOR NOTES:**
- Camera: [specific shot types]
- Music vibe: [specific style/tempo]
- On-screen text: [key supers]
- Editing rhythm: [pacing notes]

Write in spoken, conversational language — exactly how a human would say it on camera. No AI jargon. No filler phrases. Every word earns its place.`,
        context: '',
      });

      const raw = res.data?.result || '';
      setScriptOutput(raw);
      setParsedScripts(parseScripts(raw));

      // Save version
      const nextV = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;
      await Promise.all(versions.filter(v => v.is_active).map(v => base44.entities.ScriptVersion.update(v.id, { is_active: false })));
      const newVer = await base44.entities.ScriptVersion.create({
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        version_number: nextV,
        label: `v${nextV} – ${config.platform} / ${config.goal}`,
        script_content: raw,
        platform: config.platform,
        tone: config.tone,
        goal: config.goal,
        content_type: 'trend-based',
        selected_ideas: JSON.stringify(selected.map(i => i.text)),
        is_active: true,
      });
      setVersions(prev => [...prev.map(v => ({ ...v, is_active: false })), newVer]);
      setStep('output');
    } catch (e) {
      showToast('Failed to write scripts', 'red');
      setStep('ideas');
    } finally {
      setGeneratingScripts(false);
    }
  };

  const attachToProject = async () => {
    await base44.entities.EditBrief.create({
      project_id: selectedProject.id,
      project_name: selectedProject.name,
      published: false,
      script: scriptOutput,
      notes: `Platform: ${config.platform} | Tone: ${config.tone} | Goal: ${config.goal}`,
    });
    showToast('Scripts attached to project brief!', 'green');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: 40, color: '#444', fontFamily: MONO, fontSize: 12 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, fontFamily: 'Syne, sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(232,26,26,0.12)', border: '1px solid rgba(232,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#E81A1A" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Script Engine</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>AI-powered · trend-aware · viral-first</div>
          </div>
        </div>
      </div>

      {/* ── STEP: HOME — pick project ── */}
      {step === 'home' && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Select a project to write scripts for</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {projects.map(p => (
              <button key={p.id} onClick={() => selectProject(p)} style={{
                textAlign: 'left', background: '#0D0D0D', border: '1px solid #141414', borderRadius: 14,
                padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,26,26,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#141414'}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginBottom: 10 }}>{p.client} · {p.status}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, padding: '3px 8px', borderRadius: 4, background: 'rgba(232,26,26,0.08)', color: '#E81A1A', border: '1px solid rgba(232,26,26,0.15)' }}>
                    {p.date || 'No date'}
                  </span>
                </div>
              </button>
            ))}
            {projects.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#444', gridColumn: '1/-1' }}>
                <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>🎬</div>
                <div>No projects yet. Create a project first.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP: CONFIGURE ── */}
      {step === 'configure' && selectedProject && (
        <div>
          <button onClick={() => setStep('home')} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Back
          </button>

          {/* Project pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 10, marginBottom: 28 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E81A1A' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedProject.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{selectedProject.client}</span>
          </div>

          {/* Trend Intel Panel */}
          <TrendIntelPanel
            platform={config.platform}
            niche={config.niche || selectedProject.client}
            trendData={trendData}
            loading={loadingTrends}
            onFetch={fetchTrends}
          />

          {/* Config */}
          <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Script Configuration</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <Sel label="Platform" options={PLATFORMS} value={config.platform} onChange={v => setConfig(c => ({ ...c, platform: v }))} />
              <Sel label="Goal" options={GOALS} value={config.goal} onChange={v => setConfig(c => ({ ...c, goal: v }))} />
              <Sel label="Tone" options={TONES} value={config.tone} onChange={v => setConfig(c => ({ ...c, tone: v }))} />
              <Sel label="Target Duration" options={DURATIONS} value={config.duration} onChange={v => setConfig(c => ({ ...c, duration: v }))} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Brand / Niche</div>
                  <input value={config.niche} onChange={e => setConfig(c => ({ ...c, niche: e.target.value }))} placeholder="e.g. luxury real estate, restaurant" style={{ width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Number of Scripts</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 5].map(n => (
                      <button key={n} onClick={() => setConfig(c => ({ ...c, numScripts: n }))} style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        border: `1px solid ${config.numScripts === n ? '#E81A1A' : '#1E1E1E'}`,
                        background: config.numScripts === n ? 'rgba(232,26,26,0.12)' : 'transparent',
                        color: config.numScripts === n ? '#E81A1A' : '#555', cursor: 'pointer',
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Extra Context (optional)</div>
                <textarea value={config.extraContext} onChange={e => setConfig(c => ({ ...c, extraContext: e.target.value }))} placeholder="Promotions, key messages, things to avoid, specific products, campaign angle..." rows={3} style={{ width: '100%', background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Syne, sans-serif', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          <button onClick={generateIdeas} disabled={generatingIdeas} style={{
            width: '100%', padding: '16px 0', background: '#E81A1A', border: 'none', borderRadius: 14,
            color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            letterSpacing: '-0.01em',
          }}>
            <Sparkles size={18} />
            Generate Content Ideas
            {trendData && <span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7 }}>· trend-informed</span>}
          </button>
        </div>
      )}

      {/* ── LOADING SCREENS ── */}
      {(step === 'generating' || step === 'writing') && (
        <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 16 }}>
          <AILoadingBar label={step === 'generating' ? 'Generating content ideas...' : 'Writing viral scripts...'} />
        </div>
      )}

      {/* ── STEP: IDEAS ── */}
      {step === 'ideas' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Pick Your Ideas</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>Select the angles you want turned into full scripts</div>
            </div>
            <button onClick={() => setStep('configure')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: MONO }}>← Back</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {ideas.map(idea => (
              <button key={idea.id} onClick={() => setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, selected: !i.selected } : i))} style={{
                width: '100%', textAlign: 'left', background: idea.selected ? 'rgba(232,26,26,0.06)' : '#0A0A0A',
                border: `1px solid ${idea.selected ? 'rgba(232,26,26,0.4)' : '#141414'}`, borderRadius: 14,
                padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, border: `2px solid ${idea.selected ? '#E81A1A' : '#333'}`,
                  background: idea.selected ? '#E81A1A' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                  {idea.selected && <CheckCircle2 size={12} color="#fff" />}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.75, color: idea.selected ? '#fff' : '#aaa', whiteSpace: 'pre-wrap', flex: 1 }}>
                  {idea.text}
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={generateIdeas} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #222', borderRadius: 12, color: '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={13} /> Regenerate
            </button>
            <button onClick={writeScripts} disabled={!ideas.some(i => i.selected)} style={{
              flex: 1, padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12,
              color: '#fff', fontSize: 14, fontWeight: 800, cursor: ideas.some(i => i.selected) ? 'pointer' : 'default',
              opacity: ideas.some(i => i.selected) ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Send size={15} /> Write {ideas.filter(i => i.selected).length || ''} Script{ideas.filter(i => i.selected).length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: OUTPUT ── */}
      {step === 'output' && parsedScripts.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                {parsedScripts.length} Script{parsedScripts.length !== 1 ? 's' : ''} Ready
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>{config.platform} · {config.goal} · {config.duration}</div>
            </div>
            <button onClick={() => setStep('ideas')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: MONO }}>← Back</button>
          </div>

          {/* Version history */}
          <ScriptVersionHistory
            projectId={selectedProject?.id}
            versions={versions}
            onVersionsChange={setVersions}
            onRevertToVersion={(content) => { setScriptOutput(content); setParsedScripts(parseScripts(content)); }}
          />

          {/* Script cards */}
          <div style={{ marginBottom: 20 }}>
            {parsedScripts.map((s, i) => (
              <ScriptCard key={i} script={s} index={i} onCopy={(txt) => { navigator.clipboard.writeText(txt); showToast('Copied!'); }} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => { navigator.clipboard.writeText(scriptOutput); showToast('All scripts copied!'); }} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #222', borderRadius: 12, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Copy size={14} /> Copy All
            </button>
            <button onClick={writeScripts} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #222', borderRadius: 12, color: '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: MONO }}>
              <RotateCcw size={14} /> Rewrite
            </button>
            <button onClick={attachToProject} style={{ flex: 1, padding: '14px 0', background: '#E81A1A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Zap size={15} /> Attach to Project Brief
            </button>
          </div>

          {/* Start new */}
          <button onClick={() => { setStep('home'); setSelectedProject(null); setIdeas([]); setScriptOutput(''); setParsedScripts([]); setTrendData(null); setVersions([]); }} style={{ width: '100%', marginTop: 14, padding: '12px 0', background: 'transparent', border: '1px solid #111', borderRadius: 12, color: '#333', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MONO }}>
            + New Project Scripts
          </button>
        </div>
      )}
    </div>
  );
}