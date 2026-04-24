import { ensureHabits, ORBIT_HABITS } from '../../lib/bodyData'

export default function HabitsPanel({ trailsData, habitScores, entries, phases, sortedDates, habits }) {
  const list = habits || ORBIT_HABITS
  const curPhase = phases.find(p => !p.end)
  const phaseKeys = curPhase ? sortedDates.filter(k => k >= curPhase.start && (!curPhase.end || k <= curPhase.end)) : sortedDates

  const streaks = list.map(h => {
    let streak = 0
    for (let i = phaseKeys.length - 1; i >= 0; i--) {
      const e = ensureHabits(entries[phaseKeys[i]])
      const v = e.habits?.[h.key]
      if (v === null || v === undefined) continue
      if (v) streak++; else break
    }
    return { ...h, streak }
  })

  return (
    <>
      <div className="stat-section-title">21-day trails</div>
      <div className="trails-section" style={{ marginBottom: 12 }}>
        <div className="section-h">
          <span className="t"></span>
          <span className="sub">3 wk {'→'} today</span>
        </div>
        {trailsData.map(h => (
          <div key={h.key} className="trail">
            <span className="t-icon">{h.icon}</span>
            <span className="t-name">{h.name}{h.auto ? <span className="auto">auto</span> : ''}</span>
            <div className="dots">
              {h.dots.map((dot, i) => (
                <div key={i} className={dot.cls} style={{ '--c': dot.color }}></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="stat-section-title">Habit compliance -- all time</div>
      <div className="compliance-grid">
        {habitScores.map(hs => {
          const pctVal = Math.round(hs.pct * 100)
          return (
            <div key={hs.key} className="comp-cell">
              <div className="name">{hs.icon} {hs.name}</div>
              <div className="pct" style={{ color: hs.color }}>{pctVal}%</div>
              <div className="meta">{hs.done} / {hs.total} days</div>
              <div className="pct-bar">
                <div className="pct-fill" style={{ width: pctVal + '%', background: hs.color }}></div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="stat-section-title">Streaks ({curPhase ? 'current phase' : 'all time'})</div>
      <div className="chart-card">
        {streaks.map(h => (
          <div key={h.key} className="streak-row">
            <span className="s-icon">{h.icon}</span>
            <span className="s-name">{h.name}</span>
            <span className="s-val" style={{ color: h.color }}>{h.streak}d</span>
          </div>
        ))}
      </div>
    </>
  )
}
