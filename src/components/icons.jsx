export const BlackHoleIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" className="celeb-svg">
    <defs>
      <radialGradient id="bhDisc" cx="50%" cy="50%" r="50%">
        <stop offset="30%" stopColor="#000000" stopOpacity="1" />
        <stop offset="45%" stopColor="#11111b" stopOpacity="1" />
        <stop offset="58%" stopColor="#cba6f7" stopOpacity="0.9" />
        <stop offset="72%" stopColor="#f9e2af" stopOpacity="0.85" />
        <stop offset="90%" stopColor="#fab387" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#fab387" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="bhCore" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" />
        <stop offset="85%" stopColor="#000000" />
        <stop offset="100%" stopColor="#11111b" />
      </radialGradient>
    </defs>
    <circle cx="27" cy="27" r="26" fill="url(#bhDisc)" />
    <circle cx="27" cy="27" r="10" fill="url(#bhCore)" />
  </svg>
)

export const StarIcon = () => (
  <svg width="46" height="46" viewBox="0 0 46 46" className="celeb-svg">
    <defs>
      <radialGradient id="starGrad">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f9e2af" />
        <stop offset="100%" stopColor="#fab387" />
      </radialGradient>
    </defs>
    <polygon
      points="23,2 28,17 44,17 31,27 36,43 23,33 10,43 15,27 2,17 18,17"
      fill="url(#starGrad)"
      stroke="#fff5d5"
      strokeWidth="0.5"
    />
  </svg>
)

export const PlanetIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" className="celeb-svg">
    <defs>
      <radialGradient id="planetBody" cx="38%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#fab387" />
        <stop offset="60%" stopColor="#d85e3c" />
        <stop offset="100%" stopColor="#7a2e1e" />
      </radialGradient>
    </defs>
    <ellipse cx="27" cy="28" rx="21" ry="5" fill="none" stroke="#f9e2af" strokeWidth="2.5" opacity="0.5" transform="rotate(-18 27 28)" />
    <circle cx="27" cy="27" r="13" fill="url(#planetBody)" />
    <path d="M 8.3 20 a 21 5 -18 0 0 37.4 14" fill="none" stroke="#f9e2af" strokeWidth="2.5" opacity="0.95" />
  </svg>
)

export const SunIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
  </svg>
)

// Barbell — matches gym-tracker's nav icon
export const DumbbellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3v18M7 3v18M3 7v10M21 7v10M7 12h10M3 12h4M17 12h4" />
  </svg>
)

export const ChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 4 4-6" />
  </svg>
)

// Body = person silhouette (head + shoulders)
export const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.2" />
    <path d="M7 21v-4a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4" />
  </svg>
)

// Workout = small barbell (matches gym log nav icon, shrunk)
export const BarbellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3v18M7 3v18M3 7v10M21 7v10M7 12h10M3 12h4M17 12h4" />
  </svg>
)

export const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
