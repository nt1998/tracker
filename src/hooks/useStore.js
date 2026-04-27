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

// One-shot: rewrite the meal/sups habit descriptions to the polished version
// (multi-line, divider + macros, no "× M" markers). Local app keeps auto-
// pushing stale text over remote edits, so we patch localStorage instead.
function migrateMealHabits() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem('tracker_mig_meals_v2') === '1') return
  try {
    const raw = localStorage.getItem('tracker_habits')
    if (!raw) { localStorage.setItem('tracker_mig_meals_v2', '1'); return }
    const habits = JSON.parse(raw)
    if (!Array.isArray(habits)) { localStorage.setItem('tracker_mig_meals_v2', '1'); return }
    const SEP = '─'.repeat(22)
    const UPDATES = {
      meal1: ['400g Quarkcreme', '200g Apple / Pear / Banana', '15g Nut butter', SEP, '482 kcal · 54 P · 8 F · 45 C'].join('\n'),
      meal2: ['100g Chicken breast (raw)', '200g Vegetables', '80g Rice (raw)', '60g Avocado (1 small)', '55g Egg', '2g Salt', SEP, '635 kcal · 41 P · 17 F · 78 C'].join('\n'),
      meal3pre: ['60g Oats', '40g Whey protein', '200g Apple / Pear / Banana', '15g Nut butter', '2g Salt', SEP, '590 kcal · 44 P · 13 F · 67 C'].join('\n'),
      intra: ['20g Maltodextrin', '10g EAAs', SEP, '116 kcal · 10 P · 0 F · 19 C'].join('\n'),
      meal4: ['80g Rice (raw)', '100g Chicken breast (raw)', '200g Vegetables', '10g Olive oil', '55g Egg', '2g Salt', SEP, '628 kcal · 40 P · 18 F · 73 C'].join('\n'),
      sups: ['AM', '  1× D3+K2', '  1× Vitamin Complex', '  1× Zinc', '  2× Omega 3', 'PM', '  2× Magnesium', '  2× Omega 3'].join('\n'),
    }
    let changed = false
    habits.forEach(h => {
      if (h && UPDATES[h.key] && h.description !== UPDATES[h.key]) {
        h.description = UPDATES[h.key]
        changed = true
      }
    })
    if (changed) localStorage.setItem('tracker_habits', JSON.stringify(habits))
    localStorage.setItem('tracker_mig_meals_v2', '1')
  } catch { /* ignore */ }
}
migrateMealHabits()

// One-shot: activate the imported Steppe UL routine if present and the
// active routine still points at the old r_imported. App's auto-push keeps
// reverting remote changes to activeRoutineId.
function migrateActivateSteppeUL() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem('tracker_mig_active_steppe_ul') === '1') return
  try {
    const routinesRaw = localStorage.getItem('tracker_routines')
    if (!routinesRaw) { localStorage.setItem('tracker_mig_active_steppe_ul', '1'); return }
    const routines = JSON.parse(routinesRaw)
    if (!Array.isArray(routines)) { localStorage.setItem('tracker_mig_active_steppe_ul', '1'); return }
    const hasSteppe = routines.some(r => r && r.id === 'r_steppe_ul')
    if (!hasSteppe) { localStorage.setItem('tracker_mig_active_steppe_ul', '1'); return }
    localStorage.setItem('tracker_active_routine', JSON.stringify('r_steppe_ul'))
    localStorage.setItem('tracker_mig_active_steppe_ul', '1')
  } catch { /* ignore */ }
}
migrateActivateSteppeUL()

// One-shot: rewrite UL warmups + rest workout in localStorage. Auto-push
// keeps reverting remote edits.
function migrateULWarmupsRest() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem('tracker_mig_ul_warmups_v1') === '1') return
  try {
    const raw = localStorage.getItem('tracker_routines')
    if (!raw) { localStorage.setItem('tracker_mig_ul_warmups_v1', '1'); return }
    const routines = JSON.parse(raw)
    if (!Array.isArray(routines)) { localStorage.setItem('tracker_mig_ul_warmups_v1', '1'); return }
    const ul = routines.find(r => r && r.id === 'r_steppe_ul')
    if (!ul) { localStorage.setItem('tracker_mig_ul_warmups_v1', '1'); return }
    const UPPER = [
      { id: 'wu_shoulder', name: 'Shoulder Circles', reps: '10', checks: ['Forward', 'Backward'] },
      { id: 'wu_wrist', name: 'Wrist Circles', reps: '10', checks: ['Clockwise', 'Counterclockwise'] },
    ]
    const LOWER = [
      { id: 'wu_ankle', name: 'Ankle Circles', reps: '10', checks: ['Clockwise', 'Counterclockwise'] },
      { id: 'wu_hip', name: 'Hip Circles', reps: '10', checks: ['Clockwise', 'Counterclockwise'] },
    ]
    if (ul.workouts?.upperA) ul.workouts.upperA.warmups = UPPER
    if (ul.workouts?.upperB) ul.workouts.upperB.warmups = UPPER
    if (ul.workouts?.lowerA) ul.workouts.lowerA.warmups = LOWER
    if (ul.workouts?.lowerB) ul.workouts.lowerB.warmups = LOWER
    // Copy the old r_imported rest workout into UL.
    const oldRest = routines.find(r => r && r.id === 'r_imported')?.workouts?.rest
    if (oldRest && ul.workouts) ul.workouts.rest = JSON.parse(JSON.stringify(oldRest))
    localStorage.setItem('tracker_routines', JSON.stringify(routines))
    localStorage.setItem('tracker_mig_ul_warmups_v1', '1')
  } catch { /* ignore */ }
}
migrateULWarmupsRest()

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
