import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, pin, source = 'WEB', payload = {} } = body;

    // Validate PIN for security
    const expectedPin = process.env.NEXT_PUBLIC_DASHBOARD_PIN || '2026';
    if (String(pin) !== String(expectedPin)) {
      return NextResponse.json({ error: 'Invalid Dashboard PIN' }, { status: 401 });
    }

    // Fetch current state first
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('device_state')
      .select('*')
      .eq('id', 'esp32_main')
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Device state not found' }, { status: 500 });
    }

    const updates = { updated_by: source };
    const logsToInsert = [];

    switch (action) {
      case 'TOGGLE_RELAY': {
        const { relayNum, state } = payload;
        const boolState = Boolean(state);
        if (relayNum === 1) {
          updates.relay1 = boolState;
          updates.r1_override = current.r1_sched_enabled;
          if (current.relay1 !== boolState) {
            logsToInsert.push({ relay_num: 1, state: boolState, trigger_source: source });
          }
        } else if (relayNum === 2) {
          updates.relay2 = boolState;
          updates.r2_override = current.r2_sched_enabled;
          if (current.relay2 !== boolState) {
            logsToInsert.push({ relay_num: 2, state: boolState, trigger_source: source });
          }
        }
        break;
      }

      case 'UPDATE_SCHEDULE': {
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
        break;
      }

      case 'UPDATE_WATTS': {
        const { relayNum, watts } = payload;
        const parsed = Math.max(1, Math.min(10000, Number(watts) || 60));
        if (relayNum === 1) updates.r1_watts = parsed;
        if (relayNum === 2) updates.r2_watts = parsed;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { data: updatedRow, error: updateErr } = await supabaseAdmin
      .from('device_state')
      .update(updates)
      .eq('id', 'esp32_main')
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (logsToInsert.length > 0) {
      await supabaseAdmin.from('relay_logs').insert(logsToInsert);
    }

    return NextResponse.json({ ok: true, state: updatedRow });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}