export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function dateKey(d) {
  if (typeof d === 'string') return d
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s, n) {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function formatDateLabel(s) {
  const d = parseDate(s)
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

export const todayKey = () => dateKey(new Date())

// Every calendar day between start and end inclusive, as YYYY-MM-DD keys.
export function expandDaily(start, end) {
  if (!start || !end || start > end) return []
  const out = []
  let cur = parseDate(start)
  const last = parseDate(end)
  while (cur <= last) {
    out.push(dateKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

// Build a time-spaced x-axis from entries. Runs of ≥gapThresholdDays
// consecutive MISSING days collapse to a single 'gap' slot so the chart
// doesn't waste space on empty time. Shorter misses keep per-day slots
// (line breaks at nulls).
// Returns { keys, dates, isGap } arrays of equal length. `keys[i]` is the
// date string or '__gap__' sentinel. `dates[i]` is the real date string or
// null for gap slots.
export function buildTimeSeries(firstKey, lastKey, entries, gapThresholdDays = 14) {
  const keys = []
  const dates = []
  const isGap = []
  if (!firstKey || !lastKey || firstKey > lastKey) return { keys, dates, isGap }

  const end = parseDate(lastKey)
  let cur = parseDate(firstKey)

  while (cur <= end) {
    const k = dateKey(cur)
    if (entries[k]) {
      keys.push(k); dates.push(k); isGap.push(false)
      cur.setDate(cur.getDate() + 1)
      continue
    }
    // count missing streak
    const runStart = new Date(cur)
    while (cur <= end && !entries[dateKey(cur)]) cur.setDate(cur.getDate() + 1)
    const runEnd = new Date(cur)
    runEnd.setDate(runEnd.getDate() - 1)
    const runDays = Math.round((runEnd - runStart) / 86400000) + 1
    if (runDays <= gapThresholdDays) {
      const rcur = new Date(runStart)
      while (rcur <= runEnd) {
        keys.push(dateKey(rcur)); dates.push(dateKey(rcur)); isGap.push(false)
        rcur.setDate(rcur.getDate() + 1)
      }
    } else {
      // Reserve multiple slots so the zigzag break reads clearly
      for (let g = 0; g < 5; g++) { keys.push('__gap__'); dates.push(null); isGap.push(true) }
    }
  }
  return { keys, dates, isGap }
}
