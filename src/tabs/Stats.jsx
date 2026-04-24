import { useMemo, useState } from 'react'
import JourneyPanel from '../components/stats/JourneyPanel'
import PhasePanel from '../components/stats/PhasePanel'
import HabitsPanel from '../components/stats/HabitsPanel'
import MeasurementsTable from '../components/stats/MeasurementsTable'
import { ORBIT_HABITS, ensureHabits, habitApplies } from '../lib/bodyData'
import { addDays, todayKey } from '../lib/dates'
import { PersonIcon, BarbellIcon } from '../components/icons'
import GymStats from './GymStats'

export default function Stats({ entries, phases, workouts, routines, autoHabitsByDate }) {
  const [view, setView] = useState('body') // 'body' | 'workout'
  // 'journey' | 'history' | phase id
  const [scope, setScope] = useState('journey')

  const sortedDates = useMemo(() => Object.keys(entries).sort(), [entries])
  const today = todayKey()

  const trailsData = useMemo(() => {
    return ORBIT_HABITS.map(h => {
      const dots = []
      for (let i = 20; i >= 0; i--) {
        const d = addDays(today, -i)
        const isTodayDot = i === 0
        const appl = habitApplies(h, d, entries)
        let val = null
        if (appl) {
          if (h.auto) val = !!autoHabitsByDate[d]?.[h.key]
          else {
            const ent = entries[d] ? ensureHabits(entries[d]) : null
            val = ent ? !!ent.habits?.[h.key] : null
          }
        }
        let cls = 'dot'
        if (!appl || val === null || val === undefined) cls += ' na'
        else {
          if (val) cls += ' done'
          else cls += ' miss'
          if (isTodayDot) cls += ' today-dot ' + (val ? 'done' : 'pending')
        }
        dots.push({ cls, color: h.color })
      }
      return { ...h, dots }
    })
  }, [entries, today, autoHabitsByDate])

  const habitScores = useMemo(() => {
    return ORBIT_HABITS.map(h => {
      let done = 0, total = 0
      sortedDates.forEach(k => {
        if (!habitApplies(h, k, entries)) return
        const v = h.auto ? !!autoHabitsByDate[k]?.[h.key] : !!ensureHabits(entries[k]).habits?.[h.key]
        total++
        if (v) done++
      })
      const pct = total > 0 ? done / total : 0
      return { ...h, pct, done, total }
    })
  }, [entries, sortedDates, autoHabitsByDate])

  const phaseOpts = useMemo(() => {
    return [...phases].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  }, [phases])

  const scopedPhase = (scope === 'journey' || scope === 'history')
    ? null
    : phases.find(p => String(p.id) === String(scope))
  const scopedPhaseIdx = scopedPhase ? phases.indexOf(scopedPhase) : -1

  return (
    <>
      <div className="stats-toolbar">
        <div className="stats-view-toggle">
          <button className={view === 'body' ? 'active' : ''} onClick={() => setView('body')} aria-label="Body">
            <PersonIcon />
          </button>
          <button className={view === 'workout' ? 'active' : ''} onClick={() => setView('workout')} aria-label="Workout">
            <BarbellIcon />
          </button>
        </div>
        <div className="stats-phase-picker">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="journey">Journey</option>
            <option value="history">History</option>
            {phaseOpts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{!p.end ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BODY VIEW */}
      {view === 'body' && scope === 'journey' && (
        <>
          <JourneyPanel entries={entries} phases={phases} sortedDates={sortedDates} />
          <HabitsPanel trailsData={trailsData} habitScores={habitScores} entries={entries} phases={phases} sortedDates={sortedDates} />
        </>
      )}

      {view === 'body' && scope === 'history' && (
        <>
          <div className="stat-section-title">Measurement history</div>
          <MeasurementsTable entries={entries} dates={sortedDates} />
        </>
      )}

      {view === 'body' && scopedPhase && (
        <PhasePanel
          entries={entries}
          phases={phases}
          sortedDates={sortedDates}
          statsPhaseIdx={scopedPhaseIdx}
          setStatsPhaseIdx={(idx) => {
            const p = phases[idx]
            setScope(p ? p.id : 'journey')
          }}
        />
      )}

      {/* WORKOUT VIEW */}
      {view === 'workout' && (
        <GymStats
          workouts={workouts}
          phases={phases}
          routines={routines}
          forcedScope={scope === 'journey' || scope === 'history' ? 'all' : scope}
          forcedSubTab={scope === 'history' ? 'history' : undefined}
          hideSubTabs={scope === 'history'}
        />
      )}
    </>
  )
}
