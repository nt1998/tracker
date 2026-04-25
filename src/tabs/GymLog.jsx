import { useEffect, useRef, useState } from 'react'
import { todayKey } from '../lib/dates'
import { fmtSec, formatPlates, generateWeightSteps, getPlatesPerSide, toKg } from '../lib/weights'
import RestSetRow from '../components/RestSetRow'
import KeypadInput from '../components/KeypadInput'
import { templateKeyForDate } from '../lib/routine'

const defaultGetWorkoutFromTemplate = (templateKey, template, exercises, exerciseNotes) => {
  if (template?.isRest) {
    const flat = (template.blocks || []).flatMap(b => b.exercises)
    return {
      routineType: templateKey,
      isRest: true,
      exercises: [],
      restChecks: flat.map(ex => Array(ex.sets || 1).fill(false)),
      warmupChecks: [],
      committed: false,
    }
  }
  return {
    routineType: templateKey,
    isRest: false,
    exercises: (template?.items || []).map(item => {
      const ex = exercises[item.exerciseId]
      return {
        id: ex?.id ?? item.exerciseId,
        name: ex?.name ?? '(missing exercise)',
        warmupSets: Array(item.warmupSets).fill().map(() => ({ weight: '', reps: '', committed: false })),
        workSets: Array(item.workSets).fill().map(() => ({ weight: '', reps: '', committed: false })),
        notes: exerciseNotes[ex?.name || ''] || '',
      }
    }),
    warmupChecks: (template?.warmups || []).map(() => false),
    committed: false,
  }
}

