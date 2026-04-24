import { useRef, useState } from 'react'
import './App.css'
import './lib/chartSetup'
import useStore from './hooks/useStore'
import useOrientationLock from './hooks/useOrientationLock'
import useSwipeNav from './hooks/useSwipeNav'
import WeightLog from './tabs/WeightLog'
import GymLog from './tabs/GymLog'
import Stats from './tabs/Stats'
import Settings from './tabs/Settings'
import { SunIcon, ChartIcon, GearIcon } from './components/icons'
import { templateKeyForDate } from './lib/routine'
import { todayKey } from './lib/dates'

const TABS = ['weight', 'gym', 'stats', 'settings']

export default function App() {
  const [tab, setTab] = useState('weight')
  const appRef = useRef(null)

  useOrientationLock()

  const {
    entries, setEntries,
    phases, setPhases,
    workouts, setWorkouts,
    exerciseNotes, setExerciseNotes,
    habits, setHabits,
    exercises, setExercises,
    routines, setRoutines,
    activeRoutineId, setActiveRoutineId,
    autoHabitsByDate,
  } = useStore()

  const { isSwiping, tabCls, tabStl, onClickCapture } = useSwipeNav({
    appRef, tabs: TABS, tab, setTab,
  })

  const activeRoutine = (routines || []).find(r => r.id === activeRoutineId) || routines?.[0]
  const todaysDayKey = activeRoutine ? templateKeyForDate(activeRoutine, todayKey()) : null
  const dayEntries = Object.entries(activeRoutine?.workouts || {}).slice(0, 6)

  return (
    <div
      ref={appRef}
      className={`app${isSwiping ? ' is-swiping' : ''}`}
      onClickCapture={onClickCapture}
    >
      <main className="content" key={tab}>
        {tab === 'weight' && (
          <WeightLog entries={entries} setEntries={setEntries} autoHabitsByDate={autoHabitsByDate} habits={habits} />
        )}
        {tab === 'gym' && (
          <GymLog
            workouts={workouts}
            setWorkouts={setWorkouts}
            exercises={exercises}
            routines={routines}
            activeRoutineId={activeRoutineId}
            exerciseNotes={exerciseNotes}
            setExerciseNotes={setExerciseNotes}
          />
        )}
        {tab === 'stats' && (
          <Stats
            entries={entries}
            phases={phases}
            workouts={workouts}
            exercises={exercises}
            autoHabitsByDate={autoHabitsByDate}
            habits={habits}
          />
        )}
        {tab === 'settings' && (
          <Settings
            phases={phases} setPhases={setPhases}
            habits={habits} setHabits={setHabits}
            exercises={exercises} setExercises={setExercises}
            routines={routines} setRoutines={setRoutines}
            activeRoutineId={activeRoutineId} setActiveRoutineId={setActiveRoutineId}
          />
        )}
      </main>

      <nav className="tabbar">
        <button className={tabCls('weight')} style={tabStl('weight')} onClick={() => setTab('weight')}>
          <span className="glyph"><SunIcon /></span>
        </button>
        <button className={tabCls('gym')} style={tabStl('gym')} onClick={() => setTab('gym')}>
          <span className="glyph day-dots">
            {dayEntries.length === 0 ? (
              <span className="day-dot empty">·</span>
            ) : dayEntries.map(([k, w]) => {
              const letter = (w.name || k).trim().charAt(0).toUpperCase() || '•'
              const isToday = k === todaysDayKey
              return (
                <span key={k} className={`day-dot ${isToday ? 'today' : ''} ${w.isRest ? 'rest' : ''}`}>
                  {letter}
                </span>
              )
            })}
          </span>
        </button>
        <button className={tabCls('stats')} style={tabStl('stats')} onClick={() => setTab('stats')}>
          <span className="glyph"><ChartIcon /></span>
        </button>
        <button className={tabCls('settings')} style={tabStl('settings')} onClick={() => setTab('settings')}>
          <span className="glyph"><GearIcon /></span>
        </button>
      </nav>
    </div>
  )
}
