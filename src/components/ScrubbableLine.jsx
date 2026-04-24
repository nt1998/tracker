import { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'

export default function ScrubbableLine({
  data, options, width, height, style, renderHead, className,
  // Optional zoom/pan. When range + onRangeChange are provided, two-finger
  // touch gestures pinch-zoom and pan the x-axis within [0, maxIndex].
  range, onRangeChange, maxIndex,
}) {
  const chartRef = useRef(null)
  const wrapRef = useRef(null)
  const selRef = useRef(null)
  const gestureRef = useRef(null)
  const [sel, setSel] = useState(null)

  const clearSel = () => {
    if (selRef.current == null) return
    selRef.current = null
    setSel(null)
    chartRef.current?.update('none')
  }

  useEffect(() => {
    const onDocDown = (e) => {
      if (selRef.current == null) return
      if (wrapRef.current && !wrapRef.current.contains(e.target)) clearSel()
    }
    const onExtClear = () => clearSel()
    document.addEventListener('pointerdown', onDocDown)
    window.addEventListener('scrub:clear', onExtClear)
    return () => {
      document.removeEventListener('pointerdown', onDocDown)
      window.removeEventListener('scrub:clear', onExtClear)
    }
  }, [])

  const pickIdx = (clientX) => {
    const chart = chartRef.current
    if (!chart) return null
    const rect = chart.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const scale = chart.scales.x
    if (!scale) return null
    const n = chart.data.labels.length
    let best = 0, bestDist = Infinity
    for (let i = 0; i < n; i++) {
      const px = scale.getPixelForValue(i)
      const d = Math.abs(px - x)
      if (d < bestDist) { bestDist = d; best = i }
    }
    return best
  }

  const updateSel = (idx) => {
    if (idx == null || idx === selRef.current) return
    selRef.current = idx
    setSel(idx)
    chartRef.current?.update('none')
  }

  // ----- Gesture handling -----
  // One finger: scrub.
  // Two fingers: pinch zoom + pan (x-axis only). Only active when the caller
  // wired onRangeChange.
  const zoomEnabled = typeof onRangeChange === 'function' && typeof maxIndex === 'number'

  // Mode discrimination:
  //   - Zoom: direct pinch (distance changes beyond threshold).
  //   - Pan:  2 fingers held ~350ms roughly still, THEN move as a unit.
  // Locked on first qualifying motion; stays locked until touch ends.
  const PAN_HOLD_MS = 350
  const ZOOM_DIST_THRESHOLD = 8
  const MIN_SPAN = 2

  const snapshotTouches = (chart, e) => {
    const rect = chart.canvas.getBoundingClientRect()
    const x0 = e.touches[0].clientX - rect.left
    const x1 = e.touches[1].clientX - rect.left
    return { x0, x1, rect }
  }

  const onTouchStart = (e) => {
    if (zoomEnabled && e.touches.length === 2) {
      const chart = chartRef.current
      if (!chart) return
      const { x0, x1, rect } = snapshotTouches(chart, e)
      const span = (range ? (range.max - range.min) : maxIndex) || 1
      gestureRef.current = {
        mode: 'none',
        startDist: Math.abs(x1 - x0),
        startCenterPx: (x0 + x1) / 2,
        startMin: range ? range.min : 0,
        startMax: range ? range.max : maxIndex,
        startSpan: span,
        chartWidth: rect.width,
        holdTimer: setTimeout(() => {
          if (gestureRef.current && gestureRef.current.mode === 'none') {
            gestureRef.current.mode = 'pan'
          }
        }, PAN_HOLD_MS),
      }
      clearSel()
      e.preventDefault()
      return
    }
    if (e.touches.length > 1) { clearSel(); return }
    const t = e.touches?.[0]
    if (t) updateSel(pickIdx(t.clientX))
  }

  const onTouchMove = (e) => {
    const g = gestureRef.current
    if (zoomEnabled && g && e.touches.length === 2) {
      const chart = chartRef.current
      if (!chart) return
      const { x0, x1 } = snapshotTouches(chart, e)
      const curDist = Math.abs(x1 - x0)
      const curCenterPx = (x0 + x1) / 2
      const distDelta = Math.abs(curDist - g.startDist)

      if (g.mode === 'none' && distDelta > ZOOM_DIST_THRESHOLD) {
        if (g.holdTimer) { clearTimeout(g.holdTimer); g.holdTimer = null }
        g.mode = 'zoom'
      }

      if (g.mode === 'zoom') {
        // Pinch zoom. Anchor the value at the gesture-start midpoint.
        const zoomFactor = g.startDist / Math.max(1, curDist)
        let newSpan = Math.max(MIN_SPAN, g.startSpan * zoomFactor)
        newSpan = Math.min(maxIndex, newSpan)
        const pxPerIdxStart = g.chartWidth / Math.max(1, g.startSpan)
        const valueAtStartCenter = g.startMin + g.startCenterPx / pxPerIdxStart
        const pxPerIdxNew = g.chartWidth / newSpan
        let newMin = valueAtStartCenter - g.startCenterPx / pxPerIdxNew
        let newMax = newMin + newSpan
        if (newMin < 0) { newMax -= newMin; newMin = 0 }
        if (newMax > maxIndex) { newMin -= (newMax - maxIndex); newMax = maxIndex }
        newMin = Math.max(0, newMin)
        newMax = Math.min(maxIndex, newMax)
        if (newMax - newMin < MIN_SPAN) newMax = Math.min(maxIndex, newMin + MIN_SPAN)
        onRangeChange({ min: Math.round(newMin), max: Math.round(newMax) })
        e.preventDefault()
        return
      }

      if (g.mode === 'pan') {
        // Shift the whole range in value-space by the midpoint drag delta.
        const pxPerIdxStart = g.chartWidth / Math.max(1, g.startSpan)
        const valueShift = (g.startCenterPx - curCenterPx) / pxPerIdxStart
        let newMin = g.startMin + valueShift
        let newMax = g.startMax + valueShift
        if (newMin < 0) { newMax -= newMin; newMin = 0 }
        if (newMax > maxIndex) { newMin -= (newMax - maxIndex); newMax = maxIndex }
        newMin = Math.max(0, newMin)
        newMax = Math.min(maxIndex, newMax)
        onRangeChange({ min: Math.round(newMin), max: Math.round(newMax) })
        e.preventDefault()
        return
      }
      // Mode still 'none' — waiting for hold timer or pinch threshold.
      e.preventDefault()
      return
    }
    if (g) return
    if (e.touches.length > 1) return
    const t = e.touches?.[0]
    if (!t) return
    e.preventDefault()
    updateSel(pickIdx(t.clientX))
  }

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) {
      const g = gestureRef.current
      if (g?.holdTimer) clearTimeout(g.holdTimer)
      gestureRef.current = null
    }
  }

  // Merge range into options.scales.x so Chart.js draws the zoomed view.
  const finalOptions = useMemo(() => {
    if (!range) return options
    return {
      ...options,
      scales: {
        ...(options?.scales || {}),
        x: {
          ...((options?.scales && options.scales.x) || {}),
          min: range.min,
          max: range.max,
        },
      },
    }
  }, [options, range])

  const scrubPlugin = useMemo(() => ({
    id: 'scrub',
    afterDatasetsDraw(chart) {
      const idx = selRef.current
      if (idx == null) return
      const { ctx, chartArea, scales } = chart
      const x = scales.x.getPixelForValue(idx)
      ctx.save()
      ctx.strokeStyle = 'rgba(137, 180, 250, 0.55)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      ctx.setLineDash([])
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i)
        const pt = meta.data[idx]
        if (!pt) return
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = ds.borderColor
        ctx.fill()
        ctx.strokeStyle = '#1e1e2e'
        ctx.lineWidth = 2
        ctx.stroke()
      })
      ctx.restore()
    },
  }), [])

  return (
    <>
      {renderHead && renderHead(sel)}
      <div
        ref={wrapRef}
        className={className}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{ touchAction: zoomEnabled ? 'none' : 'pan-y', width: '100%', height: height ?? style?.height }}
      >
        <Line
          ref={chartRef}
          data={data}
          options={finalOptions}
          plugins={[scrubPlugin]}
        />
      </div>
    </>
  )
}
