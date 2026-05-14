import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import BrainIdentitySection from './sections/BrainIdentitySection';
import BrainAudienceSection from './sections/BrainAudienceSection';
import BrainPillarsSection from './sections/BrainPillarsSection';
import BrainPerformanceSection from './sections/BrainPerformanceSection';
import BrainCompetitorsSection from './sections/BrainCompetitorsSection';
import BrainComplianceSection from './sections/BrainComplianceSection';
import BrainOfferStackSection from './sections/BrainOfferStackSection';
import BrainVersionsPanel from './BrainVersionsPanel';
import { Globe, Save, History } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const TABS = [
  { key: 'identity',    label: '🎯 Identity' },
  { key: 'audience',    label: '👥 Audience' },
  { key: 'pillars',     label: '📌 Pillars' },
  { key: 'performance', label: '📊 Performance' },
  { key: 'competitors', label: '🏁 Competitors' },
  { key: 'compliance',  label: '⚖️ Compliance' },
  { key: 'offers',      label: '💼 Offer Stack' },
  { key: 'versions',    label: '🕓 History' },
];

function emptyBrain(existing = {}) {
  return {
    website_url: existing.website_url || '',
    identity: {
      brand_voice_adjectives: '', tone_dos: '', tone_donts: '',
      banned_words: '', signature_phrases: '', point_of_view: '',
      ...(existing.identity || {}),
    },
    audience: {
      primary_demo: '', psychographic: '', pain_points: '',
      desires: '', objections: '',
      ...(existing.audience || {}),
    },
    content_pillars: existing.content_pillars || [],
    performance_memory: {
      top_posts: '', winning_hooks: [], winning_formats: [],
      ...(existing.performance_memory || {}),
    },
    competitors: existing.competitors || [],
    compliance: {
      regulated_industry: '', required_disclaimers: '', restricted_language: '',
      ...(existing.compliance || {}),
    },
    offer_stack: existing.offer_stack || [],
    brain_versions: existing.brain_versions || [],
  };
}

