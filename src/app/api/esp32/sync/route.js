import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-esp32-key');
    const expectedKey = process.env.ESP32_API_SECRET || 'esp32_secret_key_98765';

    if (apiKey !== expectedKey) {
      console.error('ESP32 sync unauthorized key:', apiKey);
      return NextResponse.json({ error: 'Unauthorized ESP32 key' }, { status: 401 });
    }

    const rawText = await request.text();
    let body = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr) {
      console.error('ESP32 JSON parse error:', parseErr.message, 'Raw payload:', rawText);
      return NextResponse.json({ error: 'Invalid JSON payload from ESP32' }, { status: 400 });
    }

    const {
      activeNetwork = 'WIFI',
      localChanged = false,
      relay1,
      relay2,
      r1SchedEnabled,
      r1OnTime,
      r1OffTime,
      r1Override,
      r2SchedEnabled,
      r2OnTime,
      r2OffTime,
      r2Override,
    } = body;

    let { data: dbState, error } = await supabaseAdmin
      .from('device_state')
      .select('*')
      .eq('id', 'esp32_main')
      .maybeSingle();

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-seed the 'esp32_main' row if it doesn't exist yet
    if (!dbState) {
      console.warn('esp32_main row missing — auto-inserting default row...');
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('device_state')
        .insert({ id: 'esp32_main' })
        .select()
        .single();

      if (insertErr || !inserted) {
        console.error('Supabase auto-insert error:', insertErr);
        return NextResponse.json(
          { error: insertErr?.message || 'Failed to initialize device_state row' },
          { status: 500 }
        );
      }
      dbState = inserted;
    }

    const nowIso = new Date().toISOString();

    // Case 1: ESP32 had a local event (BLE button, Schedule trigger, or Boot catch-up)
    // Push ESP32's authoritative hardware state up to Supabase
    if (localChanged) {
      const logsToInsert = [];
      if (typeof relay1 === 'boolean' && relay1 !== dbState.relay1) {
        logsToInsert.push({
          relay_num: 1,
          state: relay1,
          trigger_source: r1Override ? 'BLE' : 'SCHEDULE',
        });
      }
      if (typeof relay2 === 'boolean' && relay2 !== dbState.relay2) {
        logsToInsert.push({
          relay_num: 2,
          state: relay2,
          trigger_source: r2Override ? 'BLE' : 'SCHEDULE',
        });
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('device_state')
        .update({
          relay1: typeof relay1 === 'boolean' ? relay1 : dbState.relay1,
          relay2: typeof relay2 === 'boolean' ? relay2 : dbState.relay2,
          r1_sched_enabled: typeof r1SchedEnabled === 'boolean' ? r1SchedEnabled : dbState.r1_sched_enabled,
          r1_on_time: r1OnTime || dbState.r1_on_time,
          r1_off_time: r1OffTime || dbState.r1_off_time,
          r1_override: typeof r1Override === 'boolean' ? r1Override : dbState.r1_override,
          r2_sched_enabled: typeof r2SchedEnabled === 'boolean' ? r2SchedEnabled : dbState.r2_sched_enabled,
          r2_on_time: r2OnTime || dbState.r2_on_time,
          r2_off_time: r2OffTime || dbState.r2_off_time,
          r2_override: typeof r2Override === 'boolean' ? r2Override : dbState.r2_override,
          active_network: activeNetwork,
          last_seen: nowIso,
          updated_by: 'ESP32',
        })
        .eq('id', 'esp32_main')
        .select()
        .single();

      if (updateErr) {
        console.error('Supabase localChanged update error:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      if (logsToInsert.length > 0) {
        const { error: logErr } = await supabaseAdmin.from('relay_logs').insert(logsToInsert);
        if (logErr) console.error('Supabase relay_logs insert error:', logErr);
      }

      return NextResponse.json(formatEspResponse(updated || dbState));
    }

    // Case 2: Normal heartbeat poll — update last_seen & return desired cloud state to ESP32
    const { error: heartbeatErr } = await supabaseAdmin
      .from('device_state')
      .update({
        active_network: activeNetwork,
        last_seen: nowIso,
      })
      .eq('id', 'esp32_main');

    if (heartbeatErr) {
      console.error('Supabase heartbeat update error:', heartbeatErr);
      return NextResponse.json({ error: heartbeatErr.message }, { status: 500 });
    }

    return NextResponse.json(formatEspResponse(dbState));
  } catch (err) {
    console.error('ESP32 sync unhandled crash:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

function formatEspResponse(row) {
  return {
    r1: row.relay1 ? 1 : 0,
    r2: row.relay2 ? 1 : 0,
    r1En: row.r1_sched_enabled ? 1 : 0,
    r1On: row.r1_on_time,
    r1Off: row.r1_off_time,
    r1Over: row.r1_override ? 1 : 0,
    r2En: row.r2_sched_enabled ? 1 : 0,
    r2On: row.r2_on_time,
    r2Off: row.r2_off_time,
    r2Over: row.r2_override ? 1 : 0,
  };
}