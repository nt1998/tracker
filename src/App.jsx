import { useRef, useState } from 'react'
import './App.css'
import './lib/chartSetup'
import useStore from './hooks/useStore'
import useOrientationLock from './hooks/useOrientationLock'
import useSwipeNav from './hooks/useSwipeNav'
import WeightLog from './tabs/WeightLog'
import GymLog from './tabs/GymLog'
import BodyStats from './tabs/BodyStats'
import GymStats from './tabs/GymStats'
import Settings from './tabs/Settings'
import { SunIcon, DumbbellIcon, ChartIcon, GearIcon } from './components/icons'

const TABS = ['weight', 'gym', 'body-stats', 'gym-stats', 'settings']

export default function App() {
  const [tab, setTab] = useState('weight')
  const appRef = useRef(null)

  useOrientationLock()

  const {
    entries, setEntries,
    phases,
    workouts, setWorkouts,
    routines,
    exerciseNotes, setExerciseNotes,
    autoHabitsByDate,
  } = useStore()

  const { isSwiping, tabCls, tabStl, onClickCapture } = useSwipeNav({
    appRef, tabs: TABS, tab, setTab,
  })

  return (
    <div
      ref={appRef}
      className={`app${isSwiping ? ' is-swiping' : ''}`}
      onClickCapture={onClickCapture}
    >
      <main className="content" key={tab}>
        {tab === 'weight' && (
          <WeightLog entries={entries} setEntries={setEntries} autoHabitsByDate={autoHabitsByDate} />
        )}
        {tab === 'gym' && (
          <GymLog
            workouts={workouts}
            setWorkouts={setWorkouts}
            routines={routines}
            exerciseNotes={exerciseNotes}
            setExerciseNotes={setExerciseNotes}
          />
        )}
        {tab === 'body-stats' && (
          <BodyStats entries={entries} phases={phases} autoHabitsByDate={autoHabitsByDate} />
        )}
        {tab === 'gym-stats' && <GymStats />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="tabbar">
        <button className={tabCls('weight')} style={tabStl('weight')} onClick={() => setTab('weight')}>
          <span className="glyph"><SunIcon /></span>
        </button>
        <button className={tabCls('gym')} style={tabStl('gym')} onClick={() => setTab('gym')}>
          <span className="glyph"><DumbbellIcon /></span>
        </button>
        <button className={tabCls('body-stats')} style={tabStl('body-stats')} onClick={() => setTab('body-stats')}>
          <span className="glyph"><ChartIcon /></span>
        </button>
        <button className={tabCls('gym-stats')} style={tabStl('gym-stats')} onClick={() => setTab('gym-stats')}>
          <span className="glyph"><ChartIcon /></span>
        </button>
        <button className={tabCls('settings')} style={tabStl('settings')} onClick={() => setTab('settings')}>
          <span className="glyph"><GearIcon /></span>
        </button>
      </nav>
    </div>
  )
}
