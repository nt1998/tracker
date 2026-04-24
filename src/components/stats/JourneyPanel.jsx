import ScrubbableLine from '../ScrubbableLine'
import DeltaBadge from '../DeltaBadge'
import MeasurementsTable from './MeasurementsTable'
import WeightTrendChart from './WeightTrendChart'
import { hexToRgba } from '../../lib/colors'
import { buildPhaseBands, baseChartOpts } from '../../lib/chartSetup'
import { ensureHabits } from '../../lib/bodyData'

const CANVAS_W = 337

export default function JourneyPanel({ entries, phases, sortedDates: allDates, hideMeasurements, settings, water }) {
  const visceralEnabled = !!settings?.visceralEnabled
  const waterEnabled = !!settings?.waterEnabled
  const waterGoal = Math.max(1, parseInt(settings?.waterGoalML, 10) || 2500)
  const firstPhaseStart = phases.length > 0 ? phases.map(p => p.start).sort()[0] : null
  const sortedDates = firstPhaseStart ? allDates.filter(d => d >= firstPhaseStart) : allDates
  if (sortedDates.length === 0) return <div style={{ color: '#45475a', textAlign: 'center', padding: 40 }}>No data yet</div>

  const firstKey = sortedDates[0]
  const lastKey = sortedDates[sortedDates.length - 1]
  const firstE = ensureHabits(entries[firstKey])
  const lastE = ensureHabits(entries[lastKey])
  const totalDays = sortedDates.length

  const firstW = parseFloat(firstE.weight) || 0
  const lastW = parseFloat(lastE.weight) || 0
  const firstBf = parseFloat(firstE.bodyFat) || 0
  const lastBf = parseFloat(lastE.bodyFat) || 0
  const firstMu = parseFloat(firstE.musclePct) || 0
  const lastMu = parseFloat(lastE.musclePct) || 0

  const phaseBands = buildPhaseBands(sortedDates, phases)
  const labels = sortedDates.map(k => k.slice(5))
  const wts = sortedDates.map(k => parseFloat(entries[k]?.weight) || null)
  const bfs = sortedDates.map(k => parseFloat(entries[k]?.bodyFat) || null)
  const mus = sortedDates.map(k => parseFloat(entries[k]?.musclePct) || null)
  const vis = sortedDates.map(k => parseFloat(entries[k]?.visceralFat) || null)
  const fatMass = sortedDates.map(k => {
    const w = parseFloat(entries[k]?.weight), bf = parseFloat(entries[k]?.bodyFat)
    return (!isNaN(w) && !isNaN(bf)) ? +(w * bf / 100).toFixed(2) : null
  })
  const muMass = sortedDates.map(k => {
    const w = parseFloat(entries[k]?.weight), mu = parseFloat(entries[k]?.musclePct)
    return (!isNaN(w) && !isNaN(mu)) ? +(w * mu / 100).toFixed(2) : null
  })

  const makeData = (vals, color) => ({
    labels,
    datasets: [{ data: vals, borderColor: color, backgroundColor: hexToRgba(color, 0.12), fill: true }],
  })
  const journeyOpts = (extraScales) => baseChartOpts(extraScales, phaseBands, sortedDates)
  const pickLast = (arr) => { for (let j = arr.length - 1; j >= 0; j--) if (arr[j] != null) return j; return arr.length - 1 }

  return (
    <>
      <div className="journey-total">
        <div className="jt-days">{totalDays}</div>
        <div className="jt-right">
          <div className="jt-label">Days tracked</div>
          <div className="jt-sub">{firstKey} to {lastKey} / {phases.length} phases</div>
        </div>
      </div>

      <div className="hero-metrics">
        <div className="hero-card" style={{ '--accent': '#f38ba8' }}>
          <div className="hero-val">{lastW.toFixed(1)}</div>
          <div className="hero-label">Weight kg</div>
          <div className="hero-delta"><DeltaBadge val={lastW - firstW} unit="kg" invertGood={true} /></div>
        </div>
        <div className="hero-card" style={{ '--accent': '#fab387' }}>
          <div className="hero-val">{lastBf.toFixed(1)}</div>
          <div className="hero-label">Body Fat %</div>
          <div className="hero-delta"><DeltaBadge val={lastBf - firstBf} unit="%" invertGood={true} /></div>
        </div>
        <div className="hero-card" style={{ '--accent': '#a6e3a1' }}>
          <div className="hero-val">{lastMu.toFixed(1)}</div>
          <div className="hero-label">Muscle %</div>
          <div className="hero-delta"><DeltaBadge val={lastMu - firstMu} unit="%" invertGood={false} /></div>
        </div>
      </div>

      <div className="stat-section-title">Weight trajectory</div>
      <div className="chart-card">
        <ScrubbableLine
          data={makeData(wts, '#f38ba8')}
          options={journeyOpts()}
          width={CANVAS_W} height={140}
          style={{ width: CANVAS_W, height: 140 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(wts)
            const v = wts[i]
            return <div className="card-head">Weight <span className="v">{v != null ? v.toFixed(1) : '--'} kg {idx != null && <span className="d">{sortedDates[i]}</span>}</span></div>
          }}
        />
      </div>

      <div className="stat-section-title">7 Day Weight Delta</div>
      <WeightTrendChart keys={sortedDates} entries={entries} opts={journeyOpts()} />

      <div className="stat-section-title">Body composition</div>
      <div className="chart-card">
        <ScrubbableLine
          data={{
            labels,
            datasets: [
              { data: fatMass, borderColor: '#fab387', backgroundColor: hexToRgba('#fab387', 0.1), fill: true, yAxisID: 'y' },
              { data: muMass, borderColor: '#a6e3a1', backgroundColor: hexToRgba('#a6e3a1', 0.1), fill: true, yAxisID: 'y2' },
            ],
          }}
          options={(() => {
            const fv = fatMass.filter(v => v !== null), mv = muMass.filter(v => v !== null)
            if (!fv.length || !mv.length) return journeyOpts()
            const fMin = Math.min(...fv), fMax = Math.max(...fv)
            const mMin = Math.min(...mv), mMax = Math.max(...mv)
            const range = Math.max(fMax - fMin, mMax - mMin, 2)
            const pad = range * 0.15
            const fCenter = (fMin + fMax) / 2, mCenter = (mMin + mMax) / 2
            return journeyOpts({
              y: { position: 'left', min: fCenter - range / 2 - pad, max: fCenter + range / 2 + pad, ticks: { color: '#fab387', font: { size: 9 } }, grid: { color: '#313244' } },
              y2: { position: 'right', min: mCenter - range / 2 - pad, max: mCenter + range / 2 + pad, ticks: { color: '#a6e3a1', font: { size: 9 } }, grid: { display: false } },
            })
          })()}
          width={CANVAS_W} height={140}
          style={{ width: CANVAS_W, height: 140 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(fatMass)
            const f = fatMass[i], m = muMass[i]
            return <div className="card-head">Fat vs Lean (kg) <span className="v">{f != null ? f.toFixed(1) : '--'} / {m != null ? m.toFixed(1) : '--'} {idx != null && <span className="d">{sortedDates[i]}</span>}</span></div>
          }}
        />
      </div>

      <div className="chart-card">
        <ScrubbableLine
          data={makeData(bfs, '#fab387')}
          options={journeyOpts()}
          width={CANVAS_W} height={120}
          style={{ width: CANVAS_W, height: 120 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(bfs)
            const v = bfs[i]
            return <div className="card-head">Body Fat % <span className="v">{v != null ? v.toFixed(1) : '--'}% {idx != null && <span className="d">{sortedDates[i]}</span>}</span></div>
          }}
        />
      </div>

      <div className="chart-card">
        <ScrubbableLine
          data={makeData(mus, '#a6e3a1')}
          options={journeyOpts()}
          width={CANVAS_W} height={120}
          style={{ width: CANVAS_W, height: 120 }}
          renderHead={(idx) => {
            const i = idx ?? pickLast(mus)
            const v = mus[i]
            return <div className="card-head">Muscle % <span className="v">{v != null ? v.toFixed(1) : '--'}% {idx != null && <span className="d">{sortedDates[i]}</span>}</span></div>
          }}
        />
      </div>

      {visceralEnabled && (
        <div className="chart-card">
          <ScrubbableLine
            data={makeData(vis, '#cba6f7')}
            options={{
              ...journeyOpts(),
              scales: { x: { display: false }, y: { ticks: { color: '#6c7086', font: { size: 9 }, stepSize: 1 }, grid: { color: '#313244' }, suggestedMin: 0, suggestedMax: 8 } },
            }}
            width={CANVAS_W} height={90}
            style={{ width: CANVAS_W, height: 90 }}
            renderHead={(idx) => {
              const i = idx ?? pickLast(vis)
              const v = vis[i]
              return <div className="card-head">Visceral Fat <span className="v">{v ?? '--'} {idx != null && <span className="d">{sortedDates[i]}</span>}</span></div>
            }}
          />
        </div>
      )}

      {waterEnabled && (() => {
        const waterVals = sortedDates.map(k => (water && water[k]) || 0)
        const loggedVals = Object.values(water || {}).map(v => parseFloat(v) || 0).filter(v => v > 0)
        const overallAvg = loggedVals.length ? Math.round(loggedVals.reduce((a, b) => a + b, 0) / loggedVals.length) : 0
        // 7-day avg ending today (count days with any log toward sum; divide by 7)
        const now = new Date()
        const keyOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        let sum7 = 0
        for (let i = 0; i < 7; i++) {
          const dt = new Date(now)
          dt.setDate(now.getDate() - i)
          sum7 += (water && water[keyOf(dt)]) || 0
        }
        const avg7 = Math.round(sum7 / 7)
        const best = loggedVals.length ? Math.max(...loggedVals) : 0
        return (
          <>
            <div className="stat-section-title">Water</div>
            <div className="hero-metrics">
              <div className="hero-card" style={{ '--accent': '#89dceb' }}>
                <div className="hero-val">{overallAvg}</div>
                <div className="hero-label">Avg ml/day</div>
              </div>
              <div className="hero-card" style={{ '--accent': '#89dceb' }}>
                <div className="hero-val">{avg7}</div>
                <div className="hero-label">7-day avg</div>
              </div>
              <div className="hero-card" style={{ '--accent': '#89dceb' }}>
                <div className="hero-val">{best}</div>
                <div className="hero-label">Best day</div>
              </div>
            </div>
            <div className="chart-card">
              <ScrubbableLine
                data={{
                  labels,
                  datasets: [
                    { data: waterVals, borderColor: '#89dceb', backgroundColor: hexToRgba('#89dceb', 0.18), fill: true },
                    { data: waterVals.map(() => waterGoal), borderColor: '#45475a', borderDash: [4, 4], borderWidth: 1, fill: false, pointRadius: 0 },
                  ],
                }}
                options={journeyOpts()}
                width={CANVAS_W} height={120}
                style={{ width: CANVAS_W, height: 120 }}
                renderHead={(idx) => {
                  const i = idx ?? pickLast(waterVals)
                  const v = waterVals[i]
                  return <div className="card-head">Water <span className="v">{v != null ? v : '--'} ml {idx != null && <span className="d">{sortedDates[i]}</span>}</span></div>
                }}
              />
            </div>
          </>
        )
      })()}

      {!hideMeasurements && <MeasurementsTable entries={entries} dates={sortedDates} settings={settings} />}
    </>
  )
}
