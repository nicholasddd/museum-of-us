import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { paintedTexture } from '../paint/textures'
import { lightLevel } from './lightLevel'

// The room the museum lives in, at real size in mm: it sits on a sideboard
// against the wall, with a tall window to its right.
export const TOP = -85.3 // sideboard top, where the museum stands
const FLOOR = -645
const WALL_Z = -190

function useTex(key: Parameters<typeof paintedTexture>[0], rx = 1, ry = 1) {
  return useMemo(() => {
    const t = paintedTexture(key).clone()
    t.repeat.set(rx, ry)
    t.needsUpdate = true
    return t
  }, [key, rx, ry])
}

const mats = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: string, roughness = 0.7, metalness = 0) {
  const key = `${color}|${roughness}|${metalness}`
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }))
  return mats.get(key)!
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

function Walls() {
  const wall = useTex('room:wall', 9, 4.5)
  const floor = useTex('room:floor', 8, 4)
  const rug = useTex('room:rug')
  return (
    <group>
      <mesh position={[0, FLOOR + 2500, WALL_Z]} receiveShadow>
        <planeGeometry args={[10000, 5000]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, FLOOR + 55, WALL_Z + 10]} material={mat('#efe6d6', 0.6)} receiveShadow>
        <boxGeometry args={[10000, 110, 20]} />
      </mesh>
      <mesh position={[0, FLOOR, 2000]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10000, 5000]} />
        <meshStandardMaterial map={floor} roughness={0.75} />
      </mesh>
      <mesh position={[60, FLOOR + 1, 640]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 1250]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
    </group>
  )
}

function Window() {
  const day = useTex('room:skyday')
  const night = useTex('room:skynight')
  const nightMat = useRef<THREE.MeshBasicMaterial>(null!)
  const curtain = useTex('room:curtain')
  const W = 440, H = 1150, X = 650, Y = 330
  const curtainGeo = useMemo(() => {
    // Gentle folds, wider at the floor.
    const g = new THREE.PlaneGeometry(230, 1420, 40, 8)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i)
      const flare = 1 + (0.5 - y / 1420) * 0.25
      p.setX(i, x * flare)
      p.setZ(i, Math.sin(x * 0.085) * 16 * flare)
    }
    g.computeVertexNormals()
    return g
  }, [])
  useFrame(() => { nightMat.current.opacity = lightLevel.k })
  const frame = mat('#f3ece0', 0.55)
  return (
    <group position={[X, Y, WALL_Z]}>
      <mesh position={[0, 0, 1]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={day} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 2]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial ref={nightMat} map={night} transparent toneMapped={false} />
      </mesh>
      {[[0, H / 2, W + 60, 30], [0, -H / 2, W + 60, 30], [0, H * 0.12, W, 18]].map(([x, y, w, h], i) => (
        <mesh key={`h${i}`} material={frame} position={[x, y, 18]} castShadow receiveShadow><boxGeometry args={[w, h, 36]} /></mesh>
      ))}
      {[[-W / 2, 30], [W / 2, 30], [0, 16]].map(([x, w], i) => (
        <mesh key={`v${i}`} material={frame} position={[x, 0, 18]} castShadow receiveShadow><boxGeometry args={[w, H, 36]} /></mesh>
      ))}
      <mesh material={frame} position={[0, -H / 2 - 22, 40]} castShadow receiveShadow><boxGeometry args={[W + 120, 18, 80]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={curtainGeo} position={[s * (W / 2 + 110), -80, 70]} castShadow receiveShadow>
          <meshStandardMaterial map={curtain} roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh material={mat('#b08a55', 0.4, 0.7)} position={[0, H / 2 + 120, 80]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[8, 8, W + 600, 12]} />
      </mesh>
    </group>
  )
}

function Art() {
  const art = useTex('room:art')
  return (
    <group position={[-560, 420, WALL_Z]}>
      <mesh material={mat('#4a3426', 0.55)} position={[0, 0, 14]} castShadow receiveShadow><boxGeometry args={[400, 490, 28]} /></mesh>
      <mesh position={[0, 0, 29]} receiveShadow>
        <planeGeometry args={[340, 430]} />
        <meshStandardMaterial map={art} roughness={0.9} />
      </mesh>
    </group>
  )
}

