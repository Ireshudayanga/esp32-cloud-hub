'use client';

import React from 'react';
import { History } from 'lucide-react';

export default function ActivityLogList({ logs = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-5 h-5 text-blue-400" />
        <h2 className="text-base font-bold text-slate-100">Recent Switch Activity</h2>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">
          No relay switching history recorded yet. Toggle a relay above to test!
        </p>
      ) : (
        <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
          {logs.slice(0, 20).map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    item.state
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {item.state ? 'ON' : 'OFF'}
                </span>
                <span className="font-semibold text-slate-200">Relay {item.relay_num}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {item.trigger_source}
                </span>
              </div>

              <span className="text-slate-400 font-mono text-[11px]">
                {new Date(item.created_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}