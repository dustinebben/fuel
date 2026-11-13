// Placeholder cards in roughly the shape of the Home screen, so the first paint after
// sign-in already looks like the app instead of a bare "Loading…". Only opacity pulses.
export function LoadingSkeleton() {
  const pulse = 'glass animate-pulse'
  return (
    <div
      className="mx-auto max-w-lg space-y-3 px-4"
      style={{ paddingTop: 'calc(4.5rem + env(safe-area-inset-top))' }}
      role="status"
      aria-label="Loading"
    >
      <div className={`${pulse} h-28`} />
      <div className="grid grid-cols-2 gap-3">
        <div className={`${pulse} h-24`} />
        <div className={`${pulse} h-24`} />
      </div>
      <div className={`${pulse} h-20`} />
      <div className={`${pulse} h-44`} />
    </div>
  )
}
