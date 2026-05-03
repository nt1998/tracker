import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drop-in numeric / decimal input. Opens a custom floating keypad instead of
 * the system keyboard — viewport doesn't shift, scroll position stays intact.
 *
 * Props:
 *   value         string | number
 *   onChange      (next: string) => void  — called on commit
 *   mode          'decimal' | 'integer' (default 'decimal')
 *   min, max      optional clamps (applied on commit)
 *   placeholder   string
 *   label         string — shown in sheet header
 *   unit          string — shown after live value
 *   className     string — forwarded to the trigger button
 *   disabled      boolean
 *   displayClassName  string — extra class for trigger (optional)
 */
export default function KeypadInput({
  value,
  onChange,
  mode = 'decimal',
  min,
  max,
  placeholder = '',
  label = '',
  unit = '',
  className = '',
  disabled = false,
  style,
  inputStyle,
}) {
  const [open, setOpen] = useState(false)
  const [buf, setBuf] = useState('')
  const [replaceOnNext, setReplaceOnNext] = useState(true)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef(null)

  const current = value == null ? '' : String(value)

  const openPad = useCallback((e) => {
    if (disabled) return
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setBuf(current)
    setReplaceOnNext(true)
    setClosing(false)
    setOpen(true)
    // blur any focused field so iOS definitely doesn't pop a keyboard
    if (typeof document !== 'undefined' && document.activeElement?.blur) {
      document.activeElement.blur()
    }
  }, [current, disabled])

  const finishClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      setClosing(false)
      closeTimer.current = null
    }, 180)
  }, [])

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  const clamp = useCallback((raw) => {
    if (raw === '' || raw === '-' || raw === '.') return raw
    const n = parseFloat(raw)
    if (!isFinite(n)) return raw
    let clamped = n
    if (typeof min === 'number' && clamped < min) clamped = min
    if (typeof max === 'number' && clamped > max) clamped = max
    if (clamped === n) return raw
    // keep integer/decimal flavor
    return mode === 'integer' ? String(Math.round(clamped)) : String(clamped)
  }, [min, max, mode])

  const commit = useCallback(() => {
    const out = clamp(buf)
    onChange(out)
    finishClose()
  }, [buf, clamp, onChange, finishClose])

  const cancel = useCallback(() => {
    finishClose()
  }, [finishClose])

  const press = useCallback((key) => {
    setReplaceOnNext(false)
    setBuf(prev => {
      const base = replaceOnNext ? '' : prev
      if (key === '.') {
        if (mode === 'integer') return base
        if (base.includes('.')) return base
        return base === '' ? '0.' : base + '.'
      }
      if (key === '-') {
        // only in integer mode as sign toggle
        if (mode !== 'integer') return base
        if (base.startsWith('-')) return base.slice(1)
        return '-' + base
      }
      // digit
      if (base === '0') return key
      if (base === '-0') return '-' + key
      return base + key
    })
  }, [replaceOnNext, mode])

  const backspace = useCallback(() => {
    setReplaceOnNext(false)
    setBuf(prev => {
      if (!prev) return ''
      const next = prev.slice(0, -1)
      return next === '-' ? '' : next
    })
  }, [])

  // Keyboard (desktop) support while sheet is open
  useEffect(() => {
    if (!open || closing) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return }
      if (e.key === 'Enter') { e.preventDefault(); commit(); return }
      if (e.key === 'Backspace') { e.preventDefault(); backspace(); return }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); return }
      if (e.key === '.' || e.key === ',') { e.preventDefault(); press('.'); return }
      if (e.key === '-') { e.preventDefault(); press('-'); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closing, press, backspace, commit, cancel])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const showValue = buf === '' ? (placeholder || '0') : buf
  const showPlaceholder = buf === ''

  // Trigger shows just the raw value so tight containers (e.g., 56px
   // measurement slots) don't wrap unit text onto a second line. Unit
   // still appears inside the keypad sheet header.
  const displayText = current === '' ? placeholder : current

  const triggerHandler = (e) => {
    // preventDefault so iOS doesn't try to focus / open its keyboard
    openPad(e)
  }

  return (
    <>
      <button
        type="button"
        className={`kp-trigger ${className}`}
        onPointerDown={triggerHandler}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        disabled={disabled}
        style={{ ...style, ...inputStyle }}
      >
        {current === '' ? (
          <span className="kp-trigger-placeholder">{placeholder || '--'}</span>
        ) : (
          <span className="kp-trigger-value">{displayText}</span>
        )}
      </button>

      {open && (
        <div
          className={`kp-overlay ${closing ? 'kp-closing' : ''}`}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) cancel()
          }}
        >
          <div
            className="kp-sheet"
            onPointerDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={label || 'Number input'}
          >
            <div className="kp-head">
              <div className="kp-head-label">{label}</div>
              <div className={`kp-display ${showPlaceholder ? 'placeholder' : ''}`}>
                <span className="kp-display-value">{showValue}</span>
                {unit && <span className="kp-display-unit">{unit}</span>}
              </div>
              <button type="button" className="kp-backspace" onPointerDown={(e) => { e.preventDefault(); backspace() }}>
                ⌫
              </button>
            </div>

            <div className="kp-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
                <button
                  key={k}
                  type="button"
                  className="kp-key"
                  onPointerDown={(e) => { e.preventDefault(); press(k) }}
                >{k}</button>
              ))}
              {mode === 'integer' ? (
                <button
                  type="button"
                  className="kp-key kp-key-sign"
                  onPointerDown={(e) => { e.preventDefault(); press('-') }}
                  disabled={typeof min === 'number' && min >= 0}
                >±</button>
              ) : (
                <button
                  type="button"
                  className="kp-key"
                  onPointerDown={(e) => { e.preventDefault(); press('.') }}
                >.</button>
              )}
              {/* 0 spans the last 2 cols — Save lives in kp-actions only */}
              <button
                type="button"
                className="kp-key kp-key-zero"
                onPointerDown={(e) => { e.preventDefault(); press('0') }}
              >0</button>
            </div>

            <div className="kp-actions">
              <button type="button" className="kp-cancel" onPointerDown={(e) => { e.preventDefault(); cancel() }}>Cancel</button>
              <button type="button" className="kp-save" onPointerDown={(e) => { e.preventDefault(); commit() }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
