import { useState } from 'react'
import { todayKey, addDays } from '../../lib/dates'
import { PHASE_TYPES, getPhaseColor } from '../../lib/colors'
import KeypadInput from '../KeypadInput'

export default function SettingsGeneral({
  phases, setPhases,
  settings, setSettings,
  theme, setTheme,
  github, onConnectGithub, onDisconnectGithub,
  onSyncNow, onPull, syncStatus, lastSyncAt, needsSync,
}) {
  const [phaseModal, setPhaseModal] = useState(null)
  const [ghExpanded, setGhExpanded] = useState(false)
  const [ghForm, setGhForm] = useState({ token: github?.token || '', owner: github?.owner || '', repo: github?.repo || '' })

  const openNewPhase = () => {
    setPhaseModal({ name: '', type: 'cut', goals: { weight: '', bodyFat: '', musclePct: '' } })
  }
  const savePhaseModal = () => {
    const { name, type, goals } = phaseModal
    if (!name.trim()) { alert('Name required'); return }
    const today = todayKey()
    setPhases(prev => {
      const withEnded = prev.map(p => p.end ? p : { ...p, end: addDays(today, -1) })
      return [...withEnded, { id: Date.now(), name: name.trim(), type, start: today, end: '', goals }]
    })
    setPhaseModal(null)
  }
  const deletePhase = (id) => {
    if (!confirm('Delete this phase?')) return
    setPhases(prev => prev.filter(p => p.id !== id))
  }

  const sortedPhases = [...phases].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  const isMaintain = phaseModal?.type === 'maintain'

  return (
    <>
      <div className="settings-section">Phases</div>
      <button className="primary-btn" onClick={openNewPhase}>Start new phase</button>
      <p style={{ fontSize: 11, color: '#6c7086', margin: '6px 0 12px' }}>
        Starting a new phase auto-ends the current one.
      </p>

      {sortedPhases.map(p => {
        const isCurrent = !p.end
        const color = getPhaseColor(p)
        const typeLabel = PHASE_TYPES.find(t => t.id === p.type)?.label || p.type || ''
        return (
          <div key={p.id} className={`phase-card ${isCurrent ? 'current' : ''}`} style={{ borderColor: color + '40' }}>
            <div className="pc-name" style={{ color }}>
              {p.name}
              {typeLabel && <span style={{ fontSize: 10, color: '#6c7086', fontWeight: 500, marginLeft: 8 }}>· {typeLabel}</span>}
              {isCurrent && <span style={{ fontSize: 10, color: '#89b4fa', fontWeight: 600, marginLeft: 8 }}>· current</span>}
            </div>
            <div className="pc-dates">{p.start} → {p.end || 'ongoing'}</div>
            {p.goals && (
              <div className="pc-goals">
                Goal: {p.goals.weight && `${p.goals.weight}kg `}{p.goals.bodyFat && `${p.goals.bodyFat}% BF `}{p.goals.musclePct && `${p.goals.musclePct}% Mu`}
              </div>
            )}
            <div className="pc-actions">
              <button className="del" onClick={() => deletePhase(p.id)}>{'×'}</button>
            </div>
          </div>
        )
      })}
      {phases.length === 0 && <div style={{ color: '#45475a', fontSize: 12, padding: '8px 0' }}>No phases yet</div>}

      <div className="settings-section">Tracking</div>
      <div className="toggle-row">
        <span>
          <div className="tr-title">Visceral fat</div>
          <div className="tr-sub">Record and chart the 4th measurement.</div>
        </span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!!settings?.visceralEnabled}
            onChange={(e) => setSettings({ ...settings, visceralEnabled: e.target.checked })}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="toggle-row">
        <span>
          <div className="tr-title">Swipe between tabs</div>
          <div className="tr-sub">Horizontal swipe navigates tabs.</div>
        </span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings?.swipeNavEnabled !== false}
            onChange={(e) => setSettings({ ...settings, swipeNavEnabled: e.target.checked })}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="toggle-row">
        <span>
          <div className="tr-title">Light mode</div>
          <div className="tr-sub">Catppuccin Latte palette.</div>
        </span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={theme === 'light'}
            onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="toggle-row">
        <span>
          <div className="tr-title">Water</div>
          <div className="tr-sub">Track daily water intake.</div>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings?.waterEnabled !== false && (
            <div className="inline-goal">
              <KeypadInput
                mode="integer"
                value={settings?.waterGoalML ?? 2500}
                onChange={(next) => {
                  const n = parseInt(next, 10)
                  setSettings({ ...settings, waterGoalML: isNaN(n) ? 0 : n })
                }}
                placeholder="2500"
                label="Daily water goal"
                unit="ml"
                min={0}
              />
              <span className="unit">ml</span>
            </div>
          )}
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.waterEnabled !== false}
              onChange={(e) => setSettings({ ...settings, waterEnabled: e.target.checked })}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">Sync</div>
      <div className="settings-row" onClick={() => setGhExpanded(!ghExpanded)}>
        <div className="sr-left">
          <span className="sr-icon">☁︎</span>
          <span className="sr-label">GitHub Sync {github?.connected ? '· connected' : ''}</span>
        </div>
        <span className="sr-arrow">{ghExpanded ? '‹' : '›'}</span>
      </div>

      {ghExpanded && (
        <div className="gh-form">
          {!github?.connected ? (
            <>
              <div className="field">
                <label>Token</label>
                <input type="password" value={ghForm.token} onChange={(e) => setGhForm({ ...ghForm, token: e.target.value })} placeholder="ghp_..." />
              </div>
              <div className="field">
                <label>Owner</label>
                <input value={ghForm.owner} onChange={(e) => setGhForm({ ...ghForm, owner: e.target.value })} placeholder="username" />
              </div>
              <div className="field">
                <label>Repo</label>
                <input value={ghForm.repo} onChange={(e) => setGhForm({ ...ghForm, repo: e.target.value })} placeholder="repo-name (private)" />
              </div>
              <button className="primary-btn" onClick={() => onConnectGithub(ghForm)}>Connect &amp; Pull</button>
              <p style={{ fontSize: 10, color: '#6c7086', marginTop: 6 }}>
                Reads / writes tracker.json only.
              </p>
            </>
          ) : (
            <>
              <div className="connected-info">Connected to {github.owner}/{github.repo}</div>
              <div className="sync-stats">
                {lastSyncAt > 0 && <p className="sync-note">Last sync: {new Date(lastSyncAt).toLocaleString()}</p>}
                <p className="sync-note">{needsSync ? 'Changes pending…' : 'Up to date'}</p>
              </div>
              <button className="primary-btn" onClick={onSyncNow}>Sync now</button>
              <button className="primary-btn" style={{ marginTop: 6 }} onClick={() => {
                if (confirm('Pull remote state and overwrite local?')) onPull()
              }}>Pull from remote</button>
              <button className="danger-btn" style={{ marginTop: 6 }} onClick={() => {
                if (confirm('Disconnect? Local data stays.')) onDisconnectGithub()
              }}>Disconnect</button>
            </>
          )}
          {syncStatus && <div className="sync-status" style={{ marginTop: 8 }}>{syncStatus}</div>}
        </div>
      )}

      <div className="settings-section">App</div>
      <button className="primary-btn" onClick={() => window.location.reload()}>Reload App</button>

      {phaseModal && (
        <div className="modal-overlay" onClick={() => setPhaseModal(null)}>
          <div className="modal modal-tall" onClick={e => e.stopPropagation()}>
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
                        goals: isNowMaintain ? { ...phaseModal.goals, weight: '' } : phaseModal.goals,
                      })
                    }}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Name</label>
              <input value={phaseModal.name} onChange={(e) => setPhaseModal({ ...phaseModal, name: e.target.value })} placeholder="e.g. Spring Cut" />
            </div>

            <div className="field">
              <label>Goal Weight (kg){isMaintain && ' — disabled on Maintain'}</label>
              <KeypadInput
                mode="decimal"
                disabled={isMaintain}
                value={isMaintain ? '' : phaseModal.goals.weight}
                onChange={(next) => setPhaseModal({ ...phaseModal, goals: { ...phaseModal.goals, weight: next } })}
                placeholder={isMaintain ? '—' : '75'}
                label="Goal weight"
                unit="kg"
                min={0}
              />
            </div>

            <div className="field">
              <label>Goal Body Fat %</label>
              <KeypadInput
                mode="decimal"
                value={phaseModal.goals.bodyFat}
                onChange={(next) => setPhaseModal({ ...phaseModal, goals: { ...phaseModal.goals, bodyFat: next } })}
                placeholder="15"
                label="Goal body fat"
                unit="%"
                min={0}
                max={100}
              />
            </div>

            <div className="field">
              <label>Goal Muscle %</label>
              <KeypadInput
                mode="decimal"
                value={phaseModal.goals.musclePct}
                onChange={(next) => setPhaseModal({ ...phaseModal, goals: { ...phaseModal.goals, musclePct: next } })}
                placeholder="40"
                label="Goal muscle"
                unit="%"
                min={0}
                max={100}
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
