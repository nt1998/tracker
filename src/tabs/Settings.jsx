export default function Settings() {
  const resetToSeed = () => {
    if (!confirm('Wipe tracker storage and reload? Seed test data will re-populate on refresh.')) return
    ;['tracker_entries', 'tracker_phases', 'tracker_workouts', 'tracker_routines', 'tracker_notes']
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <>
      <div className="settings-h">Settings</div>

      <div className="settings-section">App</div>
      <button className="primary-btn" onClick={() => window.location.reload()}>
        Reload App
      </button>

      <div className="settings-section">Test data</div>
      <button className="primary-btn" onClick={resetToSeed}>
        Reset to seed data
      </button>

      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6c7086', fontSize: 12 }}>
        More settings coming soon
      </div>
    </>
  )
}
