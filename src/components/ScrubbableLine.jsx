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

  const onTouchStart = (e) => {
    if (zoomEnabled && e.touches.length === 2) {
      const chart = chartRef.current
      if (!chart) return
      const rect = chart.canvas.getBoundingClientRect()
      const x0 = e.touches[0].clientX - rect.left
      const x1 = e.touches[1].clientX - rect.left
      const span = (range ? (range.max - range.min) : maxIndex) || 1
      gestureRef.current = {
        startDist: Math.abs(x1 - x0),
        startCenterPx: (x0 + x1) / 2,
        startMin: range ? range.min : 0,
        startMax: range ? range.max : maxIndex,
        startSpan: span,
        chartLeft: rect.left,
        chartWidth: rect.width,
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
    if (zoomEnabled && gestureRef.current && e.touches.length === 2) {
      const chart = chartRef.current
      if (!chart) return
      const rect = chart.canvas.getBoundingClientRect()
      const x0 = e.touches[0].clientX - rect.left
      const x1 = e.touches[1].clientX - rect.left
      const curDist = Math.abs(x1 - x0)
      const curCenterPx = (x0 + x1) / 2
      const { startDist, startCenterPx, startMin, startSpan, chartWidth } = gestureRef.current
      // Zoom: distance grows → zoom in (span shrinks)
      const zoomFactor = startDist / Math.max(1, curDist)
      let newSpan = Math.max(2, startSpan * zoomFactor)
      newSpan = Math.min(maxIndex, newSpan)
      // Anchor: value under the fingers' midpoint at gesture start stays under
      // the (possibly shifted) midpoint now.
      const pxPerIdxStart = chartWidth / Math.max(1, startSpan)
      const valueAtStartCenter = startMin + startCenterPx / pxPerIdxStart
      const pxPerIdxNew = chartWidth / newSpan
      let newMin = valueAtStartCenter - curCenterPx / pxPerIdxNew
      let newMax = newMin + newSpan
      // clamp
      if (newMin < 0) { newMax -= newMin; newMin = 0 }
      if (newMax > maxIndex) { newMin -= (newMax - maxIndex); newMax = maxIndex }
      newMin = Math.max(0, newMin)
      newMax = Math.min(maxIndex, newMax)
      if (newMax - newMin < 2) newMax = Math.min(maxIndex, newMin + 2)
      onRangeChange({ min: Math.round(newMin), max: Math.round(newMax) })
      e.preventDefault()
      return
    }
    if (gestureRef.current) return
    if (e.touches.length > 1) return
    const t = e.touches?.[0]
    if (!t) return
    e.preventDefault()
    updateSel(pickIdx(t.clientX))
  }

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) gestureRef.current = null
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
