import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, pin, payload, source = 'WEB' } = body;

    const validPin = process.env.ADMIN_PIN || '2026';
    if (String(pin) !== String(validPin)) {
      return NextResponse.json({ ok: false, error: 'Invalid Security PIN' }, { status: 401 });
    }

    const { data: currentState, error: fetchErr } = await supabaseAdmin
      .from('device_state')
      .select('*')
      .eq('id', 'esp32_main')
      .single();

    if (fetchErr || !currentState) {
      return NextResponse.json({ ok: false, error: 'Device state not found' }, { status: 500 });
    }

    let updates = {};
    let logEntry = null;

    if (action === 'TOGGLE_RELAY') {
      const { relayNum, state } = payload;
      const boolState = Boolean(state);

      if (relayNum === 1) {
        updates.relay1 = boolState;
        updates.r1_override = currentState.r1_sched_enabled ? true : false;
      } else if (relayNum === 2) {
        updates.relay2 = boolState;
        updates.r2_override = currentState.r2_sched_enabled ? true : false;
      }

      logEntry = {
        relay_num: relayNum,
        state: boolState,
        trigger_source: source,
        notes: `Toggled via ${source} Dashboard`,
      };
    } else if (action === 'UPDATE_SCHEDULE') {
      const { relayNum, enabled, onTime, offTime } = payload;
      if (relayNum === 1) {
        if (typeof enabled === 'boolean') updates.r1_sched_enabled = enabled;
        if (onTime) updates.r1_on_time = onTime;
        if (offTime) updates.r1_off_time = offTime;
        updates.r1_override = false;
      } else if (relayNum === 2) {
        if (typeof enabled === 'boolean') updates.r2_sched_enabled = enabled;
        if (onTime) updates.r2_on_time = onTime;
        if (offTime) updates.r2_off_time = offTime;
        updates.r2_override = false;
      }
    } else if (action === 'UPDATE_WATTS') {
      const { relayNum, watts } = payload;
      const numWatts = Math.max(1, Number(watts) || 60);
      if (relayNum === 1) updates.r1_watts = numWatts;
      if (relayNum === 2) updates.r2_watts = numWatts;
    } else if (action === 'UPDATE_CUSTOM_WIFI') {
      const { enabled, ssid, password } = payload;
      updates.custom_wifi_enabled = Boolean(enabled);
      if (typeof ssid === 'string') updates.custom_wifi_ssid = ssid.trim();
      if (typeof password === 'string') updates.custom_wifi_pass = password;
    } else {
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }

    const { data: updatedState, error: updateErr } = await supabaseAdmin
      .from('device_state')
      .update(updates)
      .eq('id', 'esp32_main')
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    if (logEntry) {
      await supabaseAdmin.from('relay_logs').insert([logEntry]);
    }

    return NextResponse.json({ ok: true, state: updatedState });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}