import { useMemo, useState } from 'react'
import JourneyPanel from '../components/stats/JourneyPanel'
import PhasePanel from '../components/stats/PhasePanel'
import HabitsPanel from '../components/stats/HabitsPanel'
import MeasurementsTable from '../components/stats/MeasurementsTable'
import { ensureHabits, habitApplies } from '../lib/bodyData'
import { addDays, todayKey } from '../lib/dates'
import { PersonIcon, BarbellIcon } from '../components/icons'
import GymStats from './GymStats'

export default function Stats({ entries, phases, workouts, exercises, autoHabitsByDate, habits, routines, activeRoutineId, settings, water }) {
  const [view, setView] = useState('body') // 'body' | 'workout'
  // 'journey' | phase id — history lives inline at the bottom of each view
  const [scope, setScope] = useState('journey')

  const sortedDates = useMemo(() => Object.keys(entries).sort(), [entries])
  const today = todayKey()
  const waterEnabled = settings?.waterEnabled !== false
  const waterGoal = Math.max(1, parseInt(settings?.waterGoalML, 10) || 2500)

  const trailsData = useMemo(() => {
    const rows = []
    if (waterEnabled) {
      const dots = []
      const partialThresh = waterGoal * 0.9
      for (let i = 20; i >= 0; i--) {
        const d = addDays(today, -i)
        const isTodayDot = i === 0
        const ml = water && water[d] != null ? parseFloat(water[d]) : null
        let cls = 'dot'
        if (ml == null || ml <= 0) cls += ' na'
        else if (ml >= waterGoal) {
          cls += ' done'
          if (isTodayDot) cls += ' today-dot done'
        } else if (ml >= partialThresh) {
          cls += ' partial'
          if (isTodayDot) cls += ' today-dot done'
        } else {
          cls += ' miss'
          if (isTodayDot) cls += ' today-dot pending'
        }
        dots.push({ cls, color: '#89dceb' })
      }
      rows.push({ key: '_water', icon: '💧', name: 'Water', color: '#89dceb', dots })
    }
    habits.forEach(h => {
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
      rows.push({ ...h, dots })
    })
    return rows
  }, [entries, today, autoHabitsByDate, habits, water, waterEnabled, waterGoal])

  const habitScores = useMemo(() => {
    const rows = []
    if (waterEnabled) {
      let done = 0, total = 0
      const partialThresh = waterGoal * 0.9
      // Only count days actually logged (skip blanks and current day).
      sortedDates.forEach(k => {
        if (k === today) return
        const ml = water && water[k] != null ? parseFloat(water[k]) : null
        if (ml == null || ml <= 0) return
        total++
        if (ml >= partialThresh) done++
      })
      const pct = total > 0 ? done / total : 0
      rows.push({ key: '_water', icon: '💧', name: 'Water', color: '#89dceb', pct, done, total })
    }
    habits.forEach(h => {
      let done = 0, total = 0
      sortedDates.forEach(k => {
        if (!habitApplies(h, k, entries)) return
        const v = h.auto ? !!autoHabitsByDate[k]?.[h.key] : !!ensureHabits(entries[k]).habits?.[h.key]
        total++
        if (v) done++
      })
      const pct = total > 0 ? done / total : 0
      rows.push({ ...h, pct, done, total })
    })
    return rows
  }, [entries, sortedDates, autoHabitsByDate, habits, water, waterEnabled, waterGoal])

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
          <JourneyPanel entries={entries} phases={phases} sortedDates={sortedDates} hideMeasurements settings={settings} water={water} />
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
          water={water}
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
          routines={routines}
          activeRoutineId={activeRoutineId}
          forcedScope={scope === 'journey' ? 'all' : scope}
          flatLayout
        />
      )}
    </>
  )
}
