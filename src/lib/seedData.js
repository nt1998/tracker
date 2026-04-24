// Seed data for testing — used as the initial value of the tracker_* stores
// when localStorage has nothing. Safe to drop in because useLocalStorage only
// reads initialValue on empty storage; real user data is never overwritten.

const START = '2026-02-23'   // ~60 days before 2026-04-24
const CUT_END = '2026-03-21'
const BULK_START = '2026-03-22'
const TODAY = '2026-04-24'

// deterministic-ish pseudo noise
const noise = (seed, amp = 0.3) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2 * amp
}

function dateRange(start, end) {
  const out = []
  const [ys, ms, ds] = start.split('-').map(Number)
  const [ye, me, de] = end.split('-').map(Number)
  const d = new Date(ys, ms - 1, ds)
  const last = new Date(ye, me - 1, de)
  while (d <= last) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}

function emptyHabits() {
  return { morning: false, supsAM: false, d3k2: false, supsPM: false, gymPush: false, gymPull: false, hiit: false, rehab: false }
}

function buildEntries() {
  const dates = dateRange(START, TODAY)
  const entries = {}
  dates.forEach((d, i) => {
    const day = new Date(d + 'T12:00:00')
    const dow = day.getDay()
    // cut → bulk curve for weight
    let weight
    if (d <= CUT_END) {
      // 75.2 → 72.8 over 27 days
      const t = i / 27
      weight = 75.2 - 2.4 * Math.min(1, t) + noise(i, 0.25)
    } else {
      // 72.8 → ~75.1 over ~33 days (bulking)
      const j = i - 27
      const t = j / 33
      weight = 72.8 + 2.3 * Math.min(1, t) + noise(i, 0.25)
    }

    // Body fat matches phase direction
    let bf
    if (d <= CUT_END) bf = 16.5 - 2.3 * (i / 27) + noise(i + 100, 0.3)
    else bf = 14.2 + 1.4 * ((i - 27) / 33) + noise(i + 100, 0.3)

    // Muscle % inverse-ish to fat %
    let mu
    if (d <= CUT_END) mu = 39.8 + 1.1 * (i / 27) + noise(i + 200, 0.25)
    else mu = 40.9 - 0.7 * ((i - 27) / 33) + noise(i + 200, 0.25)

    const visceral = Math.round(6 - (i / 60) * 1 + noise(i + 300, 0.6))

    // Habits — mostly compliant, occasional miss
    const h = emptyHabits()
    h.morning = (i % 11) !== 3
    h.supsAM = (i % 7) !== 4
    h.d3k2 = i % 2 === 0
    h.supsPM = (i % 9) !== 5
    // HIIT on Wed (3) or Sun (0)
    if ([3, 0].includes(dow)) h.hiit = i % 3 !== 0
    // gym habits auto-filled by gymWorkouts derivation, but we also set manual flags
    h.rehab = dow === 0 && i % 4 !== 1

    // Skip ~10% of entries (user didn't log)
    if ((i * 7) % 10 === 3) return

    entries[d] = {
      weight: weight.toFixed(1),
      bodyFat: bf.toFixed(1),
      musclePct: mu.toFixed(1),
      visceralFat: String(Math.max(2, Math.min(9, visceral))),
      habits: h,
    }
  })
  return entries
}

function buildPhases() {
  return [
    {
      id: 1708700000000,
      name: 'Cut',
      start: START,
      end: CUT_END,
      goals: { weight: '73', bodyFat: '14', musclePct: '41' },
    },
    {
      id: 1711000000000,
      name: 'Lean Bulk',
      start: BULK_START,
      end: '',
      goals: { weight: '78', bodyFat: '16.5', musclePct: '40' },
    },
  ]
}