export default function GymLog({ workouts, setWorkouts, exercises, routines, activeRoutineId, exerciseNotes, setExerciseNotes }) {
  const [date, setDate] = useState(todayKey())
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [activeSetIdx, setActiveSetIdx] = useState({ type: 'work', idx: 0 })
  const lastCommitRef = useRef({})
  const [, forceTick] = useState(0)
  const markCommit = (exId) => { if (exId) { lastCommitRef.current[exId] = Date.now(); forceTick(n => n + 1) } }

  useEffect(() => {
    const iv = setInterval(() => forceTick(n => (n + 1) % 1000000), 1000)
    return () => clearInterval(iv)
  }, [])

  // Keep date fresh across midnight + on tab focus
  useEffect(() => {
    const refresh = () => { const t = todayKey(); setDate(prev => prev === t ? prev : t) }
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', refresh)
    const iv = setInterval(refresh, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', refresh)
      clearInterval(iv)
    }
  }, [])

  const activeRoutine = (routines || []).find(r => r.id === activeRoutineId) || routines?.[0]
  const routineWorkouts = activeRoutine?.workouts || {}

  const getTodaysRoutineType = () => {
    if (workouts[date]?.routineType) return workouts[date].routineType
    return templateKeyForDate(activeRoutine, date) || 'push'
  }

  const currentRoutineType = getTodaysRoutineType()
  const currentRoutine = routineWorkouts[currentRoutineType]

  const workout = workouts[date] || defaultGetWorkoutFromTemplate(currentRoutineType, currentRoutine, exercises, exerciseNotes)
  const warmups = currentRoutine?.warmups || []
  const hasWarmups = warmups.length > 0
  const isOnWarmup = hasWarmups && currentExerciseIdx === 0
  const exerciseIdx = hasWarmups ? currentExerciseIdx - 1 : currentExerciseIdx
  const currentExercise = isOnWarmup ? null : workout.exercises[exerciseIdx]
  // Per-workout item config (reps, warmup/work sets) for the current exercise
  const templateItem = currentExercise
    ? (currentRoutine?.items || []).find(it => it.exerciseId === currentExercise.id)
    : null
  // Exercise library entry — holds unit / equipment / increment
  const exerciseLib = currentExercise ? exercises[currentExercise.id] : null
  const routineTemplate = templateItem && exerciseLib ? { ...exerciseLib, ...templateItem, name: exerciseLib.name } : null
  const restExercises = currentRoutine?.isRest ? (currentRoutine.blocks || []).flatMap(b => b.exercises) : []
  const totalItems = currentRoutine?.isRest ? restExercises.length : ((hasWarmups ? 1 : 0) + workout.exercises.length)

  const getExerciseConfig = (exerciseName) => {
    const ex = Object.values(exercises).find(e => e.name === exerciseName)
    return ex || { unit: 'kg', equipmentType: 'machine', startWeight: 5, increment: 5 }
  }

  const getLastExerciseValues = (exerciseName) => {
    const sortedDates = Object.keys(workouts).filter(d => d < date && workouts[d].committed).sort().reverse()
    const hasAny = (sets) => (sets || []).some(s => s && (s.weight || s.reps))
    for (const d of sortedDates) {
      const w = workouts[d]
      const ex = w.exercises?.find(e => e.name === exerciseName)
      if (!ex) continue
      if (!hasAny(ex.warmupSets) && !hasAny(ex.workSets)) continue
      return { warmupSets: ex.warmupSets || [], workSets: ex.workSets || [] }
    }
    return { warmupSets: [], workSets: [] }
  }

  const getLastExerciseData = (exerciseName) => {
    const sortedDates = Object.keys(workouts).filter(d => d < date && workouts[d].committed).sort().reverse()
    for (const d of sortedDates) {
      const w = workouts[d]
      const ex = w.exercises?.find(e => e.name === exerciseName)
      if (ex) {
        const lastWorkSet = ex.workSets?.filter(s => s.weight)?.pop()
        if (lastWorkSet) return lastWorkSet
      }
    }
    return null
  }

  const getExercisePR = (exerciseName) => {
    let maxWeight = 0
    let maxRepsAtMaxWeight = 0
    const config = getExerciseConfig(exerciseName)
    Object.entries(workouts).forEach(([d, w]) => {
      if (d >= date || !w.committed) return
      const ex = w.exercises?.find(e => e.name === exerciseName)
      if (ex) {
        ex.workSets?.forEach(set => {
          if (set.committed === false) return
          const weight = toKg(set.weight, set.unit || config.unit, config.kgPerUnit)
          const reps = parseInt(set.reps) || 0
          if (weight > 0 && reps > 0) {
            if (weight > maxWeight) {
              maxWeight = weight
              maxRepsAtMaxWeight = reps
            } else if (Math.abs(weight - maxWeight) < 0.1 && reps > maxRepsAtMaxWeight) {
              maxRepsAtMaxWeight = reps
            }
          }
        })
      }
    })
    return { maxWeight: Math.round(maxWeight * 10) / 10, maxRepsAtMaxWeight }
  }

  const lastExerciseValues = currentExercise ? getLastExerciseValues(currentExercise.name) : { warmupSets: [], workSets: [] }
  const lastData = currentExercise ? getLastExerciseData(currentExercise.name) : null

  const isSetPR = (exerciseName, weight, reps) => {
    const pr = getExercisePR(exerciseName)
    const config = getExerciseConfig(exerciseName)
    const w = Math.round(toKg(weight, config.unit, config.kgPerUnit) * 10) / 10
    const r = parseInt(reps) || 0
    if (w <= 0 || r <= 0) return { isWeightPR: false, isRepPR: false }
    const isWeightPR = w > pr.maxWeight
    const isRepPR = !isWeightPR && w === pr.maxWeight && r > pr.maxRepsAtMaxWeight
    return { isWeightPR, isRepPR }
  }

  const writeWorkout = (mutator) => {
    setWorkouts(prev => {
      const base = prev[date] || defaultGetWorkoutFromTemplate(currentRoutineType, currentRoutine, exercises, exerciseNotes)
      const next = JSON.parse(JSON.stringify(base))
      mutator(next)
      return { ...prev, [date]: next }
    })
  }

  // Look up exercise by stable id (captured at call time), not by index —
  // avoids stale exerciseIdx if state changed between tap and state flush.
  const writeExercise = (exId, mutator) => {
    if (exId == null) return
    setWorkouts(prev => {
      const base = prev[date] || defaultGetWorkoutFromTemplate(currentRoutineType, currentRoutine, exercises, exerciseNotes)
      const next = JSON.parse(JSON.stringify(base))
      const ex = next.exercises.find(e => e.id === exId)
      if (!ex) return prev
      mutator(next, ex)
      return { ...prev, [date]: next }
    })
  }

  const updateSet = (type, setIdx, field, value, autoCommit = false) => {
    const exId = currentExercise?.id
    const unit = routineTemplate?.unit || 'kg'
    writeExercise(exId, (_next, ex) => {
      const sets = type === 'warmup' ? ex.warmupSets : ex.workSets
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      if (field === 'weight' && value) sets[setIdx].unit = unit
      if (autoCommit) {
        sets[setIdx].committed = true
        markCommit(ex.id)
      }
    })
    setActiveSetIdx({ type, idx: setIdx })
  }

  const toggleSetCommitted = (type, setIdx) => {
    const exId = currentExercise?.id
    const unit = routineTemplate?.unit || 'kg'
    const prevSets = type === 'warmup' ? lastExerciseValues.warmupSets : lastExerciseValues.workSets
    writeExercise(exId, (_next, ex) => {
      const sets = type === 'warmup' ? ex.warmupSets : ex.workSets
      const set = sets[setIdx]
      if (set.committed) {
        set.committed = false
      } else {
        const prevSet = prevSets[setIdx]
        if (!set.weight && prevSet?.weight) {
          set.weight = prevSet.weight
          set.unit = prevSet.unit || unit
        }
        if (!set.reps && prevSet?.reps) set.reps = prevSet.reps
        set.committed = true
        markCommit(ex.id)
      }
    })
    setActiveSetIdx({ type, idx: setIdx })
  }

  const adjustWeight = (type, setIdx, delta) => {
    if (!currentExercise) return
    const exId = currentExercise.id
    const unit = routineTemplate?.unit || 'kg'
    const sets = type === 'warmup' ? currentExercise.warmupSets : currentExercise.workSets
    const set = sets[setIdx]
    const prevSets = type === 'warmup' ? lastExerciseValues.warmupSets : lastExerciseValues.workSets
    const prevWeight = prevSets[setIdx]?.weight || ''
    const currentWeight = parseFloat(set.weight) || parseFloat(prevWeight) || 0

    const equipType = routineTemplate?.equipmentType || 'machine'
    const increment = routineTemplate?.increment || 5
    const startWeight = routineTemplate?.startWeight || 5

    let newWeight
    if (equipType === 'plates') {
      newWeight = Math.max(0, Math.round((currentWeight + delta * increment) * 10) / 10)
    } else {
      const steps = generateWeightSteps(startWeight, increment)
      const currentIdx = steps.findIndex(s => Math.abs(s - currentWeight) < 0.1)
      if (currentIdx === -1) {
        const closest = steps.reduce((a, b) => Math.abs(b - currentWeight) < Math.abs(a - currentWeight) ? b : a)
        const closestIdx = steps.indexOf(closest)
        const newIdx = Math.max(0, Math.min(steps.length - 1, closestIdx + delta))
        newWeight = steps[newIdx]
      } else {
        const newIdx = Math.max(0, Math.min(steps.length - 1, currentIdx + delta))
        newWeight = steps[newIdx]
      }
    }

    writeExercise(exId, (_next, ex) => {
      const newSets = type === 'warmup' ? ex.warmupSets : ex.workSets
      newSets[setIdx].weight = newWeight.toString()
      newSets[setIdx].unit = unit
      if (!newSets[setIdx].reps && prevSets[setIdx]?.reps) {
        newSets[setIdx].reps = prevSets[setIdx].reps
      }
      newSets[setIdx].committed = true
      markCommit(ex.id)
    })
    setActiveSetIdx({ type, idx: setIdx })
  }

  const adjustReps = (type, setIdx, delta) => {
    if (!currentExercise) return
    const exId = currentExercise.id
    const unit = routineTemplate?.unit || 'kg'
    const sets = type === 'warmup' ? currentExercise.warmupSets : currentExercise.workSets
    const set = sets[setIdx]
    const prevSets = type === 'warmup' ? lastExerciseValues.warmupSets : lastExerciseValues.workSets
    const prevReps = prevSets[setIdx]?.reps || ''
    const currentReps = parseInt(set.reps) || parseInt(prevReps) || 0
    const newReps = Math.max(0, currentReps + delta)

    writeExercise(exId, (_next, ex) => {
      const newSets = type === 'warmup' ? ex.warmupSets : ex.workSets
      newSets[setIdx].reps = newReps.toString()
      if (!newSets[setIdx].weight && prevSets[setIdx]?.weight) {
        newSets[setIdx].weight = prevSets[setIdx].weight
        newSets[setIdx].unit = prevSets[setIdx].unit || unit
      }
      newSets[setIdx].committed = true
      markCommit(ex.id)
    })
    setActiveSetIdx({ type, idx: setIdx })
  }

  const updateExerciseNote = (note) => {
    if (!currentExercise) return
    const exId = currentExercise.id
    const name = currentExercise.name
    writeExercise(exId, (_next, ex) => { ex.notes = note })
    setExerciseNotes(prev => ({ ...prev, [name]: note }))
  }

  const nextExercise = () => {
    if (currentExerciseIdx < totalItems - 1) setCurrentExerciseIdx(currentExerciseIdx + 1)
  }

  const prevExercise = () => {
    if (currentExerciseIdx > 0) setCurrentExerciseIdx(currentExerciseIdx - 1)
  }

  const commitWorkout = () => {
    writeWorkout(next => { next.committed = true })
  }

  const toggleWarmupCheck = (warmupIdx) => {
    writeWorkout(next => {
      if (!Array.isArray(next.warmupChecks) || next.warmupChecks.some(v => Array.isArray(v))) {
        next.warmupChecks = (currentRoutine.warmups || []).map(() => false)
      }
      next.warmupChecks[warmupIdx] = !next.warmupChecks[warmupIdx]
    })
  }

  const toggleRestSetCheck = (exIdx, setIdx, forceVal) => {
    writeWorkout(next => {
      const flat = (currentRoutine.blocks || []).flatMap(b => b.exercises)
      if (!Array.isArray(next.restChecks) || (next.restChecks.length && !Array.isArray(next.restChecks[0]))) {
        next.restChecks = flat.map(ex => Array(ex.sets || 1).fill(false))
      }
      if (!next.restChecks[exIdx]) next.restChecks[exIdx] = Array(flat[exIdx]?.sets || 1).fill(false)
      const cur = next.restChecks[exIdx][setIdx] || false
      next.restChecks[exIdx][setIdx] = forceVal === undefined ? !cur : forceVal
    })
  }

  const isLastExercise = currentExerciseIdx === totalItems - 1

  const renderSetRow = (set, idx, type, label) => {
    const prevSet = type === 'work' ? lastExerciseValues.workSets[idx] : lastExerciseValues.warmupSets[idx]
    const prevWeight = prevSet?.weight || ''
    const prevReps = prevSet?.reps || ''
    const goalRepsRaw = routineTemplate?.reps || ''
    const goalReps = goalRepsRaw.split('-')[0] || ''
    const unit = routineTemplate?.unit || 'kg'
    const hasValues = set.weight || set.reps
    const isCommitted = set.committed === true || (hasValues && set.committed !== false)
    const prStatus = type === 'work' && isCommitted && set.weight && set.reps
      ? isSetPR(currentExercise.name, set.weight, set.reps)
      : { isWeightPR: false, isRepPR: false }

    return (
      <div key={`${type}${idx}`} className={`set-row ${type === 'work' ? 'work' : ''} ${isCommitted ? 'committed' : 'uncommitted'} ${prStatus.isWeightPR ? 'weight-pr' : ''} ${prStatus.isRepPR ? 'rep-pr' : ''}`}>
        <div className="set-controls">
          <div className="set-field">
            <button className="adj-btn" onClick={() => adjustWeight(type, idx, -1)}>−</button>
            <KeypadInput
              mode="decimal"
              value={set.weight}
              placeholder={prevWeight || unit}
              label={`${type === 'warmup' ? 'Warm-up' : 'Set'} ${idx + 1} weight`}
              unit={unit}
              min={0}
              onChange={(next) => updateSet(type, idx, 'weight', next)}
            />
            <button className="adj-btn" onClick={() => adjustWeight(type, idx, 1)}>+</button>
          </div>
          <span className="set-label clickable" onClick={() => toggleSetCommitted(type, idx)}>
            {label}{prStatus.isWeightPR && '⭐'}{prStatus.isRepPR && '✓'}
          </span>
          <div className="set-field reps">
            <button className="adj-btn" onClick={() => adjustReps(type, idx, -1)}>−</button>
            <KeypadInput
              mode="integer"
              value={set.reps}
              placeholder={prevReps || goalReps || '-'}
              label={`${type === 'warmup' ? 'Warm-up' : 'Set'} ${idx + 1} reps`}
              min={0}
              onChange={(next) => updateSet(type, idx, 'reps', next)}
            />
            <button className="adj-btn" onClick={() => adjustReps(type, idx, 1)}>+</button>
          </div>
        </div>
      </div>
    )
  }

  // Empty routine / no workouts at all
  if (!activeRoutine || Object.keys(routineWorkouts).length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🗓️</div>
        <p style={{ marginBottom: 8 }}>No routine set up yet.</p>
        <p style={{ fontSize: 12, color: '#6c7086' }}>Open Settings → Routines to add one.</p>
      </div>
    )
  }

  if (currentRoutine?.isRest && restExercises.length > 0) {
    const ex = restExercises[currentExerciseIdx] || restExercises[0]
    const flatChecks = (Array.isArray(workout.restChecks?.[0]) || workout.restChecks?.length === 0)
      ? workout.restChecks
      : restExercises.map(e => Array(e.sets || 1).fill(false))
    const exChecks = flatChecks?.[currentExerciseIdx] || Array(ex.sets || 1).fill(false)
    return (
      <div className="log-page rest-log-page">
        <div className="exercise-nav">
          <button onClick={prevExercise} disabled={currentExerciseIdx === 0}>&lt;</button>
          <div className="exercise-info-center">
            <h2 className="exercise-name">{ex.name}</h2>
            <span className="exercise-count">
              {currentExerciseIdx + 1} / {restExercises.length}
              {ex.alias && ` · ${ex.alias}`}
              {workout.committed && ' ✓'}
            </span>
          </div>
          {isLastExercise ? (
            <button className={`commit-btn ${workout.committed ? 'committed' : ''}`} onClick={commitWorkout}>✓</button>
          ) : (
            <button onClick={nextExercise}>&gt;</button>
          )}
        </div>

        {ex.notes && <div className="rest-notes-block">{ex.notes}</div>}

        <div className="rest-sets">
          {Array.from({ length: ex.sets || 1 }).map((_, sIdx) => (
            <RestSetRow
              key={sIdx}
              ex={ex}
              setIdx={sIdx}
              checked={!!exChecks[sIdx]}
              onCheck={(val) => toggleRestSetCheck(currentExerciseIdx, sIdx, val)}
            />
          ))}
        </div>
      </div>
    )
  }

  if (currentRoutine?.isRest && restExercises.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888' }}>
        <h2 style={{ marginBottom: 16 }}>{currentRoutine.name}</h2>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🛌</div>
        <p>Nothing to do today.</p>
      </div>
    )
  }

  if (!currentRoutine?.isRest && !(isOnWarmup || currentExercise)) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
        <p style={{ marginBottom: 16 }}>No exercises configured for {currentRoutine?.name || 'this routine'}.</p>
        <p style={{ fontSize: 11, color: '#6c7086' }}>Configure routines in Settings (coming soon).</p>
      </div>
    )
  }

  const pr = currentExercise ? getExercisePR(currentExercise.name) : { maxWeight: 0, maxRepsAtMaxWeight: 0 }
  const unit = routineTemplate?.unit || 'kg'
  const kgPerUnit = routineTemplate?.kgPerUnit
  let bestWeightNative = 0, bestReps = 0
  currentExercise?.workSets?.forEach(set => {
    const hasValues = set.weight || set.reps
    const isCommitted = set.committed === true || (hasValues && set.committed !== false)
    if (!isCommitted) return
    const w = parseFloat(set.weight) || 0
    const r = parseInt(set.reps) || 0
    if (w > 0 && r > 0 && (w > bestWeightNative || (w === bestWeightNative && r > bestReps))) {
      bestWeightNative = w
      bestReps = r
    }
  })
  const bestWeightKg = Math.round(toKg(bestWeightNative, unit, kgPerUnit) * 10) / 10
  const isWeightPR = bestWeightKg > pr.maxWeight
  const isRepPR = !isWeightPR && bestWeightKg === pr.maxWeight && bestReps > pr.maxRepsAtMaxWeight
  const lastDataKg = lastData ? toKg(lastData.weight, unit, kgPerUnit) : 0
  const anyCommitted = currentExercise?.warmupSets.some(s => s.committed === true) || currentExercise?.workSets.some(s => s.committed === true)
  const allWorkDone = currentExercise?.workSets.length > 0 && currentExercise?.workSets.every(s => s.committed === true)
  const ts = currentExercise ? lastCommitRef.current[currentExercise.id] : null
  const showTimer = anyCommitted && !allWorkDone && ts
  const timer = showTimer ? <span className="set-timer">⏱ {fmtSec(Math.floor((Date.now() - ts) / 1000))}</span> : null

  return (
    <div className="log-page">
      <div className="exercise-nav">
        <button onClick={prevExercise} disabled={currentExerciseIdx === 0}>&lt;</button>
        <div className="exercise-info-center">
          <h2 className="exercise-name">{isOnWarmup ? 'Warm-up' : currentExercise.name}</h2>
          <span className="exercise-count">
            {isOnWarmup ? '' : `${exerciseIdx + 1} / ${workout.exercises.length}`}
            {!isOnWarmup && routineTemplate?.reps && ` · ${routineTemplate.reps} reps`}
            {!isOnWarmup && workout.committed && ' ✓'}
          </span>
        </div>
        {isLastExercise ? (
          <button className={`commit-btn ${workout.committed ? 'committed' : ''}`} onClick={commitWorkout}>✓</button>
        ) : (
          <button onClick={nextExercise}>&gt;</button>
        )}
      </div>

      {isOnWarmup ? (
        <div className="warmup-all">
          {warmups.map((wu, wuIdx) => {
            const isChecked = workout.warmupChecks?.[wuIdx] === true
            const desc = [wu.checks?.join(', '), wu.notes].filter(Boolean).join(' · ')
            return (
              <div
                key={wu.id}
                className={`warmup-block ${isChecked ? 'checked' : ''}`}
                onClick={() => toggleWarmupCheck(wuIdx)}
              >
                <div className="warmup-check-box">{isChecked ? '✓' : ''}</div>
                <div className="warmup-block-info">
                  <div className="warmup-block-header">
                    <span className="warmup-block-name">{wu.name}</span>
                    <span className="warmup-block-reps">{wu.reps}</span>
                  </div>
                  {desc && <div className="warmup-block-notes">{desc}</div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {(pr.maxWeight > 0 || isWeightPR || isRepPR) ? (
            <div className={`pr-info ${isWeightPR ? 'new-weight-pr' : ''} ${isRepPR ? 'new-rep-pr' : ''}`}>
              <span className="pr-label">{isWeightPR || isRepPR ? 'NEW PR' : 'PR'}</span>
              <span className="pr-value">{pr.maxWeight}kg×{pr.maxRepsAtMaxWeight}</span>
              {lastData && !(isWeightPR || isRepPR) && (
                <span className="last-value">Last {lastData.weight}{unit}×{lastData.reps}</span>
              )}
              {timer}
            </div>
          ) : lastData ? (
            <div className="last-workout">
              Last: {lastData.weight}{unit} {unit !== 'kg' ? `(${lastDataKg}kg)` : ''} × {lastData.reps}
              {timer}
            </div>
          ) : timer ? (
            <div className="last-workout">{timer}</div>
          ) : null}

          {routineTemplate?.templateNotes && (
            <div className="template-notes">{routineTemplate.templateNotes}</div>
          )}

          <div className="sets-section">
            {currentExercise.warmupSets.length > 0 && (
              <>
                <div className="sets-label">Warm-up</div>
                {currentExercise.warmupSets.map((set, idx) => renderSetRow(set, idx, 'warmup', `W${idx + 1}`))}
              </>
            )}

            <div className="sets-label">Working Sets</div>
            {currentExercise.workSets.map((set, idx) => renderSetRow(set, idx, 'work', `${idx + 1}`))}
          </div>

          <div className="bottom-section">
            {(() => {
              const sets = activeSetIdx.type === 'warmup' ? currentExercise.warmupSets : currentExercise.workSets
              const activeSet = sets?.[activeSetIdx.idx] || currentExercise.workSets?.[0]
              const weight = parseFloat(activeSet?.weight) || 0
              const weightType = routineTemplate?.weightType
              const isPlates = routineTemplate?.equipmentType === 'plates' || weightType === 'plates-kg' || weightType === 'plates-lbs'
              const bottomUnit = routineTemplate?.unit || (weightType === 'plates-lbs' ? 'lbs' : 'kg')
              const bottomKg = toKg(weight, bottomUnit, routineTemplate?.kgPerUnit)
              let detail = null
              if (isPlates && weight > 0) {
                const defaultBar = bottomUnit === 'lbs' ? 45 : 20
                const barWeight = routineTemplate?.barWeight ?? defaultBar
                const plates = getPlatesPerSide(weight, barWeight, bottomUnit)
                detail = `${formatPlates(plates)}/side`
              }
              return (
                <div className="weight-info">
                  <span className="weight-kg">{weight > 0 ? `${Math.round(bottomKg * 10) / 10}kg` : '-'}</span>
                  {detail && <span className="weight-detail">{detail}</span>}
                </div>
              )
            })()}

            <div className="notes-section">
              <input
                type="text"
                value={currentExercise.notes || ''}
                onChange={(e) => updateExerciseNote(e.target.value)}
                placeholder={routineTemplate?.templateNotes || '+ Add note'}
              />
            </div>
          </div>
        </>
      )}

    </div>
  )
}
