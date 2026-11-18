'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import PinLockScreen from '@/components/PinLockScreen';
import DeviceStatusHeader from '@/components/DeviceStatusHeader';
import RelayControlCard from '@/components/RelayControlCard';
import ScheduleManagerCard from '@/components/ScheduleManagerCard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ActivityLogList from '@/components/ActivityLogList';

export default function DashboardPage() {
  const [pin, setPin] = useState(null);
  const [deviceState, setDeviceState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);

  // Restore PIN from current browser session if already unlocked
  useEffect(() => {
    const saved = sessionStorage.getItem('esp32_hub_pin');
    if (saved) setPin(saved);
  }, []);

  const loadInitialData = useCallback(async () => {
    const { data: stateRow } = await supabase
      .from('device_state')
      .select('*')
      .eq('id', 'esp32_main')
      .single();

    if (stateRow) setDeviceState(stateRow);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logRows } = await supabase
      .from('relay_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(300);

    if (logRows) setLogs(logRows);
  }, []);

  useEffect(() => {
    if (!pin) return;

    loadInitialData();

    // Subscribe to Realtime changes on device_state and relay_logs
    const channel = supabase
      .channel('esp32_cloud_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_state', filter: 'id=eq.esp32_main' },
        (payload) => {
          if (payload.new) setDeviceState(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'relay_logs' },
        (payload) => {
          if (payload.new) {
            setLogs((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin, loadInitialData]);

  const sendControlAction = async (action, payload) => {
    setBusy(true);
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pin, source: 'WEB', payload }),
      });
      const json = await res.json();
      if (json.ok && json.state) {
        setDeviceState(json.state);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!pin) {
    return <PinLockScreen onUnlock={(validPin) => setPin(validPin)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      <DeviceStatusHeader
        deviceState={deviceState}
        onLock={() => {
          sessionStorage.removeItem('esp32_hub_pin');
          setPin(null);
        }}
      />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Relay Control Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RelayControlCard
            relayNum={1}
            title="Relay 1"
            gpio="GPIO 22"
            isActive={Boolean(deviceState?.relay1)}
            isOverride={Boolean(deviceState?.r1_override)}
            watts={deviceState?.r1_watts ?? 60}
            busy={busy}
            onToggle={(relayNum, state) => sendControlAction('TOGGLE_RELAY', { relayNum, state })}
            onUpdateWatts={(relayNum, watts) => sendControlAction('UPDATE_WATTS', { relayNum, watts })}
          />

          <RelayControlCard
            relayNum={2}
            title="Relay 2"
            gpio="GPIO 23"
            isActive={Boolean(deviceState?.relay2)}
            isOverride={Boolean(deviceState?.r2_override)}
            watts={deviceState?.r2_watts ?? 100}
            busy={busy}
            onToggle={(relayNum, state) => sendControlAction('TOGGLE_RELAY', { relayNum, state })}
            onUpdateWatts={(relayNum, watts) => sendControlAction('UPDATE_WATTS', { relayNum, watts })}
          />
        </section>

        {/* Schedules */}
        <ScheduleManagerCard
          deviceState={deviceState}
          onUpdateSchedule={(relayNum, schedulePayload) =>
            sendControlAction('UPDATE_SCHEDULE', { relayNum, ...schedulePayload })
          }
        />

        {/* Analytics */}
        <AnalyticsDashboard logs={logs} deviceState={deviceState} />

        {/* Activity Timeline */}
        <ActivityLogList logs={logs} />
      </main>
    </div>
  );
}