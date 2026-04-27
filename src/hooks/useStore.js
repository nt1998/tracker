import { useMemo } from 'react'
import useLocalStorage from './useLocalStorage'

// Backfill legacy routine shapes so older saves don't crash the editor.
// Runs once at module load before useLocalStorage reads.
function migrateRoutinesShape() {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem('tracker_routines')
  if (!raw) return
  try {
    let parsed = JSON.parse(raw)
    let changed = false
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      parsed = [{
        id: 'r_legacy',
        name: 'PPL',
        schedule: { mode: 'weekday', weekdayMap: {}, cycle: [] },
        workouts: parsed,
      }]
      changed = true
    }
    const oldTemplates = localStorage.getItem('tracker_workout_templates')
    const tmpls = oldTemplates ? JSON.parse(oldTemplates) : null
    parsed = parsed.map(r => {
      const next = { ...r }
      if (!next.workouts || typeof next.workouts !== 'object') {
        next.workouts = tmpls || {}
        changed = true
      }
      if (!next.schedule) { next.schedule = { mode: 'weekday', weekdayMap: {}, cycle: [] }; changed = true }
      if (!next.schedule.weekdayMap) { next.schedule.weekdayMap = {}; changed = true }
      if (!Array.isArray(next.schedule.cycle)) { next.schedule.cycle = []; changed = true }
      return next
    })
    if (changed) localStorage.setItem('tracker_routines', JSON.stringify(parsed))
    if (oldTemplates) localStorage.removeItem('tracker_workout_templates')
  } catch { /* ignore */ }
}
migrateRoutinesShape()

// One-shot fix: trim garbage pre-2026-02-01 days from the first cut. Runs
// once per device. Touches localStorage directly so the auto-push picks the
// corrected value up on the next debounce tick.
function migrateFirstCutStart() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem('tracker_mig_cut_feb1') === '1') return
  try {
    const raw = localStorage.getItem('tracker_phases')
    if (!raw) { localStorage.setItem('tracker_mig_cut_feb1', '1'); return }
    const phases = JSON.parse(raw)
    if (!Array.isArray(phases)) { localStorage.setItem('tracker_mig_cut_feb1', '1'); return }
    let changed = false
    phases.forEach(p => {
      if (p && p.name === 'Cut' && p.start === '2026-01-29') {
        p.start = '2026-02-01'
        changed = true
      }
    })
    if (changed) localStorage.setItem('tracker_phases', JSON.stringify(phases))
    localStorage.setItem('tracker_mig_cut_feb1', '1')
  } catch { /* ignore */ }
}
migrateFirstCutStart()

export default function useStore() {
  const [entries, setEntries] = useLocalStorage('tracker_entries', {})
  const [phases, setPhases] = useLocalStorage('tracker_phases', [])
  const [workouts, setWorkouts] = useLocalStorage('tracker_workouts', {})
  const [exerciseNotes, setExerciseNotes] = useLocalStorage('tracker_notes', {})
  const [habits, setHabits] = useLocalStorage('tracker_habits', [])
  const [exercises, setExercises] = useLocalStorage('tracker_exercises', {})
  const [routines, setRoutines] = useLocalStorage('tracker_routines', [])
  const [activeRoutineId, setActiveRoutineId] = useLocalStorage('tracker_active_routine', null)
  const [settings, setSettings] = useLocalStorage('tracker_settings', { visceralEnabled: false, waterEnabled: true, waterGoalML: 2500 })
  const [water, setWater] = useLocalStorage('tracker_water', {})
  // Per-day event log: { 'YYYY-MM-DD': [{ at: msEpoch, ml: number }, ...] }.
  // ml is negative for removals. Used by the water timeline popup.
  const [waterLog, setWaterLog] = useLocalStorage('tracker_water_log', {})

  const autoHabitsByDate = useMemo(() => {
    const out = {}
    Object.entries(workouts).forEach(([d, w]) => {
      if (!w?.committed) return
      const h = {}
      if (w.routineType === 'push') h.gymPush = true
      if (w.routineType === 'pull') h.gymPull = true
      if (w.routineType === 'rest' || w.isRest) h.rehab = true
      out[d] = h
    })
    return out
  }, [workouts])

  return {
    entries, setEntries,
    phases, setPhases,
    workouts, setWorkouts,
    exerciseNotes, setExerciseNotes,
    habits, setHabits,
    exercises, setExercises,
    routines, setRoutines,
    activeRoutineId, setActiveRoutineId,
    settings, setSettings,
    water, setWater,
    waterLog, setWaterLog,
    autoHabitsByDate,
  }
}
