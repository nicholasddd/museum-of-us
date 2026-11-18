import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { FIGURINES, WALL_H, type FigurineId } from '../data/catalog'
import { useMuseum, type PlacedFigurine } from '../store'

// Little hand-made minis, built from simple shapes and sized for the 150 mm tall museum.
const FLOOR_Y = -WALL_H / 2
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), WALL_H / 2)
const hit = new THREE.Vector3()

const mats = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: string, roughness = 0.65, metalness = 0) {
  const key = `${color}|${roughness}|${metalness}`
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }))
  return mats.get(key)!
}

type V3 = [number, number, number]
function Part({ color, position, rotation, scale, children, rough, metal }: {
  color: string; position?: V3; rotation?: V3; scale?: V3 | number; children: ReactNode; rough?: number; metal?: number
}) {
  return <mesh material={mat(color, rough, metal)} position={position} rotation={rotation} scale={scale} castShadow receiveShadow>{children}</mesh>
}

const SKIN = '#e8c29f'

function Person({ coat, trousers, hair, scale = 1, dress = false, bun = false }: {
  coat: string; trousers: string; hair: string; scale?: number; dress?: boolean; bun?: boolean
}) {
  return (
    <group scale={scale}>
      {dress ? (
        <>
          {[-1.8, 1.8].map((x) => <Part key={x} color={trousers} position={[x, 2.6, 0]}><capsuleGeometry args={[1.3, 3, 4, 8]} /></Part>)}
          <Part color={coat} position={[0, 15, 0]}><cylinderGeometry args={[3.6, 7.6, 22, 20]} /></Part>
          <Part color={coat} position={[0, 28.5, 0]}><capsuleGeometry args={[3.9, 5, 6, 14]} /></Part>
        </>
      ) : (
        <>
          {[-2.2, 2.2].map((x) => <Part key={x} color={trousers} position={[x, 9.5, 0]}><capsuleGeometry args={[1.9, 15, 4, 8]} /></Part>)}
          {[-2.2, 2.2].map((x) => <Part key={`s${x}`} color="#2a211c" position={[x, 0.9, 1]}><boxGeometry args={[3.2, 1.8, 5]} /></Part>)}
          <Part color={coat} position={[0, 25.5, 0]}><capsuleGeometry args={[4.9, 10, 6, 14]} /></Part>
        </>
      )}
      {[-1, 1].map((s) => (
        <Part key={`a${s}`} color={coat} position={[s * (dress ? 5.2 : 6.2), dress ? 25 : 25.5, 0]} rotation={[0, 0, s * 0.14]}>
          <capsuleGeometry args={[1.4, dress ? 10 : 12, 4, 8]} />
        </Part>
      ))}
      <Part color={SKIN} position={[0, dress ? 37.6 : 40.4, 0]}><sphereGeometry args={[4.2, 18, 14]} /></Part>
      <Part color={hair} position={[0, dress ? 38.2 : 41, -0.4]} rotation={[-0.35, 0, 0]}>
        <sphereGeometry args={[4.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
      </Part>
      {bun && <Part color={hair} position={[0, 41, -3.6]}><sphereGeometry args={[2.3, 12, 10]} /></Part>}
      {!dress && <Part color="#b8473a" position={[0, 36, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.2, 1.1, 8, 18]} /></Part>}
    </group>
  )
}

function Dog() {
  const fur = '#c49a6c'
  return (
    <group>
      <Part color={fur} position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[3.2, 8, 6, 12]} /></Part>
      {[[-4, -1.8], [-4, 1.8], [4, -1.8], [4, 1.8]].map(([x, z]) => (
        <Part key={`${x}${z}`} color={fur} position={[x, 3, z]}><cylinderGeometry args={[1, 1, 6, 8]} /></Part>
      ))}
      <Part color={fur} position={[8.2, 12, 0]}><sphereGeometry args={[3.1, 14, 12]} /></Part>
      <Part color="#a77d55" position={[11, 11.2, 0]}><sphereGeometry args={[1.6, 10, 8]} /></Part>
      <Part color="#2a211c" position={[12.4, 11.5, 0]}><sphereGeometry args={[0.6, 8, 6]} /></Part>
      {[-1.8, 1.8].map((z) => <Part key={z} color="#7a5638" position={[7.4, 14.6, z]} rotation={[z * 0.2, 0, 0.3]}><sphereGeometry args={[1.2, 8, 6]} /></Part>)}
      <Part color={fur} position={[-8.6, 11.5, 0]} rotation={[0, 0, 0.7]}><capsuleGeometry args={[0.8, 5, 4, 6]} /></Part>
    </group>
  )
}

function Bench() {
  return (
    <group>
      <Part color="#7a2f35" rough={0.9} position={[0, 10.5, 0]}><boxGeometry args={[46, 4, 11]} /></Part>
      <Part color="#3b2a20" position={[0, 8, 0]}><boxGeometry args={[44, 1.4, 10]} /></Part>
      {[-19, 19].map((x) => <Part key={x} color="#3b2a20" position={[x, 3.7, 0]}><boxGeometry args={[2.6, 7.4, 9]} /></Part>)}
    </group>
  )
}

function Plant() {
  const leaves = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * Math.PI * 2, t: 0.3 + (i % 3) * 0.2, l: 9 + (i % 4) * 2 })), [])
  return (
    <group>
      <Part color="#c0714b" rough={0.85} position={[0, 4.5, 0]}><cylinderGeometry args={[5.2, 4, 9, 18]} /></Part>
      {leaves.map((l, i) => (
        <group key={i} position={[0, 8.5, 0]} rotation={[0, l.a, 0]}>
          <group rotation={[0, 0, l.t]}>
            <Part color={i % 2 ? '#5e7f4f' : '#7b9a62'} position={[0, l.l / 2, 0]} scale={[2.2, l.l / 2, 0.6]}><sphereGeometry args={[1, 8, 6]} /></Part>
          </group>
        </group>
      ))}
    </group>
  )
}

