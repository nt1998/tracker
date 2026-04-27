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
        dots.push({ cls, color: 'var(--c-sky)' })
      }
      rows.push({ key: '_water', icon: '💧', name: 'Water', color: 'var(--c-sky)', dots })
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
            // undefined = habit didn't exist when entry was logged → treat as
            // not tracked (na), not as a miss.
            const raw = ent?.habits?.[h.key]
            val = raw === undefined ? null : !!raw
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

  // Compliance is scored over the current phase only (or all time if no
  // active phase). Days the user didn't open the app at all are excluded.
  // Today is always excluded since it's still in progress.
  const curPhaseForScore = useMemo(() => phases.find(p => !p.end), [phases])
  const scoreDates = useMemo(() => {
    if (!curPhaseForScore) return sortedDates
    return sortedDates.filter(k => k >= curPhaseForScore.start && (!curPhaseForScore.end || k <= curPhaseForScore.end))
  }, [sortedDates, curPhaseForScore])
  const habitScores = useMemo(() => {
    const rows = []
    if (waterEnabled) {
      let done = 0, total = 0
      const partialThresh = waterGoal * 0.9
      scoreDates.forEach(k => {
        if (k === today) return
        const ml = water && water[k] != null ? parseFloat(water[k]) : null
        if (ml == null || ml <= 0) return
        total++
        if (ml >= partialThresh) done++
      })
      const pct = total > 0 ? done / total : 0
      rows.push({ key: '_water', icon: '💧', name: 'Water', color: 'var(--c-sky)', pct, done, total })
    }
    habits.forEach(h => {
      // Window start = max(phase start, first day this habit was tracked).
      // No createdAt field exists, so derive habit creation from data: the
      // first entry where the habit key shows up at all.
      let firstSeen = null
      if (h.auto) {
        for (const k of sortedDates) {
          if (autoHabitsByDate[k] && Object.prototype.hasOwnProperty.call(autoHabitsByDate[k], h.key)) {
            firstSeen = k
            break
          }
        }
      } else {
        for (const k of sortedDates) {
          const raw = entries[k]?.habits?.[h.key]
          if (raw !== undefined) { firstSeen = k; break }
        }
      }
      const winStart = firstSeen && (!curPhaseForScore || firstSeen > curPhaseForScore.start)
        ? firstSeen
        : (curPhaseForScore ? curPhaseForScore.start : (sortedDates[0] || ''))

      let done = 0, total = 0
      scoreDates.forEach(k => {
        if (k === today) return
        if (k < winStart) return
        if (!habitApplies(h, k, entries)) return
        if (!h.auto && !entries[k]) return
        if (!h.auto) {
          const raw = ensureHabits(entries[k]).habits?.[h.key]
          if (raw === undefined) return
          total++
          if (raw) done++
        } else {
          total++
          if (autoHabitsByDate[k]?.[h.key]) done++
        }
      })
      const pct = total > 0 ? done / total : 0
      rows.push({ ...h, pct, done, total })
    })
    return rows
  }, [entries, scoreDates, today, autoHabitsByDate, habits, water, waterEnabled, waterGoal])

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
