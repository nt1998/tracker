import { useState } from 'react'

const EMPTY = () => ({
  id: Date.now(),
  name: '',
  unit: 'kg',
  equipmentType: 'machine',
  startWeight: 5,
  increment: 5,
  barWeight: 20,
  templateNotes: '',
})

export default function SettingsExercises({ exercises, setExercises }) {
  const [editing, setEditing] = useState(null)
  const [isNew, setIsNew] = useState(false)

  const list = Object.values(exercises || {}).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const openAdd = () => { setEditing(EMPTY()); setIsNew(true) }
  const openEdit = (ex) => { setEditing({ ...ex }); setIsNew(false) }
  const close = () => { setEditing(null); setIsNew(false) }

  const save = () => {
    if (!editing.name.trim()) { alert('Name required'); return }
    setExercises(prev => ({ ...prev, [editing.id]: editing }))
    close()
  }

  const del = () => {
    if (!confirm(`Delete "${editing.name}"? Workout templates referencing it will break.`)) return
    setExercises(prev => {
      const next = { ...prev }
      delete next[editing.id]
      return next
    })
    close()
  }

  const update = (patch) => setEditing(s => ({ ...s, ...patch }))

  return (
    <>
      <div className="settings-section">Exercise library</div>
      {list.map(ex => (
        <div key={ex.id} className="phase-card" style={{ cursor: 'pointer', marginBottom: 6 }} onClick={() => openEdit(ex)}>
          <div className="pc-name" style={{ fontSize: 14 }}>{ex.name}</div>
          <div className="pc-dates">{ex.equipmentType} · {ex.unit} · +{ex.increment}{ex.unit} / start {ex.startWeight}{ex.unit}</div>
          {ex.templateNotes && <div className="pc-goals" style={{ fontSize: 10 }}>{ex.templateNotes}</div>}
        </div>
      ))}
      {list.length === 0 && <div style={{ color: '#45475a', fontSize: 12, padding: '8px 0' }}>No exercises yet</div>}

      <button className="primary-btn" style={{ marginTop: 12 }} onClick={openAdd}>+ Add exercise</button>

      {editing && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal modal-tall" onClick={e => e.stopPropagation()}>
            <h3>{isNew ? 'Add exercise' : 'Edit exercise'}</h3>

            <div className="field">
              <label>Name</label>
              <input value={editing.name} onChange={(e) => update({ name: e.target.value })} placeholder="Bench Press" />
            </div>

            <div className="field">
              <label>Unit</label>
              <select value={editing.unit} onChange={(e) => update({ unit: e.target.value })}>
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>

            <div className="field">
              <label>Equipment</label>
              <select value={editing.equipmentType} onChange={(e) => update({ equipmentType: e.target.value })}>
                <option value="plates">plates (barbell)</option>
                <option value="machine">machine</option>
                <option value="cable">cable</option>
                <option value="dumbbell">dumbbell</option>
                <option value="bodyweight">bodyweight</option>
              </select>
            </div>

            <div className="field">
              <label>Start weight</label>
              <input type="number" value={editing.startWeight} onChange={(e) => update({ startWeight: +e.target.value })} />
            </div>

            <div className="field">
              <label>Increment</label>
              <input type="number" step="0.5" value={editing.increment} onChange={(e) => update({ increment: +e.target.value })} />
            </div>

            {editing.equipmentType === 'plates' && (
              <div className="field">
                <label>Bar weight</label>
                <input type="number" value={editing.barWeight ?? 20} onChange={(e) => update({ barWeight: +e.target.value })} />
              </div>
            )}

            <div className="field">
              <label>Notes (form cues)</label>
              <input value={editing.templateNotes || ''} onChange={(e) => update({ templateNotes: e.target.value })} />
            </div>

            <div className="modal-actions">
              {!isNew && <button className="danger-btn" onClick={del}>Delete</button>}
              <button className="cancel-btn" onClick={close}>Cancel</button>
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
