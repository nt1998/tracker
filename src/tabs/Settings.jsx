export default function Settings() {
  return (
    <>
      <div className="settings-h">Settings</div>

      <div className="settings-section">App</div>
      <button className="primary-btn" onClick={() => window.location.reload()}>
        Reload App
      </button>

      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6c7086', fontSize: 12 }}>
        More settings coming soon
      </div>
    </>
  )
}
