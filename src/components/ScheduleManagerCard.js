'use client';

import React, { useState, useEffect } from 'react';
import { CalendarClock, Hand, Save } from 'lucide-react';

function RelayScheduleRow({ relayNum, title, gpio, enabled, onTime, offTime, isOverride, onSave }) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localOn, setLocalOn] = useState(onTime || '18:15');
  const [localOff, setLocalOff] = useState(offTime || '06:30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalEnabled(enabled);
    setLocalOn(onTime || '18:15');
    setLocalOff(offTime || '06:30');
  }, [enabled, onTime, offTime]);

  const handleToggleEnable = async () => {
    const next = !localEnabled;
    setLocalEnabled(next);
    setSaving(true);
    await onSave(relayNum, { enabled: next, onTime: localOn, offTime: localOff });
    setSaving(false);
  };

  const handleSaveTimes = async () => {
    setSaving(true);
    await onSave(relayNum, { enabled: localEnabled, onTime: localOn, offTime: localOff });
    setSaving(false);
  };

  const hasUnsavedTimeChanges = localOn !== onTime || localOff !== offTime;

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          <p className="text-[11px] text-slate-400">{gpio}</p>
        </div>

        <button
          type="button"
          onClick={handleToggleEnable}
          className={`w-16 h-7 rounded-full px-1 flex items-center transition cursor-pointer ${
            localEnabled ? 'bg-blue-600 justify-between flex-row-reverse' : 'bg-slate-700 justify-between'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow" />
          <span className="text-[10px] font-bold text-white px-1">
            {localEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {localEnabled && isOverride && (
        <div className="flex items-center gap-2 bg-amber-500/10 border-l-2 border-amber-500 px-3 py-1.5 rounded text-[11px] text-amber-300 font-medium">
          <Hand className="w-3.5 h-3.5 shrink-0" />
          <span>Manual override active — resumes automatically at next cycle</span>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-3 ${!localEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Auto ON Time</label>
          <input
            type="time"
            value={localOn}
            onChange={(e) => setLocalOn(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Auto OFF Time</label>
          <input
            type="time"
            value={localOff}
            onChange={(e) => setLocalOff(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-100 outline-none"
          />
        </div>
      </div>

      {localEnabled && hasUnsavedTimeChanges && (
        <button
          disabled={saving}
          onClick={handleSaveTimes}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving to Cloud...' : 'Save Schedule Times'}
        </button>
      )}
    </div>
  );
}

export default function ScheduleManagerCard({ deviceState, onUpdateSchedule }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-blue-400" />
        <div>
          <h2 className="text-base font-bold text-slate-100">Automation Schedules</h2>
          <p className="text-xs text-slate-400">
            Syncs automatically to ESP32 Flash memory (survives power & Wi-Fi loss)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RelayScheduleRow
          relayNum={1}
          title="Relay 1 Schedule"
          gpio="GPIO 22"
          enabled={deviceState?.r1_sched_enabled ?? true}
          onTime={deviceState?.r1_on_time ?? '18:15'}
          offTime={deviceState?.r1_off_time ?? '06:30'}
          isOverride={deviceState?.r1_override ?? false}
          onSave={onUpdateSchedule}
        />

        <RelayScheduleRow
          relayNum={2}
          title="Relay 2 Schedule"
          gpio="GPIO 23"
          enabled={deviceState?.r2_sched_enabled ?? true}
          onTime={deviceState?.r2_on_time ?? '18:15'}
          offTime={deviceState?.r2_off_time ?? '06:30'}
          isOverride={deviceState?.r2_override ?? false}
          onSave={onUpdateSchedule}
        />
      </div>
    </div>
  );
}