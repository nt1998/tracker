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

// Draw a zigzag scissor-mark over gap slots in the x-axis + blank the plot area above them.
const gapMarksPlugin = {
  id: 'gapMarks',
  afterDraw(chart) {
    const isGap = chart.options.plugins?.gapMarks?.isGap
    if (!isGap || !isGap.length) return
    const { ctx, chartArea, scales } = chart
    ctx.save()
    for (let i = 0; i < isGap.length; i++) {
      if (!isGap[i]) continue
      const xCur = scales.x.getPixelForValue(i)
      const xPrev = i > 0 ? scales.x.getPixelForValue(i - 1) : xCur
      const xNext = i < isGap.length - 1 ? scales.x.getPixelForValue(i + 1) : xCur
      const left = (xPrev + xCur) / 2
      const right = (xCur + xNext) / 2
      // blank the gap column (remove phase fill + gridlines visually)
      ctx.clearRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top + 6)
      // draw zigzag across the gap span at the x-axis baseline
      ctx.strokeStyle = '#6c7086'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      const y0 = chartArea.bottom
      const amp = 4
      const step = 3
      let x = left
      let up = true
      ctx.moveTo(x, y0)
      while (x < right) {
        x += step
        ctx.lineTo(x, y0 + (up ? -amp : amp))
        up = !up
      }
      ctx.stroke()
    }
    ctx.restore()
  },
}
ChartJS.register(gapMarksPlugin)

const weekMarkersPlugin = {
  id: 'weekMarkers',
  afterDatasetsDraw(chart) {
    const dates = chart.options.plugins?.weekMarkers?.dates
    if (!dates || dates.length < 2) return
    const { ctx, chartArea, scales } = chart
    ctx.save()
    ctx.fillStyle = 'rgba(137, 180, 250, 0.55)'
    for (let i = 1; i < dates.length; i++) {
      if (!dates[i] || !dates[i - 1]) continue // skip across gap slots
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

// Year-change markers: dashed vertical line + bold year label on top.
// Runs in afterDraw (after gapMarksPlugin's blanking) so the label isn't hidden.
const yearMarkersPlugin = {
  id: 'yearMarkers',
  afterDraw(chart) {
    const dates = chart.options.plugins?.yearMarkers?.dates
    if (!dates || dates.length < 2) return
    const { ctx, chartArea, scales } = chart
    let lastYear = null
    for (let i = 0; i < dates.length; i++) {
      if (!dates[i]) continue
      const y = dates[i].slice(0, 4)
      if (lastYear !== null && y !== lastYear) {
        const xCur = scales.x.getPixelForValue(i)
        const xPrev = i > 0 ? scales.x.getPixelForValue(i - 1) : xCur
        const x = Math.round((xCur + xPrev) / 2)
        ctx.save()
        // solid bright line
        ctx.strokeStyle = '#a6e3a1'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(x, chartArea.top + 14)
        ctx.lineTo(x, chartArea.bottom)
        ctx.stroke()
        ctx.setLineDash([])
        // pill backdrop behind the year label so it stays readable over anything
        ctx.font = 'bold 11px -apple-system, sans-serif'
        const label = y
        const w = ctx.measureText(label).width + 10
        const h = 14
        const rectX = x - w / 2
        const rectY = chartArea.top
        ctx.fillStyle = '#1e1e2e'
        ctx.strokeStyle = '#a6e3a1'
        ctx.lineWidth = 1
        ctx.beginPath()
        const r = 4
        ctx.moveTo(rectX + r, rectY)
        ctx.lineTo(rectX + w - r, rectY)
        ctx.quadraticCurveTo(rectX + w, rectY, rectX + w, rectY + r)
        ctx.lineTo(rectX + w, rectY + h - r)
        ctx.quadraticCurveTo(rectX + w, rectY + h, rectX + w - r, rectY + h)
        ctx.lineTo(rectX + r, rectY + h)
        ctx.quadraticCurveTo(rectX, rectY + h, rectX, rectY + h - r)
        ctx.lineTo(rectX, rectY + r)
        ctx.quadraticCurveTo(rectX, rectY, rectX + r, rectY)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#a6e3a1'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x, rectY + h / 2 + 0.5)
        ctx.restore()
      }
      lastYear = y
    }
  },
}
ChartJS.register(yearMarkersPlugin)

// Split phase bands at gap slots so the zigzag column stays unfilled.
export function buildPhaseBands(sortedDates, phases, isGap) {
  const bands = []
  phases.forEach(p => {
    const color = getPhaseColor(p)
    const rgba = hexToRgba(color, 0.13)
    let segStart = -1
    for (let i = 0; i < sortedDates.length; i++) {
      const d = sortedDates[i]
      const gap = isGap ? isGap[i] : false
      const inside = d && !gap && d >= p.start && (!p.end || d <= p.end)
      if (inside && segStart === -1) segStart = i
      else if (!inside && segStart !== -1) {
        bands.push({ startIdx: segStart, endIdx: i - 1, color: rgba })
        segStart = -1
      }
    }
    if (segStart !== -1) bands.push({ startIdx: segStart, endIdx: sortedDates.length - 1, color: rgba })
  })
  return bands
}

export function baseChartOpts(extraScales, phaseBands, dates, isGap) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      ...(phaseBands ? { phaseBands: { bands: phaseBands } } : {}),
      ...(dates ? { weekMarkers: { dates }, yearMarkers: { dates } } : {}),
      ...(isGap ? { gapMarks: { isGap } } : {}),
    },
    scales: {
      x: { ticks: { color: '#6c7086', font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
      y: { ticks: { color: '#6c7086', font: { size: 9 } }, grid: { color: '#313244' } },
      ...extraScales,
    },
    elements: { point: { radius: 0 }, line: { tension: 0.35, borderWidth: 2 } },
  }
}