export default function ClientBrainEditor({ client, onSave, saving }) {
  const [brain, setBrain] = useState(() => emptyBrain(client.client_brain || {}));
  const [activeTab, setActiveTab] = useState('identity');
  const [aiFilling, setAiFilling] = useState(null); // section key being AI-filled

  const set = (section, updates) => {
    setBrain(b => ({ ...b, [section]: typeof updates === 'object' && !Array.isArray(updates)
      ? { ...(b[section] || {}), ...updates }
      : updates,
    }));
  };

  const handleAiFill = async (section) => {
    const url = brain.website_url;
    if (!url) { showToast('Add a website URL first to use AI Fill', 'amber'); return; }
    setAiFilling(section);
    try {
      const clientContext = `
        Client: ${client.name}
        Company: ${client.client_company || ''}
        Website: ${url}
        Industry/Project type: ${client.client_project_type || ''}
        Existing brain notes: ${JSON.stringify(brain[section] || {})}
      `;

      const schemaMap = {
        identity: {
          type: 'object', properties: {
            brand_voice_adjectives: { type: 'string' },
            tone_dos: { type: 'string' },
            tone_donts: { type: 'string' },
            banned_words: { type: 'string' },
            signature_phrases: { type: 'string' },
            point_of_view: { type: 'string' },
          }
        },
        audience: {
          type: 'object', properties: {
            primary_demo: { type: 'string' },
            psychographic: { type: 'string' },
            pain_points: { type: 'string' },
            desires: { type: 'string' },
            objections: { type: 'string' },
          }
        },
        content_pillars: {
          type: 'object', properties: {
            pillars: { type: 'array', items: { type: 'object', properties: {
              name: { type: 'string' }, description: { type: 'string' }, example_topics: { type: 'string' }
            }}}
          }
        },
        performance_memory: {
          type: 'object', properties: {
            winning_hooks: { type: 'array', items: { type: 'string' } },
            winning_formats: { type: 'array', items: { type: 'string' } },
          }
        },
        competitors: {
          type: 'object', properties: {
            competitors: { type: 'array', items: { type: 'object', properties: {
              name: { type: 'string' }, platform: { type: 'string' }, handle: { type: 'string' }, what_they_do_well: { type: 'string' }
            }}}
          }
        },
        compliance: {
          type: 'object', properties: {
            regulated_industry: { type: 'string' },
            required_disclaimers: { type: 'string' },
            restricted_language: { type: 'string' },
          }
        },
        offers: {
          type: 'object', properties: {
            offer_stack: { type: 'array', items: { type: 'object', properties: {
              product_name: { type: 'string' }, description: { type: 'string' }, positioning_angle: { type: 'string' }, price: { type: 'string' }
            }}}
          }
        },
      };

      const promptMap = {
        identity: `Based on this client's website and context, draft their brand identity section: brand voice adjectives (3-5 single adjectives), tone dos (what the brand should sound like), tone don'ts (what to avoid), banned words, signature phrases they use, and a 1-2 sentence point of view / positioning statement. Be specific and based on their actual brand.`,
        audience: `Based on this client's website, describe their ideal customer: primary demographic (age, location, income), psychographic profile (values, lifestyle), 3 key pain points they have, 3 deep desires, and 3 common objections to buying. Be specific.`,
        content_pillars: `Based on this client's business, suggest 3-5 content pillars for social media. Each pillar should have a name, description (what kind of content), and 3 example post topics. Make them specific to their business.`,
        performance_memory: `Based on this client's brand and industry, suggest 5 high-converting hook formulas and 5 winning content formats that typically perform well for brands like theirs.`,
        competitors: `Based on this client's industry/website, identify up to 5 likely competitors. For each, provide a name, primary platform, estimated handle format, and what they likely do well in their content.`,
        compliance: `Based on this client's industry, identify any regulated language concerns, required disclaimers, or restricted language they should be aware of in their marketing content.`,
        offers: `Based on this client's website and business type, draft their likely offer stack with product/service names, short descriptions, and a positioning angle for each.`,
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${promptMap[section]}\n\nClient context:\n${clientContext}`,
        add_context_from_internet: true,
        response_json_schema: schemaMap[section],
        model: 'gemini_3_flash',
      });

      // Merge result back
      if (section === 'content_pillars' && result.pillars) {
        set('content_pillars', result.pillars);
      } else if (section === 'offers' && result.offer_stack) {
        set('offer_stack', result.offer_stack);
      } else if (section === 'competitors' && result.competitors) {
        set('competitors', result.competitors);
      } else if (section === 'performance_memory') {
        set('performance_memory', { ...brain.performance_memory, ...result });
      } else {
        set(section, result);
      }
      showToast('AI Fill complete!', 'green');
    } catch (e) {
      showToast('AI Fill failed', 'red');
    }
    setAiFilling(null);
  };

  const restoreVersion = (snapshot) => {
    try {
      const parsed = JSON.parse(snapshot);
      setBrain(emptyBrain(parsed));
      showToast('Version restored', 'blue');
      setActiveTab('identity');
    } catch {
      showToast('Could not restore version', 'red');
    }
  };

  return (
    <div>
      {/* Website URL + Save bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '8px 12px' }}>
          <Globe size={14} color="#555" />
          <input
            value={brain.website_url}
            onChange={e => setBrain(b => ({ ...b, website_url: e.target.value }))}
            placeholder="Client website URL (used for AI Fill)"
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1, fontFamily: 'Syne, sans-serif' }}
          />
        </div>
        <button
          onClick={() => onSave(brain)}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#E81A1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save Brain'}
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '7px 13px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: MONO, border: `1px solid ${activeTab === t.key ? '#A78BFA' : '#1E1E1E'}`,
            background: activeTab === t.key ? 'rgba(167,139,250,0.12)' : 'transparent',
            color: activeTab === t.key ? '#A78BFA' : '#555', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Section content */}
      {activeTab === 'identity' && (
        <BrainIdentitySection
          data={brain.identity}
          onChange={v => set('identity', v)}
          onAiFill={() => handleAiFill('identity')}
          aiFilling={aiFilling === 'identity'}
        />
      )}
      {activeTab === 'audience' && (
        <BrainAudienceSection
          data={brain.audience}
          onChange={v => set('audience', v)}
          onAiFill={() => handleAiFill('audience')}
          aiFilling={aiFilling === 'audience'}
        />
      )}
      {activeTab === 'pillars' && (
        <BrainPillarsSection
          data={brain.content_pillars}
          onChange={v => set('content_pillars', v)}
          onAiFill={() => handleAiFill('content_pillars')}
          aiFilling={aiFilling === 'content_pillars'}
        />
      )}
      {activeTab === 'performance' && (
        <BrainPerformanceSection
          data={brain.performance_memory}
          onChange={v => set('performance_memory', v)}
          onAiFill={() => handleAiFill('performance_memory')}
          aiFilling={aiFilling === 'performance_memory'}
        />
      )}
      {activeTab === 'competitors' && (
        <BrainCompetitorsSection
          data={brain.competitors}
          onChange={v => set('competitors', v)}
          onAiFill={() => handleAiFill('competitors')}
          aiFilling={aiFilling === 'competitors'}
        />
      )}
      {activeTab === 'compliance' && (
        <BrainComplianceSection
          data={brain.compliance}
          onChange={v => set('compliance', v)}
          onAiFill={() => handleAiFill('compliance')}
          aiFilling={aiFilling === 'compliance'}
        />
      )}
      {activeTab === 'offers' && (
        <BrainOfferStackSection
          data={brain.offer_stack}
          onChange={v => set('offer_stack', v)}
          onAiFill={() => handleAiFill('offers')}
          aiFilling={aiFilling === 'offers'}
        />
      )}
      {activeTab === 'versions' && (
        <BrainVersionsPanel versions={brain.brain_versions || []} onRestore={restoreVersion} />
      )}
    </div>
  );
}