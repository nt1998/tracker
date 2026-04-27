export default function MeasurementsTable({ entries, dates, settings }) {
  if (!dates || dates.length === 0) return null
  const visceralEnabled = !!settings?.visceralEnabled
  const rows = [...dates].reverse()
  return (
    <div className="measurements-table">
      <div className="card-head" style={{ marginBottom: 8 }}>Measurements</div>
      <div className="mt-header">
        <span className="mt-date">Date</span>
        <span className="mt-val" style={{ color: 'var(--c-red)' }}>Wt</span>
        <span className="mt-val" style={{ color: 'var(--c-peach)' }}>BF%</span>
        <span className="mt-val" style={{ color: 'var(--c-green)' }}>Mu%</span>
        {visceralEnabled && <span className="mt-val" style={{ color: 'var(--c-mauve)' }}>Vi</span>}
      </div>
      <div className="mt-body">
        {rows.map(d => {
          const e = entries[d]
          if (!e) return null
          const [, m, day] = d.split('-')
          return (
            <div key={d} className="mt-row">
              <span className="mt-date">{`${day}/${m}`}</span>
              <span className="mt-val">{e.weight || '—'}</span>
              <span className="mt-val">{e.bodyFat || '—'}</span>
              <span className="mt-val">{e.musclePct || '—'}</span>
              {visceralEnabled && <span className="mt-val">{e.visceralFat || '—'}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
