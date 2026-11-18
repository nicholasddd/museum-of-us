import { Component, Suspense, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { Diorama } from './scene/Diorama'
import { Dock } from './ui/Dock'
import { LightSwitch } from './ui/LightSwitch'
import { FrontView } from './ui/FrontView'
import { lastDragEnd, readPhoto, useMuseum } from './store'

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <div className="scene-error">The museum couldn’t be drawn on this device. Try reloading the page.</div>
      : this.props.children
  }
}

function Loader() {
  const { active, progress } = useProgress()
  return (
    <div className={`loader ${active ? '' : 'done'}`}>
      <span>Hanging the frames…</span>
      <i style={{ width: `${progress}%` }} />
    </div>
  )
}

// Dropped photos go into the selected frame first, then into empty frames in order.
async function placeDroppedPhotos(files: File[]) {
  const s = useMuseum.getState()
  const targets = [
    ...s.frames.filter((f) => f.uid === s.selected),
    ...s.frames.filter((f) => f.uid !== s.selected && !f.photo),
  ]
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (!images.length) return
  if (!targets.length) return s.notify('Every frame is full — select one to replace its photo.')
  for (let i = 0; i < Math.min(images.length, targets.length); i++) {
    s.setPhoto(targets[i].uid, await readPhoto(images[i]))
  }
}

export default function App() {
  const toast = useMuseum((s) => s.toast)
  const lights = useMuseum((s) => s.lights)
  const [over, setOver] = useState(false)
  return (
    <div className={`app ${lights ? 'night' : 'day'}`}>
      <main
        className={`stage ${over ? 'drop' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); placeDroppedPhotos([...e.dataTransfer.files]) }}
      >
        <header className="brand">
          <h1>Museum <em>of</em> Us</h1>
          <p>Your story, hung on the wall.</p>
        </header>
        <div className="stage-tools">
          <FrontView />
          <LightSwitch />
        </div>
        <SceneBoundary>
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ fov: 32, near: 5, far: 12000, position: [-380, 174, 1500] }}
          gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
          onPointerMissed={() => { if (performance.now() - lastDragEnd > 250) useMuseum.getState().select(null) }}
        >
          <Suspense fallback={null}>
            <Diorama />
          </Suspense>
        </Canvas>
        </SceneBoundary>
        {toast && <div className="toast" role="status">{toast}</div>}
        <Loader />
      </main>
      <Dock />
    </div>
  )
}
