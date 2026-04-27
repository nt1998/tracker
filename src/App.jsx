import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import './lib/chartSetup'
import useStore from './hooks/useStore'
import useOrientationLock from './hooks/useOrientationLock'
import useSwipeNav from './hooks/useSwipeNav'
import useLocalStorage from './hooks/useLocalStorage'
import { pullFromGithub, pushToGithub, buildPayload, applyPayload, verifyCredentials } from './lib/github'
import WeightLog from './tabs/WeightLog'
import GymLog from './tabs/GymLog'
import Stats from './tabs/Stats'
import Settings from './tabs/Settings'
import { SunIcon, DumbbellIcon, ChartIcon, GearIcon } from './components/icons'
import { templateKeyForDate } from './lib/routine'
import { todayKey } from './lib/dates'

const TABS = ['weight', 'gym', 'stats', 'settings']

export default function App() {
  const [tab, setTab] = useLocalStorage('tracker_tab', 'weight')
  const [theme, setTheme] = useLocalStorage('tracker_theme', 'dark')
  const appRef = useRef(null)

  useEffect(() => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  }, [theme])

  useOrientationLock()

  const store = useStore()
  const {
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
    autoHabitsByDate,
  } = store

  const swipeEnabled = settings?.swipeNavEnabled !== false
  const { isSwiping, tabCls, tabStl, onClickCapture } = useSwipeNav({
    appRef, tabs: TABS, tab, setTab, enabled: swipeEnabled,
  })

  const activeRoutine = (routines || []).find(r => r.id === activeRoutineId) || routines?.[0]
  const today = todayKey()
  const scheduledDayKey = activeRoutine ? templateKeyForDate(activeRoutine, today) : null
  // What's actually logged for today, falling back to the schedule
  const todaysDayKey = workouts[today]?.routineType || scheduledDayKey
  const dayEntries = Object.entries(activeRoutine?.workouts || {}).slice(0, 6)

  // Day picker (long-press on gym tab)
  const [dayPickerOpen, setDayPickerOpen] = useState(false)
  const gymLongPressRef = useRef(null)
  const startGymLongPress = () => {
    if (gymLongPressRef.current) clearTimeout(gymLongPressRef.current)
    gymLongPressRef.current = setTimeout(() => {
      setDayPickerOpen(true)
      gymLongPressRef.current = null
    }, 500)
  }
  const cancelGymLongPress = () => {
    if (gymLongPressRef.current) { clearTimeout(gymLongPressRef.current); gymLongPressRef.current = null }
  }
  const switchTodayDay = (key) => {
    const tmpl = activeRoutine?.workouts?.[key]
    if (!tmpl) return
    const today = todayKey()
    const makeFresh = () => {
      if (tmpl.isRest) {
        const flat = (tmpl.blocks || []).flatMap(b => b.exercises)
        return { routineType: key, isRest: true, exercises: [], restChecks: flat.map(e => Array(e.sets || 1).fill(false)), warmupChecks: [], committed: false }
      }
      return {
        routineType: key,
        isRest: false,
        exercises: (tmpl.items || []).map(it => {
          const ex = exercises[it.exerciseId]
          return {
            id: ex?.id ?? it.exerciseId,
            name: ex?.name ?? '(missing)',
            warmupSets: Array(it.warmupSets).fill().map(() => ({ weight: '', reps: '', committed: false })),
            workSets: Array(it.workSets).fill().map(() => ({ weight: '', reps: '', committed: false })),
            notes: exerciseNotes[ex?.name || ''] || '',
          }
        }),
        warmupChecks: (tmpl.warmups || []).map(() => false),
        committed: false,
      }
    }
    setWorkouts(prev => ({ ...prev, [today]: makeFresh() }))
    setTab('gym')
    setDayPickerOpen(false)
  }

  // -------- GitHub sync --------
  const [github, setGithub] = useLocalStorage('tracker_github', { token: '', owner: '', repo: '', connected: false })
  const [syncStatus, setSyncStatus] = useState('') // idle message
  const [lastSyncAt, setLastSyncAt] = useLocalStorage('tracker_lastsync', 0)
  const [needsSync, setNeedsSync] = useState(false)
  const syncTimeoutRef = useRef(null)
  const firstSyncSkip = useRef(true)

  const setters = { setEntries, setPhases, setWorkouts, setExerciseNotes, setHabits, setExercises, setRoutines, setActiveRoutineId, setSettings, setWater }

  const doPush = useCallback(async (gh = github) => {
    if (!gh.connected || !gh.token || !gh.owner || !gh.repo) return
    try {
      setSyncStatus('Syncing…')
      const payload = buildPayload({ entries, phases, workouts, exerciseNotes, habits, exercises, routines, activeRoutineId, settings, water })
      await pushToGithub(gh, payload)
      setLastSyncAt(Date.now())
      setNeedsSync(false)
      setSyncStatus('Synced')
      setTimeout(() => setSyncStatus(''), 1500)
    } catch (e) {
      setSyncStatus('Sync failed: ' + e.message)
      setTimeout(() => setSyncStatus(''), 3500)
    }
  }, [github, entries, phases, workouts, exerciseNotes, habits, exercises, routines, activeRoutineId, settings, water, setLastSyncAt])

  const doPull = useCallback(async (gh = github) => {
    if (!gh.token || !gh.owner || !gh.repo) { setSyncStatus('Missing credentials'); return { source: 'none' } }
    try {
      setSyncStatus('Pulling…')
      const { source, data } = await pullFromGithub(gh)
      if (!data) { setSyncStatus('Nothing on remote'); setTimeout(() => setSyncStatus(''), 2000); return { source } }
      applyPayload(data, setters)
      setLastSyncAt(Date.now())
      setSyncStatus('Pulled from remote')
      setTimeout(() => setSyncStatus(''), 2500)
      return { source }
    } catch (e) {
      setSyncStatus('Pull failed: ' + e.message)
      setTimeout(() => setSyncStatus(''), 3500)
      return { source: 'error' }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [github, setLastSyncAt])

  const connectGithub = useCallback(async (creds) => {
    try {
      setSyncStatus('Verifying…')
      await verifyCredentials(creds)
      const gh = { ...creds, connected: true }
      setGithub(gh)
      setSyncStatus('Connected. Pulling…')
      await doPull(gh)
    } catch (e) {
      setSyncStatus('Connect failed: ' + e.message)
      setTimeout(() => setSyncStatus(''), 3500)
    }
  }, [doPull, setGithub])

  const disconnectGithub = useCallback(() => {
    setGithub({ token: '', owner: '', repo: '', connected: false })
  }, [setGithub])

  // Mark needsSync on any store change (skip the very first render which hydrates from localStorage)
  useEffect(() => {
    if (firstSyncSkip.current) { firstSyncSkip.current = false; return }
    if (github.connected) setNeedsSync(true)
  }, [entries, phases, workouts, exerciseNotes, habits, exercises, routines, activeRoutineId, settings, water, github.connected])

  // Debounced auto-push 5s after last change
  useEffect(() => {
    if (!needsSync || !github.connected) return
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => { doPush() }, 5000)
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current) }
  }, [needsSync, github.connected, doPush])

  // Push on background
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && needsSync && github.connected) doPush()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [needsSync, github.connected, doPush])

  return (
    <div
      ref={appRef}
      className={`app${isSwiping ? ' is-swiping' : ''}`}
      onClickCapture={onClickCapture}
    >
      <main className={`content ${tab === 'weight' ? 'no-scroll' : ''}`} key={tab}>
        {tab === 'weight' && (
          <WeightLog entries={entries} setEntries={setEntries} autoHabitsByDate={autoHabitsByDate} habits={habits} settings={settings} water={water} setWater={setWater} />
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
            routines={routines}
            activeRoutineId={activeRoutineId}
            settings={settings}
            water={water}
          />
        )}
        {tab === 'settings' && (
          <Settings
            phases={phases} setPhases={setPhases}
            habits={habits} setHabits={setHabits}
            exercises={exercises} setExercises={setExercises}
            routines={routines} setRoutines={setRoutines}
            activeRoutineId={activeRoutineId} setActiveRoutineId={setActiveRoutineId}
            settings={settings} setSettings={setSettings}
            theme={theme} setTheme={setTheme}
            github={github} onConnectGithub={connectGithub} onDisconnectGithub={disconnectGithub}
            onSyncNow={() => doPush()} onPull={() => doPull()}
            syncStatus={syncStatus} lastSyncAt={lastSyncAt} needsSync={needsSync}
          />
        )}
      </main>

      <nav className="tabbar">
        <button className={tabCls('weight')} style={tabStl('weight')} onClick={() => setTab('weight')}>
          <span className="glyph"><SunIcon /></span>
        </button>
        <button
          className={tabCls('gym')}
          style={tabStl('gym')}
          onClick={() => { if (!gymLongPressRef.current) setTab('gym') }}
          onPointerDown={startGymLongPress}
          onPointerUp={cancelGymLongPress}
          onPointerLeave={cancelGymLongPress}
          onPointerCancel={cancelGymLongPress}
        >
          <span className="glyph"><DumbbellIcon /></span>
        </button>
        <button className={tabCls('stats')} style={tabStl('stats')} onClick={() => setTab('stats')}>
          <span className="glyph"><ChartIcon /></span>
        </button>
        <button className={tabCls('settings')} style={tabStl('settings')} onClick={() => setTab('settings')}>
          <span className="glyph"><GearIcon /></span>
        </button>
      </nav>

      {dayPickerOpen && (
        <div className="modal-overlay" onClick={() => setDayPickerOpen(false)}>
          <div className="day-picker" onClick={e => e.stopPropagation()}>
            <div className="dp-title">Switch day</div>
            {Object.entries(activeRoutine?.workouts || {}).map(([k, w]) => (
              <button
                key={k}
                className={`dp-option ${k === todaysDayKey ? 'active' : ''}`}
                onClick={() => switchTodayDay(k)}
              >
                {w.name}{w.isRest ? ' · rest' : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
