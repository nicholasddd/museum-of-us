import { useState } from 'react'
import { CASES, DESIGNS, DESIGN_ORDER, FIGURINES, FINISHES, FLOORS, MAX_FIGURINES, VIBES, WALLS } from '../data/catalog'
import { wallUsed } from '../data/layout'
import { TABS, useMuseum } from '../store'
import { swatch } from '../paint/textures'
import { Inspector } from './Inspector'
import { FigurineIcon } from './FigurineIcon'

function Head({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="tray-head">
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  )
}

function FramesTab() {
  const frames = useMuseum((s) => s.frames)
  const addFrame = useMuseum((s) => s.addFrame)
  const resetLayout = useMuseum((s) => s.resetLayout)
  const used = wallUsed(frames)
  // The card that just didn't fit gives a little shake; nothing is ever greyed out.
  const [nope, setNope] = useState<{ id: string; n: number } | null>(null)
  return (
    <>
      <Head title="Frames" hint="Tap a frame to hang it, drag it on the wall, then tap it to add a photo.">
        <span className="count" title="Wall taken up by frames and the space around them">
          {frames.length} {frames.length === 1 ? 'frame' : 'frames'}
          <i className="meter"><b style={{ width: `${used * 100}%` }} /></i>
        </span>
        <button className="link" onClick={resetLayout}>Restore original</button>
      </Head>
      <div className="tray">
        {DESIGN_ORDER.map((id) => {
          const d = DESIGNS[id]
          const n = frames.filter((f) => f.design === id).length
          return (
            <button key={nope?.id === id ? `${id}-${nope.n}` : id} className={`card ${nope?.id === id ? 'nope' : ''}`}
              onClick={() => { if (!addFrame(id)) setNope({ id, n: (nope?.n ?? 0) + 1 }) }}>
              <img src={`${import.meta.env.BASE_URL}thumbs/${id}.png`} alt="" />
              <span className="name">{d.label}</span>
              <span className="dims">{Math.round(d.width)} × {Math.round(d.height)} mm</span>
              {n > 0 && <span className="badge">{n}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

function SwatchTab({ kind }: { kind: 'wall' | 'floor' }) {
  const value = useMuseum((s) => s[kind])
  const set = useMuseum((s) => s.set)
  const items = kind === 'wall' ? WALLS : FLOORS
  return (
    <>
      <Head title={kind === 'wall' ? 'Wallpaper' : 'Flooring'} />
      <div className="tray">
        {items.map((it) => (
          <button key={it.id} className={`swatch ${value === it.id ? 'on' : ''}`} onClick={() => set({ [kind]: it.id })}>
            <span className="chip" style={{ backgroundImage: `url(${swatch(`${kind}:${it.id}`)})` }} />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function VibeTab() {
  const vibe = useMuseum((s) => s.vibe)
  const set = useMuseum((s) => s.set)
  return (
    <>
      <Head title="Light colour" hint="The colour of the three little lights in the museum ceiling." />
      <div className="tray">
        {VIBES.map((v) => (
          <button key={v.id} className={`vibe ${vibe === v.id ? 'on' : ''}`} onClick={() => set({ vibe: v.id, lights: true })}>
            <span className="vibe-chip" style={{ background: `radial-gradient(circle at 50% 20%, #fff 0%, ${v.color} 30%, #2a2018 95%)` }} />
            <span className="vibe-text"><strong>{v.label}</strong><em>{v.blurb}</em></span>
          </button>
        ))}
      </div>
    </>
  )
}

function FinishTab() {
  const finish = useMuseum((s) => s.finish)
  const caseFinish = useMuseum((s) => s.caseFinish)
  const set = useMuseum((s) => s.set)
  return (
    <div className="finish-rows">
      <div>
        <Head title="Frame colour" hint="All frames share one finish." />
        <div className="tray">
          {FINISHES.map((f) => (
            <button key={f.id} className={`dot ${finish === f.id ? 'on' : ''}`} onClick={() => set({ finish: f.id })}>
              <span style={{ background: f.metalness > 0.5 ? `linear-gradient(135deg, #fff8 0%, ${f.color} 35%, ${f.color} 65%, #0004 100%)` : f.color }} />
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Head title="Box colour" />
        <div className="tray">
          {CASES.map((f) => (
            <button key={f.id} className={`dot ${caseFinish === f.id ? 'on' : ''}`} onClick={() => set({ caseFinish: f.id })}>
              <span style={{ background: f.color }} />
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FigurinesTab() {
  const figurines = useMuseum((s) => s.figurines)
  const add = useMuseum((s) => s.addFigurine)
  const full = figurines.length >= MAX_FIGURINES
  return (
    <>
      <Head title="Figurines" hint="Little people and furniture for the museum floor. Drag them around once placed.">
        <span className="count">{figurines.length} / {MAX_FIGURINES}</span>
      </Head>
      <div className="tray">
        {FIGURINES.map((f, i) => {
          const n = figurines.filter((q) => q.kind === f.id).length
          return (
            <button key={f.id} className={`card fig ${i > 0 && FIGURINES[i - 1].group !== f.group ? 'gap' : ''}`} disabled={full} onClick={() => add(f.id)}>
              <FigurineIcon kind={f.id} />
              <span className="name">{f.label}</span>
              <span className="dims">{f.group}</span>
              {n > 0 && <span className="badge">{n}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function Dock() {
  const tab = useMuseum((s) => s.tab)
  const setTab = useMuseum((s) => s.setTab)
  const selected = useMuseum((s) => s.selected)
  return (
    <section className="dock">
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={!selected && tab === t} className={!selected && tab === t ? 'on' : ''}
            onClick={() => setTab(t)}>{t}</button>
        ))}
        <button className="print" disabled title="Coming soon">Print my museum <small>soon</small></button>
      </nav>
      <div className="dock-body">
        {selected ? <Inspector /> : (
          <div className="tab-body" key={tab}>
            {tab === 'Frames' && <FramesTab />}
            {tab === 'Wall' && <SwatchTab kind="wall" />}
            {tab === 'Floor' && <SwatchTab kind="floor" />}
            {tab === 'Vibe' && <VibeTab />}
            {tab === 'Finish' && <FinishTab />}
            {tab === 'Figurines' && <FigurinesTab />}
          </div>
        )}
      </div>
    </section>
  )
}
