import { useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { todayKey } from '../lib/dates'
import { toKg } from '../lib/weights'

// Render kg value with unit, switching to tons above 1000 kg.
const fmtKg = v => v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${Math.round(v)} kg`
const fmtMD = d => { const [, m, da] = d.split('-'); return `${m}/${da}` }

function getExerciseConfig(exercises, name) {
  const ex = Object.values(exercises || {}).find(e => e.name === name)
  return ex || { unit: 'kg', equipmentType: 'machine', startWeight: 5, increment: 5 }
}

function getSessionVolume(exercises, w) {
  let total = 0, setCount = 0
  w.exercises?.forEach(ex => {
    const cfg = getExerciseConfig(exercises, ex.name)
    ex.workSets?.forEach(s => {
      if (s.committed === false) return
      const wt = toKg(s.weight, cfg.unit, cfg.kgPerUnit)
      const r = parseInt(s.reps) || 0
      if (wt > 0 && r > 0) { total += wt * r; setCount++ }
    })
  })
  return { volume: total, sets: setCount }
}

function filterByPhase(workouts, phases, statsFilter) {
  if (statsFilter === 'all') {
    return Object.fromEntries(Object.entries(workouts).filter(([, w]) => w.committed))
  }
  let phase
  if (statsFilter === 'current') phase = phases.find(p => !p.end)
  else phase = phases.find(p => String(p.id) === String(statsFilter))
  if (!phase) return Object.fromEntries(Object.entries(workouts).filter(([, w]) => w.committed))
  return Object.fromEntries(
    Object.entries(workouts).filter(([d, w]) => d >= phase.start && (!phase.end || d <= phase.end) && w.committed),
  )
}

const isRestWorkout = (w) => w?.isRest === true || w?.routineType === 'rest'

function getWeeklyStreak(workouts, phases, filterByCurrentPhase) {
  const phase = phases.find(p => !p.end)
  const committed = Object.entries(workouts)
    .filter(([d, w]) => w.committed && !isRestWorkout(w) && (!filterByCurrentPhase || !phase || d >= phase.start))
    .map(([d]) => d)
  const getWeekNumber = (d) => {
    const dt = new Date(d)
    const soy = new Date(dt.getFullYear(), 0, 1)
    const days = Math.floor((dt - soy) / 86400000)
    return Math.ceil((days + soy.getDay() + 1) / 7)
  }
  const weekHas = new Set()
  committed.forEach(date => {
    const y = date.slice(0, 4)
    weekHas.add(`${y}-W${getWeekNumber(date)}`)
  })
  const sorted = [...weekHas].sort().reverse()
  let streak = 0
  const now = new Date()
  const curWk = `${now.getFullYear()}-W${getWeekNumber(now.toISOString().slice(0, 10))}`
  for (const wk of sorted) {
    if (weekHas.has(wk)) streak++
    else if (wk !== curWk) break
  }
  return streak
}

function getWeeklyVolume(exercises, workouts, phases, statsFilter) {
  const filtered = filterByPhase(workouts, phases, statsFilter)
  const map = {}
  Object.entries(filtered).forEach(([date, w]) => {
    if (isRestWorkout(w)) return
    const d = new Date(date)
    const day = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - day)
    const wk = d.toISOString().slice(0, 10)
    if (!map[wk]) map[wk] = { week: wk, volume: 0 }
    const { volume } = getSessionVolume(exercises, w)
    map[wk].volume += volume
  })
  return Object.values(map).sort((a, b) => a.week.localeCompare(b.week))
}

function getCadenceCells(exercises, workouts, today) {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const dow = (t.getDay() + 6) % 7
  const end = new Date(t); end.setDate(end.getDate() - dow + 6)
  const start = new Date(end); start.setDate(start.getDate() - (12 * 7 - 1))
  const cols = []
  let maxVol = 1
  Object.entries(workouts).forEach(([, w]) => {
    if (w.committed && !isRestWorkout(w)) maxVol = Math.max(maxVol, getSessionVolume(exercises, w).volume)
  })
  let lastMonth = -1
  for (let w = 0; w < 12; w++) {
    const colStart = new Date(start); colStart.setDate(colStart.getDate() + w * 7)
    let monthLabel = ''
    if (colStart.getMonth() !== lastMonth) {
      monthLabel = colStart.toLocaleDateString('en', { month: 'short' })
      lastMonth = colStart.getMonth()
    }
    const days = []
    for (let di = 0; di < 7; di++) {
      const day = new Date(start); day.setDate(day.getDate() + w * 7 + di)
      const ds = day.toISOString().slice(0, 10)
      const wk = workouts[ds]
      if (wk?.committed) {
        if (isRestWorkout(wk)) days.push({ ds, type: 'rest', level: 0 })
        else {
          const vol = getSessionVolume(exercises, wk).volume
          const lvl = Math.min(4, Math.max(1, Math.ceil((vol / maxVol) * 4)))
          days.push({ ds, type: 'gym', level: lvl, volume: vol })
        }
      } else {
        days.push({ ds, type: null, level: 0 })
      }
    }
    cols.push({ monthLabel, days })
  }
  return cols
}

function getCalendarDays(workouts, calendarMonth) {
  const year = calendarMonth.getFullYear()
  const month = calendarMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []
  const startDay = (firstDay.getDay() + 6) % 7
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const w = workouts[ds]
    days.push({
      day: d,
      date: ds,
      hasWorkout: w?.committed,
      kind: w?.committed ? (isRestWorkout(w) ? 'rest' : 'gym') : '',
    })
  }
  return days
}

function buildExerciseIndex(exercises, workouts, phases, statsFilter) {
  const filtered = filterByPhase(workouts, phases, statsFilter)
  const idx = {}
  Object.entries(filtered).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, w]) => {
    if (isRestWorkout(w)) return
    w.exercises?.forEach(ex => {
      const cfg = getExerciseConfig(exercises, ex.name)
      const workSets = (ex.workSets || []).filter(s => s.committed !== false).map(s => {
        const wKg = toKg(s.weight, cfg.unit, cfg.kgPerUnit)
        const reps = parseInt(s.reps) || 0
        return { weight: s.weight, weightKg: wKg, reps, unit: s.unit || cfg.unit, e1RM: wKg > 0 && reps > 0 ? wKg * (1 + reps / 30) : 0 }
      })
      const valid = workSets.filter(s => s.weightKg > 0 && s.reps > 0)
      if (!valid.length) return
      const topSet = valid.reduce((b, s) => !b || s.weightKg > b.weightKg ? s : b, null)
      const e1RM = valid.reduce((m, s) => Math.max(m, s.e1RM), 0)
      const volume = valid.reduce((s, x) => s + x.weightKg * x.reps, 0)
      if (!idx[ex.name]) idx[ex.name] = { name: ex.name, sessions: [] }
      idx[ex.name].sessions.push({ date, topSet, e1RM, volume, workSets, notes: ex.notes || '' })
    })
  })
  const now = new Date()
  Object.values(idx).forEach(e => {
    e.maxWeight = Math.max(...e.sessions.map(s => s.topSet.weightKg))
    e.maxE1RM = Math.max(...e.sessions.map(s => s.e1RM))
    e.totalVolume = e.sessions.reduce((s, x) => s + x.volume, 0)
    e.totalSets = e.sessions.reduce((s, x) => s + x.workSets.length, 0)
    e.totalReps = e.sessions.reduce((s, x) => s + x.workSets.reduce((a, b) => a + b.reps, 0), 0)
    e.lastDate = e.sessions[e.sessions.length - 1].date
    e.daysSince = Math.floor((now - new Date(e.lastDate)) / 86400000)
    const last = e.sessions.slice(-4)
    if (last.length >= 2) {
      const xs = last.map((_, i) => i)
      const ys = last.map(s => s.e1RM)
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length
      const my = ys.reduce((a, b) => a + b, 0) / ys.length
      let num = 0, den = 0
      for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
      e.slope = den ? num / den : 0
    } else { e.slope = 0 }
    if (e.sessions.length >= 4) {
      const cutE1 = Math.max(...e.sessions.slice(0, -3).map(s => s.e1RM))
      const recentMax = Math.max(...e.sessions.slice(-3).map(s => s.e1RM))
      e.stalled = recentMax <= cutE1 + 0.1
    } else { e.stalled = false }
  })
  return idx
}

function detectPRsInRange(exercises, workouts, phases, statsFilter) {
  const filtered = filterByPhase(workouts, phases, statsFilter)
  const sorted = Object.entries(filtered).sort(([a], [b]) => a.localeCompare(b))
  const best = {}
  const prs = []
  sorted.forEach(([date, w]) => {
    if (isRestWorkout(w)) return
    w.exercises?.forEach(ex => {
      const cfg = getExerciseConfig(exercises, ex.name)
      let topW = 0, topR = 0, e1RM = 0
      ex.workSets?.forEach(s => {
        if (s.committed === false) return
        const wt = toKg(s.weight, cfg.unit, cfg.kgPerUnit)
        const r = parseInt(s.reps) || 0
        if (wt > 0 && r > 0) {
          if (wt > topW) { topW = wt; topR = r }
          const e = wt * (1 + r / 30)
          if (e > e1RM) e1RM = e
        }
      })
      if (e1RM === 0) return
      const cur = best[ex.name] || 0
      if (e1RM > cur + 0.1) {
        if (cur > 0) prs.push({ date, name: ex.name, weight: topW, reps: topR, e1RM })
        best[ex.name] = e1RM
      } else { best[ex.name] = Math.max(cur, e1RM) }
    })
  })
  return prs
}

export default function GymStats({ workouts, phases, exercises, forcedScope, forcedSubTab, hideSubTabs, flatLayout }) {
  const [ownFilter, setOwnFilter] = useState('current')
  const statsFilter = forcedScope !== undefined ? forcedScope : ownFilter
  const setStatsFilter = forcedScope !== undefined ? () => {} : setOwnFilter
  const [ownSubTab, setOwnSubTab] = useState('overview')
  const statsTab = forcedSubTab !== undefined ? forcedSubTab : ownSubTab
  const setStatsTab = forcedSubTab !== undefined ? () => {} : setOwnSubTab
  const [exSort, setExSort] = useState('recent')
  const [histFilter, setHistFilter] = useState('all')
  const [openHistDates, setOpenHistDates] = useState(new Set())
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const today = todayKey()
  const curPhase = phases.find(p => !p.end)
  const showOwnFilter = forcedScope === undefined

  const filtered = useMemo(() => filterByPhase(workouts, phases, statsFilter), [workouts, phases, statsFilter])
  const filteredEntries = Object.entries(filtered)
  const workSessions = filteredEntries.filter(([, w]) => !isRestWorkout(w))
  const totalVolume = workSessions.reduce((s, [, w]) => s + getSessionVolume(exercises, w).volume, 0)
  const weekly = useMemo(() => getWeeklyVolume(exercises, workouts, phases, statsFilter), [exercises, workouts, phases, statsFilter])
  const cadence = useMemo(() => getCadenceCells(exercises, filtered, today), [exercises, filtered, today])
  const exIdx = useMemo(() => buildExerciseIndex(exercises, workouts, phases, statsFilter), [exercises, workouts, phases, statsFilter])
  const prs = useMemo(() => detectPRsInRange(exercises, workouts, phases, statsFilter), [exercises, workouts, phases, statsFilter])

  const exList = Object.values(exIdx)

  const sortedExList = [...exList]
  if (exSort === 'alpha') sortedExList.sort((a, b) => a.name.localeCompare(b.name))
  else if (exSort === 'recent') sortedExList.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
  else if (exSort === 'trend') sortedExList.sort((a, b) => b.slope - a.slope)
  else if (exSort === 'volume') sortedExList.sort((a, b) => b.totalVolume - a.totalVolume)

  const histSessions = filteredEntries
    .filter(([, w]) => {
      if (histFilter === 'all') return true
      const rest = isRestWorkout(w)
      return (histFilter === 'rest') ? rest : !rest
    })
    .sort(([a], [b]) => b.localeCompare(a))
  const histGroups = {}
  histSessions.forEach(([d, w]) => {
    const dt = new Date(d); const day = (dt.getDay() + 6) % 7
    dt.setDate(dt.getDate() - day)
    const wk = dt.toISOString().slice(0, 10)
    if (!histGroups[wk]) histGroups[wk] = []
    histGroups[wk].push([d, w])
  })
  const prSet = new Set(); prs.forEach(p => prSet.add(p.date + '|' + p.name))

  return (
    <div className="stats-page">
      {showOwnFilter && (
        <div className="stats-filter">
          <select value={statsFilter} onChange={(e) => setStatsFilter(e.target.value)}>
            {curPhase && <option value="current">{curPhase.name} (current)</option>}
            {phases.filter(p => p.end).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="all">All Time</option>
          </select>
        </div>
      )}

      {!hideSubTabs && !flatLayout && (
        <div className="stats-subtabs">
          <button className={statsTab === 'overview' ? 'active' : ''} onClick={() => setStatsTab('overview')}>Overview</button>
          <button className={statsTab === 'exercises' ? 'active' : ''} onClick={() => setStatsTab('exercises')}>Exercises</button>
          <button className={statsTab === 'history' ? 'active' : ''} onClick={() => setStatsTab('history')}>History</button>
        </div>
      )}

      {(flatLayout || statsTab === 'overview') && (
        <>
          <div className="hero-quad">
            <div className="hero-card"><div className="v">{workSessions.length}</div><div className="l">Sessions</div></div>
            <div className="hero-card streak"><div className="v">{getWeeklyStreak(workouts, phases, true)}</div><div className="l">Week Streak</div></div>
            <div className="hero-card"><div className="v">{fmtKg(totalVolume)}</div><div className="l">Volume</div></div>
            <div className="hero-card pr"><div className="v">{prs.length}</div><div className="l">PRs</div></div>
          </div>

          <div className="stats-block">
            <h4>Weekly Volume</h4>
            {weekly.length >= 1 ? (
              <div className="chart-host" style={{ height: 180 }}>
                <Bar
                  data={{
                    labels: weekly.map(w => fmtMD(w.week)),
                    datasets: [
                      { label: 'Volume', data: weekly.map(w => Math.round(w.volume || 0)), backgroundColor: '#89b4fa', borderRadius: 4 },
                    ],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: '#6c7086', font: { size: 9 } }, grid: { display: false } },
                      y: { ticks: { color: '#6c7086', font: { size: 9 }, callback: v => fmtKg(v) }, grid: { color: '#313244' } },
                    },
                  }}
                />
              </div>
            ) : <div className="empty-msg">No data</div>}
          </div>

          <div className="stats-block">
            <h4>Cadence <span className="sub">12wk · 1col=1wk Mon→Sun</span></h4>
            <div className="heatmap-wrap">
              <div className="heatmap-months">
                <span></span>
                {cadence.map((c, i) => <span key={i}>{c.monthLabel}</span>)}
              </div>
              <div className="heatmap-body">
                <div className="heatmap-days">
                  <span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span>S</span>
                </div>
                <div className="heatmap-grid">
                  {cadence.map((c, ci) => (
                    <div className="heatmap-col" key={ci}>
                      {c.days.map((d, di) => (
                        <div
                          key={di}
                          className={`heatmap-cell ${d.type === 'rest' ? 'rest' : d.level ? 'l' + d.level : ''} ${d.ds === today ? 'today' : ''}`}
                          title={d.ds + (d.type ? ` · ${d.type}` : '')}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="heatmap-legend">
              <div className="grad">
                <span>Less</span>
                <span className="sw" />
                <span className="sw l1" />
                <span className="sw l2" />
                <span className="sw l3" />
                <span className="sw l4" />
                <span>More</span>
              </div>
              <div><span className="sw rest" /> Rehab</div>
            </div>
          </div>

          <div className="calendar-section">
            <div className="calendar-header">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>&lt;</button>
              <span>{calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>&gt;</button>
            </div>
            <div className="calendar-weekdays">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="calendar-grid">
              {getCalendarDays(filtered, calendarMonth).map((day, i) => (
                <div
                  key={i}
                  className={`calendar-day ${day?.hasWorkout ? 'workout' : ''} ${day?.kind || ''} ${day?.date === today ? 'today' : ''}`}
                >
                  {day?.day}
                </div>
              ))}
            </div>
            <div className="cal-legend">
              <span><span className="sw push" /> Push</span>
              <span><span className="sw pull" /> Pull</span>
              <span><span className="sw rest" /> Rehab</span>
            </div>
          </div>

        </>
      )}

      {(flatLayout || statsTab === 'exercises') && (
        <>
          {flatLayout && <div className="stat-section-title">Exercises</div>}
          <div className="ex-sort-bar">
            <select value={exSort} onChange={(e) => setExSort(e.target.value)}>
              <option value="recent">Sort: Recent</option>
              <option value="alpha">Sort: A-Z</option>
              <option value="trend">Sort: Trend</option>
              <option value="volume">Sort: Volume</option>
            </select>
          </div>
          {sortedExList.length === 0 && <div className="empty-msg">No exercises in this period</div>}
          {sortedExList.map(e => {
            const last = e.sessions[e.sessions.length - 1]
            const cls = e.slope > 0.2 ? 'up' : e.slope < -0.2 ? 'down' : 'flat'
            const arr = e.slope > 0.2 ? '▲' : e.slope < -0.2 ? '▼' : '–'
            return (
              <div key={e.name} className="ex-card2">
                <div className="head">
                  <div>
                    <div className="nm">{e.name}</div>
                    <div className="sub">
                      <span>{last.topSet.weightKg.toFixed(1)}kg × {last.topSet.reps}</span>
                      <span className={`arr ${cls}`}>{arr}</span>
                      <span>· {e.daysSince}d ago</span>
                    </div>
                  </div>
                </div>
                <div className="chart-host" style={{ height: 170 }}>
                  {e.sessions.length < 2 ? (
                    <div className="single-note">Only 1 session — need ≥2 for a chart</div>
                  ) : (
                    <Line
                      data={{
                        labels: e.sessions.map(s => fmtMD(s.date)),
                        datasets: [
                          { label: 'Weight', data: e.sessions.map(s => +s.topSet.weightKg.toFixed(1)), borderColor: '#89b4fa', backgroundColor: '#89b4fa22', tension: 0.3, borderWidth: 2, pointRadius: 2.5, yAxisID: 'y' },
                          { label: '1RM', data: e.sessions.map(s => +s.e1RM.toFixed(1)), borderColor: '#f9e2af', backgroundColor: '#f9e2af22', tension: 0.3, borderWidth: 2, pointRadius: 2.5, borderDash: [4, 3], yAxisID: 'y' },
                          { label: 'Volume', data: e.sessions.map(s => Math.round(s.volume)), borderColor: '#cba6f7', backgroundColor: '#cba6f733', tension: 0.3, borderWidth: 2, pointRadius: 2.5, yAxisID: 'y2' },
                        ],
                      }}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: { position: 'bottom', labels: { color: '#a6adc8', boxWidth: 10, font: { size: 9 }, padding: 6, usePointStyle: true } },
                          tooltip: { backgroundColor: '#181825', borderColor: '#45475a', borderWidth: 1, titleColor: '#cdd6f4', bodyColor: '#cdd6f4', padding: 8 },
                        },
                        scales: {
                          x: { ticks: { color: '#6c7086', font: { size: 8 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
                          y: { position: 'left', ticks: { color: '#89b4fa', font: { size: 8 } }, grid: { color: '#31324480' }, title: { display: true, text: 'kg', color: '#89b4fa', font: { size: 9 } } },
                          y2: { position: 'right', ticks: { color: '#cba6f7', font: { size: 8 }, callback: v => fmtKg(v) }, grid: { display: false }, title: { display: true, text: 'vol', color: '#cba6f7', font: { size: 9 } } },
                        },
                      }}
                    />
                  )}
                </div>
                <div className="stats-row">
                  <div><span>Top</span><b>{e.maxWeight.toFixed(1)}kg</b></div>
                  <div><span>e1RM</span><b>{e.maxE1RM.toFixed(1)}kg</b></div>
                  <div><span>Sets</span><b>{e.totalSets}</b></div>
                  <div><span>Vol</span><b>{fmtKg(e.totalVolume)}</b></div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {(flatLayout || statsTab === 'history') && (
        <>
          {flatLayout && <div className="stat-section-title">History</div>}
          <div className="hist-filter">
            {['all', 'gym', 'rest'].map(r => (
              <button key={r} className={histFilter === r ? 'active' : ''} onClick={() => setHistFilter(r)}>
                {r === 'rest' ? 'Rest' : r === 'gym' ? 'Gym' : 'All'}
              </button>
            ))}
          </div>
          {histSessions.length === 0 && <div className="empty-msg">No sessions in this period</div>}
          {Object.keys(histGroups).sort().reverse().map(wk => (
            <div key={wk}>
              <div className="hist-week">Week of {fmtMD(wk)}</div>
              {histGroups[wk].map(([d, w]) => {
                const isRest = isRestWorkout(w)
                const { volume, sets } = isRest ? { volume: 0, sets: 0 } : getSessionVolume(exercises, w)
                const open = openHistDates.has(d)
                const exPRs = isRest ? 0 : (w.exercises || []).filter(ex => prSet.has(d + '|' + ex.name)).length
                return (
                  <div key={d} className="sess-card">
                    <div className="sess-head" onClick={() => {
                      const next = new Set(openHistDates)
                      if (next.has(d)) next.delete(d); else next.add(d)
                      setOpenHistDates(next)
                    }}>
                      <div className="left">
                        <span className={`badge ${isRest ? 'rest' : 'gym'}`}>{w.routineType}</span>
                        <span className="date">{fmtMD(d)}</span>
                      </div>
                      <div className="meta">
                        {isRest ? <span>rehab ✓</span> : <><span>{fmtKg(volume)}</span><span>{sets} sets</span></>}
                        {exPRs > 0 && <span className="pr">{exPRs}⭐</span>}
                        <span className="chev">{open ? '▴' : '▾'}</span>
                      </div>
                    </div>
                    {open && (
                      <div className="sess-body">
                        {isRest ? (
                          <div className="sess-rest">Rehab session completed.</div>
                        ) : (w.exercises || []).map((ex, ei) => {
                          const cfg = getExerciseConfig(exercises, ex.name)
                          const work = (ex.workSets || []).filter(s => s.committed !== false && parseFloat(s.weight) > 0)
                          const warm = (ex.warmupSets || []).filter(s => parseFloat(s.weight) > 0)
                          const isPR = prSet.has(d + '|' + ex.name)
                          if (!work.length && !warm.length) return null
                          return (
                            <div key={ei} className="sess-ex">
                              <div className="nm">
                                <span>{ex.name}</span>
                                {isPR && <span className="pr">⭐ PR</span>}
                              </div>
                              <div className="sets">
                                {work.map((s, si) => (
                                  <span key={si} className="work">{s.weight}{s.unit || cfg.unit}×{s.reps}{si < work.length - 1 ? ', ' : ''}</span>
                                ))}
                                {warm.length > 0 && (
                                  <span className="warm"> · w: {warm.map((s) => `${s.weight}${s.unit || cfg.unit}×${s.reps}`).join(', ')}</span>
                                )}
                              </div>
                              {ex.notes && <div className="notes">{ex.notes}</div>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
