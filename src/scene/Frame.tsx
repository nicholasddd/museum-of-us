import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DESIGNS, type DesignId } from '../data/catalog'
import { frameSize, type Rotation } from '../data/layout'
import { useMuseum, type PlacedFrame, type Photo } from '../store'
import { paintedTexture } from '../paint/textures'

const LIP = 1.6 // how far the photo runs under the frame, mm
const PHOTO_Z = 0.4
const wallPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const hit = new THREE.Vector3()

function useFrameGeometry(design: DesignId) {
  const gltf = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}models/${design}.glb`)
  return useMemo(() => {
    const g = (gltf.scene.children[0] as THREE.Mesh).geometry
    if (!g.attributes.normal) g.computeVertexNormals()
    return g
  }, [gltf])
}

function useMask(design: DesignId, rot: Rotation) {
  const base = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}masks/${design}.png`)
  return useMemo(() => {
    const t = base.clone()
    t.center.set(0.5, 0.5)
    t.rotation = rot === 90 ? -Math.PI / 2 : 0
    t.needsUpdate = true
    return t
  }, [base, rot])
}

function usePhotoTexture(url?: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) return setTex(null)
    let alive = true
    new THREE.TextureLoader().load(url, (t) => {
      if (!alive) return
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      setTex(t)
    })
    return () => { alive = false }
  }, [url])
  return tex
}

// Fit the photo so it covers the frame opening ("cover"), then apply zoom and pan.
function fitPhoto(tex: THREE.Texture, design: DesignId, rot: Rotation, photo: Pick<Photo, 'aspect' | 'zoom' | 'ox' | 'oy'>) {
  const { w: W, h: H } = frameSize(design, rot)
  let o = DESIGNS[design].opening
  if (rot === 90) o = { x0: o.y0, x1: o.y1, y0: -o.x1, y1: -o.x0 }
  const ow = o.x1 - o.x0 + 2 * LIP
  const oh = o.y1 - o.y0 + 2 * LIP
  let pw = photo.aspect > ow / oh ? oh * photo.aspect : ow
  let ph = pw / photo.aspect
  pw *= photo.zoom
  ph *= photo.zoom
  const rx0 = (o.x0 + o.x1) / 2 - pw / 2 + (photo.ox * (pw - ow)) / 2
  const ry0 = (o.y0 + o.y1) / 2 - ph / 2 + (photo.oy * (ph - oh)) / 2
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(W / pw, H / ph)
  tex.offset.set((-W / 2 - rx0) / pw, (-H / 2 - ry0) / ph)
  tex.needsUpdate = true
}

const easeOutBack =(t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)

export function Frame({ frame, material }: { frame: PlacedFrame; material: THREE.Material }) {
  const { uid, design, rot, photo } = frame
  const geometry = useFrameGeometry(design)
  const mask = useMask(design, rot)
  const photoTex = usePhotoTexture(photo?.url)
  const selected = useMuseum((s) => s.selected === uid)
  const editable = useMuseum((s) => s.tab === 'Frames')
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null
  const { w, h } = frameSize(design, rot)

  const group = useRef<THREE.Group>(null!)
  const lift = useRef<THREE.Group>(null!)
  const photoMat = useRef<THREE.MeshStandardMaterial>(null!)
  const drag = useRef<{ dx: number; dy: number; moved: number; sx: number; sy: number } | null>(null)

  const placeholder = useMemo(() => paintedTexture('placeholder').clone(), [])
  const shown = photoTex ?? placeholder
  useLayoutEffect(() => {
    fitPhoto(shown, design, rot, photo && photoTex ? photo : { aspect: 1, zoom: 1, ox: 0, oy: 0 })
  }, [shown, design, rot, photo, photoTex])

  // Fade a new photo in.
  const photoBorn = useRef(0)
  useEffect(() => { photoBorn.current = performance.now() }, [photoTex])

  useFrame((_, dt) => {
    const g = group.current
    const k = 1 - Math.exp(-dt * (drag.current ? 30 : 10))
    g.position.x += (frame.x - g.position.x) * k
    g.position.y += (frame.y - g.position.y) * k
    // Arrival: drop onto the wall with a little overshoot.
    const t = Math.min(1, Math.max(0, (performance.now() - frame.bornAt) / 700))
    const s = 0.55 + 0.45 * easeOutBack(t)
    g.scale.setScalar(t === 0 ? 0.0001 : s)
    const targetLift = (selected ? 3 : 0) + (1 - t) * 30
    lift.current.position.z += (targetLift - lift.current.position.z) * (1 - Math.exp(-dt * 12))
    const pt = Math.min(1, (performance.now() - photoBorn.current) / 600)
    photoMat.current.color.setScalar(0.35 + 0.65 * pt)
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!e.ray.intersectPlane(wallPlane, hit)) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = { dx: frame.x - hit.x, dy: frame.y - hit.y, moved: 0, sx: hit.x, sy: hit.y }
    if (controls) controls.enabled = false
    useMuseum.getState().select(uid)
    useMuseum.getState().setDragging(true)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d || !e.ray.intersectPlane(wallPlane, hit)) return
    d.moved = Math.max(d.moved, Math.hypot(hit.x - d.sx, hit.y - d.sy))
    if (d.moved > 0.8) useMuseum.getState().moveFrame(uid, hit.x + d.dx, hit.y + d.dy)
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    drag.current = null
    if (controls) controls.enabled = true
    useMuseum.getState().setDragging(false)
  }

  return (
    <group ref={group} position={[frame.x, frame.y, 0]}>
      <group ref={lift} {...(editable && {
        onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
        onClick: (e: ThreeEvent<MouseEvent>) => e.stopPropagation(),
        onPointerOver: () => (document.body.style.cursor = 'grab'),
        onPointerOut: () => (document.body.style.cursor = ''),
      })}>
        <mesh position={[0, 0, PHOTO_Z]} receiveShadow>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial ref={photoMat} map={shown} alphaMap={mask} alphaTest={0.5} roughness={0.55} />
        </mesh>
        <mesh geometry={geometry} material={material} rotation={[0, 0, rot === 90 ? -Math.PI / 2 : 0]} castShadow receiveShadow />
      </group>
    </group>
  )
}
