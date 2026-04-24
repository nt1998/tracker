import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDays, formatDateLabel, todayKey } from '../lib/dates'
import { METRICS, getActiveMetrics, ensureHabits, habitApplies, makeEmptyEntry } from '../lib/bodyData'
import { BlackHoleIcon } from '../components/icons'

export default function WeightLog({ entries, setEntries, autoHabitsByDate, habits, settings, water, setWater }) {
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

  const waterEnabled = !!settings?.waterEnabled
  const waterGoal = Math.max(1, parseInt(settings?.waterGoalML, 10) || 2500)
  const waterToday = (water && water[date]) || 0
  const waterPct = Math.round((waterToday / waterGoal) * 100)
  const waterAtGoal = waterToday >= waterGoal

  const addWater = (ml) => {
    setWater(prev => {
      const cur = (prev && prev[date]) || 0
      return { ...(prev || {}), [date]: cur + ml }
    })
  }
  const resetWater = () => {
    setWater(prev => {
      const next = { ...(prev || {}) }
      delete next[date]
      return next
    })
  }
  const waterBtnDown = () => {
    waterLongFiredRef.current = false
    if (waterLongPressRef.current) clearTimeout(waterLongPressRef.current)
    waterLongPressRef.current = setTimeout(() => {
      waterLongFiredRef.current = true
      waterLongPressRef.current = null
      if (confirm('Reset today’s water intake to 0?')) resetWater()
    }, 500)
  }
  const waterBtnUp = (ml) => {
    if (waterLongPressRef.current) {
      clearTimeout(waterLongPressRef.current)
      waterLongPressRef.current = null
    }
    if (waterLongFiredRef.current) {
      waterLongFiredRef.current = false
      return
    }
    addWater(ml)
  }
  const waterBtnCancel = () => {
    if (waterLongPressRef.current) {
      clearTimeout(waterLongPressRef.current)
      waterLongPressRef.current = null
    }
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
              longPressRef.current = setTimeout(() => {
                setHabitDetail(h)
                longPressRef.current = null
              }, 500)
            }
            const pressEnd = () => {
              if (celebPhase !== 'orbit') return
              if (longPressRef.current) {
                clearTimeout(longPressRef.current)
                longPressRef.current = null
                updateHabit(h.key, !isDone)
              }
            }
            const pressCancel = () => {
              if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }
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

      {waterEnabled && (
        <>
          <div className="log-section-title">Water</div>
          <div className="water-section">
            <div className="water-progress-row">
              <span className={`wpr-left ${waterAtGoal ? 'over' : ''}`}>
                {waterToday} / {waterGoal} ml
              </span>
              <span className="wpr-right" style={{ color: '#89dceb' }}>
                {waterAtGoal ? '✓' : waterPct + '%'}
              </span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: Math.min(100, waterPct) + '%', background: '#89dceb' }}
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

      <div className="log-section-title">Measurements</div>
      <div className="log-metrics">
        {activeMetrics.map(m => (
          <div key={m.key} className="log-metric">
            <div className="lm-label">{m.label} {m.unit && `(${m.unit})`}</div>
            <div className="lm-row">
              <button className="lm-btn" onClick={() => adjustValue(m.key, -1)}>-</button>
              <div className={`lm-val ${isYesterdayValue(m.key) ? 'yesterday' : ''}`} style={{ color: m.color }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={getDisplayValue(m.key)}
                  placeholder="--"
                  style={{ color: isYesterdayValue(m.key) ? '#6c7086' : m.color }}
                  onChange={(e) => updateEntry(m.key, e.target.value)}
                />
              </div>
              <button className="lm-btn" onClick={() => adjustValue(m.key, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

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
    </>
  )
}
