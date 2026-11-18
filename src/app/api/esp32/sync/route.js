import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-esp32-key');
    const expectedKey = process.env.ESP32_API_SECRET || 'esp32_secret_key_98765';

    if (apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized ESP32 key' }, { status: 401 });
    }

    const body = await request.json();
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

    const { data: dbState, error } = await supabaseAdmin
      .from('device_state')
      .select('*')
      .eq('id', 'esp32_main')
      .single();

    if (error || !dbState) {
      return NextResponse.json({ error: 'Database row missing' }, { status: 500 });
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

      const { data: updated } = await supabaseAdmin
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

      if (logsToInsert.length > 0) {
        await supabaseAdmin.from('relay_logs').insert(logsToInsert);
      }

      return NextResponse.json(formatEspResponse(updated || dbState));
    }

    // Case 2: Normal heartbeat poll — update last_seen & return desired cloud state to ESP32
    await supabaseAdmin
      .from('device_state')
      .update({
        active_network: activeNetwork,
        last_seen: nowIso,
      })
      .eq('id', 'esp32_main');

    return NextResponse.json(formatEspResponse(dbState));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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