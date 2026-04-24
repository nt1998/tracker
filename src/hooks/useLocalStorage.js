import { useCallback, useEffect, useRef, useState } from 'react'

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* quota or serialization err — ignore */ }
  }, [key, value])

  const reset = useCallback(() => setValue(initialValue), [initialValue])
  return [value, setValue, reset]
}
