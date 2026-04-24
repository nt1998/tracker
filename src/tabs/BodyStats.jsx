import { useMemo, useState } from 'react'
import JourneyPanel from '../components/stats/JourneyPanel'
import PhasePanel from '../components/stats/PhasePanel'
import HabitsPanel from '../components/stats/HabitsPanel'
import { ORBIT_HABITS, ensureHabits, habitApplies } from '../lib/bodyData'
import { addDays, todayKey } from '../lib/dates'

export default function BodyStats({ entries, phases, autoHabitsByDate }) {
  const [statsTab, setStatsTab] = useState('journey')
  const [statsPhaseIdx, setStatsPhaseIdx] = useState(-1)

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

  return (
    <>
      <div className="stats-nav">
        {['journey', 'phase', 'habits'].map(t => (
          <button key={t} className={statsTab === t ? 'active' : ''} onClick={() => setStatsTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {statsTab === 'journey' && <JourneyPanel entries={entries} phases={phases} sortedDates={sortedDates} />}
      {statsTab === 'phase' && <PhasePanel entries={entries} phases={phases} sortedDates={sortedDates} statsPhaseIdx={statsPhaseIdx} setStatsPhaseIdx={setStatsPhaseIdx} />}
      {statsTab === 'habits' && <HabitsPanel trailsData={trailsData} habitScores={habitScores} entries={entries} phases={phases} sortedDates={sortedDates} />}
    </>
  )
}
