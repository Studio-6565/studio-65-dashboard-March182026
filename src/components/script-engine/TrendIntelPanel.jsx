import React, { useState } from 'react';
import { TrendingUp, Wifi, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const MONO = '"DM Mono", monospace';

const PLATFORM_LABELS = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  youtube: 'YouTube Shorts',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

function Pill({ text, color = '#4A9EFF', bg }) {
  return (
    <div style={{
      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: bg || `${color}14`, border: `1px solid ${color}30`, color,
      fontFamily: MONO, lineHeight: 1.4,
    }}>
      {text}
    </div>
  );
}

export default function TrendIntelPanel({ platform, niche, trendData, loading, onFetch }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = trendData && Object.keys(trendData).length > 0;
  const platformLabel = PLATFORM_LABELS[platform] || platform;

  return (
    <div style={{
      background: hasData ? 'rgba(74,158,255,0.04)' : '#0A0A0A',
      border: `1px solid ${hasData ? 'rgba(74,158,255,0.2)' : '#141414'}`,
      borderRadius: 16, marginBottom: 20, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: hasData ? 'rgba(74,158,255,0.1)' : 'rgba(100,100,100,0.1)', border: `1px solid ${hasData ? 'rgba(74,158,255,0.2)' : '#1E1E1E'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {loading ? <Loader2 size={15} color="#4A9EFF" style={{ animation: 'spin 1s linear infinite' }} /> : hasData ? <TrendingUp size={15} color="#4A9EFF" /> : <Wifi size={15} color="#444" />}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: hasData ? '#fff' : '#666' }}>
            {hasData ? `Trend Intelligence — ${platformLabel}` : 'Trend Intelligence'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 1 }}>
            {loading ? 'Scanning social & traditional media...' : hasData ? `Live data for ${niche || platformLabel}` : 'Scan what\'s trending now before generating'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasData && (
            <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: MONO }}>
              {expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> View</>}
            </button>
          )}
          <button onClick={onFetch} disabled={loading} style={{
            padding: '8px 16px', background: hasData ? 'rgba(74,158,255,0.1)' : '#E81A1A',
            border: `1px solid ${hasData ? 'rgba(74,158,255,0.3)' : 'transparent'}`,
            borderRadius: 10, color: hasData ? '#4A9EFF' : '#fff',
            fontSize: 11, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: MONO,
            opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
          }}>
            {loading ? 'Scanning...' : hasData ? '↺ Refresh' : '🔍 Scan Trends'}
          </button>
        </div>
      </div>

      {/* Data */}
      {hasData && expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(74,158,255,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>

            {trendData.hook_styles?.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>🎯 Hook Styles Working Now</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trendData.hook_styles.map((h, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#bbb', padding: '7px 10px', background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 8, lineHeight: 1.5 }}>{h}</div>
                  ))}
                </div>
              </div>
            )}

            {trendData.content_formats?.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#7BC853', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>📈 Formats Going Viral</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trendData.content_formats.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#bbb', padding: '7px 10px', background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: 8, lineHeight: 1.5 }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {trendData.storytelling_patterns?.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>✍️ Storytelling Patterns</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {trendData.storytelling_patterns.map((p, i) => <Pill key={i} text={p} color="#A78BFA" />)}
                </div>
              </div>
            )}

            {trendData.winning_creators?.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>🏆 Winning Right Now</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {trendData.winning_creators.map((c, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#aaa', padding: '6px 10px', background: '#0D0D0D', borderRadius: 8, lineHeight: 1.5 }}>{c}</div>
                  ))}
                </div>
              </div>
            )}

            {trendData.avoid?.length > 0 && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: '#E81A1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={10} /> Oversaturated — Avoid
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {trendData.avoid.map((a, i) => <Pill key={i} text={a} color="#E81A1A" />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}