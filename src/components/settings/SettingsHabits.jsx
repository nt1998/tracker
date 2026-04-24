import { ORBIT_HABITS } from '../../lib/bodyData'

export default function SettingsHabits() {
  return (
    <>
      <div className="settings-section">Orbit habits</div>
      {ORBIT_HABITS.map(h => (
        <div key={h.key} className="phase-card" style={{ borderColor: `${h.color}30` }}>
          <div className="pc-name" style={{ color: h.color }}>
            {h.icon} {h.name}
          </div>
          <div className="pc-dates">key: {h.key}</div>
          {h.details && h.details.length > 0 && (
            <div className="pc-goals" style={{ whiteSpace: 'pre-wrap' }}>
              {h.details.join(' · ')}
            </div>
          )}
        </div>
      ))}
      <div style={{ padding: '20px 0', textAlign: 'center', color: '#6c7086', fontSize: 11 }}>
        Habit editing coming soon — habits are currently defined in code.
      </div>
    </>
  )
}
