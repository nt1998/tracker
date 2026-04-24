import { useMemo } from 'react'
import useLocalStorage from './useLocalStorage'
import {
  seedEntries, seedPhases, seedWorkouts, seedNotes,
  seedExercises, seedWorkoutTemplates, seedRoutines, seedActiveRoutineId,
} from '../lib/seedData'
import { DEFAULT_HABITS } from '../lib/bodyData'

export default function useStore() {
  const [entries, setEntries] = useLocalStorage('tracker_entries', seedEntries)
  const [phases, setPhases] = useLocalStorage('tracker_phases', seedPhases)
  const [workouts, setWorkouts] = useLocalStorage('tracker_workouts', seedWorkouts)
  const [exerciseNotes, setExerciseNotes] = useLocalStorage('tracker_notes', seedNotes)
  const [habits, setHabits] = useLocalStorage('tracker_habits', DEFAULT_HABITS)
  const [exercises, setExercises] = useLocalStorage('tracker_exercises', seedExercises)
  const [workoutTemplates, setWorkoutTemplates] = useLocalStorage('tracker_workout_templates', seedWorkoutTemplates)
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
    workoutTemplates, setWorkoutTemplates,
    routines, setRoutines,
    activeRoutineId, setActiveRoutineId,
    autoHabitsByDate,
  }
}