function Sideboard() {
  const wood = useTex('room:wood')
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62 }), [wood])
  const brass = mat('#c9a15a', 0.35, 0.8)
  return (
    <group>
      <mesh material={m} position={[0, TOP - 12, 30]} castShadow receiveShadow><boxGeometry args={[1300, 24, 440]} /></mesh>
      <mesh material={m} position={[0, -335.3, 25]} castShadow receiveShadow><boxGeometry args={[1260, 450, 410]} /></mesh>
      {[-465, -155, 155, 465].map((x) => (
        <group key={x}>
          <mesh material={m} position={[x, -340, 236]} castShadow receiveShadow><boxGeometry args={[298, 390, 12]} /></mesh>
          <mesh material={brass} position={[x, -205, 248]} castShadow><sphereGeometry args={[10, 16, 12]} /></mesh>
        </group>
      ))}
      {[[-590, -150], [590, -150], [-590, 200], [590, 200]].map(([x, z]) => (
        <mesh key={`${x}${z}`} material={mat('#3e2a1c', 0.6)} position={[x, -602.8, z]} castShadow><cylinderGeometry args={[12, 9, 85, 12]} /></mesh>
      ))}
    </group>
  )
}

function Lamp() {
  const shade = useRef<THREE.MeshStandardMaterial>(null!)
  const bulb = useRef<THREE.PointLight>(null!)
  useFrame(() => {
    shade.current.emissiveIntensity = 0.9 * lightLevel.k
    bulb.current.intensity = 0.3 * lightLevel.k
  })
  return (
    <group position={[-480, TOP, -40]}>
      <mesh material={mat('#c9a15a', 0.35, 0.8)} position={[0, 10, 0]} castShadow><cylinderGeometry args={[55, 62, 20, 32]} /></mesh>
      <mesh material={mat('#c9a15a', 0.35, 0.8)} position={[0, 160, 0]} castShadow><cylinderGeometry args={[7, 7, 280, 12]} /></mesh>
      <mesh position={[0, 330, 0]} castShadow>
        <cylinderGeometry args={[82, 118, 170, 40, 1, true]} />
        <meshStandardMaterial ref={shade} color="#efe2c8" emissive="#ffb466" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={bulb} position={[0, 320, 0]} color="#ffb46b" decay={0} distance={1700} />
    </group>
  )
}

function Leaves({ seed, count, size, spread, colors }: { seed: number; count: number; size: [number, number]; spread: number; colors: string[] }) {
  const leaves = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.6
      const tilt = 0.25 + r() * spread
      const len = size[1] * (0.65 + r() * 0.5)
      return { a, tilt, len, color: colors[i % colors.length] }
    })
  }, [seed, count, size, spread, colors])
  return (
    <>
      {leaves.map((l, i) => (
        <group key={i} rotation={[0, l.a, 0]}>
          <group rotation={[0, 0, l.tilt]}>
            <mesh material={mat(l.color, 0.8)} position={[0, l.len / 2, 0]} scale={[size[0], l.len / 2, size[0] * 0.25]} castShadow>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  )
}

const GREENS = ['#5e7f4f', '#728f5a', '#4c6b45', '#86a06a']

function Decor() {
  return (
    <group>
      {/* Books with a little vase, left of the museum */}
      <group position={[-275, TOP, -50]}>
        {[['#8b3b32', 190, 34, 0.04], ['#2f4a5c', 175, 30, -0.06], ['#d8c39a', 160, 26, 0.1]].map(([c, w, h, rot], i, all) => {
          const y = all.slice(0, i).reduce((s, b) => s + (b[2] as number), 0) + (h as number) / 2
          return <mesh key={i} material={mat(c as string, 0.8)} position={[0, y, 0]} rotation={[0, rot as number, 0]} castShadow receiveShadow><boxGeometry args={[w as number, h as number, 140]} /></mesh>
        })}
        <mesh material={mat('#6f8f86', 0.4)} position={[30, 90 + 26, 0]} scale={[1, 1.3, 1]} castShadow><sphereGeometry args={[22, 24, 18]} /></mesh>
        <mesh material={mat('#6f8f86', 0.4)} position={[30, 90 + 58, 0]} castShadow><cylinderGeometry args={[7, 10, 18, 16]} /></mesh>
      </group>
      {/* A small potted succulent to the right */}
      <group position={[270, TOP, 20]}>
        <mesh material={mat('#c0714b', 0.85)} position={[0, 32, 0]} castShadow receiveShadow><cylinderGeometry args={[48, 38, 64, 24]} /></mesh>
        <group position={[0, 60, 0]}><Leaves seed={7} count={11} size={[16, 55]} spread={0.9} colors={GREENS} /></group>
      </group>
      {/* Tall floor plant beside the sideboard */}
      <group position={[-900, FLOOR, 60]}>
        <mesh material={mat('#e7dccb', 0.7)} position={[0, 170, 0]} castShadow receiveShadow><cylinderGeometry args={[150, 115, 340, 32]} /></mesh>
        <group position={[0, 330, 0]}><Leaves seed={3} count={16} size={[70, 560]} spread={0.75} colors={GREENS} /></group>
      </group>
    </group>
  )
}

export function LivingRoom() {
  return (
    <group>
      <Walls />
      <Window />
      <Art />
      <Sideboard />
      <Lamp />
      <Decor />
    </group>
  )
}