function Rope() {
  const rope = useMemo(() => new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(-25, 19, 0), new THREE.Vector3(0, 9, 0), new THREE.Vector3(25, 19, 0)), 24, 0.9, 8),
  [])
  return (
    <group>
      {[-26, 26].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Part color="#c9a15a" metal={0.8} rough={0.35} position={[0, 0.7, 0]}><cylinderGeometry args={[3.6, 4, 1.4, 18]} /></Part>
          <Part color="#c9a15a" metal={0.8} rough={0.35} position={[0, 11, 0]}><cylinderGeometry args={[0.9, 0.9, 21, 10]} /></Part>
          <Part color="#c9a15a" metal={0.8} rough={0.35} position={[0, 21.8, 0]}><sphereGeometry args={[1.8, 12, 10]} /></Part>
        </group>
      ))}
      <mesh geometry={rope} material={mat('#8c1d2c', 0.9)} castShadow />
    </group>
  )
}

function Pedestal() {
  const vase = useMemo(() => new THREE.LatheGeometry(
    [[0, 0], [2.4, 0.2], [4, 3], [4.2, 6], [2.2, 9.5], [1.7, 11.5], [2.4, 12.6]].map(([x, y]) => new THREE.Vector2(x, y)), 24),
  [])
  return (
    <group>
      <Part color="#efe7da" rough={0.45} position={[0, 12, 0]}><boxGeometry args={[12, 24, 12]} /></Part>
      <Part color="#efe7da" rough={0.45} position={[0, 24.8, 0]}><boxGeometry args={[14, 1.6, 14]} /></Part>
      <mesh geometry={vase} material={mat('#2f5f73', 0.35)} position={[0, 25.6, 0]} castShadow />
    </group>
  )
}

function Model({ kind }: { kind: FigurineId }) {
  switch (kind) {
    case 'gent': return <Person coat="#3e4f6b" trousers="#5b4a3d" hair="#3a2a20" />
    case 'lady': return <Person coat="#b9645a" trousers={SKIN} hair="#5a3524" dress bun />
    case 'child': return <Person coat="#e2b443" trousers="#3e5a74" hair="#7a4a2a" scale={0.64} />
    case 'dog': return <Dog />
    case 'bench': return <Bench />
    case 'plant': return <Plant />
    case 'rope': return <Rope />
    case 'pedestal': return <Pedestal />
  }
}

const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)

export function Figurine({ fig }: { fig: PlacedFigurine }) {
  const def = FIGURINES.find((f) => f.id === fig.kind)!
  const selected = useMuseum((s) => s.selected === fig.uid)
  const editable = useMuseum((s) => s.tab === 'Figurines')
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null
  const group = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const drag = useRef<{ dx: number; dz: number } | null>(null)

  useFrame((_, dt) => {
    const g = group.current
    const k = 1 - Math.exp(-dt * (drag.current ? 30 : 10))
    g.position.x += (fig.x - g.position.x) * k
    g.position.z += (fig.z - g.position.z) * k
    const turn = (fig.turn * Math.PI) / 4
    body.current.rotation.y += (turn - body.current.rotation.y) * (1 - Math.exp(-dt * 10))
    const t = Math.min(1, Math.max(0, (performance.now() - fig.bornAt) / 650))
    body.current.position.y = (1 - easeOutBack(t)) * 40 + (selected ? 1.5 : 0)
    body.current.scale.setScalar(t === 0 ? 0.0001 : 1)
    ring.current.visible = selected
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!e.ray.intersectPlane(floorPlane, hit)) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = { dx: fig.x - hit.x, dz: fig.z - hit.z }
    if (controls) controls.enabled = false
    useMuseum.getState().select(fig.uid)
    useMuseum.getState().setDragging(true)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d || !e.ray.intersectPlane(floorPlane, hit)) return
    useMuseum.getState().moveFigurine(fig.uid, hit.x + d.dx, hit.z + d.dz)
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    drag.current = null
    if (controls) controls.enabled = true
    useMuseum.getState().setDragging(false)
  }

  return (
    <group ref={group} position={[fig.x, FLOOR_Y, fig.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} raycast={() => null}>
        <ringGeometry args={[Math.max(def.w, def.d) / 2 + 1.5, Math.max(def.w, def.d) / 2 + 3, 40]} />
        <meshBasicMaterial color="#e8c070" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <group ref={body} {...(editable && {
        onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
        onClick: (e: ThreeEvent<MouseEvent>) => e.stopPropagation(),
        onPointerOver: () => (document.body.style.cursor = 'grab'),
        onPointerOut: () => (document.body.style.cursor = ''),
      })}>
        <Model kind={fig.kind} />
      </group>
    </group>
  )
}
