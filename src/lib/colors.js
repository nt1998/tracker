export function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

export const PHASE_TYPES = [
  { id: 'cut',      label: 'Cut',      color: '#f38ba8' },
  { id: 'maintain', label: 'Maintain', color: '#f9e2af' },
  { id: 'bulk',     label: 'Bulk',     color: '#a6e3a1' },
]

export function getPhaseColor(phaseOrName) {
  // Accept a phase object or a legacy name string
  if (phaseOrName && typeof phaseOrName === 'object') {
    const t = PHASE_TYPES.find(x => x.id === phaseOrName.type)
    if (t) return t.color
    return getPhaseColor(phaseOrName.name || '')
  }
  const n = (phaseOrName || '').toLowerCase()
  const t = PHASE_TYPES.find(x => n === x.id || n.includes(x.id))
  return t ? t.color : '#f9e2af'
}
