import { useEffect } from 'react'

const CLAMP_DEG = 8

/**
 * Maps device gamma/beta to the glass gradient-stroke angle, reproducing iOS Liquid
 * Glass's tilt-reactive specular highlight. Progressive enhancement only — gated
 * behind a settings toggle (requestPermission needs a user gesture on iOS 13+), and
 * clamped hard so a shaky hand never reads as a broken layout rather than premium.
 */
export function useTiltHighlight(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    function handle(e: DeviceOrientationEvent) {
      const gamma = Math.max(-CLAMP_DEG, Math.min(CLAMP_DEG, e.gamma ?? 0))
      document.documentElement.style.setProperty('--tilt-angle', `${145 + gamma}deg`)
    }

    window.addEventListener('deviceorientation', handle)
    return () => {
      window.removeEventListener('deviceorientation', handle)
      document.documentElement.style.removeProperty('--tilt-angle')
    }
  }, [enabled])
}
