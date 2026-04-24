import { useState } from 'react'
import { todayKey, addDays } from '../../lib/dates'
import { PHASE_TYPES, getPhaseColor } from '../../lib/colors'
import useLocalStorage from '../../hooks/useLocalStorage'

export default function SettingsGeneral({ phases, setPhases }) {
  const [phaseModal, setPhaseModal] = useState(null)
  const [github, setGithub] = useLocalStorage('tracker_github', { token: '', repo: '', owner: '', connected: false })
  const [ghExpanded, setGhExpanded] = useState(false)

  const openNewPhase = () => {
    setPhaseModal({
      name: '',
      type: 'cut',
      goals: { weight: '', bodyFat: '', musclePct: '' },
    })
  }

  const savePhaseModal = () => {
    const { name, type, goals } = phaseModal
    if (!name.trim()) { alert('Name required'); return }
    const today = todayKey()
    setPhases(prev => {
      // auto-end any currently-ongoing phase the day before new phase starts
      const withEnded = prev.map(p => p.end ? p : { ...p, end: addDays(today, -1) })
      return [
        ...withEnded,
        { id: Date.now(), name: name.trim(), type, start: today, end: '', goals },
      ]
    })
    setPhaseModal(null)
  }

  const deletePhase = (id) => {
    if (!confirm('Delete this phase?')) return
    setPhases(prev => prev.filter(p => p.id !== id))
  }

  const sortedPhases = [...phases].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  const isMaintain = phaseModal?.type === 'maintain'

  const connectGithub = () => setGithub({ ...github, connected: true })
  const disconnectGithub = () => setGithub({ token: '', repo: '', owner: '', connected: false })

  const resetToSeed = () => {
    if (!confirm('Wipe tracker storage and reload? Seed test data will re-populate on refresh.')) return
    ;['tracker_entries', 'tracker_phases', 'tracker_workouts', 'tracker_notes',
      'tracker_habits', 'tracker_exercises', 'tracker_workout_templates',
      'tracker_routines', 'tracker_active_routine']
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <>
      <div className="settings-section">Phases</div>
      <button className="primary-btn" onClick={openNewPhase}>
        Start new phase
      </button>
      <p style={{ fontSize: 11, color: '#6c7086', margin: '6px 0 12px' }}>
        Starting a new phase automatically ends the current one.
      </p>

      {sortedPhases.map(p => {
        const isCurrent = !p.end
        const color = getPhaseColor(p)
        const typeLabel = PHASE_TYPES.find(t => t.id === p.type)?.label || p.type || ''
        return (
          <div key={p.id} className={`phase-card ${isCurrent ? 'current' : ''}`} style={{ borderColor: color + '40' }}>
            <div className="pc-name" style={{ color }}>
              {p.name}{typeLabel && <span style={{ fontSize: 10, color: '#6c7086', fontWeight: 500, marginLeft: 8 }}>· {typeLabel}</span>}
            </div>
            <div className="pc-dates">{p.start} {'→'} {p.end || 'ongoing'}</div>
            {p.goals && (
              <div className="pc-goals">
                Goal: {p.goals.weight && `${p.goals.weight}kg `}{p.goals.bodyFat && `${p.goals.bodyFat}% BF `}{p.goals.musclePct && `${p.goals.musclePct}% Mu`}
              </div>
            )}
            {isCurrent && <div className="pc-badge">Current</div>}
            <div className="pc-actions">
              <button className="del" onClick={() => deletePhase(p.id)}>{'×'}</button>
            </div>
          </div>
        )
      })}
      {phases.length === 0 && <div style={{ color: '#45475a', fontSize: 12, padding: '8px 0' }}>No phases yet</div>}

      <div className="settings-section">Sync</div>
      <div className="settings-row" onClick={() => setGhExpanded(!ghExpanded)}>
        <div className="sr-left">
          <span className="sr-icon">{'\u{E0A0}'}</span>
          <span className="sr-label">GitHub Sync</span>
        </div>
        <span className="sr-arrow">{ghExpanded ? '‹' : '›'}</span>
      </div>

      {ghExpanded && (
        <div className="gh-form">
          {!github.connected ? (
            <>
              <div className="field">
                <label>Token</label>
                <input type="password" value={github.token} onChange={(e) => setGithub({ ...github, token: e.target.value })} placeholder="ghp_..." />
              </div>
              <div className="field">
                <label>Owner</label>
                <input value={github.owner} onChange={(e) => setGithub({ ...github, owner: e.target.value })} placeholder="username" />
              </div>
              <div className="field">
                <label>Repo</label>
                <input value={github.repo} onChange={(e) => setGithub({ ...github, repo: e.target.value })} placeholder="repo-name" />
              </div>
              <button className="primary-btn" onClick={connectGithub}>Save credentials</button>
              <p style={{ fontSize: 11, color: '#6c7086', marginTop: 8 }}>
                Credential storage only for now — push/pull not wired yet.
              </p>
            </>
          ) : (
            <>
              <div className="connected-info">Saved: {github.owner}/{github.repo}</div>
              <button className="danger-btn" onClick={disconnectGithub}>Clear credentials</button>
            </>
          )}
        </div>
      )}

      <div className="settings-section">App</div>
      <button className="primary-btn" onClick={() => window.location.reload()}>Reload App</button>
      <button className="primary-btn" style={{ marginTop: 8 }} onClick={resetToSeed}>Reset to seed data</button>

      {phaseModal && (
        <div className="modal-overlay" onClick={() => setPhaseModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Start new phase</h3>

            <div className="field">
              <label>Type</label>
              <div className="phase-type-pills">
                {PHASE_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={phaseModal.type === t.id ? 'active' : ''}
                    style={{ '--pc': t.color }}
                    onClick={() => {
                      const isNowMaintain = t.id === 'maintain'
                      setPhaseModal({
                        ...phaseModal,
                        type: t.id,
                        goals: isNowMaintain
                          ? { ...phaseModal.goals, weight: '' }
                          : phaseModal.goals,
                      })
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Name</label>
              <input
                value={phaseModal.name}
                onChange={(e) => setPhaseModal({ ...phaseModal, name: e.target.value })}
                placeholder="e.g. Spring Cut"
              />
            </div>

            <div className="field">
              <label>Goal Weight (kg){isMaintain && ' — disabled on Maintain'}</label>
              <input
                type="text"
                inputMode="decimal"
                disabled={isMaintain}
                value={isMaintain ? '' : phaseModal.goals.weight}
                onChange={(e) => setPhaseModal({ ...phaseModal, goals: { ...phaseModal.goals, weight: e.target.value } })}
                placeholder={isMaintain ? '—' : '75'}
              />
            </div>

            <div className="field">
              <label>Goal Body Fat %</label>
              <input
                type="text"
                inputMode="decimal"
                value={phaseModal.goals.bodyFat}
                onChange={(e) => setPhaseModal({ ...phaseModal, goals: { ...phaseModal.goals, bodyFat: e.target.value } })}
                placeholder="15"
              />
            </div>

            <div className="field">
              <label>Goal Muscle %</label>
              <input
                type="text"
                inputMode="decimal"
                value={phaseModal.goals.musclePct}
                onChange={(e) => setPhaseModal({ ...phaseModal, goals: { ...phaseModal.goals, musclePct: e.target.value } })}
                placeholder="40"
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setPhaseModal(null)}>Cancel</button>
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={savePhaseModal}>Start phase</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
