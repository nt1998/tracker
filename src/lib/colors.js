export function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

export function getPhaseColor(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('cut')) return '#f38ba8'
  if (n.includes('bulk')) return '#a6e3a1'
  return '#f9e2af'
}
