import { useState } from 'react'

const EMPTY = {
  name: '',
  warmupSets: 2,
  workSets: 3,
  reps: '8-12',
  unit: 'kg',
  equipmentType: 'machine',
  startWeight: 5,
  increment: 5,
  barWeight: 20,
  templateNotes: '',
}

export default function SettingsExercises({ routines, setRoutines }) {
  const [editing, setEditing] = useState(null) // { routineKey, idx, ex, isNew }

  // Flat list of editable exercises across all non-rest routines
  const rows = []
  Object.entries(routines).forEach(([rk, r]) => {
    if (r.isRest) return
    ;(r.exercises || []).forEach((ex, i) => {
      rows.push({ routineKey: rk, routineName: r.name || rk, idx: i, ex })
    })
  })

  const openEdit = (routineKey, idx, ex) => setEditing({ routineKey, idx, ex: { ...ex }, isNew: false })
  const openAdd  = (routineKey) => setEditing({ routineKey, idx: -1, ex: { ...EMPTY, id: Date.now() }, isNew: true })

  const save = () => {
    const { routineKey, idx, ex, isNew } = editing
    setRoutines(prev => {
      const r = prev[routineKey]
      const list = [...(r.exercises || [])]
      if (isNew) list.push(ex)
      else list[idx] = ex
      return { ...prev, [routineKey]: { ...r, exercises: list } }
    })
    setEditing(null)
  }

  const del = () => {
    if (!confirm('Delete this exercise?')) return
    const { routineKey, idx } = editing
    setRoutines(prev => {
      const r = prev[routineKey]
      const list = (r.exercises || []).filter((_, i) => i !== idx)
      return { ...prev, [routineKey]: { ...r, exercises: list } }
    })
    setEditing(null)
  }

  const updateEx = (patch) => setEditing(s => ({ ...s, ex: { ...s.ex, ...patch } }))

  return (
    <>
      <div className="settings-section">Exercise library</div>

      {Object.entries(routines).filter(([, r]) => !r.isRest).map(([rk, r]) => (
        <div key={rk} style={{ marginBottom: 14 }}>
          <div className="pc-dates" style={{ marginBottom: 6, fontSize: 11, color: '#a6adc8' }}>
            {r.name || rk}
          </div>
          {(r.exercises || []).map((ex, i) => (
            <div key={ex.id ?? i} className="phase-card" style={{ marginBottom: 6 }} onClick={() => openEdit(rk, i, ex)}>
              <div className="pc-name" style={{ fontSize: 14 }}>{ex.name}</div>
              <div className="pc-dates">
                {ex.warmupSets}w + {ex.workSets} sets · {ex.reps} reps · {ex.unit}
              </div>
              <div className="pc-dates" style={{ fontSize: 10 }}>
                {ex.equipmentType} · start {ex.startWeight}{ex.unit} · +{ex.increment}{ex.unit}
              </div>
            </div>
          ))}
          <button className="add-phase-btn" onClick={() => openAdd(rk)}>+ Add exercise to {r.name || rk}</button>
        </div>
      ))}

      {rows.length === 0 && (
        <div style={{ color: '#45475a', fontSize: 12, padding: '8px 0', textAlign: 'center' }}>No exercises yet</div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing.isNew ? 'Add exercise' : 'Edit exercise'}</h3>
            <div className="field">
              <label>Name</label>
              <input value={editing.ex.name} onChange={(e) => updateEx({ name: e.target.value })} />
            </div>
            <div className="field">
              <label>Warmup sets</label>
              <input type="number" value={editing.ex.warmupSets} onChange={(e) => updateEx({ warmupSets: +e.target.value })} />
            </div>
            <div className="field">
              <label>Work sets</label>
              <input type="number" value={editing.ex.workSets} onChange={(e) => updateEx({ workSets: +e.target.value })} />
            </div>
            <div className="field">
              <label>Reps (range or single)</label>
              <input value={editing.ex.reps} onChange={(e) => updateEx({ reps: e.target.value })} placeholder="8-12" />
            </div>
            <div className="field">
              <label>Unit</label>
              <select value={editing.ex.unit} onChange={(e) => updateEx({ unit: e.target.value })}>
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
            <div className="field">
              <label>Equipment</label>
              <select value={editing.ex.equipmentType} onChange={(e) => updateEx({ equipmentType: e.target.value })}>
                <option value="plates">plates (barbell)</option>
                <option value="machine">machine</option>
                <option value="cable">cable</option>
                <option value="dumbbell">dumbbell</option>
                <option value="bodyweight">bodyweight</option>
              </select>
            </div>
            <div className="field">
              <label>Start weight</label>
              <input type="number" value={editing.ex.startWeight} onChange={(e) => updateEx({ startWeight: +e.target.value })} />
            </div>
            <div className="field">
              <label>Increment</label>
              <input type="number" step="0.5" value={editing.ex.increment} onChange={(e) => updateEx({ increment: +e.target.value })} />
            </div>
            {editing.ex.equipmentType === 'plates' && (
              <div className="field">
                <label>Bar weight</label>
                <input type="number" value={editing.ex.barWeight ?? 20} onChange={(e) => updateEx({ barWeight: +e.target.value })} />
              </div>
            )}
            <div className="field">
              <label>Notes</label>
              <input value={editing.ex.templateNotes || ''} onChange={(e) => updateEx({ templateNotes: e.target.value })} placeholder="form cues, tempo..." />
            </div>
            <div className="modal-actions">
              {!editing.isNew && <button className="danger-btn" onClick={del}>Delete</button>}
              <button className="cancel-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
