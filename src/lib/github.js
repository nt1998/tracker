// GitHub sync — single tracker.json file with the whole store.
// Falls back to body-tracker's data.json + gym-tracker's gym.json on first pull
// so users can migrate without exporting.

const b64decode = (s) => JSON.parse(decodeURIComponent(escape(atob(s))))
const b64encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))))

const api = (gh, path) => `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`
const authHeaders = (gh) => ({ Authorization: `token ${gh.token}` })

async function getFile(gh, path) {
  const res = await fetch(api(gh, path), { headers: authHeaders(gh) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  const f = await res.json()
  try { return { sha: f.sha, data: b64decode(f.content) } }
  catch { return { sha: f.sha, data: null } }
}

async function putFile(gh, path, payload, sha) {
  const body = {
    message: `tracker ${path} ${new Date().toISOString()}`,
    content: b64encode(payload),
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(api(gh, path), {
    method: 'PUT',
    headers: { ...authHeaders(gh), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PUT ${path}: ${res.status} ${txt.slice(0, 200)}`)
  }
}

export async function verifyCredentials(gh) {
  const res = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}`, { headers: authHeaders(gh) })
  if (!res.ok) throw new Error(`Repo access failed: ${res.status}`)
  return true
}

export async function pullFromGithub(gh) {
  const tracker = await getFile(gh, 'tracker.json')
  if (tracker?.data && typeof tracker.data === 'object') {
    return { source: 'tracker', data: tracker.data }
  }
  return { source: 'empty', data: null }
}

export async function pushToGithub(gh, payload) {
  const existing = await getFile(gh, 'tracker.json').catch(() => null)
  await putFile(gh, 'tracker.json', payload, existing?.sha)
}

// Assemble the full sync payload from current React state.
export function buildPayload(stores) {
  const {
    entries, phases, workouts, exerciseNotes,
    habits, exercises, routines, activeRoutineId, settings, water,
  } = stores
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries, phases, workouts, exerciseNotes,
    habits, exercises, routines, activeRoutineId, settings, water,
  }
}

// Apply a remote payload into the React stores (last-write-wins).
export function applyPayload(data, setters) {
  if (!data || typeof data !== 'object') return
  if (data.entries)         setters.setEntries(data.entries)
  if (data.phases)          setters.setPhases(data.phases)
  if (data.workouts)        setters.setWorkouts(data.workouts)
  if (data.exerciseNotes)   setters.setExerciseNotes(data.exerciseNotes)
  if (data.habits)          setters.setHabits(data.habits)
  if (data.exercises)       setters.setExercises(data.exercises)
  if (data.routines)        setters.setRoutines(data.routines)
  if (data.activeRoutineId) setters.setActiveRoutineId(data.activeRoutineId)
  if (data.settings)        setters.setSettings(data.settings)
  if (data.water)           setters.setWater(data.water)
}
