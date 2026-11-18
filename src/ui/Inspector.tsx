import { useRef } from 'react'
import { DESIGNS, FIGURINES } from '../data/catalog'
import { readPhoto, useMuseum, type PlacedFigurine, type PlacedFrame } from '../store'
import { FigurineIcon } from './FigurineIcon'

function FrameInspector({ frame }: { frame: PlacedFrame }) {
  const { setPhoto, updatePhoto, rotateFrame, removeFrame, select, notify } = useMuseum.getState()
  const input = useRef<HTMLInputElement>(null)
  const d = DESIGNS[frame.design]
  const p = frame.photo

  const onFile = async (file?: File) => {
    if (!file) return
    try {
      setPhoto(frame.uid, await readPhoto(file))
    } catch {
      notify('That file couldn’t be opened as a photo.')
    }
  }

  return (
    <div className="inspector" key={frame.uid}>
      <div className="insp-head">
        <img src={`${import.meta.env.BASE_URL}thumbs/${frame.design}.png`} alt="" />
        <div>
          <strong>{d.label}</strong>
          <span>{Math.round(d.width)} × {Math.round(d.height)} mm</span>
        </div>
        <button className="done" onClick={() => select(null)}>Done</button>
      </div>

      <div className="insp-main">
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        <button className="primary" onClick={() => input.current?.click()}>{p ? 'Replace photo' : 'Add a photo'}</button>
        {p && (
          <div className="sliders">
            <label>Zoom<input type="range" min={1} max={3} step={0.01} value={p.zoom} onChange={(e) => updatePhoto(frame.uid, { zoom: +e.target.value })} /></label>
            <label>Left / right<input type="range" min={-1} max={1} step={0.01} value={-p.ox} onChange={(e) => updatePhoto(frame.uid, { ox: -e.target.value })} /></label>
            <label>Up / down<input type="range" min={-1} max={1} step={0.01} value={-p.oy} onChange={(e) => updatePhoto(frame.uid, { oy: -e.target.value })} /></label>
          </div>
        )}
      </div>

      <div className="insp-actions">
        {d.canRotate && <button onClick={() => rotateFrame(frame.uid)}>Turn 90°</button>}
        {p && <button onClick={() => setPhoto(frame.uid, undefined)}>Remove photo</button>}
        <button className="danger" onClick={() => removeFrame(frame.uid)}>Take down</button>
      </div>
    </div>
  )
}

function FigurineInspector({ fig }: { fig: PlacedFigurine }) {
  const { turnFigurine, removeFigurine, select } = useMuseum.getState()
  const def = FIGURINES.find((f) => f.id === fig.kind)!
  return (
    <div className="inspector" key={fig.uid}>
      <div className="insp-head">
        <FigurineIcon kind={fig.kind} />
        <div>
          <strong>{def.label}</strong>
          <span>Drag it along the museum floor</span>
        </div>
        <button className="done" onClick={() => select(null)}>Done</button>
      </div>
      <div className="insp-actions">
        <button onClick={() => turnFigurine(fig.uid)}>Turn</button>
        <button className="danger" onClick={() => removeFigurine(fig.uid)}>Remove</button>
      </div>
    </div>
  )
}

export function Inspector() {
  const frame = useMuseum((s) => s.frames.find((f) => f.uid === s.selected))
  const fig = useMuseum((s) => s.figurines.find((f) => f.uid === s.selected))
  if (frame) return <FrameInspector frame={frame} />
  if (fig) return <FigurineInspector fig={fig} />
  return null
}
