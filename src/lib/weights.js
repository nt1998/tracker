export const fmtSec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export const lbsToKg = (lbs) => Math.round(lbs * 0.453592 * 10) / 10

export function toKg(weight, unit, kgPerUnit = null) {
  if (!weight) return 0
  const w = parseFloat(weight) || 0
  // kgPerUnit only applies to pin-stack unit. A per-set `unit: "kg"` tag
  // means the value is literal kg even if the exercise library defines a
  // kgPerUnit (e.g. machine was changed to pin retroactively).
  if (unit === 'pin' && kgPerUnit) return w * kgPerUnit
  if (unit === 'lbs') return lbsToKg(w)
  return w
}

export function generateWeightSteps(start, increment, max = 200) {
  const steps = []
  for (let w = start; w <= max; w += increment) {
    steps.push(Math.round(w * 10) / 10)
  }
  return steps
}

export function getPlatesPerSide(totalWeight, barWeight, unit) {
  const weightPerSide = (totalWeight - barWeight) / 2
  if (weightPerSide <= 0) return []
  const plates = unit === 'lbs'
    ? [45, 25, 10, 5, 2.5]
    : [20, 10, 5, 2.5, 1.25]
  const result = []
  let remaining = weightPerSide
  for (const plate of plates) {
    while (remaining >= plate - 0.01) {
      result.push(plate)
      remaining -= plate
    }
  }
  return result
}

export function formatPlates(plates) {
  if (plates.length === 0) return 'bar only'
  const counts = {}
  plates.forEach(p => counts[p] = (counts[p] || 0) + 1)
  return Object.entries(counts)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
    .map(([plate, count]) => count > 1 ? `${count}×${plate}` : plate)
    .join('+')
}
