import { useMemo, useState } from 'react'
import JourneyPanel from '../components/stats/JourneyPanel'
import PhasePanel from '../components/stats/PhasePanel'
import HabitsPanel from '../components/stats/HabitsPanel'
import MeasurementsTable from '../components/stats/MeasurementsTable'
import { ensureHabits, habitApplies } from '../lib/bodyData'
import { addDays, todayKey } from '../lib/dates'
import { PersonIcon, BarbellIcon } from '../components/icons'
import GymStats from './GymStats'

export default function Stats({ entries, phases, workouts, exercises, autoHabitsByDate, habits, settings }) {
  const [view, setView] = useState('body') // 'body' | 'workout'
  // 'journey' | phase id — history lives inline at the bottom of each view
  const [scope, setScope] = useState('journey')

  const sortedDates = useMemo(() => Object.keys(entries).sort(), [entries])
  const today = todayKey()

  const trailsData = useMemo(() => {
    return habits.map(h => {
      const dots = []
      for (let i = 20; i >= 0; i--) {
        const d = addDays(today, -i)
        const isTodayDot = i === 0
        const appl = habitApplies(h, d)
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
  }, [entries, today, autoHabitsByDate, habits])

  const habitScores = useMemo(() => {
    return habits.map(h => {
      let done = 0, total = 0
      sortedDates.forEach(k => {
        if (!habitApplies(h, k)) return
        const v = h.auto ? !!autoHabitsByDate[k]?.[h.key] : !!ensureHabits(entries[k]).habits?.[h.key]
        total++
        if (v) done++
      })
      const pct = total > 0 ? done / total : 0
      return { ...h, pct, done, total }
    })
  }, [entries, sortedDates, autoHabitsByDate, habits])

  const phaseOpts = useMemo(() => {
    return [...phases].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  }, [phases])

  const scopedPhase = scope === 'journey'
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
          <JourneyPanel entries={entries} phases={phases} sortedDates={sortedDates} hideMeasurements settings={settings} />
          <HabitsPanel trailsData={trailsData} habitScores={habitScores} entries={entries} phases={phases} sortedDates={sortedDates} habits={habits} />
          <MeasurementsTable entries={entries} dates={sortedDates} />
        </>
      )}

      {view === 'body' && scopedPhase && (
        <PhasePanel
          entries={entries}
          phases={phases}
          sortedDates={sortedDates}
          settings={settings}
          statsPhaseIdx={scopedPhaseIdx}
          setStatsPhaseIdx={(idx) => {
            const p = phases[idx]
            setScope(p ? p.id : 'journey')
          }}
        />
      )}

      {/* WORKOUT VIEW — all sections stacked, history at bottom */}
      {view === 'workout' && (
        <GymStats
          workouts={workouts}
          phases={phases}
          exercises={exercises}
          forcedScope={scope === 'journey' ? 'all' : scope}
          flatLayout
        />
      )}
    </>
  )
}
