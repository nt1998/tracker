import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDays, formatDateLabel, todayKey } from '../lib/dates'
import { METRICS, getActiveMetrics, ensureHabits, habitApplies, makeEmptyEntry } from '../lib/bodyData'
import { BlackHoleIcon } from '../components/icons'
import KeypadInput from '../components/KeypadInput'

export default function WeightLog({ entries, setEntries, autoHabitsByDate, habits, settings, water, setWater, waterLog, setWaterLog }) {
  const activeMetrics = getActiveMetrics(settings)
  const today = todayKey()
  const [date, setDate] = useState(today)
  const [habitDetail, setHabitDetail] = useState(null)
  const [celebPhase, setCelebPhase] = useState('orbit')
  const [animT, setAnimT] = useState(0)
  const dateInputRef = useRef(null)
  const longPressRef = useRef(null)
  const celebRafRef = useRef(null)
  const waterLongPressRef = useRef(null)
  const waterLongFiredRef = useRef(false)
  const waterSectionLongPressRef = useRef(null)
  const [waterTimelineOpen, setWaterTimelineOpen] = useState(false)

  const waterEnabled = settings?.waterEnabled !== false
  const waterGoal = Math.max(1, parseInt(settings?.waterGoalML, 10) || 2500)
  const waterToday = (water && water[date]) || 0
  const waterPct = Math.round((waterToday / waterGoal) * 100)
  const waterAtGoal = waterToday >= waterGoal

  const addWater = (ml) => {
    setWater(prev => {
      const cur = (prev && prev[date]) || 0
      const next = Math.max(0, cur + ml)
      return { ...(prev || {}), [date]: next }
    })
    setWaterLog(prev => {
      const dayEvents = (prev && prev[date]) || []
      return { ...(prev || {}), [date]: [...dayEvents, { at: Date.now(), ml }] }
    })
  }
  // First time the timeline is opened on a day where water exists but no
  // per-event log was captured (pre-feature data), back-fill plausible events
  // spread between 06:00 and the current time. Greedy split into 1L / 330 /
  // 250 chunks so totals match exactly.
  const backfillIfNeeded = () => {
    if (!isToday) return
    const existing = (waterLog && waterLog[date]) || []
    if (existing.length > 0) return
    let remaining = waterToday
    if (remaining <= 0) return
    const chunks = []
    while (remaining >= 1000) { chunks.push(1000); remaining -= 1000 }
    while (remaining >= 330) { chunks.push(330); remaining -= 330 }
    while (remaining >= 250) { chunks.push(250); remaining -= 250 }
    if (remaining > 0) chunks.push(remaining)
    const now = new Date()
    const nowMs = now.getTime()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0).getTime()
    const span = Math.max(60_000, nowMs - dayStart)
    const synthesized = chunks.map((ml, i) => ({
      at: Math.round(dayStart + (span * (i + 1)) / (chunks.length + 1)),
      ml,
    }))
    setWaterLog(prev => ({ ...(prev || {}), [date]: synthesized }))
  }
  const openWaterTimeline = () => { backfillIfNeeded(); setWaterTimelineOpen(true) }
  const closeWaterTimeline = () => setWaterTimelineOpen(false)
  const sectionLongPressDown = () => {
    if (waterSectionLongPressRef.current) clearTimeout(waterSectionLongPressRef.current)
    waterSectionLongPressRef.current = setTimeout(() => {
      openWaterTimeline()
      waterSectionLongPressRef.current = null
    }, 500)
  }
  const sectionLongPressCancel = () => {
    if (waterSectionLongPressRef.current) {
      clearTimeout(waterSectionLongPressRef.current)
      waterSectionLongPressRef.current = null
    }
  }
  // Long-press (≥500ms): release subtracts the button's amount.
  // Short tap: release adds the amount.
  const waterBtnDown = () => {
    waterLongFiredRef.current = false
    if (waterLongPressRef.current) clearTimeout(waterLongPressRef.current)
    waterLongPressRef.current = setTimeout(() => {
      waterLongFiredRef.current = true
      waterLongPressRef.current = null
    }, 500)
  }
  const waterBtnUp = (ml) => {
    if (waterLongPressRef.current) {
      clearTimeout(waterLongPressRef.current)
      waterLongPressRef.current = null
    }
    if (waterLongFiredRef.current) {
      waterLongFiredRef.current = false
      addWater(-ml)
      return
    }
    addWater(ml)
  }
  const waterBtnCancel = () => {
    if (waterLongPressRef.current) {
      clearTimeout(waterLongPressRef.current)
      waterLongPressRef.current = null
    }
    waterLongFiredRef.current = false
  }

  const isToday = date === today

  useEffect(() => {
    if (!habitDetail) return
    const onDown = (e) => {
      setHabitDetail(null)
      e.stopPropagation()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [habitDetail])

  const updateEntry = useCallback((field, value) => {
    setEntries(prev => {
      const existing = prev[date] ? ensureHabits(prev[date]) : makeEmptyEntry(prev[addDays(date, -1)])
      return { ...prev, [date]: { ...existing, [field]: value } }
    })
  }, [date, setEntries])

  const updateHabit = useCallback((habitKey, value) => {
    setEntries(prev => {
      const existing = prev[date] ? ensureHabits(prev[date]) : makeEmptyEntry(prev[addDays(date, -1)])
      return { ...prev, [date]: { ...existing, habits: { ...existing.habits, [habitKey]: value } } }
    })
  }, [date, setEntries])

  const adjustValue = useCallback((field, delta) => {
    const metric = METRICS.find(m => m.key === field)
    const step = metric?.step || 0.1
    const existing = entries[date] ? ensureHabits(entries[date]) : makeEmptyEntry(entries[addDays(date, -1)])
    const current = parseFloat(existing[field]) || 0
    const newVal = (current + delta * step).toFixed(step === 1 ? 0 : 1)
    updateEntry(field, newVal)
  }, [entries, date, updateEntry])

  const changeDate = useCallback((days) => {
    const newDate = addDays(date, days)
    if (newDate > today) return
    setDate(newDate)
  }, [date, today])

  const entryRecorded = !!entries[date]

  const readHabit = useCallback((d, key) => {
    const h = habits.find(x => x.key === key)
    if (h?.auto) return !!autoHabitsByDate[d]?.[key]
    const ent = entries[d] ? ensureHabits(entries[d]) : null
    return !!ent?.habits?.[key]
  }, [entries, autoHabitsByDate, habits])

  const applicable = useMemo(
    () => habits.filter(h => !h.auto && habitApplies(h, date, entries)),
    [date, habits, entries],
  )

  const orbitFraction = useMemo(() => {
    const done = applicable.filter(h => readHabit(date, h.key)).length
    return { done, total: applicable.length }
  }, [date, applicable, readHabit])

  const allDone = orbitFraction.total > 0 && orbitFraction.done === orbitFraction.total

  useEffect(() => {
    if (!allDone) setCelebPhase('orbit')
  }, [allDone, date])

  useEffect(() => {
    if (celebPhase !== 'swallow' && celebPhase !== 'eject') return
    const start = performance.now()
    const duration = celebPhase === 'swallow' ? 1600 : 900
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setAnimT(t)
      if (t < 1) {
        celebRafRef.current = requestAnimationFrame(step)
      } else {
        setCelebPhase(prev => prev === 'swallow' ? 'hidden' : 'orbit')
        setAnimT(0)
      }
    }
    celebRafRef.current = requestAnimationFrame(step)
    return () => { if (celebRafRef.current) cancelAnimationFrame(celebRafRef.current) }
  }, [celebPhase])

  const handleCenterClick = () => {
    if (!allDone) return
    if (celebPhase === 'orbit') setCelebPhase('swallow')
    else if (celebPhase === 'hidden') setCelebPhase('eject')
  }

  const getDisplayValue = (field) => {
    if (entries[date]?.[field]) return entries[date][field]
    if (!entryRecorded) {
      const yest = entries[addDays(date, -1)]
      if (yest?.[field]) return yest[field]
    }
    return ''
  }
  const isYesterdayValue = (field) => !entryRecorded && !entries[date]?.[field] && entries[addDays(date, -1)]?.[field]

  return (
    <>
      <div className="log-header">
        <button onClick={() => changeDate(-1)}>{'‹'}</button>
        <span className="log-date" onClick={() => dateInputRef.current?.showPicker()}>
          {formatDateLabel(date)}
        </span>
        <input
          type="date"
          ref={dateInputRef}
          value={date}
          max={today}
          onChange={(e) => { if (e.target.value && e.target.value <= today) setDate(e.target.value) }}
        />
        <button onClick={() => changeDate(1)} disabled={isToday}>{'›'}</button>
      </div>

      <div className="orbit-wrap">
        <div className="orbit">
          <div className="orbit-ring"></div>
          <div className="orbit-ring r2"></div>
          <div
            className={`orbit-center ${allDone ? 'celebrating' : ''} ${celebPhase}`}
            onClick={handleCenterClick}
            style={{ cursor: allDone ? 'pointer' : 'default' }}
          >
            {allDone ? (
              <div className="celebration-icon"><BlackHoleIcon /></div>
            ) : (
              <>
                <div className="frac">
                  <span>{orbitFraction.done}</span>
                  <span className="denom">/<span>{orbitFraction.total}</span></span>
                </div>
                <div className="lbl">in orbit</div>
              </>
            )}
          </div>

          {applicable.map((h, i) => {
            const N = applicable.length
            const baseAngle = -Math.PI / 2 + (i / N) * Math.PI * 2

            let angle = baseAngle, rMult = 1, opacity = 1, scale = 1, hidden = false
            if (celebPhase === 'hidden') hidden = true
            else if (celebPhase === 'swallow') {
              const t = animT
              angle = baseAngle + t * t * Math.PI * 8
              if (t < 0.45) rMult = 1 + (t / 0.45) * 0.35
              else { const t2 = (t - 0.45) / 0.55; rMult = Math.max(0, 1.35 * (1 - t2 * t2)) }
              const fadeT = Math.max(0, (t - 0.55) / 0.45)
              opacity = 1 - fadeT * fadeT
              scale = 1 - fadeT * 0.6
            } else if (celebPhase === 'eject') {
              const t = animT
              const eased = 1 - Math.pow(1 - t, 3)
              rMult = eased
              opacity = Math.min(1, t * 2)
              scale = 0.3 + 0.7 * eased
            }
            const orbitR = 110 * rMult
            const x = 140 + Math.cos(angle) * orbitR
            const y = 140 + Math.sin(angle) * orbitR
            const isDone = readHabit(date, h.key)
            const pressStart = () => {
              if (celebPhase !== 'orbit') return
              if (longPressRef.current) clearTimeout(longPressRef.current)
              longPressRef.current = {
                t: Date.now(),
                fired: false,
                timer: setTimeout(() => {
                  if (longPressRef.current) longPressRef.current.fired = true
                  setHabitDetail(h)
                }, 500),
              }
            }
            const pressEnd = () => {
              if (celebPhase !== 'orbit') return
              const ref = longPressRef.current
              if (!ref) return
              clearTimeout(ref.timer)
              longPressRef.current = null
              if (!ref.fired) updateHabit(h.key, !isDone)
            }
            // pointerLeave fires on iOS during a tap if the finger drifts even
            // a couple pixels. Don't cancel — only the timer needs canceling so
            // the long-press detail doesn't pop. Toggle still fires on pointerUp.
            const pressCancel = () => {
              const ref = longPressRef.current
              if (ref && !ref.fired) clearTimeout(ref.timer)
            }
            if (hidden) return null
            return (
              <div
                key={h.key}
                className={`planet ${isDone ? 'done' : 'pending'}`}
                style={{
                  '--c': h.color,
                  left: x + 'px',
                  top: y + 'px',
                  opacity,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transition: celebPhase === 'orbit' ? undefined : 'none',
                  pointerEvents: celebPhase === 'orbit' ? 'auto' : 'none',
                }}
                onPointerDown={pressStart}
                onPointerUp={pressEnd}
                onPointerLeave={pressCancel}
                onPointerCancel={pressCancel}
              >
                <div className="p-icon">{h.icon}</div>
                <div className="p-name">{h.name}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="log-section-title">Measurements</div>
      <div className="log-metrics">
        {activeMetrics.map(m => (
          <div key={m.key} className="log-metric">
            <div className="lm-label">{m.label}</div>
            <div className="lm-row">
              <button className="lm-btn" onClick={() => adjustValue(m.key, -1)}>-</button>
              <div className={`lm-val ${isYesterdayValue(m.key) ? 'yesterday' : ''}`} style={{ color: m.color }}>
                <KeypadInput
                  mode="decimal"
                  value={getDisplayValue(m.key)}
                  placeholder="--"
                  label={`${m.label}${m.unit ? ` (${m.unit})` : ''}`}
                  unit={m.unit || ''}
                  min={0}
                  style={{ color: isYesterdayValue(m.key) ? '#6c7086' : m.color }}
                  onChange={(next) => updateEntry(m.key, next)}
                />
              </div>
              <button className="lm-btn" onClick={() => adjustValue(m.key, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {waterEnabled && (
        <>
          <div className="log-section-title">Water</div>
          <div
            className="water-section"
            onPointerDown={sectionLongPressDown}
            onPointerUp={sectionLongPressCancel}
            onPointerLeave={sectionLongPressCancel}
            onPointerCancel={sectionLongPressCancel}
          >
            <div className="water-progress-row">
              <span className={`wpr-left ${waterAtGoal ? 'over' : ''}`}>
                {waterToday} / {waterGoal} ml
              </span>
              <span className="wpr-right" style={{ color: 'var(--c-sky)' }}>
                {waterAtGoal ? '✓' : waterPct + '%'}
              </span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: Math.min(100, waterPct) + '%', background: 'var(--c-sky)' }}
              ></div>
            </div>
            <div className="water-btn-row">
              {[
                { label: '+250', ml: 250 },
                { label: '+330', ml: 330 },
                { label: '+1L', ml: 1000 },
              ].map(b => (
                <button
                  key={b.label}
                  type="button"
                  className="water-btn"
                  onPointerDown={waterBtnDown}
                  onPointerUp={() => waterBtnUp(b.ml)}
                  onPointerLeave={waterBtnCancel}
                  onPointerCancel={waterBtnCancel}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {habitDetail && (
        <div className="habit-detail" style={{ '--c': habitDetail.color }}>
          <div className="hd-title">
            <span className="hd-icon">{habitDetail.icon}</span>
            <span>{habitDetail.name}</span>
          </div>
          {habitDetail.description && (
            <div className="hd-line">{habitDetail.description}</div>
          )}
        </div>
      )}

      {waterTimelineOpen && (
        <WaterTimeline
          events={(waterLog && waterLog[date]) || []}
          totalMl={waterToday}
          isToday={isToday}
          onClose={closeWaterTimeline}
        />
      )}
    </>
  )
}

// Vertical water timeline. Range 6:00-24:00. Past portion of day rendered
// in the accent color with a "now" marker. Each logged event becomes a dot
// + label. Same-button bursts (matching ml within 60s) collapse into one
// dot showing the summed amount; mixed-amount bursts list values comma-
// separated.
function WaterTimeline({ events, totalMl, isToday, onClose }) {
  const START_HOUR = 6
  const END_HOUR = 24
  const totalMin = (END_HOUR - START_HOUR) * 60
  // Recompute "now" each render (modal stays open briefly).
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowFrac = isToday
    ? Math.min(1, Math.max(0, (nowMin - START_HOUR * 60) / totalMin))
    : 1
  // Group events within 60s of each other.
  const sorted = [...events].sort((a, b) => a.at - b.at)
  const groups = []
  for (const ev of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(ev.at - last.lastAt) <= 60_000) {
      last.events.push(ev)
      last.lastAt = ev.at
    } else {
      groups.push({ events: [ev], lastAt: ev.at })
    }
  }
  const hours = []
  for (let h = START_HOUR; h <= END_HOUR; h += 3) hours.push(h)
  const fmtTime = (ms) => {
    const d = new Date(ms)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const groupLabel = (g) => {
    const sums = new Map()
    for (const ev of g.events) sums.set(ev.ml, (sums.get(ev.ml) || 0) + 1)
    const parts = []
    for (const [ml, count] of sums.entries()) {
      const total = ml * count
      const sign = total >= 0 ? '+' : '−'
      parts.push(`${sign}${Math.abs(total)}ml`)
    }
    return parts.join(', ')
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="water-timeline-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wtm-head">Water timeline</div>
        <div className="wtm-line-wrap">
          <div className="wtm-line">
            <div className="wtm-line-bg"></div>
            <div className="wtm-line-fill" style={{ height: (nowFrac * 100) + '%' }}></div>
            {isToday && <div className="wtm-now" style={{ top: (nowFrac * 100) + '%' }}>
              <div className="wtm-now-dot"></div>
              <div className="wtm-now-label">{fmtTime(now.getTime())}</div>
            </div>}
            {hours.map(h => {
              const top = ((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100
              return (
                <div key={h} className="wtm-hour" style={{ top: top + '%' }}>
                  <span>{String(h).padStart(2, '0')}:00</span>
                </div>
              )
            })}
            {groups.map((g, i) => {
              const at = g.events[g.events.length - 1].at
              const d = new Date(at)
              const min = d.getHours() * 60 + d.getMinutes()
              const top = Math.min(100, Math.max(0, ((min - START_HOUR * 60) / totalMin) * 100))
              const negative = g.events.every(e => e.ml < 0)
              return (
                <div key={i} className={`wtm-event ${negative ? 'neg' : ''}`} style={{ top: top + '%' }}>
                  <div className="wtm-event-dot"></div>
                  <div className="wtm-event-label">{groupLabel(g)}</div>
                </div>
              )
            })}
          </div>
        </div>
        {events.length === 0 && totalMl > 0 && (
          <div className="wtm-empty">No per-event history before this update — new adds will appear with timestamps.</div>
        )}
        {events.length === 0 && totalMl <= 0 && (
          <div className="wtm-empty">No water logged today.</div>
        )}
        <button className="wtm-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
