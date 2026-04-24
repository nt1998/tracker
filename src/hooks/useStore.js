import { useMemo } from 'react'
import useLocalStorage from './useLocalStorage'
import {
  seedEntries, seedPhases, seedWorkouts, seedNotes,
  seedExercises, seedRoutines, seedActiveRoutineId,
} from '../lib/seedData'
import { DEFAULT_HABITS } from '../lib/bodyData'

// Backfill legacy routine shapes so older saves don't crash the editor.
// Runs once at module load before useLocalStorage reads.
function migrateRoutinesShape() {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem('tracker_routines')
  if (!raw) return
  try {
    let parsed = JSON.parse(raw)
    let changed = false
    // Older shape: routines was an object keyed by push/pull/rest (no list).
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      parsed = [{
        id: 'r_legacy',
        name: 'PPL',
        schedule: { mode: 'weekday', weekdayMap: {}, cycle: [] },
        workouts: parsed,
      }]
      changed = true
    }
    // Even older shape: routines list missing .workouts (templates were separate store).
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
  } catch { /* ignore, seed will kick in if value is unparseable */ }
}
migrateRoutinesShape()

export default function useStore() {
  const [entries, setEntries] = useLocalStorage('tracker_entries', seedEntries)
  const [phases, setPhases] = useLocalStorage('tracker_phases', seedPhases)
  const [workouts, setWorkouts] = useLocalStorage('tracker_workouts', seedWorkouts)
  const [exerciseNotes, setExerciseNotes] = useLocalStorage('tracker_notes', seedNotes)
  const [habits, setHabits] = useLocalStorage('tracker_habits', DEFAULT_HABITS)
  const [exercises, setExercises] = useLocalStorage('tracker_exercises', seedExercises)
  const [routines, setRoutines] = useLocalStorage('tracker_routines', seedRoutines)
  const [activeRoutineId, setActiveRoutineId] = useLocalStorage('tracker_active_routine', seedActiveRoutineId)

  const autoHabitsByDate = useMemo(() => {
    const out = {}
    Object.entries(workouts).forEach(([d, w]) => {
      if (!w?.committed) return
      const h = {}
      if (w.routineType === 'push') h.gymPush = true
      if (w.routineType === 'pull') h.gymPull = true
      if (w.routineType === 'rest') h.rehab = true
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
    autoHabitsByDate,
  }
}
