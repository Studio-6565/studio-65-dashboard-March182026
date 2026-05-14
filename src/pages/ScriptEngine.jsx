import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import ScriptVersionHistory from '@/components/script-engine/ScriptVersionHistory';
import TrendIntelPanel from '@/components/script-engine/TrendIntelPanel';
import ScriptScheduleModal from '@/components/script-engine/ScriptScheduleModal';
import { Sparkles, Copy, Zap, Loader2, ChevronDown } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Twitter/X'];
const TONES = ['Educational', 'Entertaining', 'Inspirational', 'Promotional', 'Conversational', 'Storytelling'];
const GOALS = ['Brand Awareness', 'Lead Generation', 'Sales', 'Engagement', 'Education', 'Entertainment'];
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
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: MONO,
              border: active ? `1px solid ${color}50` : '1px solid #1E1E1E',
              background: active ? `${color}14` : 'transparent',
              color: active ? color : '#555',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ScriptEngine() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [tone, setTone] = useState('Educational');
  const [goal, setGoal] = useState('Brand Awareness');
  const [duration, setDuration] = useState('60s');
  const [niche, setNiche] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [selectedIdeas, setSelectedIdeas] = useState([]);

  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);

  const [versions, setVersions] = useState([]);
  const [scheduleModal, setScheduleModal] = useState(null); // version to schedule

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    base44.entities.Project.list('-date', 100).then(ps => {
      const live = ps.filter(p => !p.archived && !p.is_test);
      setProjects(live);
    });
  }, []);

  // Load versions when project changes
  useEffect(() => {
    if (!selectedProjectId) { setVersions([]); return; }
    base44.entities.ScriptVersion.filter({ project_id: selectedProjectId }, '-version_number', 20)
      .then(vs => {
        setVersions(vs);
        const active = vs.find(v => v.is_active);
        if (active) setScript(active.script_content);
      });
  }, [selectedProjectId]);

  const handleFetchTrends = async () => {
    setTrendLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a social media trend analyst. Analyze what's currently trending on ${platform} for the niche: "${niche || 'general content creation'}". 
      Return data in the specified JSON schema. Be specific and current.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          hook_styles: { type: 'array', items: { type: 'string' } },
          content_formats: { type: 'array', items: { type: 'string' } },
          storytelling_patterns: { type: 'array', items: { type: 'string' } },
          winning_creators: { type: 'array', items: { type: 'string' } },
          avoid: { type: 'array', items: { type: 'string' } },
        },
      },
    });
    setTrendData(res);
    setTrendLoading(false);
  };

  const handleGenerateIdeas = async () => {
    setIdeasLoading(true);
    setIdeas([]);
    const project = projects.find(p => p.id === selectedProjectId);
    const brandProfile = project ? JSON.stringify(project) : '';
    const trendContext = trendData ? `\n\nCurrent trends: ${JSON.stringify(trendData)}` : '';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 6 creative short-form video content ideas for a ${platform} ${tone.toLowerCase()} ${goal.toLowerCase()} video.
      Niche: ${niche || 'general'}
      Duration: ${duration}
      ${project ? `Project/Client context: ${project.name} - ${project.client}` : ''}
      ${additionalContext ? `Additional context: ${additionalContext}` : ''}
      ${trendContext}
      
      Each idea should be punchy and distinct. Focus on hooks that stop the scroll.`,
      response_json_schema: {
        type: 'object',
        properties: {
          ideas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                hook: { type: 'string' },
                concept: { type: 'string' },
              },
            },
          },
        },
      },
    });
    setIdeas(res?.ideas || []);
    setIdeasLoading(false);
  };

  const handleGenerateScript = async () => {
    setGenerating(true);
    setScript('');
    const project = projects.find(p => p.id === selectedProjectId);
    const trendContext = trendData ? `\nTrending formats to leverage: ${JSON.stringify(trendData.content_formats?.slice(0, 3))}` : '';
    const ideasContext = selectedIdeas.length ? `\nContent ideas to incorporate: ${selectedIdeas.join(' | ')}` : '';
    const brandContext = project?.client ? `\nClient: ${project.client}` : '';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a complete, production-ready ${platform} video script.

Platform: ${platform}
Tone: ${tone}
Goal: ${goal}  
Duration: ${duration}
Niche: ${niche || 'general'}
${brandContext}
${additionalContext ? `Brief: ${additionalContext}` : ''}
${ideasContext}
${trendContext}

Structure the script with:
- A strong HOOK (first 3 seconds)
- BODY content with clear pacing notes
- A compelling CTA at the end

Include [ON SCREEN TEXT] cues, [B-ROLL] suggestions, and speaker notes in brackets.
Make it punchy, specific, and tailored for the platform algorithm.`,
    });

    const scriptText = typeof res === 'string' ? res : res?.script || res?.content || JSON.stringify(res);
    setScript(scriptText);

    // Save as a new version
    if (selectedProjectId) {
      const nextNumber = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;
      // Deactivate previous active
      await Promise.all(versions.filter(v => v.is_active).map(v =>
        base44.entities.ScriptVersion.update(v.id, { is_active: false })
      ));
      const newVersion = await base44.entities.ScriptVersion.create({
        project_id: selectedProjectId,
        project_name: project?.name || '',
        version_number: nextNumber,
        script_content: scriptText,
        platform,
        tone,
        goal,
        is_active: true,
        selected_ideas: JSON.stringify(selectedIdeas),
      });
      setVersions(prev => [newVersion, ...prev.map(v => ({ ...v, is_active: false }))]);
      showToast(`Script v${nextNumber} saved`, 'green');
    }

    setGenerating(false);
  };

  const handleRevertToVersion = (content) => {
    setScript(content);
  };

  const activeVersion = versions.find(v => v.is_active);

  return (
    <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff', maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Sparkles size={20} color="#E81A1A" />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Script Engine</div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#444' }}>AI-powered video script generator with trend intelligence</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* LEFT — Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Project selector */}
          <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, padding: '18px 20px' }}>
            <label style={LS}>Link to Project (optional)</label>
            <select style={IS} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} · {p.client}</option>)}
            </select>
          </div>

          {/* Platform & tone */}
          <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={LS}>Platform</label>
              <ChipGroup options={PLATFORMS} value={platform} onChange={setPlatform} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={LS}>Tone</label>
              <ChipGroup options={TONES} value={tone} onChange={setTone} color="#A78BFA" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={LS}>Goal</label>
              <ChipGroup options={GOALS} value={goal} onChange={setGoal} color="#4A9EFF" />
            </div>
            <div>
              <label style={LS}>Duration</label>
              <ChipGroup options={DURATIONS} value={duration} onChange={setDuration} color="#F59E0B" />
            </div>
          </div>

          {/* Context */}
          <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Niche / Industry</label>
              <input style={IS} value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Real estate, fitness, restaurant, SaaS..." />
            </div>
            <div>
              <label style={LS}>Additional Brief / Context</label>
              <textarea
                style={{ ...IS, resize: 'none' }}
                rows={4}
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="Key messages, products to feature, specific hooks, CTA, brand voice notes..."
              />
            </div>
          </div>

          {/* Trend Intel */}
          <TrendIntelPanel
            platform={platform}
            niche={niche}
            trendData={trendData}
            loading={trendLoading}
            onFetch={handleFetchTrends}
          />

          {/* Idea brainstorm */}
          <div style={{ background: '#0A0A0A', border: '1px solid #141414', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Content Ideas</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 2 }}>Select ideas to inject into the script</div>
              </div>
              <button
                onClick={handleGenerateIdeas}
                disabled={ideasLoading}
                style={{ padding: '8px 16px', background: ideasLoading ? '#1A1A1A' : 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10, color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {ideasLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
                {ideasLoading ? 'Thinking...' : 'Brainstorm'}
              </button>
            </div>

            {ideas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ideas.map((idea, i) => {
                  const isSelected = selectedIdeas.includes(idea.title);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedIdeas(prev => isSelected ? prev.filter(x => x !== idea.title) : [...prev, idea.title])}
                      style={{
                        textAlign: 'left', padding: '12px 14px',
                        background: isSelected ? 'rgba(167,139,250,0.08)' : '#0D0D0D',
                        border: `1px solid ${isSelected ? 'rgba(167,139,250,0.35)' : '#1A1A1A'}`,
                        borderRadius: 10, cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#A78BFA' : '#ccc', marginBottom: 3 }}>{idea.title}</div>
                      <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{idea.hook}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateScript}
            disabled={generating}
            style={{
              width: '100%', padding: '15px 0',
              background: generating ? '#1A1A1A' : '#E81A1A',
              border: 'none', borderRadius: 12, color: generating ? '#444' : '#fff',
              fontSize: 15, fontWeight: 800, cursor: generating ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              letterSpacing: '-0.01em',
            }}
          >
            {generating
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating Script...</>
              : <><Sparkles size={16} /> Generate Script</>
            }
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* RIGHT — Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Version history */}
          {versions.length > 0 && (
            <ScriptVersionHistory
              projectId={selectedProjectId}
              versions={versions}
              onVersionsChange={setVersions}
              onRevertToVersion={handleRevertToVersion}
            />
          )}

          {/* Script output */}
          <div style={{ background: '#0A0A0A', border: `1px solid ${script ? '#1E1E1E' : '#141414'}`, borderRadius: 14, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Script Output
                </div>
                {activeVersion && (
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#7BC853', background: 'rgba(123,200,83,0.1)', border: '1px solid rgba(123,200,83,0.2)', borderRadius: 4, padding: '2px 6px' }}>
                    v{activeVersion.version_number}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeVersion && (
                  <button
                    onClick={() => setScheduleModal(activeVersion)}
                    style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, color: '#F59E0B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Zap size={11} /> Schedule
                  </button>
                )}
                {script && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(script); showToast('Script copied!'); }}
                    style={{ padding: '6px 12px', background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 8, color: '#4A9EFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Copy size={11} /> Copy
                  </button>
                )}
              </div>
            </div>

            {generating ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Loader2 size={24} color="#E81A1A" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#444' }}>Crafting your script...</div>
              </div>
            ) : script ? (
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                style={{
                  width: '100%', minHeight: 480, background: 'transparent', border: 'none',
                  padding: '18px 20px', color: '#ccc', fontSize: 12, lineHeight: 1.9,
                  resize: 'vertical', outline: 'none', fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}
              />
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, opacity: 0.07, marginBottom: 14 }}>📝</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#2A2A2A', lineHeight: 1.8 }}>
                  Configure your settings on the left<br />and hit Generate Script.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {scheduleModal && (
        <ScriptScheduleModal
          version={scheduleModal}
          projects={projects}
          onScheduled={() => { setScheduleModal(null); showToast('Added to Content Calendar 🗓', 'green'); }}
          onClose={() => setScheduleModal(null)}
        />
      )}
    </div>
  );
}