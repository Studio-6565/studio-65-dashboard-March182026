import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from './StudioToast';
import { Sparkles, TrendingUp } from 'lucide-react';

const MONO = '"DM Mono", monospace';

export default function AIBrainstorming({ project, platform, goal }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Fetch historical performance data for this client
      const perfData = await base44.entities.ScriptPerformance.filter({
        client: project?.client,
        platform: platform
      }, '-publish_date', 50);

      if (perfData.length === 0) {
        showToast('No historical data for this client yet. Generate ideas based on platform trends.', 'amber');
        setInsights({ hooks: [], topics: [], outlines: [] });
        return;
      }

      // Calculate top performing metrics
      const topScripts = perfData.sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0)).slice(0, 5);
      const avgRetention = (perfData.reduce((s, p) => s + (p.retention_rate || 0), 0) / perfData.length).toFixed(1);
      const topType = perfData.reduce((acc, p) => {
        acc[p.script_type] = (acc[p.script_type] || 0) + 1;
        return acc;
      }, {});
      const topScriptType = Object.keys(topType).sort((a, b) => topType[b] - topType[a])[0];

      // Get AI insights based on performance data
      const res = await base44.functions.invoke('studioAgents', {
        agent: 'scriptEngine',
        prompt: `Analyze historical script performance and suggest NEW hooks, trending topics, and outlines for ${project?.client} on ${platform}.

HISTORICAL PERFORMANCE:
${topScripts.map(s => `- "${s.script_title}" (${s.script_type}): ${s.views} views, ${s.engagement_rate}% engagement, ${s.retention_rate}% retention`).join('\n')}

Top Performing Type: ${topScriptType}
Average Retention: ${avgRetention}%

TASK: Based on this data, suggest:
1. **5 Hook Styles**: Specific opening patterns that worked (not generic, reference actual data trends)
2. **3 Trending Topics**: Angles not yet explored by this client but aligned with their niche
3. **3 Script Outlines**: Full structures for high-engagement content

Format as JSON:
{
  "hooks": ["hook 1", "hook 2", ...],
  "topics": ["topic 1", "topic 2", ...],
  "outlines": ["outline 1", "outline 2", ...]
}`,
        context: ''
      });

      try {
        const parsed = JSON.parse(res.data?.result || '{}');
        setInsights(parsed);
        setExpanded(true);
      } catch (e) {
        showToast('Insights generated but could not parse format', 'amber');
        setInsights({ hooks: [], topics: [], outlines: [] });
      }
    } catch (error) {
      showToast('Failed to generate insights', 'red');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded && insights ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="#A78BFA" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>AI Brainstorming</div>
            <div style={{ fontSize: 10, color: '#666', fontFamily: MONO }}>Based on your client's past performance</div>
          </div>
        </div>
        <button onClick={generateInsights} disabled={loading} style={{
          padding: '8px 14px', background: '#A78BFA', border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 11, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1, fontFamily: MONO
        }}>
          {loading ? '⏳...' : '✨ Analyze'}
        </button>
      </div>

      {expanded && insights && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hooks */}
          {insights.hooks?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', fontFamily: MONO, textTransform: 'uppercase', marginBottom: 8 }}>💡 Proven Hook Styles</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {insights.hooks.map((hook, idx) => (
                  <div key={idx} style={{
                    background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                    padding: '8px 12px', fontSize: 11, color: '#ccc', lineHeight: 1.4
                  }}>
                    {hook}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {insights.topics?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7BC853', fontFamily: MONO, textTransform: 'uppercase', marginBottom: 8 }}>📈 Trending Topics</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {insights.topics.map((topic, idx) => (
                  <div key={idx} style={{
                    background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                    padding: '8px 12px', fontSize: 11, color: '#ccc'
                  }}>
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outlines */}
          {insights.outlines?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4A9EFF', fontFamily: MONO, textTransform: 'uppercase', marginBottom: 8 }}>📝 Script Outlines</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {insights.outlines.map((outline, idx) => (
                  <div key={idx} style={{
                    background: '#111', border: '1px solid #2A2A2A', borderRadius: 8,
                    padding: '12px', fontSize: 11, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {outline}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}