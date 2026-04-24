import { useMemo } from 'react'
import useLocalStorage from './useLocalStorage'

// One-shot migration from body-tracker + gym-tracker localStorage keys.
// Runs before useLocalStorage reads, so fresh tracker installs pick up the
// existing data if the user already has either legacy app installed on the
// same origin (nt1998.github.io).
function migrateLegacyDataOnce() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem('tracker_migrated')) return
  const copy = (fromKey, toKey) => {
    if (localStorage.getItem(toKey) != null) return
    const v = localStorage.getItem(fromKey)
    if (v != null) localStorage.setItem(toKey, v)
  }
  copy('bodytracker_entries', 'tracker_entries')
  copy('bodytracker_phases', 'tracker_phases')
  copy('gymtracker_workouts', 'tracker_workouts')
  copy('gymtracker_routines', 'tracker_routines')
  copy('gymtracker_notes', 'tracker_notes')
  localStorage.setItem('tracker_migrated', '1')
}
migrateLegacyDataOnce()

const defaultRoutines = {
  push: {
    name: 'Push', schedule: '', warmups: [],
    exercises: [
      { id: 1, name: 'Bench Press', warmupSets: 2, workSets: 3, reps: '8-12', unit: 'kg', equipmentType: 'plates', startWeight: 60, increment: 2.5, barWeight: 20 },
    ],
  },
  pull: {
    name: 'Pull', schedule: '', warmups: [],
    exercises: [
      { id: 1, name: 'Lat Pulldown', warmupSets: 2, workSets: 3, reps: '8-12', unit: 'kg', equipmentType: 'machine', startWeight: 20, increment: 5 },
    ],
  },
  rest: { name: 'Rest Day', schedule: '', isRest: true, warmups: [], exercises: [], blocks: [] },
}

export default function useStore() {
  const [entries, setEntries] = useLocalStorage('tracker_entries', {})
  const [phases, setPhases] = useLocalStorage('tracker_phases', [])
  const [workouts, setWorkouts] = useLocalStorage('tracker_workouts', {})
  const [routines, setRoutines] = useLocalStorage('tracker_routines', defaultRoutines)
  const [exerciseNotes, setExerciseNotes] = useLocalStorage('tracker_notes', {})

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
