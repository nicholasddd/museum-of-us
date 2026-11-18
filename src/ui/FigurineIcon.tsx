import type { FigurineId } from '../data/catalog'

// Small drawn icons for the figurine cards.
export function FigurineIcon({ kind }: { kind: FigurineId }) {
  const ink = 'currentColor'
  const body = (() => {
    switch (kind) {
      case 'gent': return <><circle cx="24" cy="10" r="5" fill="#e8c29f" /><path d="M17 8a7 6 0 0 1 14 0z" fill="#3a2a20" /><rect x="17" y="16" width="14" height="16" rx="6" fill="#3e4f6b" /><rect x="18.5" y="30" width="4" height="14" rx="2" fill="#5b4a3d" /><rect x="25.5" y="30" width="4" height="14" rx="2" fill="#5b4a3d" /></>
      case 'lady': return <><circle cx="24" cy="10" r="5" fill="#e8c29f" /><path d="M18.5 9a5.5 5.5 0 0 1 11 0z" fill="#5a3524" /><circle cx="24" cy="4" r="2.6" fill="#5a3524" /><path d="M20 16h8l6 26H14z" fill="#b9645a" /><rect x="20" y="41" width="3" height="4" fill="#e8c29f" /><rect x="25" y="41" width="3" height="4" fill="#e8c29f" /></>
      case 'child': return <><circle cx="24" cy="20" r="4" fill="#e8c29f" /><path d="M19.5 19a4.5 4.5 0 0 1 9 0z" fill="#7a4a2a" /><rect x="19" y="25" width="10" height="11" rx="4" fill="#e2b443" /><rect x="20" y="35" width="3" height="9" rx="1.5" fill="#3e5a74" /><rect x="25" y="35" width="3" height="9" rx="1.5" fill="#3e5a74" /></>
      case 'dog': return <><rect x="10" y="26" width="22" height="9" rx="4.5" fill="#c49a6c" /><circle cx="35" cy="23" r="5" fill="#c49a6c" /><ellipse cx="33" cy="19" rx="2" ry="3" fill="#7a5638" /><circle cx="39.5" cy="24" r="1.2" fill="#2a211c" /><path d="M10 29l-4-6" stroke="#c49a6c" strokeWidth="2.4" strokeLinecap="round" />{[12, 16, 26, 30].map((x) => <rect key={x} x={x} y="33" width="2.6" height="10" rx="1.2" fill="#c49a6c" />)}</>
      case 'bench': return <><rect x="4" y="24" width="40" height="7" rx="2" fill="#7a2f35" /><rect x="7" y="31" width="4" height="12" fill="#3b2a20" /><rect x="37" y="31" width="4" height="12" fill="#3b2a20" /></>
      case 'plant': return <><path d="M16 30h16l-2 14H18z" fill="#c0714b" />{[-40, -15, 10, 35, 0].map((a, i) => <ellipse key={i} cx="24" cy="18" rx="3.2" ry="11" fill={i % 2 ? '#5e7f4f' : '#7b9a62'} transform={`rotate(${a} 24 30)`} />)}</>
      case 'rope': return <><path d="M9 14q15 14 30 0" stroke="#8c1d2c" strokeWidth="3" fill="none" />{[9, 39].map((x) => <g key={x}><circle cx={x} cy="11" r="2.8" fill="#c9a15a" /><rect x={x - 1.2} y="11" width="2.4" height="30" fill="#c9a15a" /><rect x={x - 5} y="41" width="10" height="3" rx="1" fill="#c9a15a" /></g>)}</>
      case 'pedestal': return <><path d="M24 4c-6 0-7 6-5 9s-1 4 0 5h10c1-1-2-2 0-5s1-9-5-9z" fill="#2f5f73" /><rect x="15" y="18" width="18" height="3" fill="#efe7da" stroke={ink} strokeOpacity=".15" /><rect x="17" y="21" width="14" height="23" fill="#efe7da" stroke={ink} strokeOpacity=".15" /></>
    }
  })()
  return <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">{body}</svg>
}
