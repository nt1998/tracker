import { useEffect } from 'react'

export default function useOrientationLock() {
  useEffect(() => {
    if (screen.orientation?.lock) {
      screen.orientation.lock('portrait').catch(() => {})
    }
    const handle = () => {
      const isLandscape = window.innerWidth > window.innerHeight
      document.body.classList.toggle('landscape-override', isLandscape)
    }
    handle()
    window.addEventListener('resize', handle)
    window.addEventListener('orientationchange', handle)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('orientationchange', handle)
    }
  }, [])
}
