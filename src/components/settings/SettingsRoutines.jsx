export default function SettingsRoutines({ routines, setRoutines }) {
  const keys = Object.keys(routines)

  const updateRoutine = (key, patch) => {
    setRoutines(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  return (
    <>
      <div className="settings-section">Routines</div>
      {keys.map(key => {
        const r = routines[key]
        return (
          <div key={key} className="phase-card" style={{ marginBottom: 12 }}>
            <div className="pc-name">{r.name || key}</div>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Name</label>
              <input value={r.name || ''} onChange={(e) => updateRoutine(key, { name: e.target.value })} />
            </div>
            <div className="field">
              <label>Schedule</label>
              <input
                value={r.schedule || ''}
                onChange={(e) => updateRoutine(key, { schedule: e.target.value })}
                placeholder="Mon · Thu"
              />
            </div>
            <div className="pc-dates" style={{ marginTop: 8 }}>
              {r.isRest
                ? `${(r.blocks || []).length} blocks · ${(r.blocks || []).flatMap(b => b.exercises || []).length} rehab items`
                : `${(r.warmups || []).length} warmups · ${(r.exercises || []).length} exercises`}
            </div>
            <div className="pc-dates" style={{ marginTop: 4, fontSize: 10 }}>
              Edit individual exercises in the Exercises tab.
            </div>
          </div>
        )
      })}
      <div style={{ padding: '20px 0', textAlign: 'center', color: '#6c7086', fontSize: 11 }}>
        Add / delete routines + reorder exercises coming soon.
      </div>
    </>
  )
}
