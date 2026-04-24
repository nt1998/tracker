import { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'

export default function ScrubbableLine({ data, options, width, height, style, renderHead, className }) {
  const chartRef = useRef(null)
  const wrapRef = useRef(null)
  const selRef = useRef(null)
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

  const onTouchStart = (e) => { const t = e.touches?.[0]; if (t) updateSel(pickIdx(t.clientX)) }
  const onTouchMove = (e) => { const t = e.touches?.[0]; if (!t) return; e.preventDefault(); updateSel(pickIdx(t.clientX)) }

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
        style={{ touchAction: 'pan-y' }}
      >
        <Line
          ref={chartRef}
          data={data}
          options={options}
          width={width}
          height={height}
          style={style}
          plugins={[scrubPlugin]}
        />
      </div>
    </>
  )
}