const routines = {
  push: {
    name: 'Push',
    schedule: 'Mon · Thu',
    warmups: [
      { id: 1, name: 'Band pull-aparts', reps: '2×15', notes: '' },
      { id: 2, name: 'Scap push-ups', reps: '2×10', notes: '' },
    ],
    exercises: [
      { id: 1, name: 'Bench Press',       warmupSets: 2, workSets: 4, reps: '6-10',  unit: 'kg',  equipmentType: 'plates',  startWeight: 60,  increment: 2.5, barWeight: 20 },
      { id: 2, name: 'Overhead Press',    warmupSets: 1, workSets: 3, reps: '6-10',  unit: 'kg',  equipmentType: 'plates',  startWeight: 30,  increment: 2.5, barWeight: 20 },
      { id: 3, name: 'Incline DB Press',  warmupSets: 1, workSets: 3, reps: '8-12',  unit: 'kg',  equipmentType: 'dumbbell',startWeight: 16,  increment: 2 },
      { id: 4, name: 'Cable Fly',         warmupSets: 0, workSets: 3, reps: '10-14', unit: 'kg',  equipmentType: 'machine', startWeight: 10,  increment: 5 },
      { id: 5, name: 'Triceps Pushdown',  warmupSets: 0, workSets: 3, reps: '10-14', unit: 'kg',  equipmentType: 'machine', startWeight: 15,  increment: 5 },
    ],
  },
  pull: {
    name: 'Pull',
    schedule: 'Tue · Fri',
    warmups: [
      { id: 1, name: 'Dead hang', reps: '2×20s', notes: '' },
      { id: 2, name: 'Scap pull-ups', reps: '2×8', notes: '' },
    ],
    exercises: [
      { id: 1, name: 'Pull-ups',          warmupSets: 1, workSets: 4, reps: '5-10',  unit: 'kg', equipmentType: 'bodyweight', startWeight: 0, increment: 2.5 },
      { id: 2, name: 'Barbell Row',       warmupSets: 2, workSets: 3, reps: '6-10',  unit: 'kg', equipmentType: 'plates',  startWeight: 50,  increment: 2.5, barWeight: 20 },
      { id: 3, name: 'Lat Pulldown',      warmupSets: 1, workSets: 3, reps: '8-12',  unit: 'kg', equipmentType: 'machine', startWeight: 40,  increment: 5 },
      { id: 4, name: 'Face Pull',         warmupSets: 0, workSets: 3, reps: '12-15', unit: 'kg', equipmentType: 'machine', startWeight: 15,  increment: 5 },
      { id: 5, name: 'Biceps Curl',       warmupSets: 0, workSets: 3, reps: '10-14', unit: 'kg', equipmentType: 'dumbbell',startWeight: 10,  increment: 1 },
    ],
  },
  rest: {
    name: 'Rest Day',
    schedule: 'Wed · Sat · Sun',
    isRest: true,
    warmups: [],
    blocks: [
      {
        name: 'Mobility',
        exercises: [
          { name: 'Cat-cow',       type: 'rep',  sets: 2, reps: '10', perSide: false },
          { name: '90/90 hip',     type: 'time', sets: 2, duration: 30, perSide: true },
          { name: 'Thoracic rot',  type: 'rep',  sets: 2, reps: '8',  perSide: true },
        ],
      },
      {
        name: 'Feet',
        exercises: [
          { name: 'Arch squeeze',  type: 'time', sets: 2, duration: 30, perSide: true },
          { name: 'Toe yoga',      type: 'rep',  sets: 2, reps: '10', perSide: true },
        ],
      },
    ],
    exercises: [],
  },
}

function buildWorkouts() {
  const dates = dateRange(START, TODAY)
  const out = {}
  dates.forEach((d, i) => {
    const day = new Date(d + 'T12:00:00')
    const dow = day.getDay()
    // Mon/Thu = push, Tue/Fri = pull, else rest
    const isPush = [1, 4].includes(dow)
    const isPull = [2, 5].includes(dow)
    // miss ~15% of scheduled workouts
    if ((isPush || isPull) && (i * 3) % 7 === 2) return

    if (isPush || isPull) {
      const routine = routines[isPush ? 'push' : 'pull']
      // progressive overload: weight climbs slowly
      const progress = i / 60
      out[d] = {
        routineType: isPush ? 'push' : 'pull',
        committed: true,
        warmupChecks: routine.warmups.map(() => true),
        exercises: routine.exercises.map((ex, ei) => {
          const baseWeight = (ex.startWeight || 20) + progress * 10 + ei * 0.5
          const unit = ex.unit || 'kg'
          return {
            id: ex.id,
            name: ex.name,
            warmupSets: Array.from({ length: ex.warmupSets }).map((_, si) => ({
              weight: Math.round((baseWeight * 0.5 + si * 5) * 10) / 10 + '',
              reps: '8',
              unit,
              committed: true,
            })),
            workSets: Array.from({ length: ex.workSets }).map((_, si) => {
              const w = baseWeight + noise(i * 31 + ei * 7 + si, 1.5)
              const r = 8 - Math.floor(si / 2) + Math.floor(noise(i + ei + si, 1.2))
              return {
                weight: Math.max(0, Math.round(w * 10) / 10) + '',
                reps: String(Math.max(4, Math.min(15, r))),
                unit,
                committed: true,
              }
            }),
            notes: '',
          }
        }),
      }
    } else if (dow === 0) {
      // Sunday rehab
      if ((i * 5) % 8 === 3) return
      const restEx = (routines.rest.blocks || []).flatMap(b => b.exercises)
      out[d] = {
        routineType: 'rest',
        committed: true,
        restChecks: restEx.map(ex => Array(ex.sets || 1).fill(true)),
        warmupChecks: [],
        exercises: [],
      }
    }
  })
  return out
}

const notes = {
  'Bench Press': 'Keep elbows 45°. Touch low chest.',
  'Overhead Press': 'Squeeze glutes, no lower back arch.',
  'Barbell Row': 'Torso 45°, pull to belly button.',
  'Pull-ups': 'Dead hang each rep. Weighted if 10+.',
}

export const seedEntries = buildEntries()
export const seedPhases = buildPhases()
export const seedWorkouts = buildWorkouts()
export const seedRoutines = routines
export const seedNotes = notes
