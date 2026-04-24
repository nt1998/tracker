export default function DeltaBadge({ val, unit, invertGood }) {
  const sign = val >= 0 ? '+' : ''
  let cls = 'neutral'
  if (invertGood) cls = val < 0 ? 'up' : val > 0 ? 'down' : 'neutral'
  else cls = val > 0 ? 'up' : val < 0 ? 'down' : 'neutral'
  return <span className={`delta-badge ${cls}`}>{sign}{val.toFixed(1)}{unit}</span>
}
