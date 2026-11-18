// Sri Lanka LKR tariff estimate per kWh (adjust anytime in UI or here)
export const LKR_PER_KWH = 35;

/**
 * Calculates daily runtime hours (last 7 days), total kWh, estimated LKR cost,
 * and trigger source distribution from relay_logs.
 */
export function computeRelayAnalytics(logs = [], r1Watts = 60, r2Watts = 100, currentState = null) {
  const now = new Date();
  const days = [];
  const dayMap = {};

  // Build last 7 days skeleton (YYYY-MM-DD)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const entry = {
      date: key,
      label,
      relay1Hours: 0,
      relay2Hours: 0,
      totalKwh: 0,
      costLkr: 0,
    };
    days.push(entry);
    dayMap[key] = entry;
  }

  // Sort logs oldest -> newest to pair ON -> OFF intervals
  const sorted = [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const activeStart = { 1: null, 2: null };
  const sourceCounts = { SCHEDULE: 0, WEB: 0, BLE: 0, ANDROID: 0, BOOT: 0 };

  for (const log of sorted) {
    const r = log.relay_num;
    const ts = new Date(log.created_at);
    const src = (log.trigger_source || 'WEB').toUpperCase();
    if (sourceCounts[src] !== undefined) {
      sourceCounts[src] += 1;
    } else {
      sourceCounts[src] = 1;
    }

    if (log.state === true) {
      if (!activeStart[r]) {
        activeStart[r] = ts;
      }
    } else if (log.state === false && activeStart[r]) {
      addIntervalToDays(dayMap, r, activeStart[r], ts);
      activeStart[r] = null;
    }
  }

  // If a relay is currently ON, include runtime up to "now"
  if (currentState?.relay1 && activeStart[1]) {
    addIntervalToDays(dayMap, 1, activeStart[1], now);
  }
  if (currentState?.relay2 && activeStart[2]) {
    addIntervalToDays(dayMap, 2, activeStart[2], now);
  }

  let totalR1Hours = 0;
  let totalR2Hours = 0;

  for (const day of days) {
    day.relay1Hours = Number(day.relay1Hours.toFixed(2));
    day.relay2Hours = Number(day.relay2Hours.toFixed(2));
    const kwh = (day.relay1Hours * r1Watts + day.relay2Hours * r2Watts) / 1000;
    day.totalKwh = Number(kwh.toFixed(3));
    day.costLkr = Number((kwh * LKR_PER_KWH).toFixed(2));

    totalR1Hours += day.relay1Hours;
    totalR2Hours += day.relay2Hours;
  }

  const totalKwh = Number(((totalR1Hours * r1Watts + totalR2Hours * r2Watts) / 1000).toFixed(2));
  const totalCostLkr = Number((totalKwh * LKR_PER_KWH).toFixed(2));

  const triggerBreakdown = Object.entries(sourceCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  return {
    dailySeries: days,
    totalR1Hours: Number(totalR1Hours.toFixed(1)),
    totalR2Hours: Number(totalR2Hours.toFixed(1)),
    totalKwh,
    totalCostLkr,
    triggerBreakdown,
  };
}

function addIntervalToDays(dayMap, relayNum, startDate, endDate) {
  let cursor = new Date(startDate);
  const end = new Date(endDate);
  if (end <= cursor) return;

  while (cursor < end) {
    const dayKey = cursor.toISOString().slice(0, 10);
    const nextMidnight = new Date(cursor);
    nextMidnight.setUTCHours(24, 0, 0, 0);

    const segmentEnd = end < nextMidnight ? end : nextMidnight;
    const hours = (segmentEnd - cursor) / (1000 * 60 * 60);

    if (dayMap[dayKey]) {
      if (relayNum === 1) dayMap[dayKey].relay1Hours += hours;
      if (relayNum === 2) dayMap[dayKey].relay2Hours += hours;
    }

    cursor = segmentEnd;
  }
}