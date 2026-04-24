import { parseDate } from './dates'

// Resolve which workout-template key (push/pull/rest/...) the given
// date maps to, given the active routine's schedule.
export function templateKeyForDate(routine, dateStr) {
  if (!routine) return null
  const s = routine.schedule || {}
  const d = parseDate(dateStr)
  if (s.mode === 'cycle' && s.cycle && s.cycle.length) {
    const anchor = s.cycleAnchor ? parseDate(s.cycleAnchor) : d
    const dayIdx = Math.floor((d - anchor) / 86400000)
    const i = ((dayIdx % s.cycle.length) + s.cycle.length) % s.cycle.length
    return s.cycle[i]
  }
  // weekday mode (default)
  const map = s.weekdayMap || {}
  return map[d.getDay()] ?? null
}
