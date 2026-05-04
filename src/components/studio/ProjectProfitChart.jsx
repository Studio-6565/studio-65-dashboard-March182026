import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { fmt } from '@/lib/studio';

const MONO = '"DM Mono", monospace';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', fontFamily: MONO, fontSize: 11, minWidth: 180 }}>
      <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6, fontSize: 12 }}>{d?.name}</div>
      <div style={{ color: '#555', marginBottom: 2 }}>{d?.client}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 8 }}>
        <span style={{ color: '#888' }}>Revenue</span>
        <span style={{ color: '#fff' }}>{fmt(d?.revenue)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 3 }}>
        <span style={{ color: '#888' }}>Crew</span>
        <span style={{ color: '#E81A1A' }}>−{fmt(d?.crewCost)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 3 }}>
        <span style={{ color: '#888' }}>Rentals</span>
        <span style={{ color: '#E81A1A' }}>−{fmt(d?.rentalCost)}</span>
      </div>
      <div style={{ height: 1, background: '#333', margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
        <span style={{ color: '#888', fontWeight: 700 }}>Profit</span>
        <span style={{ fontWeight: 800, color: d?.profit >= 0 ? '#7BC853' : '#E81A1A' }}>{fmt(d?.profit)}</span>
      </div>
      {d?.margin != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 3 }}>
          <span style={{ color: '#555' }}>Margin</span>
          <span style={{ color: d?.margin >= 50 ? '#7BC853' : d?.margin >= 25 ? '#F59E0B' : '#E81A1A' }}>{d?.margin}%</span>
        </div>
      )}
    </div>
  );
}

const RANGES = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
  { label: 'All', months: null },
];

export default function ProjectProfitChart({ projects = [] }) {
  const [range, setRange] = useState(6);

  const data = useMemo(() => {
    const active = projects.filter(p => !p.archived && p.revenue > 0);

    // Filter by range
    const cutoff = range ? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - range);
      return d.toISOString().split('T')[0];
    })() : null;

    const filtered = cutoff
      ? active.filter(p => (p.date || p.created_date || '') >= cutoff)
      : active;

    // Sort by date ascending
    return filtered
      .slice()
      .sort((a, b) => (a.date || a.created_date || '').localeCompare(b.date || b.created_date || ''))
      .map(p => {
        const revenue = p.revenue || 0;
        const crewCost = p.crew_cost || (p.crew || []).reduce((s, c) => {
          return s + (c.rate_type === 'hourly' ? (c.cost || 0) * (c.hours || 0) : (c.cost || 0));
        }, 0);
        const rentalCost = p.rental_cost || (p.rentals || []).reduce((s, r) => s + (r.total_cost || r.cost || 0), 0);
        const profit = revenue - crewCost - rentalCost;
        const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null;
        return {
          name: p.name,
          client: p.client,
          date: p.date,
          revenue,
          crewCost,
          rentalCost,
          profit,
          margin,
          // short label for x-axis
          label: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
        };
      });
  }, [projects, range]);

  const totalProfit = data.reduce((s, d) => s + d.profit, 0);
  const avgMargin = data.length > 0
    ? Math.round(data.filter(d => d.revenue > 0).reduce((s, d) => s + (d.margin || 0), 0) / data.filter(d => d.revenue > 0).length)
    : 0;
  const bestProject = data.reduce((best, d) => (!best || d.profit > best.profit) ? d : best, null);

  if (data.length === 0) return null;

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #252525', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Project Profit Trend</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: totalProfit >= 0 ? '#7BC853' : '#E81A1A' }}>{fmt(totalProfit)}</span>
              <span style={{ fontSize: 11, color: '#555', fontFamily: MONO, marginLeft: 6 }}>total profit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: avgMargin >= 50 ? '#7BC853' : avgMargin >= 25 ? '#F59E0B' : '#E81A1A' }}>{avgMargin}%</span>
              <span style={{ fontSize: 11, color: '#555', fontFamily: MONO }}>avg margin</span>
            </div>
          </div>
          {bestProject && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 4 }}>
              Best: <span style={{ color: '#7BC853' }}>{bestProject.name}</span> · {fmt(bestProject.profit)}
            </div>
          )}
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 8, padding: 3 }}>
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.months)}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                fontFamily: MONO, cursor: 'pointer', border: 'none',
                background: range === r.months ? '#E81A1A' : 'transparent',
                color: range === r.months ? '#fff' : '#555',
                transition: 'all 0.15s',
              }}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1E1E1E" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#444', fontSize: 9, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#7BC853"
            strokeWidth={2}
            dot={{ fill: '#7BC853', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#7BC853', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 2, background: '#7BC853', borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Profit (Revenue − Crew − Rentals)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 1, background: '#333', borderRadius: 1, borderTop: '1px dashed #333' }} />
          <span style={{ fontSize: 10, color: '#555', fontFamily: MONO }}>Break-even</span>
        </div>
      </div>
    </div>
  );
}