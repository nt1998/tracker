import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { parseDate } from './dates'
import { getPhaseColor, hexToRgba } from './colors'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
)

const phaseBandsPlugin = {
  id: 'phaseBands',
  beforeDraw(chart) {
    const bands = chart.options.plugins?.phaseBands?.bands
    if (!bands || !bands.length) return
    const { ctx, chartArea: { left, right, top, bottom } } = chart
    const totalLabels = chart.data.labels.length
    if (totalLabels === 0) return
    const pxPerLabel = (right - left) / (totalLabels - 1 || 1)
    bands.forEach(({ startIdx, endIdx, color }) => {
      const x0 = left + (startIdx - 0.5) * pxPerLabel
      const x1 = left + (endIdx + 0.5) * pxPerLabel
      ctx.save()
      ctx.fillStyle = color
      ctx.fillRect(Math.max(x0, left), top, Math.min(x1, right) - Math.max(x0, left), bottom - top)
      ctx.restore()
    })
  },
}
ChartJS.register(phaseBandsPlugin)

const weekMarkersPlugin = {
  id: 'weekMarkers',
  afterDatasetsDraw(chart) {
    const dates = chart.options.plugins?.weekMarkers?.dates
    if (!dates || dates.length < 2) return
    const { ctx, chartArea, scales } = chart
    ctx.save()
    ctx.fillStyle = 'rgba(137, 180, 250, 0.55)'
    for (let i = 1; i < dates.length; i++) {
      const cur = parseDate(dates[i])
      if (cur.getDay() !== 1) continue
      const prev = parseDate(dates[i - 1])
      if (prev.getDay() === 1) continue
      const xCur = scales.x.getPixelForValue(i)
      const xPrev = scales.x.getPixelForValue(i - 1)
      const x = (xCur + xPrev) / 2
      ctx.fillRect(Math.round(x) - 1, chartArea.bottom - 2, 2, 5)
    }
    ctx.restore()
  },
}
ChartJS.register(weekMarkersPlugin)

export function buildPhaseBands(sortedDates, phases) {
  const bands = []
  phases.forEach(p => {
    const startIdx = sortedDates.findIndex(d => d >= p.start)
    if (startIdx === -1) return
    let endIdx = p.end ? sortedDates.findIndex(d => d > p.end) : sortedDates.length
    if (endIdx === -1) endIdx = sortedDates.length
    endIdx = Math.max(endIdx - 1, startIdx)
    const color = getPhaseColor(p.name)
    bands.push({ startIdx, endIdx, color: hexToRgba(color, 0.13) })
  })
  return bands
}

export function baseChartOpts(extraScales, phaseBands, dates) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      ...(phaseBands ? { phaseBands: { bands: phaseBands } } : {}),
      ...(dates ? { weekMarkers: { dates } } : {}),
    },
    scales: {
      x: { ticks: { color: '#6c7086', font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
      y: { ticks: { color: '#6c7086', font: { size: 9 } }, grid: { color: '#313244' } },
      ...extraScales,
    },
    elements: { point: { radius: 0 }, line: { tension: 0.35, borderWidth: 2 } },
  }
}
