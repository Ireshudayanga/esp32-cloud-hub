'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ScheduleManagerCard from '@/components/ScheduleManagerCard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import {
  Lock,
  Unlock,
  Power,
  Wifi,
  WifiOff,
  Activity,
  Hand,
  X,
} from 'lucide-react';

export default function DashboardPage() {
  const [deviceState, setDeviceState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(null);

  // Security PIN Session
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('esp32_hub_pin');
    if (saved) setPin(saved);
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const [{ data: stateRow }, { data: logRows }] = await Promise.all([
      supabase.from('device_state').select('*').eq('id', 'esp32_main').single(),
      supabase
        .from('relay_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(300),
    ]);

    if (stateRow) setDeviceState(stateRow);
    if (logRows) setLogs(logRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('esp32-realtime-hub')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'device_state', filter: 'id=eq.esp32_main' },
        (payload) => {
          setDeviceState(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'relay_logs' },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev.slice(0, 299)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  // Live ESP32 heartbeat ticker
  useEffect(() => {
    const updateTick = () => {
      if (!deviceState?.last_seen) {
        setSecondsAgo(null);
        return;
      }
      const diff = Math.max(
        0,
        Math.floor((Date.now() - new Date(deviceState.last_seen).getTime()) / 1000)
      );
      setSecondsAgo(diff);
    };

    updateTick();
    const timer = setInterval(updateTick, 1000);
    return () => clearInterval(timer);
  }, [deviceState?.last_seen]);

  const executeControlAction = async (action, payload, activePin = pin) => {
    if (!activePin) {
      setPendingAction({ action, payload });
      setPinError('');
      setShowPinModal(true);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, pin: activePin, source: 'WEB' }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('esp32_hub_pin');
          setPin('');
          setPinError('Invalid PIN. Try again.');
          setPendingAction({ action, payload });
          setShowPinModal(true);
        } else {
          alert(data.error || 'Failed to update device');
        }
        return;
      }

      if (data.state) setDeviceState(data.state);
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter your PIN');
      return;
    }
    const verified = pinInput.trim();
    setPin(verified);
    sessionStorage.setItem('esp32_hub_pin', verified);
    setPinInput('');
    setPinError('');
    setShowPinModal(false);

    if (pendingAction) {
      const { action, payload } = pendingAction;
      setPendingAction(null);
      executeControlAction(action, payload, verified);
    }
  };

  if (loading && !deviceState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Connecting to ESP32 Cloud Hub...
      </div>
    );
  }

  const isOnline = secondsAgo !== null && secondsAgo <= 20;
  const r1On = Boolean(deviceState?.relay1);
  const r2On = Boolean(deviceState?.relay2);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ESP32 Cloud Control Hub</h1>
            <p className="text-xs text-slate-400">Remote Relay Automation, Schedules &amp; Analytics</p>
          </div>

          <button
            onClick={() => {
              if (pin) {
                sessionStorage.removeItem('esp32_hub_pin');
                setPin('');
              } else {
                setPinError('');
                setShowPinModal(true);
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              pin
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {pin ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {pin ? 'Unlocked' : 'Unlock Controls'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ESP32 Online / Offline Status Banner */}
        <div
          className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-4 ${
            isOnline ? 'border-l-emerald-500' : 'border-l-amber-500'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
                  ESP32 Cloud Heartbeat
                </p>
                <p
                  className={`text-sm font-bold font-mono ${
                    isOnline ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isOnline
                    ? `● Online (${deviceState?.active_network || 'Wi-Fi'})`
                    : secondsAgo !== null
                    ? `○ Offline (Last seen ${secondsAgo}s ago)`
                    : 'Waiting for ESP32 heartbeat...'}
                </p>
              </div>
            </div>

            {secondsAgo !== null && (
              <span className="text-xs text-slate-400 font-mono">
                Last ping: {secondsAgo}s ago
              </span>
            )}
          </div>
        </div>

        {/* Relay 1 & Relay 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Relay 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Relay 1</h2>
                  <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    GPIO 22
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Load: {deviceState?.r1_watts || 60}W
                </p>
              </div>

              <button
                disabled={busy}
                onClick={() => executeControlAction('TOGGLE_RELAY', { relayNum: 1, state: !r1On })}
                className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                  r1On
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Power className="w-4 h-4" />
                {r1On ? 'ON' : 'OFF'}
              </button>
            </div>

            {deviceState?.r1_override && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs text-amber-300">
                <Hand className="w-3.5 h-3.5 shrink-0" />
                <span>Manual Override Active</span>
              </div>
            )}
          </div>

          {/* Relay 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Relay 2</h2>
                  <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    GPIO 23
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Load: {deviceState?.r2_watts || 100}W
                </p>
              </div>

              <button
                disabled={busy}
                onClick={() => executeControlAction('TOGGLE_RELAY', { relayNum: 2, state: !r2On })}
                className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                  r2On
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Power className="w-4 h-4" />
                {r2On ? 'ON' : 'OFF'}
              </button>
            </div>

            {deviceState?.r2_override && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs text-amber-300">
                <Hand className="w-3.5 h-3.5 shrink-0" />
                <span>Manual Override Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Schedules + Custom Priority Wi-Fi */}
        <ScheduleManagerCard
          deviceState={deviceState}
          onUpdateSchedule={(relayNum, sched) =>
            executeControlAction('UPDATE_SCHEDULE', { relayNum, ...sched })
          }
          onSaveCustomWifi={(wifiPayload) =>
            executeControlAction('UPDATE_CUSTOM_WIFI', wifiPayload)
          }
        />

        {/* 7-Day Power & Runtime Analytics */}
        <AnalyticsDashboard logs={logs} deviceState={deviceState} />

        {/* Recent Switch Activity Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">Recent Switch Activity</h2>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 max-h-64 overflow-y-auto space-y-2 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-500">No switch events recorded in the last 7 days.</p>
            ) : (
              logs.slice(0, 25).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-1.5"
                >
                  <span className={item.state ? 'text-emerald-400' : 'text-rose-400'}>
                    [{new Date(item.created_at).toLocaleString()}] Relay {item.relay_num} →{' '}
                    {item.state ? 'ON' : 'OFF'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.trigger_source}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handlePinSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Security PIN Required</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPendingAction(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter your Hub PIN to unlock relay, schedule, and Wi-Fi controls.
            </p>

            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              placeholder="••••"
              className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-widest text-white outline-none"
            />

            {pinError && <p className="text-xs text-rose-400 font-medium">{pinError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition cursor-pointer"
            >
              Unlock &amp; Continue
            </button>
          </form>
        </div>
      )}
    </div>
  );
}