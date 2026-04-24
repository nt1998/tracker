import { useState } from 'react'
import { HABIT_ICONS, HABIT_COLORS } from '../../lib/habitIcons'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const EMPTY = () => ({
  key: 'h_' + Date.now(),
  icon: '✨',
  name: '',
  color: HABIT_COLORS[0],
  description: '',
  schedule: { mode: 'daily' },
})

export default function SettingsHabits({ habits, setHabits }) {
  const [editing, setEditing] = useState(null) // habit being edited
  const [isNew, setIsNew] = useState(false)

  const openAdd = () => { setEditing(EMPTY()); setIsNew(true) }
  const openEdit = (h) => { setEditing({ ...h, schedule: { ...h.schedule } }); setIsNew(false) }
  const close = () => { setEditing(null); setIsNew(false) }

  const save = () => {
    if (!editing.name.trim()) { alert('Name required'); return }
    setHabits(prev => {
      if (isNew) return [...prev, editing]
      return prev.map(h => h.key === editing.key ? editing : h)
    })
    close()
  }

  const del = () => {
    if (!confirm(`Delete habit "${editing.name}"?`)) return
    setHabits(prev => prev.filter(h => h.key !== editing.key))
    close()
  }

  const update = (patch) => setEditing(s => ({ ...s, ...patch }))
  const updateSchedule = (patch) => setEditing(s => ({ ...s, schedule: { ...s.schedule, ...patch } }))
  const toggleWeekday = (d) => {
    const wd = editing.schedule.weekdays || []
    const next = wd.includes(d) ? wd.filter(x => x !== d) : [...wd, d].sort()
    updateSchedule({ weekdays: next })
  }

  const describeSchedule = (s) => {
    if (!s || s.mode === 'daily') return 'Daily'
    if (s.mode === 'weekdays') return (s.weekdays || []).map(i => WEEKDAY_LABELS[i]).join(' · ') || 'No days set'
    if (s.mode === 'everyN') return `Every ${s.everyN || 1} day${(s.everyN || 1) > 1 ? 's' : ''}`
    return ''
  }

  return (
    <>
      <div className="settings-section">Habits</div>
      {habits.map(h => (
        <div key={h.key} className="phase-card" style={{ borderColor: h.color + '40', cursor: 'pointer' }} onClick={() => openEdit(h)}>
          <div className="pc-name" style={{ color: h.color }}>
            <span style={{ fontSize: 18, marginRight: 6 }}>{h.icon}</span>{h.name}
          </div>
          <div className="pc-dates">{describeSchedule(h.schedule)}</div>
          {h.description && <div className="pc-goals">{h.description}</div>}
        </div>
      ))}
      {habits.length === 0 && <div style={{ color: '#45475a', fontSize: 12, padding: '8px 0' }}>No habits yet</div>}

      <button className="primary-btn" style={{ marginTop: 12 }} onClick={openAdd}>+ Add habit</button>

      {editing && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{isNew ? 'Add habit' : 'Edit habit'}</h3>

            <div className="field">
              <label>Icon</label>
              <div className="icon-picker">
                {HABIT_ICONS.map(ic => (
                  <button
                    type="button"
                    key={ic}
                    className={editing.icon === ic ? 'active' : ''}
                    onClick={() => update({ icon: ic })}
                  >{ic}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Color</label>
              <div className="color-picker">
                {HABIT_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    className={editing.color === c ? 'active' : ''}
                    style={{ background: c }}
                    onClick={() => update({ color: c })}
                  />
                ))}
              </div>
            </div>

            <div className="field">
              <label>Name</label>
              <input value={editing.name} onChange={(e) => update({ name: e.target.value })} placeholder="Stretch, Vitamin, Walk..." />
            </div>

            <div className="field">
              <label>Description (long-press detail)</label>
              <input value={editing.description || ''} onChange={(e) => update({ description: e.target.value })} placeholder="what it means or how to do it" />
            </div>

            <div className="field">
              <label>Schedule</label>
              <div className="phase-type-pills">
                {[
                  { id: 'daily',    label: 'Daily' },
                  { id: 'weekdays', label: 'Weekdays' },
                  { id: 'everyN',   label: 'Every N' },
                ].map(m => (
                  <button
                    type="button"
                    key={m.id}
                    className={editing.schedule.mode === m.id ? 'active' : ''}
                    style={{ '--pc': editing.color }}
                    onClick={() => updateSchedule({ mode: m.id, weekdays: m.id === 'weekdays' ? (editing.schedule.weekdays || [1, 3, 5]) : undefined, everyN: m.id === 'everyN' ? (editing.schedule.everyN || 2) : undefined })}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <div className="schedule-details">
              {editing.schedule.mode === 'weekdays' && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Days</label>
                  <div className="weekday-picker">
                    {WEEKDAY_LABELS.map((l, i) => (
                      <button
                        key={i}
                        type="button"
                        className={(editing.schedule.weekdays || []).includes(i) ? 'active' : ''}
                        onClick={() => toggleWeekday(i)}
                      >{l}</button>
                    ))}
                  </div>
                </div>
              )}
              {editing.schedule.mode === 'everyN' && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Every N days</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editing.schedule.everyN || 2}
                    onChange={(e) => updateSchedule({ everyN: Math.max(1, +e.target.value) })}
                  />
                </div>
              )}
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
