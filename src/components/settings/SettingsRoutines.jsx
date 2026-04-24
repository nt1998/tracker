import { useState } from 'react'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function splitReps(raw) {
  const s = String(raw || '').trim()
  if (!s) return { min: '', max: '' }
  const parts = s.split('-').map(x => x.trim())
  return { min: parts[0] || '', max: parts[1] || '' }
}
function joinReps(min, max) {
  const a = String(min).trim()
  const b = String(max).trim()
  if (a && b) return `${a}-${b}`
  if (a) return a
  if (b) return b
  return ''
}

const EMPTY_WORKOUTS = () => ({
  push: { name: 'Push', warmups: [], items: [] },
  pull: { name: 'Pull', warmups: [], items: [] },
  rest: { name: 'Rest', isRest: true, warmups: [], items: [], blocks: [] },
})

export default function SettingsRoutines({
  routines, setRoutines,
  activeRoutineId, setActiveRoutineId,
  exercises,
}) {
  const [editRoutineId, setEditRoutineId] = useState(null)
  const [editWorkoutKey, setEditWorkoutKey] = useState(null)
  const [addExerciseToKey, setAddExerciseToKey] = useState(null)

  const editRoutine = routines.find(r => r.id === editRoutineId)
  const wKeys = editRoutine ? Object.keys(editRoutine.workouts || {}) : []
  const editWorkout = editWorkoutKey && editRoutine ? editRoutine.workouts[editWorkoutKey] : null

  // --- Routine CRUD ---
  const addRoutine = () => {
    const id = 'r_' + Date.now()
    const newR = {
      id,
      name: 'New routine',
      schedule: {
        mode: 'weekday',
        weekdayMap: { 0: 'rest', 1: 'push', 2: 'pull', 3: 'rest', 4: 'push', 5: 'pull', 6: 'rest' },
        cycle: ['push', 'pull', 'rest'],
      },
      workouts: EMPTY_WORKOUTS(),
    }
    setRoutines(prev => [...prev, newR])
    setEditRoutineId(id)
  }
  const deleteRoutine = (id) => {
    if (routines.length <= 1) { alert('Keep at least one routine'); return }
    if (!confirm('Delete this routine?')) return
    setRoutines(prev => prev.filter(r => r.id !== id))
    if (activeRoutineId === id) setActiveRoutineId(routines.find(r => r.id !== id).id)
  }
  const updateRoutine = (id, patch) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  const updateSchedule = (id, patch) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, schedule: { ...r.schedule, ...patch } } : r))
  }
  const setWeekdayMap = (id, day, key) => {
    const r = routines.find(x => x.id === id)
    const map = { ...(r.schedule.weekdayMap || {}) }
    map[day] = key
    updateSchedule(id, { weekdayMap: map })
  }

  // --- Workout item editing (scoped to current editRoutine) ---
  const updateWorkout = (key, patch) => {
    if (!editRoutine) return
    setRoutines(prev => prev.map(r => {
      if (r.id !== editRoutine.id) return r
      return { ...r, workouts: { ...r.workouts, [key]: { ...r.workouts[key], ...patch } } }
    }))
  }
  const addItem = (key, exerciseId) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    updateWorkout(key, { items: [...(w.items || []), { exerciseId, warmupSets: 1, workSets: 3, reps: '8-12' }] })
    setAddExerciseToKey(null)
  }
  const updateItem = (key, idx, patch) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    const items = [...(w.items || [])]
    items[idx] = { ...items[idx], ...patch }
    updateWorkout(key, { items })
  }
  const removeItem = (key, idx) => {
    if (!editRoutine) return
    if (!confirm('Remove this exercise?')) return
    const w = editRoutine.workouts[key]
    updateWorkout(key, { items: (w.items || []).filter((_, i) => i !== idx) })
  }

  // --- Cycle editing ---
  const addCycleDay = () => {
    if (!editRoutine) return
    updateSchedule(editRoutine.id, { cycle: [...(editRoutine.schedule.cycle || []), 'rest'] })
  }
  const setCycleDay = (idx, key) => {
    if (!editRoutine) return
    const cycle = [...(editRoutine.schedule.cycle || [])]
    cycle[idx] = key
    updateSchedule(editRoutine.id, { cycle })
  }
  const removeCycleDay = (idx) => {
    if (!editRoutine) return
    const cycle = (editRoutine.schedule.cycle || []).filter((_, i) => i !== idx)
    updateSchedule(editRoutine.id, { cycle })
  }

  return (
    <>
      <div className="settings-section">Routines</div>

      {routines.map(r => {
        const isActive = r.id === activeRoutineId
        return (
          <div key={r.id} className={`phase-card ${isActive ? 'current' : ''}`} style={{ marginBottom: 10 }}>
            <div className="pc-name">
              {r.name}{isActive && <span style={{ fontSize: 10, color: '#89b4fa', marginLeft: 8 }}>· active</span>}
            </div>
            <div className="pc-dates">
              {r.schedule.mode === 'weekday'
                ? `Weekday · ${Object.values(r.schedule.weekdayMap || {}).filter(v => v && v !== 'rest').length} gym days`
                : `Cycle · ${(r.schedule.cycle || []).length} day rotation`}
            </div>
            <div className="pc-actions" style={{ gap: 6, flexWrap: 'wrap' }}>
              {!isActive && <button onClick={() => setActiveRoutineId(r.id)}>Set active</button>}
              <button onClick={() => setEditRoutineId(r.id)}>Edit</button>
              <button className="del" onClick={() => deleteRoutine(r.id)}>{'×'}</button>
            </div>
          </div>
        )
      })}

      <button className="primary-btn" style={{ marginTop: 12 }} onClick={addRoutine}>+ Add routine</button>

      {/* --- Routine edit modal --- */}
      {editRoutine && (
        <div className="modal-overlay" onClick={() => setEditRoutineId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>Edit routine</h3>

            <div className="field">
              <label>Name</label>
              <input value={editRoutine.name} onChange={(e) => updateRoutine(editRoutine.id, { name: e.target.value })} />
            </div>

            <div className="field">
              <label>Schedule mode</label>
              <div className="phase-type-pills">
                <button type="button" className={editRoutine.schedule.mode === 'weekday' ? 'active' : ''} style={{ '--pc': '#89b4fa' }}
                  onClick={() => updateSchedule(editRoutine.id, { mode: 'weekday' })}>Weekday</button>
                <button type="button" className={editRoutine.schedule.mode === 'cycle' ? 'active' : ''} style={{ '--pc': '#89b4fa' }}
                  onClick={() => updateSchedule(editRoutine.id, { mode: 'cycle' })}>Cycle</button>
              </div>
            </div>

            <div className="schedule-details" style={{ minHeight: 240 }}>
              {editRoutine.schedule.mode === 'weekday' && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Weekday → workout</label>
                  {WEEKDAY_LABELS.map((lbl, day) => (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                      <span style={{ width: 36, fontSize: 11, color: '#a6adc8' }}>{lbl}</span>
                      <select
                        value={editRoutine.schedule.weekdayMap?.[day] || ''}
                        onChange={(e) => setWeekdayMap(editRoutine.id, day, e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">— none —</option>
                        {wKeys.map(k => <option key={k} value={k}>{editRoutine.workouts[k].name || k}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              {editRoutine.schedule.mode === 'cycle' && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Cycle sequence (repeats)</label>
                  {(editRoutine.schedule.cycle || []).map((k, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                      <span style={{ width: 24, fontSize: 11, color: '#6c7086' }}>{i + 1}</span>
                      <select value={k} onChange={(e) => setCycleDay(i, e.target.value)} style={{ flex: 1 }}>
                        {wKeys.map(tk => <option key={tk} value={tk}>{editRoutine.workouts[tk].name || tk}</option>)}
                      </select>
                      <button className="x-btn" onClick={() => removeCycleDay(i)}>{'×'}</button>
                    </div>
                  ))}
                  <button className="add-phase-btn" onClick={addCycleDay}>+ Add day to cycle</button>
                </div>
              )}
            </div>

            <div className="field">
              <label>Workouts</label>
              {wKeys.map(k => {
                const w = editRoutine.workouts[k]
                return (
                  <div key={k} className="phase-card" style={{ cursor: 'pointer', marginBottom: 6 }} onClick={() => setEditWorkoutKey(k)}>
                    <div className="pc-name" style={{ fontSize: 13 }}>{w.name || k}</div>
                    <div className="pc-dates">
                      {w.isRest
                        ? `${(w.blocks || []).length} blocks · rest day`
                        : `${(w.items || []).length} exercises`}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditRoutineId(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Per-workout item editor (child modal) --- */}
      {editWorkout && (
        <div className="modal-overlay" onClick={() => setEditWorkoutKey(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>{editWorkout.name || editWorkoutKey}</h3>

            {editWorkout.isRest ? (
              <p style={{ fontSize: 12, color: '#a6adc8' }}>
                Rest-day block editor coming later. {(editWorkout.blocks || []).length} blocks currently defined.
              </p>
            ) : (
              <>
                <div className="field">
                  <label>Exercises</label>
                  {(editWorkout.items || []).length === 0 && (
                    <div style={{ color: '#45475a', fontSize: 12, padding: '4px 0' }}>None yet</div>
                  )}
                  {(editWorkout.items || []).map((item, idx) => {
                    const ex = exercises[item.exerciseId]
                    return (
                      <div key={idx} className="phase-card" style={{ marginBottom: 8 }}>
                        <div className="pc-name" style={{ fontSize: 13 }}>
                          {ex?.name || `(missing exerciseId ${item.exerciseId})`}
                        </div>
                        {(() => {
                          const { min, max } = splitReps(item.reps)
                          return (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-end' }}>
                              <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                Warmup
                                <input type="number" min={0} value={item.warmupSets}
                                  onChange={(e) => updateItem(editWorkoutKey, idx, { warmupSets: +e.target.value })} />
                              </label>
                              <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                Work
                                <input type="number" min={1} value={item.workSets}
                                  onChange={(e) => updateItem(editWorkoutKey, idx, { workSets: +e.target.value })} />
                              </label>
                              <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                Reps min
                                <input type="number" min={1} value={min}
                                  onChange={(e) => updateItem(editWorkoutKey, idx, { reps: joinReps(e.target.value, max) })} />
                              </label>
                              <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                Reps max
                                <input type="number" min={1} value={max}
                                  onChange={(e) => updateItem(editWorkoutKey, idx, { reps: joinReps(min, e.target.value) })} />
                              </label>
                              <button className="x-btn" style={{ marginBottom: 2 }} onClick={() => removeItem(editWorkoutKey, idx)}>{'×'}</button>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                  <button className="add-phase-btn" onClick={() => setAddExerciseToKey(editWorkoutKey)}>+ Add exercise</button>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditWorkoutKey(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Pick exercise from library --- */}
      {addExerciseToKey && editRoutine && (
        <div className="modal-overlay" onClick={() => setAddExerciseToKey(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>Add exercise</h3>
            {Object.values(exercises).sort((a, b) => a.name.localeCompare(b.name)).map(ex => (
              <div
                key={ex.id}
                className="phase-card"
                style={{ cursor: 'pointer', marginBottom: 4 }}
                onClick={() => addItem(addExerciseToKey, ex.id)}
              >
                <div className="pc-name" style={{ fontSize: 13 }}>{ex.name}</div>
                <div className="pc-dates">{ex.equipmentType} · {ex.unit}</div>
              </div>
            ))}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setAddExerciseToKey(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
