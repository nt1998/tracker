import { useState } from 'react'
import KeypadInput from '../KeypadInput'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] // Mon-first display
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // index into weekdayMap (JS Sun=0)

function splitReps(raw) {
  const s = String(raw || '').trim()
  if (!s) return { min: '', max: '' }
  const parts = s.split('-').map(x => x.trim())
  return { min: parts[0] || '', max: parts[1] || '' }
}
function joinReps(min, max) {
  const a = String(min).trim(), b = String(max).trim()
  if (a && b) return `${a}-${b}`
  return a || b || ''
}

export default function SettingsRoutines({
  routines, setRoutines,
  activeRoutineId, setActiveRoutineId,
  exercises,
}) {
  const [editRoutineId, setEditRoutineId] = useState(null)
  const [editWorkoutKey, setEditWorkoutKey] = useState(null)
  const [addExerciseToKey, setAddExerciseToKey] = useState(null)

  const editRoutine = routines.find(r => r.id === editRoutineId)
  const editWorkout = editWorkoutKey && editRoutine ? editRoutine.workouts[editWorkoutKey] : null
  const dayKeys = editRoutine ? Object.keys(editRoutine.workouts || {}) : []

  // ---------- Routine CRUD ----------
  const addRoutine = () => {
    const id = 'r_' + Date.now()
    const newR = {
      id,
      name: 'New routine',
      schedule: { mode: 'weekday', weekdayMap: {}, cycle: [] },
      workouts: {},
    }
    setRoutines(prev => [...prev, newR])
    setEditRoutineId(id)
  }
  const deleteRoutine = (id) => {
    if (!confirm('Delete this routine?')) return
    setRoutines(prev => prev.filter(r => r.id !== id))
    if (activeRoutineId === id) {
      const fallback = routines.find(r => r.id !== id)
      setActiveRoutineId(fallback ? fallback.id : null)
    }
  }
  const updateRoutine = (id, patch) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  const updateSchedule = (id, patch) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, schedule: { ...r.schedule, ...patch } } : r))
  }

  // ---------- Day (workout) CRUD ----------
  const addDay = () => {
    if (!editRoutine) return
    const key = 'd_' + Date.now()
    const n = Object.keys(editRoutine.workouts || {}).length + 1
    const newDay = { name: `Day ${n}`, isRest: false, warmups: [], items: [] }
    setRoutines(prev => prev.map(r => r.id === editRoutine.id
      ? { ...r, workouts: { ...r.workouts, [key]: newDay } }
      : r))
    setEditWorkoutKey(key)
  }
  const deleteDay = (key) => {
    if (!editRoutine) return
    if (!confirm(`Delete day "${editRoutine.workouts[key].name}"?`)) return
    setRoutines(prev => prev.map(r => {
      if (r.id !== editRoutine.id) return r
      const next = { ...r.workouts }
      delete next[key]
      // scrub schedule references
      const wm = { ...(r.schedule.weekdayMap || {}) }
      Object.keys(wm).forEach(k => { if (wm[k] === key) delete wm[k] })
      const cyc = (r.schedule.cycle || []).filter(c => c !== key)
      return { ...r, workouts: next, schedule: { ...r.schedule, weekdayMap: wm, cycle: cyc } }
    }))
  }
  const updateWorkout = (key, patch) => {
    if (!editRoutine) return
    setRoutines(prev => prev.map(r => r.id !== editRoutine.id
      ? r
      : { ...r, workouts: { ...r.workouts, [key]: { ...r.workouts[key], ...patch } } }
    ))
  }

  // ---------- Exercise items inside a day ----------
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

  // ---------- Rest-day block + rehab item CRUD ----------
  const addBlock = (key) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    updateWorkout(key, { blocks: [...(w.blocks || []), { name: 'New block', exercises: [] }] })
  }
  const updateBlock = (key, bIdx, patch) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    const blocks = [...(w.blocks || [])]
    blocks[bIdx] = { ...blocks[bIdx], ...patch }
    updateWorkout(key, { blocks })
  }
  const removeBlock = (key, bIdx) => {
    if (!editRoutine) return
    if (!confirm('Delete this block and all its exercises?')) return
    const w = editRoutine.workouts[key]
    updateWorkout(key, { blocks: (w.blocks || []).filter((_, i) => i !== bIdx) })
  }
  const addRehabItem = (key, bIdx) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    const blocks = [...(w.blocks || [])]
    const b = blocks[bIdx]
    blocks[bIdx] = { ...b, exercises: [...(b.exercises || []), { name: '', type: 'rep', sets: 2, reps: '10', perSide: false }] }
    updateWorkout(key, { blocks })
  }
  const updateRehabItem = (key, bIdx, exIdx, patch) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    const blocks = [...(w.blocks || [])]
    const b = { ...blocks[bIdx] }
    const exs = [...(b.exercises || [])]
    exs[exIdx] = { ...exs[exIdx], ...patch }
    b.exercises = exs
    blocks[bIdx] = b
    updateWorkout(key, { blocks })
  }
  const removeRehabItem = (key, bIdx, exIdx) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    const blocks = [...(w.blocks || [])]
    const b = { ...blocks[bIdx] }
    b.exercises = (b.exercises || []).filter((_, i) => i !== exIdx)
    blocks[bIdx] = b
    updateWorkout(key, { blocks })
  }

  // ---------- Warmup CRUD ----------
  const addWarmup = (key) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    updateWorkout(key, {
      warmups: [...(w.warmups || []), { id: Date.now(), name: '', reps: '', notes: '' }],
    })
  }
  const updateWarmup = (key, idx, patch) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    const list = [...(w.warmups || [])]
    list[idx] = { ...list[idx], ...patch }
    updateWorkout(key, { warmups: list })
  }
  const removeWarmup = (key, idx) => {
    if (!editRoutine) return
    const w = editRoutine.workouts[key]
    updateWorkout(key, { warmups: (w.warmups || []).filter((_, i) => i !== idx) })
  }

  // ---------- Schedule: weekday ----------
  const toggleWeekday = (dayKey, weekdayIdx) => {
    if (!editRoutine) return
    const cur = editRoutine.schedule.weekdayMap?.[weekdayIdx]
    const wm = { ...(editRoutine.schedule.weekdayMap || {}) }
    if (cur === dayKey) delete wm[weekdayIdx]
    else wm[weekdayIdx] = dayKey
    updateSchedule(editRoutine.id, { weekdayMap: wm })
  }

  // ---------- Schedule: cycle ----------
  const addToCycle = (key) => {
    if (!editRoutine) return
    updateSchedule(editRoutine.id, { cycle: [...(editRoutine.schedule.cycle || []), key] })
  }
  const removeCycleAt = (idx) => {
    if (!editRoutine) return
    const cycle = (editRoutine.schedule.cycle || []).filter((_, i) => i !== idx)
    updateSchedule(editRoutine.id, { cycle })
  }
  const moveCycleItem = (idx, dir) => {
    if (!editRoutine) return
    const cycle = [...(editRoutine.schedule.cycle || [])]
    const j = idx + dir
    if (j < 0 || j >= cycle.length) return
    ;[cycle[idx], cycle[j]] = [cycle[j], cycle[idx]]
    updateSchedule(editRoutine.id, { cycle })
  }

  return (
    <>
      <div className="settings-section">Routines</div>

      {routines.map(r => {
        const isActive = r.id === activeRoutineId
        return (
          <div key={r.id} className={`phase-card ${isActive ? 'current' : ''}`} style={{ marginBottom: 10 }}>
            <div className="pc-name">{r.name}</div>
            <div className="pc-dates">
              {Object.keys(r.workouts || {}).length} day{Object.keys(r.workouts || {}).length !== 1 ? 's' : ''}
              {' · '}
              {r.schedule.mode === 'cycle'
                ? `cycle of ${(r.schedule.cycle || []).length}`
                : `${Object.keys(r.schedule.weekdayMap || {}).length}/7 weekdays scheduled`}
            </div>
            <div className="pc-actions" style={{ gap: 6, alignItems: 'center' }}>
              <label className="toggle-switch" onClick={(e) => e.stopPropagation()} title={isActive ? 'Active' : 'Set active'}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => { if (!isActive) setActiveRoutineId(r.id) }}
                />
                <span className="slider"></span>
              </label>
              <button onClick={() => setEditRoutineId(r.id)}>Edit</button>
              <button className="del" onClick={() => deleteRoutine(r.id)}>{'×'}</button>
            </div>
          </div>
        )
      })}

      <button className="primary-btn" style={{ marginTop: 12 }} onClick={addRoutine}>+ Add routine</button>

      {/* ============================================================
          EDIT ROUTINE
          ============================================================ */}
      {editRoutine && (
        <div className="modal-overlay" onClick={() => setEditRoutineId(null)}>
          <div className="modal modal-tall" onClick={e => e.stopPropagation()}>
            <h3>Edit routine</h3>

            <div className="field">
              <label>Name</label>
              <input value={editRoutine.name} onChange={(e) => updateRoutine(editRoutine.id, { name: e.target.value })} />
            </div>

            {/* ---- Days (workouts inside this routine) ---- */}
            <div className="field">
              <label>Days</label>
              {dayKeys.length === 0 && (
                <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '4px 0' }}>No days yet — add one below</div>
              )}
              {dayKeys.map(k => {
                const w = editRoutine.workouts[k]
                return (
                  <div key={k} className="day-item" onClick={() => setEditWorkoutKey(k)}>
                    <div className="di-name">
                      <div className={`n ${w.isRest ? 'rest' : ''}`}>{w.name}{w.isRest ? ' · rest' : ''}</div>
                      <div className="s">{w.isRest ? `${(w.blocks || []).length} blocks` : `${(w.items || []).length} exercises`}</div>
                    </div>
                    <div className="di-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="edit-btn" onClick={() => setEditWorkoutKey(k)}>Edit</button>
                      <button className="x-btn" onClick={() => deleteDay(k)}>{'×'}</button>
                    </div>
                  </div>
                )
              })}
              <button className="add-btn-wide" onClick={addDay}>+ Add day</button>
            </div>

            {/* ---- Schedule ---- */}
            <div className="field">
              <label>Schedule</label>
              <div className="phase-type-pills">
                <button type="button" className={editRoutine.schedule.mode === 'weekday' ? 'active' : ''} style={{ '--pc': '#89b4fa' }}
                  onClick={() => updateSchedule(editRoutine.id, { mode: 'weekday' })}>Weekday</button>
                <button type="button" className={editRoutine.schedule.mode === 'cycle' ? 'active' : ''} style={{ '--pc': '#89b4fa' }}
                  onClick={() => updateSchedule(editRoutine.id, { mode: 'cycle' })}>Cycle</button>
              </div>
            </div>

            <div className="schedule-details" style={{ minHeight: 220 }}>
              {editRoutine.schedule.mode === 'weekday' && (
                <>
                  {dayKeys.length === 0 && (
                    <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '4px 0' }}>
                      Add a day first, then pick weekdays for it.
                    </div>
                  )}
                  {dayKeys.map(k => {
                    const w = editRoutine.workouts[k]
                    const wm = editRoutine.schedule.weekdayMap || {}
                    return (
                      <div key={k} className="weekday-row">
                        <span className="wr-name">{w.name}</span>
                        <div className="wr-circles">
                          {WEEKDAY_ORDER.map((jsDay, i) => (
                            <button
                              key={jsDay}
                              type="button"
                              className={wm[jsDay] === k ? 'active' : (wm[jsDay] ? 'taken' : '')}
                              onClick={() => toggleWeekday(k, jsDay)}
                              title={wm[jsDay] ? `Currently: ${editRoutine.workouts[wm[jsDay]]?.name || wm[jsDay]}` : ''}
                            >{WEEKDAY_LABELS[i]}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {editRoutine.schedule.mode === 'cycle' && (
                <>
                  {(editRoutine.schedule.cycle || []).length === 0 && (
                    <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '4px 0' }}>
                      Cycle is empty. Add days below.
                    </div>
                  )}
                  {(editRoutine.schedule.cycle || []).map((k, i) => {
                    const w = editRoutine.workouts[k]
                    return (
                      <div key={i} className="cycle-row-v2">
                        <span className="ci">{i + 1}</span>
                        <span className="cn">{w?.name || '(missing)'}</span>
                        <div className="ca">
                          <button className="x-btn" onClick={() => moveCycleItem(i, -1)} disabled={i === 0}>↑</button>
                          <button className="x-btn" onClick={() => moveCycleItem(i, 1)} disabled={i === (editRoutine.schedule.cycle.length - 1)}>↓</button>
                          <button className="x-btn" onClick={() => removeCycleAt(i)}>{'×'}</button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="field" style={{ margin: '10px 0 0' }}>
                    <label>Append a day</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {dayKeys.map(k => (
                        <button key={k} className="day-chip" onClick={() => addToCycle(k)}>
                          {editRoutine.workouts[k].name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditRoutineId(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          EDIT WORKOUT (day)
          ============================================================ */}
      {editWorkout && (
        <div className="modal-overlay" onClick={() => setEditWorkoutKey(null)}>
          <div className="modal modal-tall" onClick={e => e.stopPropagation()}>
            <h3>Edit day</h3>

            <div className="field">
              <label>Name</label>
              <input value={editWorkout.name || ''} onChange={(e) => updateWorkout(editWorkoutKey, { name: e.target.value })} />
            </div>

            <div className="toggle-row">
              <span>
                <div className="tr-title">Rest day</div>
                <div className="tr-sub">No logged sets — just rehab blocks.</div>
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!!editWorkout.isRest}
                  onChange={(e) => updateWorkout(editWorkoutKey, { isRest: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>

            {editWorkout.isRest ? (
              <div className="field">
                <label>Blocks</label>
                {(editWorkout.blocks || []).length === 0 && (
                  <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '4px 0' }}>No blocks yet</div>
                )}
                {(editWorkout.blocks || []).map((b, bIdx) => (
                  <div key={bIdx} className="rest-block">
                    <div className="rb-head">
                      <input
                        value={b.name}
                        onChange={(e) => updateBlock(editWorkoutKey, bIdx, { name: e.target.value })}
                        placeholder="Block name"
                        style={{ flex: 1 }}
                      />
                      <button className="x-btn" onClick={() => removeBlock(editWorkoutKey, bIdx)}>{'×'}</button>
                    </div>
                    {(b.exercises || []).map((ex, exIdx) => (
                      <div key={exIdx} className="ex-item" style={{ marginBottom: 6 }}>
                        <div className="ei-head">
                          <input
                            value={ex.name}
                            onChange={(e) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { name: e.target.value })}
                            placeholder="Exercise name"
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <button className="x-btn" onClick={() => removeRehabItem(editWorkoutKey, bIdx, exIdx)}>{'×'}</button>
                        </div>
                        <div className="ei-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                          <label>
                            Type
                            <select
                              value={ex.type || 'rep'}
                              onChange={(e) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { type: e.target.value })}
                            >
                              <option value="rep">reps</option>
                              <option value="time">time</option>
                            </select>
                          </label>
                          <label>
                            Sets
                            <KeypadInput
                              mode="integer"
                              min={1}
                              value={ex.sets || 1}
                              onChange={(next) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { sets: parseInt(next, 10) || 1 })}
                              label="Sets"
                            />
                          </label>
                          {ex.type === 'time' ? (
                            <label>
                              Seconds
                              <KeypadInput
                                mode="integer"
                                min={1}
                                value={ex.duration || 30}
                                onChange={(next) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { duration: parseInt(next, 10) || 1 })}
                                label="Duration"
                                unit="s"
                              />
                            </label>
                          ) : (
                            <label>
                              Reps
                              <KeypadInput
                                mode="integer"
                                min={1}
                                value={ex.reps || ''}
                                onChange={(next) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { reps: next })}
                                placeholder="10"
                                label="Reps"
                              />
                            </label>
                          )}
                        </div>
                        <div className="ei-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
                          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={!!ex.perSide}
                              onChange={(e) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { perSide: e.target.checked })}
                            />
                            per side
                          </label>
                          {ex.type === 'rep' && (
                            <label>
                              Hold (s, opt)
                              <KeypadInput
                                mode="integer"
                                min={0}
                                value={ex.holdSec || ''}
                                onChange={(next) => updateRehabItem(editWorkoutKey, bIdx, exIdx, { holdSec: next ? parseInt(next, 10) : undefined })}
                                placeholder="0"
                                label="Hold"
                                unit="s"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                    <button className="add-btn-wide" onClick={() => addRehabItem(editWorkoutKey, bIdx)}>+ Add exercise to {b.name || 'block'}</button>
                  </div>
                ))}
                <button className="add-btn-wide" style={{ marginTop: 12 }} onClick={() => addBlock(editWorkoutKey)}>+ Add block</button>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Warmups</label>
                  {(editWorkout.warmups || []).length === 0 && (
                    <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '4px 0' }}>None</div>
                  )}
                  {(editWorkout.warmups || []).map((wu, idx) => (
                    <div key={wu.id ?? idx} className="ex-item">
                      <div className="ei-head">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            value={wu.name}
                            placeholder="Band pull-aparts"
                            onChange={(e) => updateWarmup(editWorkoutKey, idx, { name: e.target.value })}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <button className="x-btn" onClick={() => removeWarmup(editWorkoutKey, idx)}>{'×'}</button>
                      </div>
                      <div className="ei-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
                        <label>
                          Reps
                          <input
                            value={wu.reps}
                            placeholder="2×15"
                            onChange={(e) => updateWarmup(editWorkoutKey, idx, { reps: e.target.value })}
                          />
                        </label>
                        <label>
                          Notes
                          <input
                            value={wu.notes || ''}
                            placeholder="optional"
                            onChange={(e) => updateWarmup(editWorkoutKey, idx, { notes: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button className="add-btn-wide" onClick={() => addWarmup(editWorkoutKey)}>+ Add warmup</button>
                </div>

                <div className="field">
                  <label>Exercises</label>
                {(editWorkout.items || []).length === 0 && (
                  <div style={{ color: 'var(--text-overlay)', fontSize: 12, padding: '4px 0' }}>None yet</div>
                )}
                {(editWorkout.items || []).map((item, idx) => {
                  const ex = exercises[item.exerciseId]
                  const { min, max } = splitReps(item.reps)
                  return (
                    <div key={idx} className="ex-item">
                      <div className="ei-head">
                        <div className="ei-name">{ex?.name || `(missing)`}</div>
                        <button className="x-btn" onClick={() => removeItem(editWorkoutKey, idx)}>{'×'}</button>
                      </div>
                      <div className="ei-grid">
                        <label>
                          Warmup
                          <KeypadInput
                            mode="integer"
                            min={0}
                            value={item.warmupSets}
                            onChange={(next) => updateItem(editWorkoutKey, idx, { warmupSets: parseInt(next, 10) || 0 })}
                            label="Warmup sets"
                          />
                        </label>
                        <label>
                          Work
                          <KeypadInput
                            mode="integer"
                            min={1}
                            value={item.workSets}
                            onChange={(next) => updateItem(editWorkoutKey, idx, { workSets: parseInt(next, 10) || 1 })}
                            label="Work sets"
                          />
                        </label>
                        <label>
                          Rep min
                          <KeypadInput
                            mode="integer"
                            min={1}
                            value={min}
                            onChange={(next) => updateItem(editWorkoutKey, idx, { reps: joinReps(next, max) })}
                            label="Rep min"
                          />
                        </label>
                        <label>
                          Rep max
                          <KeypadInput
                            mode="integer"
                            min={1}
                            value={max}
                            onChange={(next) => updateItem(editWorkoutKey, idx, { reps: joinReps(min, next) })}
                            label="Rep max"
                          />
                        </label>
                      </div>
                      <div className="ei-grid">
                        <label>
                          Cadence
                          <input
                            type="text"
                            value={item.cadence || ''}
                            placeholder="1-1-3-1"
                            onChange={(e) => updateItem(editWorkoutKey, idx, { cadence: e.target.value })}
                          />
                        </label>
                        <label>
                          RIR
                          <input
                            type="text"
                            value={item.rir || ''}
                            placeholder="1 / 0"
                            onChange={(e) => updateItem(editWorkoutKey, idx, { rir: e.target.value })}
                          />
                        </label>
                        <label>
                          Rest min
                          <KeypadInput
                            mode="decimal"
                            min={0}
                            value={item.restMin ?? ''}
                            onChange={(next) => {
                              const n = parseFloat(next)
                              updateItem(editWorkoutKey, idx, { restMin: isNaN(n) ? null : n })
                            }}
                            label="Rest min"
                          />
                        </label>
                      </div>
                      <label className="ei-notes">
                        Notes
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItem(editWorkoutKey, idx, { notes: e.target.value })}
                        />
                      </label>
                    </div>
                  )
                })}
                <button className="add-btn-wide" onClick={() => setAddExerciseToKey(editWorkoutKey)}>+ Add exercise</button>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditWorkoutKey(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          EXERCISE PICKER
          ============================================================ */}
      {addExerciseToKey && editRoutine && (
        <div className="modal-overlay" onClick={() => setAddExerciseToKey(null)}>
          <div className="modal modal-tall" onClick={e => e.stopPropagation()}>
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
