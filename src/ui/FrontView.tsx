import { viewRequest } from '../scene/view'

export function FrontView() {
  return (
    <button className="front-view" onClick={() => viewRequest.front++} title="Face the museum straight on">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect x="4" y="5" width="16" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="8" y="8.5" width="8" height="6" fill="currentColor" opacity="0.35" />
      </svg>
      <span>Front view</span>
    </button>
  )
}
