'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, Zap, Coins, Clock } from 'lucide-react';
import { computeRelayAnalytics } from '@/lib/analyticsHelpers';

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#64748b'];

export default function AnalyticsDashboard({ logs, deviceState }) {
  const analytics = useMemo(() => {
    return computeRelayAnalytics(
      logs,
      deviceState?.r1_watts || 60,
      deviceState?.r2_watts || 100,
      deviceState
    );
  }, [logs, deviceState]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <div>
          <h2 className="text-base font-bold text-slate-100">7-Day Usage & Power Analytics</h2>
          <p className="text-xs text-slate-400">Runtime hours, estimated kWh consumption & LKR bill impact</p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Relay 1 Runtime
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">{analytics.totalR1Hours}h</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Relay 2 Runtime
          </div>
          <p className="text-xl font-bold font-mono text-slate-100">{analytics.totalR2Hours}h</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Total Energy
          </div>
          <p className="text-xl font-bold font-mono text-amber-300">{analytics.totalKwh} kWh</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <Coins className="w-3.5 h-3.5 text-purple-400" />
            Est. 7-Day Cost
          </div>
          <p className="text-xl font-bold font-mono text-purple-300">Rs. {analytics.totalCostLkr}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Runtime Bar Chart */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">Daily ON Runtime (Hours)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="relay1Hours" name="Relay 1 (hrs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="relay2Hours" name="Relay 2 (hrs)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trigger Source Breakdown Pie Chart */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-slate-300 mb-2">Trigger Source Breakdown</h3>
          {analytics.triggerBreakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              No switch events logged yet
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.triggerBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={4}
                  >
                    {analytics.triggerBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {analytics.triggerBreakdown.map((item, idx) => (
              <span
                key={item.name}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                {item.name}: {item.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}