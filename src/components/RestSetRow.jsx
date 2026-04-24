import { useEffect, useRef, useState } from 'react'
import { fmtSec } from '../lib/weights'

export default function RestSetRow({ ex, setIdx, checked, onCheck }) {
  const [remaining, setRemaining] = useState(null)
  const intervalRef = useRef(null)

  const clearTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  useEffect(() => () => clearTimer(), [])

  useEffect(() => {
    if (remaining === 0) {
      clearTimer()
      onCheck(true)
      setRemaining(null)
    }
  }, [remaining, onCheck])

  const isTime = ex.type === 'time'
  const totalDuration = isTime ? (ex.duration * (ex.perSide ? 2 : 1)) : 0

  const handleClick = () => {
    if (checked) { onCheck(false); return }
    if (!isTime) { onCheck(true); return }
    if (remaining !== null) {
      clearTimer()
      setRemaining(null)
      return
    }
    setRemaining(totalDuration)
    intervalRef.current = setInterval(() => {
      setRemaining(r => (r === null ? null : Math.max(0, r - 1)))
    }, 1000)
  }

  const label = isTime
    ? (ex.perSide ? `${ex.duration}s each side` : `${ex.duration}s`)
    : `${ex.reps}${ex.perSide ? ' each side' : ''}${ex.holdSec ? ` · hold ${ex.holdSec}s` : ''}`

  let boxContent = ''
  if (checked) boxContent = '✓'
  else if (remaining !== null) boxContent = fmtSec(remaining)

  return (
    <div className={`rest-set-row ${checked ? 'checked' : ''} ${remaining !== null ? 'running' : ''}`} onClick={handleClick}>
      <div className="rest-set-box">{boxContent}</div>
      <div className="rest-set-label">Set {setIdx + 1} · {label}</div>
    </div>
  )
}
