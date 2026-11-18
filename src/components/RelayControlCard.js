'use client';

import React, { useState } from 'react';
import { Power, Hand, Zap } from 'lucide-react';

export default function RelayControlCard({
  relayNum,
  title,
  gpio,
  isActive,
  isOverride,
  watts,
  busy,
  onToggle,
  onUpdateWatts,
}) {
  const [wattInput, setWattInput] = useState(String(watts || 60));

  const handleWattBlur = () => {
    const val = parseInt(wattInput, 10);
    if (!isNaN(val) && val > 0 && val !== watts) {
      onUpdateWatts(relayNum, val);
    } else {
      setWattInput(String(watts || 60));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {gpio}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="text-xs font-medium text-slate-400">
              {isActive ? 'ACTIVE (Relay Closed)' : 'OFF (Relay Open)'}
            </span>
          </div>

          {isOverride && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
              <Hand className="w-3 h-3" />
              MANUAL OVERRIDE
            </div>
          )}
        </div>

        {/* ON / OFF Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={busy}
            onClick={() => onToggle(relayNum, true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isActive
                ? 'bg-emerald-500 text-white ring-2 ring-white shadow-lg shadow-emerald-500/25'
                : 'bg-emerald-600/25 text-emerald-300 hover:bg-emerald-600/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            ON
          </button>

          <button
            disabled={busy}
            onClick={() => onToggle(relayNum, false)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              !isActive
                ? 'bg-rose-500 text-white ring-2 ring-white shadow-lg shadow-rose-500/25'
                : 'bg-rose-600/25 text-rose-300 hover:bg-rose-600/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            OFF
          </button>
        </div>
      </div>

      {/* Load Wattage Input for Cost Calculation */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Connected Load (Watts)
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            max="10000"
            value={wattInput}
            onChange={(e) => setWattInput(e.target.value)}
            onBlur={handleWattBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-20 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1 text-right font-mono text-slate-200 outline-none"
          />
          <span className="text-slate-500 font-semibold">W</span>
        </div>
      </div>
    </div>
  );
}