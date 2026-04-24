import ScrubbableLine from '../ScrubbableLine'
import { hexToRgba } from '../../lib/colors'
import { weightAvgDeltaSeries } from '../../lib/bodyData'

const CANVAS_W = 337

export default function WeightTrendChart({ keys, entries, opts }) {
  const series = weightAvgDeltaSeries(keys, entries)
  const hasData = series.some(v => v != null)
  if (!hasData) return null
  const labels = keys.map(k => k.slice(5))
  const pickLast = (arr) => { for (let j = arr.length - 1; j >= 0; j--) if (arr[j] != null) return j; return arr.length - 1 }
  const absMax = Math.max(1, ...series.filter(v => v != null).map(v => Math.abs(v)))
  const boundedOpts = {
    ...opts,
    scales: {
      ...(opts.scales || {}),
      y: { ...((opts.scales && opts.scales.y) || {}), min: -absMax, max: absMax },
    },
  }
  return (
    <div className="chart-card">
      <ScrubbableLine
        data={{
          labels,
          datasets: [
            { data: series, borderColor: '#89b4fa', backgroundColor: hexToRgba('#89b4fa', 0.15), fill: true },
            { data: series.map(() => 0), borderColor: '#45475a', borderDash: [4, 4], borderWidth: 1, fill: false, pointRadius: 0 },
          ],
        }}
        options={boundedOpts}
        width={CANVAS_W} height={120}
        style={{ width: CANVAS_W, height: 120 }}
        renderHead={(idx) => {
          const i = idx ?? pickLast(series)
          const v = series[i]
          const sign = v == null ? '' : (v >= 0 ? '+' : '')
          return (
            <div className="card-head">
              7 Day Weight Delta <span className="v">{v != null ? `${sign}${v.toFixed(2)} kg` : '--'} {idx != null && <span className="d">{keys[i]}</span>}</span>
            </div>
          )
        }}
      />
    </div>
  )
}
