import { useEffect, useRef, useState } from 'react'

const SWIPE_THRESHOLD = 60
const FLICK_MS = 250
const FLICK_DX = 40
const GRAPH_HOLD_MS = 300
const GLOW_RANGE_PX = 100

export default function useSwipeNav({ appRef, tabs, tab, setTab }) {
  const [swipeDx, setSwipeDx] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const swipeRef = useRef(null)
  const suppressClickUntil = useRef(0)
  const tabRef = useRef(tab)

  useEffect(() => { tabRef.current = tab }, [tab])

  useEffect(() => {
    const el = appRef.current
    if (!el) return
    const onStart = (e) => {
      if (e.touches.length !== 1) { swipeRef.current = null; return }
      const t = e.target
      if (t?.closest?.('input, textarea, select, [contenteditable="true"], .no-swipe')) {
        swipeRef.current = null
        return
      }
      const flickOnly = !!t?.closest?.('svg, canvas, .flick-only')
      swipeRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        t0: Date.now(),
        locked: null,
        active: false,
        flickOnly,
        scrubLocked: false,
        dx: 0,
      }
    }
    const onMove = (e) => {
      const s = swipeRef.current
      if (!s) return
      const dx = e.touches[0].clientX - s.x
      const dy = e.touches[0].clientY - s.y
      if (s.locked == null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        s.locked = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v'
        if (s.locked === 'h' && s.flickOnly && Date.now() - s.t0 >= GRAPH_HOLD_MS) {
          s.scrubLocked = true
        }
      }
      if (s.locked !== 'h' || s.scrubLocked) return
      e.preventDefault()
      e.stopPropagation()
      if (!s.active) window.dispatchEvent(new Event('scrub:clear'))
      const idx = tabs.indexOf(tabRef.current)
      let adj = dx
      if ((idx === 0 && dx > 0) || (idx === tabs.length - 1 && dx < 0)) adj = dx * 0.25
      s.active = true
      s.dx = adj
      setSwipeDx(adj)
      setIsSwiping(true)
    }
    const onEnd = () => {
      const s = swipeRef.current
      swipeRef.current = null
      if (!s) { setSwipeDx(0); setIsSwiping(false); return }
      const dt = Date.now() - s.t0
      const dx = s.dx
      const idx = tabs.indexOf(tabRef.current)
      const flick = dt < FLICK_MS && Math.abs(dx) > FLICK_DX
      const commit = s.scrubLocked ? false : (Math.abs(dx) >= SWIPE_THRESHOLD || flick)
      if (commit && dx < 0 && idx < tabs.length - 1) {
        suppressClickUntil.current = Date.now() + 400
        setTab(tabs[idx + 1])
      } else if (commit && dx > 0 && idx > 0) {
        suppressClickUntil.current = Date.now() + 400
        setTab(tabs[idx - 1])
      }
      setSwipeDx(0)
      setIsSwiping(false)
    }
    el.addEventListener('touchstart', onStart, { passive: true, capture: true })
    el.addEventListener('touchmove', onMove, { passive: false, capture: true })
    el.addEventListener('touchend', onEnd, { passive: true, capture: true })
    el.addEventListener('touchcancel', onEnd, { passive: true, capture: true })
    return () => {
      el.removeEventListener('touchstart', onStart, { capture: true })
      el.removeEventListener('touchmove', onMove, { capture: true })
      el.removeEventListener('touchend', onEnd, { capture: true })
      el.removeEventListener('touchcancel', onEnd, { capture: true })
    }
  }, [appRef, tabs, setTab])

  const getTabGlow = (tabId) => {
    const activeIdx = tabs.indexOf(tab)
    const i = tabs.indexOf(tabId)
    if (!isSwiping) return i === activeIdx ? 1 : 0
    const progress = Math.min(1, Math.abs(swipeDx) / GLOW_RANGE_PX)
    const targetIdx = swipeDx < 0 ? activeIdx + 1 : swipeDx > 0 ? activeIdx - 1 : activeIdx
    if (i === activeIdx) return 1 - progress
    if (i === targetIdx && targetIdx >= 0 && targetIdx < tabs.length) return progress
    return 0
  }

  const tabCls = (tabId) => `${tab === tabId ? 'active' : ''}${isSwiping ? ' swiping' : ''}`
  const tabStl = (tabId) => ({ '--glow': getTabGlow(tabId) })
  const onClickCapture = (e) => {
    if (Date.now() < suppressClickUntil.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return { isSwiping, tabCls, tabStl, onClickCapture }
}
