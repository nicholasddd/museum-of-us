import { useMuseum } from '../store'

export function LightSwitch() {
  const on = useMuseum((s) => s.lights)
  const set = useMuseum((s) => s.set)
  return (
    <button className={`light-switch ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set({ lights: !on })}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"
          fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span>Lights {on ? 'on' : 'off'}</span>
      <i aria-hidden="true" />
    </button>
  )
}
