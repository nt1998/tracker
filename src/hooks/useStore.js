import { useMemo } from 'react'
import useLocalStorage from './useLocalStorage'
import { seedEntries, seedPhases, seedWorkouts, seedRoutines, seedNotes } from '../lib/seedData'

export default function useStore() {
  const [entries, setEntries] = useLocalStorage('tracker_entries', seedEntries)
  const [phases, setPhases] = useLocalStorage('tracker_phases', seedPhases)
  const [workouts, setWorkouts] = useLocalStorage('tracker_workouts', seedWorkouts)
  const [routines, setRoutines] = useLocalStorage('tracker_routines', seedRoutines)
  const [exerciseNotes, setExerciseNotes] = useLocalStorage('tracker_notes', seedNotes)

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
    routines, setRoutines,
    exerciseNotes, setExerciseNotes,
    autoHabitsByDate,
  }
}
