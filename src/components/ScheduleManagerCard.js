/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { CalendarClock, Hand, Save, Wifi, Eye, EyeOff } from 'lucide-react';

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

export default function ScheduleManagerCard({ deviceState, onUpdateSchedule, onSaveCustomWifi }) {
  const [wifiEnabled, setWifiEnabled] = useState(Boolean(deviceState?.custom_wifi_enabled));
  const [wifiSsid, setWifiSsid] = useState(deviceState?.custom_wifi_ssid || '');
  const [wifiPass, setWifiPass] = useState(deviceState?.custom_wifi_pass || '');
  const [showPass, setShowPass] = useState(false);
  const [savingWifi, setSavingWifi] = useState(false);

  useEffect(() => {
    if (!deviceState) return;
    setWifiEnabled(Boolean(deviceState.custom_wifi_enabled));
    setWifiSsid(deviceState.custom_wifi_ssid || '');
    setWifiPass(deviceState.custom_wifi_pass || '');
  }, [deviceState]);

  const handleToggleFallbackWifi = async (checked) => {
    if (checked && !wifiSsid.trim()) {
      alert('Please enter a Custom Wi-Fi SSID first, then tick the checkbox.');
      return;
    }
    setWifiEnabled(checked);
    setSavingWifi(true);
    await onSaveCustomWifi({
      enabled: checked,
      ssid: wifiSsid.trim(),
      password: wifiPass,
    });
    setSavingWifi(false);
  };

  const handleSaveWifiCredentials = async () => {
    if (wifiEnabled && !wifiSsid.trim()) {
      alert('Please enter a Custom Wi-Fi SSID.');
      return;
    }
    setSavingWifi(true);
    await onSaveCustomWifi({
      enabled: wifiEnabled,
      ssid: wifiSsid.trim(),
      password: wifiPass,
    });
    setSavingWifi(false);
  };

  return (
    <div className="space-y-5">
      {/* Automation Schedules Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Automation Schedules</h2>
            <p className="text-xs text-slate-400">
              Syncs automatically to ESP32 Flash memory (survives power &amp; Wi-Fi loss)
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

      {/* Custom Fallback Wi-Fi Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Custom Fallback Wi-Fi</h2>
              <p className="text-xs text-slate-400">
                When ticked ON, ESP32 checks default networks first and uses this network as a 3rd fallback
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              checked={wifiEnabled}
              disabled={savingWifi}
              onChange={(e) => handleToggleFallbackWifi(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-200">
              {wifiEnabled ? 'Custom Fallback Enabled' : 'Disabled (Default Only)'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Wi-Fi Name (SSID)</label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              placeholder="Enter custom Wi-Fi SSID"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Wi-Fi Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                placeholder="Enter Wi-Fi password"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 pr-10 text-sm text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={savingWifi}
            onClick={handleSaveWifiCredentials}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingWifi ? 'Saving...' : 'Save Custom Wi-Fi'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          Active Connection Order:{' '}
          <span className="text-slate-200 font-medium">
            {wifiEnabled && wifiSsid.trim()
              ? `1. CCTV_2 (Default) → 2. Iresh’s iPhone (Backup) → 3. ${wifiSsid.trim()} (Custom)`
              : '1. CCTV_2 (Default) → 2. Iresh’s iPhone (Backup)'}
          </span>
        </p>
      </div>
    </div>
  );
}