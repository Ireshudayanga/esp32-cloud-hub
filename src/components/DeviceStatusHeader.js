'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Clock, LogOut } from 'lucide-react';

export default function DeviceStatusHeader({ deviceState, onLock }) {
  const [secondsAgo, setSecondsAgo] = useState(null);

  useEffect(() => {
    const updateDiff = () => {
      if (!deviceState?.last_seen) {
        setSecondsAgo(null);
        return;
      }
      const diff = Math.max(0, Math.floor((Date.now() - new Date(deviceState.last_seen).getTime()) / 1000));
      setSecondsAgo(diff);
    };

    updateDiff();
    const timer = setInterval(updateDiff, 1000);
    return () => clearInterval(timer);
  }, [deviceState?.last_seen]);

  const isOnline = secondsAgo !== null && secondsAgo <= 20;

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
            E32
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100 leading-tight">
              ESP32 Control Hub
            </h1>
            <p className="text-[11px] text-slate-400">Cloud & Realtime Automation</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Online / Offline Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>
              {isOnline
                ? `Online (${deviceState?.active_network || 'Wi-Fi'})`
                : secondsAgo !== null
                ? `Offline (${secondsAgo}s ago)`
                : 'Waiting for ESP32'}
            </span>
          </div>

          {secondsAgo !== null && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Ping: {secondsAgo}s</span>
            </div>
          )}

          <button
            onClick={onLock}
            title="Lock Dashboard"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}