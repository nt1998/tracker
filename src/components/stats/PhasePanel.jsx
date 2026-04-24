import ScrubbableLine from '../ScrubbableLine'
import MeasurementsTable from './MeasurementsTable'
import WeightTrendChart from './WeightTrendChart'
import { hexToRgba, getPhaseColor } from '../../lib/colors'
import { baseChartOpts } from '../../lib/chartSetup'
import { ensureHabits, ORBIT_HABITS } from '../../lib/bodyData'

const CANVAS_W = 337

export default function PhasePanel({ entries, phases, sortedDates, statsPhaseIdx, setStatsPhaseIdx, settings, water }) {
  const visceralEnabled = !!settings?.visceralEnabled
  const waterEnabled = settings?.waterEnabled !== false
  const waterGoal = Math.max(1, parseInt(settings?.waterGoalML, 10) || 2500)
  if (phases.length === 0) return <div style={{ color: '#45475a', textAlign: 'center', padding: 40 }}>No phases yet</div>

  const currentIdx = phases.findIndex(p => !p.end)
  const selectedIdx = statsPhaseIdx >= 0 && statsPhaseIdx < phases.length ? statsPhaseIdx : (currentIdx >= 0 ? currentIdx : phases.length - 1)
  const p = phases[selectedIdx]
  if (!p) return null

  const phaseKeys = sortedDates.filter(k => k >= p.start && (!p.end || k <= p.end))
  if (phaseKeys.length < 2) return (
    <>
      <div className="phase-picker">
        <select value={selectedIdx} onChange={(e) => setStatsPhaseIdx(+e.target.value)}>
          {phases.map((ph, i) => (
            <option key={ph.id} value={i}>{ph.name} ({ph.start} to {ph.end || 'now'}){!ph.end ? ' - current' : ''}</option>
          ))}
        </select>
      </div>
      <div style={{ color: '#45475a', textAlign: 'center', padding: 40 }}>Not enough data for this phase</div>
    </>
  )

  const first = ensureHabits(entries[phaseKeys[0]])
  const last = ensureHabits(entries[phaseKeys[phaseKeys.length - 1]])
  const days = phaseKeys.length
  const isOngoing = !p.end

  const fW = parseFloat(first.weight) || 0
  const lW = parseFloat(last.weight) || 0
  const fBf = parseFloat(first.bodyFat) || 0
  const lBf = parseFloat(last.bodyFat) || 0
  const fMu = parseFloat(first.musclePct) || 0
  const lMu = parseFloat(last.musclePct) || 0
  const fVi = parseFloat(first.visceralFat) || 0
  const lVi = parseFloat(last.visceralFat) || 0

  const wtChange = lW - fW
  const bfChange = lBf - fBf
  const muChange = lMu - fMu

  const fatMassFirst = fW * fBf / 100
  const fatMassLast = lW * lBf / 100
  const lbmFirst = fW - fatMassFirst
  const lbmLast = lW - fatMassLast
  const fatMassChange = fatMassLast - fatMassFirst
  const lbmChange = lbmLast - lbmFirst

  function gradePhase() {
    if (!p.goals) return { grade: '--', cls: '' }
    let score = 0, count = 0
    const pairs = [
      [fW, lW, parseFloat(p.goals.weight)],
      [fBf, lBf, parseFloat(p.goals.bodyFat)],
      [fMu, lMu, parseFloat(p.goals.musclePct)],
    ]
    pairs.forEach(([start, end, goal]) => {
      const target = goal - start
      const actual = end - start
      if (!isNaN(goal) && Math.abs(target) > 0.3) {
        score += Math.min(1, Math.max(0, actual / target))
        count++
      }
    })
    const avg = count > 0 ? score / count : 0
    if (avg >= 0.9) return { grade: 'A', cls: 'A' }
    if (avg >= 0.7) return { grade: 'B', cls: 'B' }
    if (avg >= 0.5) return { grade: 'C', cls: 'C' }
    if (avg >= 0.3) return { grade: 'D', cls: 'D' }
    return { grade: 'F', cls: 'F' }
  }

  const { grade, cls: gradeCls } = gradePhase()
  const phaseColor = getPhaseColor(p)

  function goalProgress(startVal, currentVal, goalVal) {
    const target = goalVal - startVal
    if (Math.abs(target) < 0.1) return 100
    return Math.min(100, Math.max(0, Math.round((currentVal - startVal) / target * 100)))
  }

  const labels = phaseKeys.map(k => k.slice(5))
  const phaseOpts = (extraScales) => baseChartOpts(extraScales, undefined, phaseKeys)
  const phaseWts = phaseKeys.map(k => parseFloat(entries[k]?.weight) || null)
  const pFatMass = phaseKeys.map(k => { const w = parseFloat(entries[k]?.weight), bf = parseFloat(entries[k]?.bodyFat); return (!isNaN(w) && !isNaN(bf)) ? +(w * bf / 100).toFixed(1) : null })
  const pMusMass = phaseKeys.map(k => { const w = parseFloat(entries[k]?.weight), mu = parseFloat(entries[k]?.musclePct); return (!isNaN(w) && !isNaN(mu)) ? +(w * mu / 100).toFixed(1) : null })
  const pBfVals = phaseKeys.map(k => parseFloat(entries[k]?.bodyFat) || null)
  const pMuVals = phaseKeys.map(k => parseFloat(entries[k]?.musclePct) || null)
  const pViVals = phaseKeys.map(k => parseFloat(entries[k]?.visceralFat) || null)
  const pickLast = (arr) => { for (let j = arr.length - 1; j >= 0; j--) if (arr[j] != null) return j; return arr.length - 1 }

  const streaks = ORBIT_HABITS.map(h => {
    let streak = 0
    for (let i = phaseKeys.length - 1; i >= 0; i--) {
      const e = ensureHabits(entries[phaseKeys[i]])
      const v = e.habits?.[h.key]
      if (v === null || v === undefined) continue
      if (v) streak++; else break
    }
    return { ...h, streak }
  })

  let liftCount = 0, cardioCount = 0, stretchCount = 0, caliCount = 0
  phaseKeys.forEach(k => {
    const e = ensureHabits(entries[k])
    if (e.habits?.lift) liftCount++
    if (e.habits?.cardio) cardioCount++
    if (e.habits?.stretch) stretchCount++
    if (e.habits?.calisthenics) caliCount++
  })

  return (
    <>
      <div className="phase-picker">
        <select value={selectedIdx} onChange={(e) => setStatsPhaseIdx(+e.target.value)}>
          {phases.map((ph, i) => (
            <option key={ph.id} value={i}>{ph.name} ({ph.start} to {ph.end || 'now'}){!ph.end ? ' - current' : ''}</option>
          ))}
        </select>
      </div>

      <div className="phase-detail" style={{ '--pc': phaseColor }}>
        <div className="pd-header">
          <div className="pd-name">{p.name}</div>
          {isOngoing
            ? <div className="pd-grade in-progress">In Progress</div>
            : <div className={`pd-grade ${gradeCls}`}>{grade}</div>}
        </div>
        <div className="pd-dates">{days} days -- {p.start} to {p.end || 'ongoing'}{p.goals ? ` -- Goal: ${p.goals.weight || '?'}kg / ${p.goals.bodyFat || '?'}% BF / ${p.goals.musclePct || '?'}% Mu` : ''}</div>
        <div className="pd-stats">
          <div className="pd-stat">
            <div className="pd-sv" style={{ color: '#f38ba8' }}>{lW.toFixed(1)}</div>
            <div className="pd-sl">Weight</div>
            <div className="pd-sd" style={{ color: wtChange <= 0 ? '#a6e3a1' : '#f38ba8' }}>{wtChange >= 0 ? '+' : ''}{wtChange.toFixed(1)}</div>
          </div>
          <div className="pd-stat">
            <div className="pd-sv" style={{ color: '#fab387' }}>{lBf.toFixed(1)}%</div>
            <div className="pd-sl">Body Fat</div>
            <div className="pd-sd" style={{ color: bfChange <= 0 ? '#a6e3a1' : '#f38ba8' }}>{bfChange >= 0 ? '+' : ''}{bfChange.toFixed(1)}</div>
          </div>
          <div className="pd-stat">
            <div className="pd-sv" style={{ color: '#a6e3a1' }}>{lMu.toFixed(1)}%</div>
            <div className="pd-sl">Muscle</div>
            <div className="pd-sd" style={{ color: muChange >= 0 ? '#a6e3a1' : '#f38ba8' }}>{muChange >= 0 ? '+' : ''}{muChange.toFixed(1)}</div>
          </div>
        </div>

        {isOngoing && p.goals && (
          <div style={{ marginTop: 10 }}>
            {[
              { label: 'Weight', start: fW, current: lW, goal: parseFloat(p.goals.weight), unit: 'kg', color: '#f38ba8' },
              { label: 'Body Fat', start: fBf, current: lBf, goal: parseFloat(p.goals.bodyFat), unit: '%', color: '#fab387' },
              { label: 'Muscle', start: fMu, current: lMu, goal: parseFloat(p.goals.musclePct), unit: '%', color: '#a6e3a1' },
            ].filter(m => !isNaN(m.goal)).map(m => {
              const pct = goalProgress(m.start, m.current, m.goal)
              return (
                <div key={m.label} className="progress-bar-wrap">
                  <div className="progress-bar-header">
                    <span>{m.label}: {m.current.toFixed(1)} / {m.goal} {m.unit}</span>
                    <span style={{ color: m.color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: pct + '%', background: m.color }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rate-row">
        <div className="rate-badge">
          <div className="rb-val" style={{ color: '#f38ba8' }}>{wtChange >= 0 ? '+' : ''}{wtChange.toFixed(1)}</div>
          <div className="rb-lbl">Weight delta kg</div>
          <div className="rb-bar" style={{ background: '#f38ba8', width: Math.min(100, Math.abs(wtChange) / 3 * 100) + '%' }}></div>
        </div>
        <div className="rate-badge">
          <div className="rb-val" style={{ color: '#fab387' }}>{fatMassChange >= 0 ? '+' : ''}{fatMassChange.toFixed(1)}</div>
          <div className="rb-lbl">Fat Mass kg</div>
          <div className="rb-bar" style={{ background: '#fab387', width: Math.min(100, Math.abs(fatMassChange) / 3 * 100) + '%' }}></div>
        </div>
        <div className="rate-badge">
          <div className="rb-val" style={{ color: '#a6e3a1' }}>{lbmChange >= 0 ? '+' : ''}{lbmChange.toFixed(1)}</div>
          <div className="rb-lbl">Lean Mass kg</div>
          <div className="rb-bar" style={{ background: '#a6e3a1', width: Math.min(100, Math.abs(lbmChange) / 3 * 100) + '%' }}></div>
        </div>
      </div>

      <div className="stat-section-title">Phase weight</div>
      <div className="chart-card">
        <ScrubbableLine
          data={{
            labels,
            datasets: [
              { data: phaseWts, borderColor: '#f38ba8', backgroundColor: hexToRgba('#f38ba8', 0.2), fill: true },
              { data: phaseWts.map(() => fW), borderColor: '#45475a', borderDash: [4, 4], borderWidth: 1, fill: false, pointRadius: 0 },
            ],
          }}
          options={phaseOpts()}
          width={CANVAS_W} height={120}
          style={{ width: CANVAS_W, height: 120 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(phaseWts)
            const v = phaseWts[i]
            return <div className="card-head">Weight <span className="v">{v != null ? v.toFixed(1) : '--'} kg {idx != null && <span className="d">{phaseKeys[i]}</span>}</span></div>
          }}
        />
      </div>
      <div className="stat-section-title">7 Day Weight Delta</div>
      <WeightTrendChart keys={phaseKeys} entries={entries} opts={phaseOpts()} />

      <div className="stat-section-title">Phase body composition</div>
      <div className="chart-card">
        <ScrubbableLine
          data={{
            labels,
            datasets: [
              { data: pFatMass, borderColor: '#fab387', backgroundColor: hexToRgba('#fab387', 0.15), fill: true, yAxisID: 'y' },
              { data: pMusMass, borderColor: '#a6e3a1', backgroundColor: hexToRgba('#a6e3a1', 0.15), fill: true, yAxisID: 'y2' },
            ],
          }}
          options={(() => {
            const fv = pFatMass.filter(v => v !== null), mv = pMusMass.filter(v => v !== null)
            if (!fv.length || !mv.length) return phaseOpts({
              y: { position: 'left', ticks: { color: '#fab387', font: { size: 9 } }, grid: { color: '#313244' } },
              y2: { position: 'right', ticks: { color: '#a6e3a1', font: { size: 9 } }, grid: { display: false } },
            })
            const fMin = Math.min(...fv), fMax = Math.max(...fv)
            const mMin = Math.min(...mv), mMax = Math.max(...mv)
            const range = Math.max(fMax - fMin, mMax - mMin, 2)
            const pad = range * 0.15
            const fCenter = (fMin + fMax) / 2, mCenter = (mMin + mMax) / 2
            return phaseOpts({
              y: { position: 'left', min: fCenter - range / 2 - pad, max: fCenter + range / 2 + pad, ticks: { color: '#fab387', font: { size: 9 } }, grid: { color: '#313244' } },
              y2: { position: 'right', min: mCenter - range / 2 - pad, max: mCenter + range / 2 + pad, ticks: { color: '#a6e3a1', font: { size: 9 } }, grid: { display: false } },
            })
          })()}
          width={CANVAS_W} height={110}
          style={{ width: CANVAS_W, height: 110 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(pFatMass)
            const f = pFatMass[i], m = pMusMass[i]
            return <div className="card-head">Fat / Muscle Mass (kg) <span className="v">{f != null ? f.toFixed(1) : '--'} / {m != null ? m.toFixed(1) : '--'} {idx != null && <span className="d">{phaseKeys[i]}</span>}</span></div>
          }}
        />
      </div>

      <div className="chart-card">
        <ScrubbableLine
          data={{ labels, datasets: [{ data: pBfVals, borderColor: '#fab387', backgroundColor: hexToRgba('#fab387', 0.2), fill: true }] }}
          options={phaseOpts()}
          width={CANVAS_W} height={120}
          style={{ width: CANVAS_W, height: 120 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(pBfVals)
            const v = pBfVals[i]
            return <div className="card-head">Body Fat % <span className="v">{v != null ? v.toFixed(1) : '--'}% {idx != null && <span className="d">{phaseKeys[i]}</span>}</span></div>
          }}
        />
      </div>
      <div className="chart-card">
        <ScrubbableLine
          data={{ labels, datasets: [{ data: pMuVals, borderColor: '#a6e3a1', backgroundColor: hexToRgba('#a6e3a1', 0.2), fill: true }] }}
          options={phaseOpts()}
          width={CANVAS_W} height={120}
          style={{ width: CANVAS_W, height: 120 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(pMuVals)
            const v = pMuVals[i]
            return <div className="card-head">Muscle % <span className="v">{v != null ? v.toFixed(1) : '--'}% {idx != null && <span className="d">{phaseKeys[i]}</span>}</span></div>
          }}
        />
      </div>
      {visceralEnabled && (
        <div className="chart-card">
          <ScrubbableLine
            data={{ labels, datasets: [{ data: pViVals, borderColor: '#cba6f7', backgroundColor: hexToRgba('#cba6f7', 0.2), fill: true }] }}
            options={{ ...phaseOpts(), scales: { x: { ticks: { color: '#6c7086', font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } }, y: { ticks: { color: '#6c7086', font: { size: 9 }, stepSize: 1 }, grid: { color: '#313244' }, suggestedMin: 0, suggestedMax: 8 } } }}
            width={CANVAS_W} height={90}
            style={{ width: CANVAS_W, height: 90 }}
            renderHead={(idx) => {
              const i = idx ?? pickLast(pViVals)
              const v = pViVals[i]
              return <div className="card-head">Visceral Fat <span className="v">{v ?? '--'} {idx != null && <span className="d">{phaseKeys[i]}</span>}</span></div>
            }}
          />
        </div>
      )}

      <div className="stat-section-title">Deltas this phase</div>
      {[
        ['Weight', fW, lW, 'kg', '#f38ba8'],
        ['Body Fat', fBf, lBf, '%', '#fab387'],
        ['Muscle', fMu, lMu, '%', '#a6e3a1'],
        ...(visceralEnabled ? [['Visceral', fVi, lVi, '', '#cba6f7']] : []),
      ].map(([lbl, fv, lv, unit, color]) => {
        const d = lv - fv
        return (
          <div key={lbl} className="adv-metric">
            <div className="am-left">
              <div className="am-label">{lbl}</div>
              <div className="am-sub">{fv.toFixed(1)}{unit} {'→'} {lv.toFixed(1)}{unit}</div>
            </div>
            <div className="am-val" style={{ '--c': color }}>{d >= 0 ? '+' : ''}{d.toFixed(1)}{unit}</div>
          </div>
        )
      })}

      {Math.abs(fatMassChange) > 0.01 && Math.abs(lbmChange) > 0.01 && (
        <div className="adv-metric">
          <div className="am-left">
            <div className="am-label">{fatMassChange < 0 && lbmChange > 0 ? 'Recomp ratio' : fatMassChange > 0 && lbmChange > 0 ? 'Lean gain ratio' : 'Fat:Muscle ratio'}</div>
            <div className="am-sub">
              {fatMassChange < 0 && lbmChange > 0
                ? 'For every 1kg fat lost'
                : fatMassChange > 0 && lbmChange > 0
                  ? 'Muscle of total gained'
                  : `Fat ${fatMassChange.toFixed(1)}kg / Muscle ${lbmChange.toFixed(1)}kg`}
            </div>
          </div>
          <div className="am-val" style={{ '--c': fatMassChange < 0 && lbmChange > 0 ? '#a6e3a1' : '#89b4fa' }}>
            {fatMassChange < 0 && lbmChange > 0
              ? `+${Math.abs(lbmChange / fatMassChange).toFixed(2)} kg muscle`
              : fatMassChange > 0 && lbmChange > 0
                ? `${(lbmChange / (fatMassChange + lbmChange) * 100).toFixed(0)}%`
                : (fatMassChange / lbmChange).toFixed(2)}
          </div>
        </div>
      )}

      <div className="stat-section-title">Current streaks</div>
      <div className="chart-card">
        {streaks.map(h => (
          <div key={h.key} className="streak-row">
            <span className="s-icon">{h.icon}</span>
            <span className="s-name">{h.name}</span>
            <span className="s-val" style={{ color: h.color }}>{h.streak}d</span>
          </div>
        ))}
      </div>

      {waterEnabled && (() => {
        const phaseWater = phaseKeys.map(k => (water && water[k]) || 0)
        const loggedVals = phaseWater.filter(v => v > 0)
        const phaseAvg = loggedVals.length ? Math.round(loggedVals.reduce((a, b) => a + b, 0) / loggedVals.length) : 0
        const daysHit = phaseWater.filter(v => v >= waterGoal).length
        const daysHitPct = phaseKeys.length ? Math.round((daysHit / phaseKeys.length) * 100) : 0
        return (
          <>
            <div className="stat-section-title">Water in this phase</div>
            <div className="hero-metrics">
              <div className="hero-card" style={{ '--accent': '#89dceb' }}>
                <div className="hero-val">{phaseAvg}</div>
                <div className="hero-label">Avg ml/day</div>
              </div>
              <div className="hero-card" style={{ '--accent': '#89dceb' }}>
                <div className="hero-val">{daysHit}</div>
                <div className="hero-label">Days at goal</div>
              </div>
              <div className="hero-card" style={{ '--accent': '#89dceb' }}>
                <div className="hero-val">{daysHitPct}%</div>
                <div className="hero-label">Goal rate</div>
              </div>
            </div>
            <div className="chart-card">
              <ScrubbableLine
                data={{
                  labels,
                  datasets: [
                    { data: phaseWater, borderColor: '#89dceb', backgroundColor: hexToRgba('#89dceb', 0.18), fill: true },
                    { data: phaseWater.map(() => waterGoal), borderColor: '#45475a', borderDash: [4, 4], borderWidth: 1, fill: false, pointRadius: 0 },
                  ],
                }}
                options={phaseOpts()}
                width={CANVAS_W} height={120}
                style={{ width: CANVAS_W, height: 120 }}
                renderHead={(idx) => {
                  const i = idx ?? pickLast(phaseWater)
                  const v = phaseWater[i]
                  return <div className="card-head">Water <span className="v">{v != null ? v : '--'} ml {idx != null && <span className="d">{phaseKeys[i]}</span>}</span></div>
                }}
              />
            </div>
          </>
        )
      })()}

      <div className="stat-section-title">Activity totals</div>
      <div className="chart-card">
        {[['Lift sessions', liftCount, '#f38ba8'],
          ['Cardio sessions', cardioCount, '#89dceb'],
          ['Stretch sessions', stretchCount, '#a6e3a1'],
          ['Calisthenics', caliCount, '#fab387']].map(([lbl, v, c]) => (
          <div key={lbl} className="work-stat">
            <span className="ws-label">{lbl}</span>
            <span className="ws-val" style={{ color: c }}>{v}</span>
          </div>
        ))}
      </div>
      <MeasurementsTable entries={entries} dates={phaseKeys} settings={settings} />
    </>
  )
}
