import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import StudioToast from '@/components/studio/StudioToast';
import AIBrainstorming from '@/components/studio/AIBrainstorming';
import { useNavigate } from 'react-router-dom';

const MONO = '"DM Mono", monospace';

export default function ScriptEngine() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('select'); // 'select' | 'generate' | 'ideas' | 'script'
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  
  const [ideas, setIdeas] = useState([]);
  const [selectedIdeas, setSelectedIdeas] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [scriptOutput, setScriptOutput] = useState('');
  
  const [inputs, setInputs] = useState({
    numIdeas: '5',
    contentType: 'mix',
    goal: 'engagement',
    platform: 'tiktok',
    tone: 'authentic',
    compliance: ''
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState(null);

  useEffect(() => {
    base44.entities.Project.list('-date', 100)
      .then(p => setProjects(p))
      .finally(() => setLoading(false));
  }, []);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setMode('generate');
  };

  const generateIdeas = async () => {
    if (!selectedProject) return;
    
    setGeneratingIdeas(true);
    try {
      const res = await base44.functions.invoke('studioAgents', {
        agent: 'scriptEngine',
        prompt: `Generate ${inputs.numIdeas} content ideas for this project:\n\nProject: ${selectedProject.name}\nClient: ${selectedProject.client}\nStatus: ${selectedProject.status}\nBudget: $${selectedProject.revenue}\n\nRequirements:\n- Content Type: ${inputs.contentType}\n- Goal: ${inputs.goal}\n- Platform: ${inputs.platform}\n- Tone: ${inputs.tone}\n${inputs.compliance ? `- Compliance: ${inputs.compliance}` : ''}\n\nGenerate ideas with hooks, angles, and performance reasoning. Avoid generic content.`,
        context: ''
      });

      const ideasText = res.data?.result || '';
      const parsedIdeas = ideasText.split('\n\n').filter(idea => idea.trim()).slice(0, parseInt(inputs.numIdeas));
      
      setIdeas(parsedIdeas.map((idea, idx) => ({
        id: idx,
        text: idea,
        selected: false
      })));
      setMode('ideas');
      showToast('Ideas generated! Select which ones to develop into scripts.');
    } catch (error) {
      showToast('Failed to generate ideas', 'red');
      console.error(error);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const toggleIdeaSelection = (id) => {
    setIdeas(ideas.map(idea => 
      idea.id === id ? { ...idea, selected: !idea.selected } : idea
    ));
  };

  const generateScripts = async () => {
    const selected = ideas.filter(i => i.selected);
    if (selected.length === 0) {
      showToast('Select at least one idea', 'amber');
      return;
    }

    setGeneratingScript(true);
    try {
      const ideasText = selected.map(i => i.text).join('\n\n');
      const res = await base44.functions.invoke('studioAgents', {
        agent: 'scriptEngine',
        prompt: `Write performance-optimized scripts for these content ideas:\n\nProject: ${selectedProject.name}\n\nIdeas:\n${ideasText}\n\nRequirements:\n- Platform: ${inputs.platform}\n- Tone: ${inputs.tone}\n- Duration: 30-45 seconds\n- Structure: Hook (1-2s) → Setup → Value → Pattern Interrupt → CTA\n- Style: Conversational, human, no AI jargon\n${inputs.compliance ? `- Compliance: ${inputs.compliance}` : ''}\n\nWrite scripts that feel strategic, urgent, and immediately producible.`,
        context: ''
      });

      setScriptOutput(res.data?.result || '');
      setMode('script');
      showToast('Scripts generated!', 'green');
    } catch (error) {
      showToast('Failed to generate scripts', 'red');
      console.error(error);
    } finally {
      setGeneratingScript(false);
    }
  };

  const attachToProject = async () => {
    if (!selectedProject || !scriptOutput) return;
    
    try {
      const briefData = {
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        published: false,
        notes: scriptOutput,
        script: scriptOutput,
        style_notes: `Platform: ${inputs.platform} | Tone: ${inputs.tone} | Goal: ${inputs.goal}`
      };

      await base44.entities.EditBrief.create(briefData);
      showToast('Scripts attached to project! Visible to team.');
      setMode('select');
      setSelectedProject(null);
      setIdeas([]);
      setScriptOutput('');
      setInputs({
        numIdeas: '5',
        contentType: 'mix',
        goal: 'engagement',
        platform: 'tiktok',
        tone: 'authentic',
        compliance: ''
      });
    } catch (error) {
      showToast('Failed to attach to project', 'red');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: '#555', fontFamily: MONO, fontSize: 12 }}>Loading Script Engine...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Syne, sans-serif' }}>
      <StudioToast />
      {/* Top nav */}
      <header style={{ borderBottom: '1px solid #1A1A1A', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', color: '#E81A1A', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>← Dashboard</button>
        <div style={{ width: 1, height: 16, background: '#222' }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Script Engine</span>
      </header>

    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Script Engine 🎬</div>
        <div style={{ fontSize: 13, color: '#666', fontFamily: MONO }}>AI content strategist for viral scripts</div>
      </div>

      {/* Mode: Select Project */}
      {mode === 'select' && (
        <div>
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎬</div>
              <div style={{ fontSize: 15 }}>No projects yet. Create one to start generating scripts.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {projects.filter(p => !p.archived).map(p => (
                <div key={p.id} onClick={() => handleProjectSelect(p)} style={{
                  background: '#1A1A1A',
                  border: '1px solid #222',
                  borderRadius: 12,
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#888', fontFamily: MONO, marginBottom: 12 }}>
                    {p.client} · {p.status}
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    {p.date && new Date(p.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode: Generate */}
      {mode === 'generate' && selectedProject && (
        <div>
          <button onClick={() => { setMode('select'); setSelectedProject(null); }} style={{
            marginBottom: 20, padding: '8px 14px', background: 'none', border: '1px solid #2A2A2A',
            borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>← Back to Projects</button>

          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{selectedProject.name}</div>
            <div style={{ fontSize: 12, color: '#888', fontFamily: MONO, marginBottom: 20 }}>
              Client: {selectedProject.client} · Revenue: ${selectedProject.revenue}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}># of Ideas</label>
                <select value={inputs.numIdeas} onChange={e => setInputs({...inputs, numIdeas: e.target.value})} style={{
                  width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                  padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif'
                }}>
                  {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Type</label>
                <select value={inputs.contentType} onChange={e => setInputs({...inputs, contentType: e.target.value})} style={{
                  width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                  padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif'
                }}>
                  <option value="trend-based">Trend-based</option>
                  <option value="evergreen">Evergreen</option>
                  <option value="mix">Mix</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Goal</label>
                <select value={inputs.goal} onChange={e => setInputs({...inputs, goal: e.target.value})} style={{
                  width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                  padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif'
                }}>
                  <option value="engagement">Engagement</option>
                  <option value="leads">Leads</option>
                  <option value="awareness">Awareness</option>
                  <option value="sales">Sales</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Platform</label>
                <select value={inputs.platform} onChange={e => setInputs({...inputs, platform: e.target.value})} style={{
                  width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                  padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif'
                }}>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram Reels</option>
                  <option value="youtube">YouTube Shorts</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tone</label>
                <select value={inputs.tone} onChange={e => setInputs({...inputs, tone: e.target.value})} style={{
                  width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                  padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif'
                }}>
                  <option value="authentic">Authentic</option>
                  <option value="educational">Educational</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="professional">Professional</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Compliance</label>
                <input type="text" value={inputs.compliance} onChange={e => setInputs({...inputs, compliance: e.target.value})} placeholder="e.g., FTC, HIPAA" style={{
                  width: '100%', background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                  padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Syne, sans-serif'
                }} />
              </div>
            </div>

            <AIBrainstorming project={selectedProject} platform={inputs.platform} goal={inputs.goal} />

            <button onClick={generateIdeas} disabled={generatingIdeas} style={{
              width: '100%', padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: generatingIdeas ? 'default' : 'pointer', opacity: generatingIdeas ? 0.7 : 1
            }}>
              {generatingIdeas ? '⏳ Generating Ideas...' : '✨ Generate Ideas'}
            </button>
          </div>
        </div>
      )}

      {/* Mode: Ideas Selection */}
      {mode === 'ideas' && (
        <div>
          <button onClick={() => { setMode('generate'); setIdeas([]); }} style={{
            marginBottom: 20, padding: '8px 14px', background: 'none', border: '1px solid #2A2A2A',
            borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>← Back</button>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Select Ideas to Develop</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ideas.map(idea => (
                <div key={idea.id} onClick={() => toggleIdeaSelection(idea.id)} style={{
                  background: idea.selected ? '#1E1E1E' : '#1A1A1A',
                  border: `1px solid ${idea.selected ? '#E81A1A' : '#222'}`,
                  borderRadius: 10,
                  padding: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, border: `2px solid ${idea.selected ? '#E81A1A' : '#444'}`,
                      background: idea.selected ? '#E81A1A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {idea.selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{idea.text}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={generateScripts} disabled={generatingScript || ideas.filter(i => i.selected).length === 0} style={{
            width: '100%', padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: generatingScript ? 'default' : 'pointer',
            opacity: generatingScript || ideas.filter(i => i.selected).length === 0 ? 0.5 : 1
          }}>
            {generatingScript ? '⏳ Writing Scripts...' : '✍️ Write Scripts'}
          </button>
        </div>
      )}

      {/* Mode: Script Output */}
      {mode === 'script' && scriptOutput && (
        <div>
          <button onClick={() => { setMode('ideas'); setScriptOutput(''); }} style={{
            marginBottom: 20, padding: '8px 14px', background: 'none', border: '1px solid #2A2A2A',
            borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>← Back</button>

          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, fontFamily: MONO }}>Generated Scripts</div>
            <div style={{
              background: '#111', border: '1px solid #2A2A2A', borderRadius: 10, padding: 16,
              fontSize: 12, lineHeight: 1.8, color: '#ccc', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto',
              fontFamily: 'monospace'
            }}>
              {scriptOutput}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => {
              navigator.clipboard.writeText(scriptOutput);
              showToast('Copied to clipboard!');
            }} style={{
              flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #2A2A2A',
              borderRadius: 10, color: '#888', fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}>
              📋 Copy Scripts
            </button>
            <button onClick={attachToProject} style={{
              flex: 1, padding: '12px 0', background: '#E81A1A', border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}>
              📌 Attach to Project
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}