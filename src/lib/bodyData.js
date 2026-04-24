import { addDays, parseDate } from './dates'

export const METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#f38ba8', step: 0.1 },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', color: '#fab387', step: 0.1 },
  { key: 'musclePct', label: 'Muscle', unit: '%', color: '#a6e3a1', step: 0.1 },
  { key: 'visceralFat', label: 'Visceral', unit: '', color: '#cba6f7', step: 1, optional: true },
]

export const getActiveMetrics = (settings) =>
  METRICS.filter(m => !m.optional || (m.key === 'visceralFat' && settings?.visceralEnabled))

// Default habits used as seed when tracker_habits storage is empty.
// Schedule spec:
//   { mode: 'daily' }
//   { mode: 'weekdays', weekdays: [0..6] }   // Sun=0 ... Sat=6
//   { mode: 'everyN',   everyN: number }     // epoch-day % N === 0
export const DEFAULT_HABITS = [
  { key: 'morning', icon: '🧘', name: 'Morning',  color: '#f9e2af',
    description: 'Ankle Circles · Hip Circles · Arch Squeeze (30s/side) · Deep Squat Hold (60s)',
    schedule: { mode: 'daily' } },
  { key: 'supsAM',  icon: '☀️', name: 'Sups AM',  color: '#cba6f7',
    description: 'Creatine · 1× Base Powder · 2× Omega 3',
    schedule: { mode: 'daily' } },
  { key: 'd3k2',    icon: '💊', name: 'D3+K2',    color: '#f5c2e7',
    description: '1× D3+K2 (every other day)',
    schedule: { mode: 'everyN', everyN: 2 } },
  { key: 'supsPM',  icon: '🌙', name: 'Sups PM',  color: '#b4befe',
    description: '1× Magnesium · 2× Omega 3',
    schedule: { mode: 'daily' } },
  { key: 'hiit',    icon: '🫀', name: 'HIIT',     color: '#89dceb',
    description: 'Zone-5 interval session',
    schedule: { mode: 'weekdays', weekdays: [3, 0] } },
]

// Back-compat alias — some tabs still import ORBIT_HABITS. Treat it as
// the default list when no persisted habits exist yet.
export const ORBIT_HABITS = DEFAULT_HABITS

export function habitApplies(h, dateStr, entries) {
  const d = new Date(dateStr + 'T12:00:00')
  const sched = h.schedule || { mode: 'daily' }
  if (sched.mode === 'weekdays') return (sched.weekdays || []).includes(d.getDay())
  if (sched.mode === 'everyN') {
    const n = Math.max(1, sched.everyN || 1)
    if (n === 1) return true
    // Applies today unless it was actually done within the last (n-1) days.
    // If user skips a scheduled day, it still applies the next day.
    for (let i = 1; i <= n - 1; i++) {
      const k = addDays(dateStr, -i)
      const done = !!entries?.[k]?.habits?.[h.key]
      if (done) return false
    }
    return true
  }
  return true
}

export function makeEmptyHabits() {
  return {
    morning: false,
    supsAM: false,
    d3k2: false,
    supsPM: false,
    gymPush: false,
    gymPull: false,
    hiit: false,
    rehab: false,
  }
}

export function makeEmptyEntry(prev) {
  return {
    weight: prev?.weight || '',
    bodyFat: prev?.bodyFat || '',
    musclePct: prev?.musclePct || '',
    visceralFat: prev?.visceralFat || '',
    habits: makeEmptyHabits(),
  }
}

export function ensureHabits(entry) {
  if (!entry) return entry
  const base = makeEmptyHabits()
  if (!entry.habits) {
    if (entry.creatine || entry.vitamins) base.supsAM = !!(entry.creatine && entry.vitamins)
    return { ...entry, habits: base }
  }
  const h = entry.habits
  const migrated = {
    ...base,
    morning: h.morning ?? h.am5 ?? false,
    supsAM: h.supsAM ?? false,
    d3k2: h.d3k2 ?? false,
    supsPM: h.supsPM ?? false,
    gymPush: h.gymPush ?? false,
    gymPull: h.gymPull ?? false,
    hiit: h.hiit ?? h.cardio ?? false,
    rehab: h.rehab ?? h.stretch ?? false,
  }
  return { ...entry, habits: migrated }
}

export function weightAvgDeltaSeries(keys, entries) {
  if (!keys || keys.length === 0) return []
  const firstKey = keys[0]
  const avgEnding = (endKey, days) => {
    if (endKey < firstKey) return null
    const startKey = addDays(endKey, -(days - 1))
    const winStart = startKey < firstKey ? firstKey : startKey
    const vals = []
    for (const k of keys) {
      if (k < winStart) continue
      if (k > endKey) break
      const w = parseFloat(entries[k]?.weight)
      if (!isNaN(w)) vals.push(w)
    }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  return keys.map(k => {
    let priorEnd = addDays(k, -7)
    if (priorEnd < firstKey) priorEnd = firstKey
    const priorStartNom = addDays(priorEnd, -3)
    let n = 4
    if (priorStartNom < firstKey) {
      const diffDays = Math.round((parseDate(priorEnd) - parseDate(firstKey)) / 86400000)
      n = Math.max(1, diffDays + 1)
    }
    const cur = avgEnding(k, n)
    const prior = avgEnding(priorEnd, n)
    return (cur != null && prior != null) ? +(cur - prior).toFixed(3) : null
  })
}
