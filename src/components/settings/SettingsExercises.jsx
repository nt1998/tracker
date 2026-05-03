import { useState } from 'react'
import KeypadInput from '../KeypadInput'

const EQUIPMENT_TYPES = ['machine', 'cable', 'plates', 'dumbbell', 'bodyweight', 'pin']

const EMPTY = () => ({
  id: Date.now(),
  name: '',
  unit: 'kg',
  equipmentType: 'machine',
  startWeight: 5,
  increment: 5,
  templateNotes: '',
})

// Legacy data stored pin as `unit: 'pin'` while equipmentType was 'machine'.
// Surface it as an equipment type so kgPerUnit hangs off equipmentType like
// every other type-dependent field. Idempotent.
function normalize(ex) {
  const next = { ...ex }
  if (next.unit === 'pin') next.equipmentType = 'pin'
  return next
}

export default function SettingsExercises({ exercises, setExercises, routines, setRoutines }) {
  const [editing, setEditing] = useState(null)
  const [isNew, setIsNew] = useState(false)

  const list = Object.values(exercises || {}).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const openAdd = () => { setEditing(EMPTY()); setIsNew(true) }
  const openEdit = (ex) => { setEditing(normalize(ex)); setIsNew(false) }
  const close = () => { setEditing(null); setIsNew(false) }

  // Equipment switch needs to keep unit consistent: pin equipment forces pin
  // unit; switching away from pin restores the most recent kg/lbs choice (or
  // default kg if it was pin before).
  const setEquipment = (type) => {
    setEditing(s => {
      const next = { ...s, equipmentType: type }
      if (type === 'pin') next.unit = 'pin'
      else if (s.unit === 'pin') next.unit = 'kg'
      return next
    })
  }

  const save = () => {
    if (!editing.name.trim()) { alert('Name required'); return }
    // Strip type-dependent fields that don't apply, so stale values can't
    // resurface if equipment type changes again later.
    const out = { ...editing }
    if (out.equipmentType !== 'plates') delete out.barWeight
    else if (out.barWeight == null) out.barWeight = 20
    if (out.equipmentType !== 'pin') delete out.kgPerUnit
    else if (out.kgPerUnit == null) out.kgPerUnit = 5
    setExercises(prev => ({ ...prev, [out.id]: out }))
    close()
  }

  // Find every routine + day that references this exercise, so we can warn
  // before deleting and offer to scrub the dangling refs.
  const findUsage = (exerciseId) => {
    const usage = []
    ;(routines || []).forEach(r => {
      Object.entries(r.workouts || {}).forEach(([_dk, w]) => {
        if ((w.items || []).some(it => it.exerciseId === exerciseId)) {
          usage.push(`${r.name} / ${w.name}`)
        }
      })
    })
    return usage
  }

  const del = () => {
    const usage = findUsage(editing.id)
    let msg = `Delete "${editing.name}"?`
    if (usage.length) {
      msg = `"${editing.name}" is used in:\n\n${usage.join('\n')}\n\nDelete it and remove from these routines?`
    }
    if (!confirm(msg)) return
    setExercises(prev => {
      const next = { ...prev }
      delete next[editing.id]
      return next
    })
    if (usage.length && setRoutines) {
      setRoutines(prev => prev.map(r => ({
        ...r,
        workouts: Object.fromEntries(
          Object.entries(r.workouts || {}).map(([dk, w]) => [
            dk,
            { ...w, items: (w.items || []).filter(it => it.exerciseId !== editing.id) },
          ])
        ),
      })))
    }
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
      {list.length === 0 && <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '8px 0' }}>No exercises yet</div>}

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
              <label>Equipment</label>
              <select value={editing.equipmentType} onChange={(e) => setEquipment(e.target.value)}>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {editing.equipmentType !== 'pin' && (
              <div className="field">
                <label>Unit</label>
                <select value={editing.unit} onChange={(e) => update({ unit: e.target.value })}>
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            )}

            {editing.equipmentType === 'pin' && (
              <div className="field">
                <label>kg per pin</label>
                <KeypadInput
                  mode="decimal"
                  min={0}
                  value={editing.kgPerUnit ?? 5}
                  onChange={(next) => update({ kgPerUnit: parseFloat(next) || 0 })}
                  label="kg per pin"
                  unit="kg"
                />
              </div>
            )}

            <div className="field">
              <label>Start weight</label>
              <KeypadInput
                mode="decimal"
                min={0}
                value={editing.startWeight}
                onChange={(next) => update({ startWeight: parseFloat(next) || 0 })}
                label="Start weight"
                unit={editing.unit}
              />
            </div>

            <div className="field">
              <label>Increment</label>
              <KeypadInput
                mode="decimal"
                min={0}
                value={editing.increment}
                onChange={(next) => update({ increment: parseFloat(next) || 0 })}
                label="Increment"
                unit={editing.unit}
              />
            </div>

            {editing.equipmentType === 'plates' && (
              <div className="field">
                <label>Bar weight</label>
                <KeypadInput
                  mode="decimal"
                  min={0}
                  value={editing.barWeight ?? 20}
                  onChange={(next) => update({ barWeight: parseFloat(next) || 0 })}
                  label="Bar weight"
                  unit={editing.unit}
                />
              </div>
            )}

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
