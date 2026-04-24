import { addDays, parseDate } from './dates'

export const METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#f38ba8', step: 0.1 },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', color: '#fab387', step: 0.1 },
  { key: 'musclePct', label: 'Muscle', unit: '%', color: '#a6e3a1', step: 0.1 },
  { key: 'visceralFat', label: 'Visceral', unit: '', color: '#cba6f7', step: 1 },
]

export const ORBIT_HABITS = [
  {
    key: 'morning', icon: '🧘', name: 'Morning', color: '#f9e2af',
    applies: () => true,
    details: [
      'Ankle Circles (Ankle CARs)',
      'Hip Circles (Hip CARs)',
      'Arch Squeeze (Short Foot, 30s each foot)',
      'Deep Squat Sit (Deep Squat Hold, 60s)',
    ],
  },
  {
    key: 'supsAM', icon: '☀️', name: 'Sups AM', color: '#cba6f7',
    applies: () => true,
    details: ['Creatine', '1x Base Powder', '2x Omega 3'],
  },
  {
    key: 'd3k2', icon: '💊', name: 'D3+K2', color: '#f5c2e7',
    applies: (_d, dateStr, entries) => {
      if (!entries) return true
      const yKey = addDays(dateStr, -1)
      const yEntry = entries[yKey]
      if (!yEntry) return true
      return !yEntry.habits?.d3k2
    },
    details: ['1x D3+K2'],
  },
  {
    key: 'supsPM', icon: '🌙', name: 'Sups PM', color: '#b4befe',
    applies: () => true,
    details: ['1x Magnesium', '2x Omega 3'],
  },
  {
    key: 'hiit', icon: '🫀', name: 'HIIT', color: '#89dceb',
    applies: d => [3, 0].includes(d.getDay()),
  },
]

export function habitApplies(h, dateStr, entries) {
  const d = new Date(dateStr + 'T12:00:00')
  return h.applies(d, dateStr, entries)
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
