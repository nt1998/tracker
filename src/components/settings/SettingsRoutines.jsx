import { useState } from 'react'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SettingsRoutines({
  routines, setRoutines,
  activeRoutineId, setActiveRoutineId,
  workoutTemplates, setWorkoutTemplates,
  exercises,
}) {
  const [editRoutineId, setEditRoutineId] = useState(null)
  const [editTemplateKey, setEditTemplateKey] = useState(null)
  const [addExerciseToTpl, setAddExerciseToTpl] = useState(null) // template key when picking

  const tplKeys = Object.keys(workoutTemplates)
  const editRoutine = routines.find(r => r.id === editRoutineId)
  const editTemplate = editTemplateKey ? workoutTemplates[editTemplateKey] : null

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

  // --- Workout template editing ---
  const addItemToTemplate = (tplKey, exerciseId) => {
    setWorkoutTemplates(prev => ({
      ...prev,
      [tplKey]: {
        ...prev[tplKey],
        items: [
          ...(prev[tplKey].items || []),
          { exerciseId, warmupSets: 1, workSets: 3, reps: '8-12' },
        ],
      },
    }))
    setAddExerciseToTpl(null)
  }
  const updateItem = (tplKey, idx, patch) => {
    setWorkoutTemplates(prev => {
      const items = [...(prev[tplKey].items || [])]
      items[idx] = { ...items[idx], ...patch }
      return { ...prev, [tplKey]: { ...prev[tplKey], items } }
    })
  }
  const removeItem = (tplKey, idx) => {
    if (!confirm('Remove this exercise from the template?')) return
    setWorkoutTemplates(prev => {
      const items = (prev[tplKey].items || []).filter((_, i) => i !== idx)
      return { ...prev, [tplKey]: { ...prev[tplKey], items } }
    })
  }

  // --- Cycle sequence editing ---
  const addCycleDay = () => {
    const r = editRoutine
    updateSchedule(r.id, { cycle: [...(r.schedule.cycle || []), 'rest'] })
  }
  const setCycleDay = (idx, key) => {
    const r = editRoutine
    const cycle = [...(r.schedule.cycle || [])]
    cycle[idx] = key
    updateSchedule(r.id, { cycle })
  }
  const removeCycleDay = (idx) => {
    const r = editRoutine
    const cycle = (r.schedule.cycle || []).filter((_, i) => i !== idx)
    updateSchedule(r.id, { cycle })
  }

  return (
    <>
      <div className="settings-section">Routines</div>
      <button className="primary-btn" onClick={addRoutine}>+ Add routine</button>
      <div style={{ height: 12 }} />

      {routines.map(r => {
        const isActive = r.id === activeRoutineId
        return (
          <div key={r.id} className={`phase-card ${isActive ? 'current' : ''}`} style={{ marginBottom: 10 }}>
            <div className="pc-name">
              {r.name}{isActive && <span style={{ fontSize: 10, color: '#89b4fa', marginLeft: 8 }}>· active</span>}
            </div>
            <div className="pc-dates">
              {r.schedule.mode === 'weekday'
                ? `Weekday map · ${Object.values(r.schedule.weekdayMap || {}).filter(v => v && v !== 'rest').length} gym days`
                : `Cycle · ${(r.schedule.cycle || []).length} day rotation`}
            </div>
            <div className="pc-actions" style={{ gap: 6, flexWrap: 'wrap' }}>
              {!isActive && (
                <button onClick={() => setActiveRoutineId(r.id)}>Set active</button>
              )}
              <button onClick={() => setEditRoutineId(r.id)}>Edit</button>
              <button className="del" onClick={() => deleteRoutine(r.id)}>{'×'}</button>
            </div>
          </div>
        )
      })}

      <div className="settings-section">Workout templates</div>
      {tplKeys.map(key => {
        const t = workoutTemplates[key]
        return (
          <div key={key} className="phase-card" style={{ cursor: 'pointer', marginBottom: 6 }} onClick={() => setEditTemplateKey(key)}>
            <div className="pc-name">{t.name || key}</div>
            <div className="pc-dates">
              {t.isRest
                ? `${(t.blocks || []).length} blocks · rest day`
                : `${(t.items || []).length} exercises · ${(t.warmups || []).length} warmups`}
            </div>
          </div>
        )
      })}

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

            {editRoutine.schedule.mode === 'weekday' && (
              <div className="field">
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
                      {tplKeys.map(k => <option key={k} value={k}>{workoutTemplates[k].name || k}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {editRoutine.schedule.mode === 'cycle' && (
              <div className="field">
                <label>Cycle sequence (repeats)</label>
                {(editRoutine.schedule.cycle || []).map((k, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                    <span style={{ width: 24, fontSize: 11, color: '#6c7086' }}>{i + 1}</span>
                    <select value={k} onChange={(e) => setCycleDay(i, e.target.value)} style={{ flex: 1 }}>
                      {tplKeys.map(tk => <option key={tk} value={tk}>{workoutTemplates[tk].name || tk}</option>)}
                    </select>
                    <button className="del" onClick={() => removeCycleDay(i)}>{'×'}</button>
                  </div>
                ))}
                <button className="add-phase-btn" onClick={addCycleDay}>+ Add day to cycle</button>
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditRoutineId(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Workout template edit modal --- */}
      {editTemplate && (
        <div className="modal-overlay" onClick={() => setEditTemplateKey(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>{editTemplate.name || editTemplateKey}</h3>

            {editTemplate.isRest ? (
              <p style={{ fontSize: 12, color: '#a6adc8' }}>
                Rest-day block editor coming later. {(editTemplate.blocks || []).length} blocks currently defined.
              </p>
            ) : (
              <>
                <div className="field">
                  <label>Exercises</label>
                  {(editTemplate.items || []).length === 0 && (
                    <div style={{ color: '#45475a', fontSize: 12, padding: '4px 0' }}>None yet</div>
                  )}
                  {(editTemplate.items || []).map((item, idx) => {
                    const ex = exercises[item.exerciseId]
                    return (
                      <div key={idx} className="phase-card" style={{ marginBottom: 8 }}>
                        <div className="pc-name" style={{ fontSize: 13 }}>
                          {ex?.name || `(missing exerciseId ${item.exerciseId})`}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            Warmup sets
                            <input type="number" min={0} value={item.warmupSets}
                              onChange={(e) => updateItem(editTemplateKey, idx, { warmupSets: +e.target.value })} />
                          </label>
                          <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            Work sets
                            <input type="number" min={1} value={item.workSets}
                              onChange={(e) => updateItem(editTemplateKey, idx, { workSets: +e.target.value })} />
                          </label>
                          <label style={{ fontSize: 10, color: '#a6adc8', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            Reps
                            <input value={item.reps}
                              onChange={(e) => updateItem(editTemplateKey, idx, { reps: e.target.value })} placeholder="8-12" />
                          </label>
                        </div>
                        <div className="pc-actions">
                          <button className="del" onClick={() => removeItem(editTemplateKey, idx)}>{'×'}</button>
                        </div>
                      </div>
                    )
                  })}
                  <button className="add-phase-btn" onClick={() => setAddExerciseToTpl(editTemplateKey)}>+ Add exercise</button>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditTemplateKey(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Pick exercise from library --- */}
      {addExerciseToTpl && (
        <div className="modal-overlay" onClick={() => setAddExerciseToTpl(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>Add exercise</h3>
            {Object.values(exercises).sort((a, b) => a.name.localeCompare(b.name)).map(ex => {
              const alreadyIn = (workoutTemplates[addExerciseToTpl]?.items || []).some(it => it.exerciseId === ex.id)
              return (
                <div
                  key={ex.id}
                  className="phase-card"
                  style={{ cursor: alreadyIn ? 'not-allowed' : 'pointer', opacity: alreadyIn ? 0.4 : 1, marginBottom: 4 }}
                  onClick={() => !alreadyIn && addItemToTemplate(addExerciseToTpl, ex.id)}
                >
                  <div className="pc-name" style={{ fontSize: 13 }}>{ex.name}</div>
                  <div className="pc-dates">{ex.equipmentType} · {ex.unit}</div>
                </div>
              )
            })}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setAddExerciseToTpl(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
