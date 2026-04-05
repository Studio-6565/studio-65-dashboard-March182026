import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import BottomSheet from '@/components/studio/BottomSheet';

const MONO = '"DM Mono", monospace';
const COLORS = ['#E81A1A', '#F59E0B', '#7BC853', '#4A9EFF', '#A78BFA'];

export default function ScriptAnalytics() {
  const [metrics, setMetrics] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    client: 'all',
    scriptType: 'all',
    platform: 'all',
  });

  const [sheetOpen, setSheetOpen] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.ScriptPerformance.list('-publish_date', 200),
      base44.entities.Project.list('name', 200),
    ]).then(([m, p]) => {
      setMetrics(m);
      setProjects(p);
    }).finally(() => setLoading(false));
  }, []);

  const clientList = ['all', ...Array.from(new Set(metrics.map(m => m.client).filter(Boolean))).sort()];
  const scriptTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'trend-based', label: 'Trend-based' },
    { value: 'evergreen', label: 'Evergreen' },
    { value: 'educational', label: 'Educational' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'promotional', label: 'Promotional' },
  ];
  const platformOptions = [
    { value: 'all', label: 'All Platforms' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'linkedin', label: 'LinkedIn' },
  ];
  const clientOptions = clientList.map(c => ({ value: c, label: c === 'all' ? 'All Clients' : c }));

  const filtered = useMemo(() => {
    return metrics.filter(m => {
      if (filters.client !== 'all' && m.client !== filters.client) return false;
      if (filters.scriptType !== 'all' && m.script_type !== filters.scriptType) return false;
      if (filters.platform !== 'all' && m.platform !== filters.platform) return false;
      return true;
    });
  }, [metrics, filters]);

  // Summary stats
  const stats = useMemo(() => {
    if (filtered.length === 0) return { totalViews: 0, totalEngagement: 0, avgRetention: 0, topType: '-' };
    
    const totalViews = filtered.reduce((s, m) => s + (m.views || 0), 0);
    const totalEngagement = filtered.reduce((s, m) => s + (m.likes || 0) + (m.shares || 0) + (m.comments || 0) + (m.saves || 0), 0);
    const avgRetention = (filtered.reduce((s, m) => s + (m.retention_rate || 0), 0) / filtered.length).toFixed(1);
    
    const typeCount = {};
    filtered.forEach(m => {
      typeCount[m.script_type] = (typeCount[m.script_type] || 0) + 1;
    });
    const topType = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a])[0];

    return { totalViews, totalEngagement, avgRetention, topType };
  }, [filtered]);

  // Performance by script type
  const typeChart = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      if (!map[m.script_type]) map[m.script_type] = { type: m.script_type, views: 0, engagement: 0, retention: 0, count: 0 };
      map[m.script_type].views += m.views || 0;
      map[m.script_type].engagement += (m.likes || 0) + (m.shares || 0) + (m.comments || 0) + (m.saves || 0);
      map[m.script_type].retention += m.retention_rate || 0;
      map[m.script_type].count += 1;
    });
    return Object.values(map).map(d => ({ ...d, retention: (d.retention / d.count).toFixed(1) }));
  }, [filtered]);

  // Performance by platform
  const platformChart = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      if (!map[m.platform]) map[m.platform] = { platform: m.platform, views: 0, engagement: 0, shares: 0 };
      map[m.platform].views += m.views || 0;
      map[m.platform].engagement += (m.likes || 0) + (m.shares || 0) + (m.comments || 0) + (m.saves || 0);
      map[m.platform].shares += m.shares || 0;
    });
    return Object.values(map);
  }, [filtered]);

  // Performance by client
  const clientChart = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      if (!map[m.client]) map[m.client] = { client: m.client, views: 0, conversions: 0, engagement: 0 };
      map[m.client].views += m.views || 0;
      map[m.client].conversions += m.conversions || 0;
      map[m.client].engagement += (m.likes || 0) + (m.shares || 0) + (m.comments || 0) + (m.saves || 0);
    });
    return Object.values(map).sort((a, b) => b.views - a.views);
  }, [filtered]);

  // Top performing scripts
  const topScripts = useMemo(() => {
    return filtered
      .map(m => ({
        ...m,
        totalEngagement: (m.likes || 0) + (m.shares || 0) + (m.comments || 0) + (m.saves || 0),
      }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);
  }, [filtered]);

  // Script type distribution
  const typeDistribution = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      map[m.script_type] = (map[m.script_type] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ name: type, value: count }));
  }, [filtered]);

  if (loading) {
    return <div style={{ padding: 40, color: '#555', fontFamily: MONO, fontSize: 12 }}>Loading analytics...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Script Analytics 📊</div>
        <div style={{ fontSize: 13, color: '#666', fontFamily: MONO }}>Track performance & optimize content strategy</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setSheetOpen('client')} style={{
          padding: '9px 12px', background: filters.client !== 'all' ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
          border: `1px solid ${filters.client !== 'all' ? 'rgba(232,26,26,0.5)' : '#222'}`,
          borderRadius: 8, fontSize: 11, fontWeight: 600, color: filters.client !== 'all' ? '#E81A1A' : '#888',
          cursor: 'pointer', fontFamily: MONO
        }}>
          🏢 {filters.client === 'all' ? 'All Clients' : filters.client}
        </button>
        <button onClick={() => setSheetOpen('type')} style={{
          padding: '9px 12px', background: filters.scriptType !== 'all' ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
          border: `1px solid ${filters.scriptType !== 'all' ? 'rgba(232,26,26,0.5)' : '#222'}`,
          borderRadius: 8, fontSize: 11, fontWeight: 600, color: filters.scriptType !== 'all' ? '#E81A1A' : '#888',
          cursor: 'pointer', fontFamily: MONO
        }}>
          📝 {scriptTypeOptions.find(o => o.value === filters.scriptType)?.label}
        </button>
        <button onClick={() => setSheetOpen('platform')} style={{
          padding: '9px 12px', background: filters.platform !== 'all' ? 'rgba(232,26,26,0.1)' : '#1A1A1A',
          border: `1px solid ${filters.platform !== 'all' ? 'rgba(232,26,26,0.5)' : '#222'}`,
          borderRadius: 8, fontSize: 11, fontWeight: 600, color: filters.platform !== 'all' ? '#E81A1A' : '#888',
          cursor: 'pointer', fontFamily: MONO
        }}>
          📱 {platformOptions.find(o => o.value === filters.platform)?.label}
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Views</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{stats.totalViews.toLocaleString()}</div>
        </div>
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Engagement</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#E81A1A' }}>{stats.totalEngagement.toLocaleString()}</div>
        </div>
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Avg Retention</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7BC853' }}>{stats.avgRetention}%</div>
        </div>
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 10, padding: '16px' }}>
          <div style={{ fontSize: 10, color: '#555', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Top Type</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#4A9EFF' }}>{stats.topType}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        
        {/* Views by platform */}
        {platformChart.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: MONO }}>Views by Platform</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={platformChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="platform" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="views" fill="#E81A1A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Engagement by type */}
        {typeChart.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: MONO }}>Engagement by Type</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="type" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="engagement" fill="#7BC853" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Script type distribution */}
        {typeDistribution.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: MONO }}>Script Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Performance by client */}
      {clientChart.length > 0 && (
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, fontFamily: MONO }}>Performance by Client</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={clientChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="client" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#555', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 8 }} />
              <Legend />
              <Bar yAxisId="left" dataKey="views" fill="#E81A1A" name="Views" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="conversions" fill="#7BC853" name="Conversions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top performing scripts */}
      {topScripts.length > 0 && (
        <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, fontFamily: MONO }}>Top Performing Scripts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topScripts.map((script, idx) => (
              <div key={script.id} style={{
                background: '#111', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{script.script_title}</div>
                  <div style={{ fontSize: 10, color: '#666', fontFamily: MONO }}>
                    {script.client} • {script.script_type} • {script.platform}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Views</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{(script.views || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Engagement</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E81A1A' }}>{script.totalEngagement.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Retention</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7BC853' }}>{(script.retention_rate || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 15 }}>No script performance data yet. Create and track scripts to see analytics here.</div>
        </div>
      )}

      {/* Bottom sheets for filters */}
      <BottomSheet
        open={sheetOpen === 'client'}
        onClose={() => setSheetOpen(null)}
        title="Filter by Client"
        options={clientOptions}
        value={filters.client}
        onChange={(val) => { setFilters({...filters, client: val}); setSheetOpen(null); }}
      />
      <BottomSheet
        open={sheetOpen === 'type'}
        onClose={() => setSheetOpen(null)}
        title="Filter by Type"
        options={scriptTypeOptions}
        value={filters.scriptType}
        onChange={(val) => { setFilters({...filters, scriptType: val}); setSheetOpen(null); }}
      />
      <BottomSheet
        open={sheetOpen === 'platform'}
        onClose={() => setSheetOpen(null)}
        title="Filter by Platform"
        options={platformOptions}
        value={filters.platform}
        onChange={(val) => { setFilters({...filters, platform: val}); setSheetOpen(null); }}
      />
    </div>
  );
}