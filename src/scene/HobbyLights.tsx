import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BOX_DEPTH, WALL_H, WALL_W } from '../data/catalog'
import { paintedTexture } from '../paint/textures'
import { lightLevel } from './lightLevel'

// Three small puck lights on the museum ceiling, evenly spaced, shining down at the wall.
const XS = [-WALL_W / 3, 0, WALL_W / 3]
const MOUNT_Y = WALL_H / 2
const MOUNT_Z = BOX_DEPTH * 0.62
const AIM = new THREE.Vector3(0, -WALL_H * 0.42 - MOUNT_Y, 1 - MOUNT_Z).normalize()
const BEAM_H = 125
const unlit = new THREE.Color('#a9a297')
const tmp = new THREE.Color()

export function HobbyLights({ color, intensity }: { color: string; intensity: number }) {
  const spots = useRef<(THREE.SpotLight | null)[]>([])
  const targets = useMemo(() => XS.map((x) => {
    const o = new THREE.Object3D()
    o.position.set(x, MOUNT_Y, MOUNT_Z).addScaledVector(AIM, 200)
    return o
  }), [])
  const bulb = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  const beam = useMemo(() => new THREE.MeshBasicMaterial({
    map: paintedTexture('room:beam'), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }), [])
  const halo = useMemo(() => new THREE.SpriteMaterial({
    map: paintedTexture('pool'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }), [])
  const tilt = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), AIM), [])
  const lit = useMemo(() => new THREE.Color(), [])
  useEffect(() => { lit.set(color) }, [lit, color])

  useFrame(() => {
    const k = lightLevel.k
    spots.current.forEach((s) => s && (s.intensity = intensity * k))
    bulb.color.copy(unlit).lerp(tmp.copy(lit).multiplyScalar(2.2), k)
    beam.color.copy(lit)
    beam.opacity = 0.13 * k
    halo.color.copy(lit)
    halo.opacity = 0.9 * k
  })

  return (
    <group>
      {targets.map((t, i) => <primitive key={`t${i}`} object={t} />)}
      {XS.map((x, i) => (
        <group key={x} position={[x, MOUNT_Y, MOUNT_Z]}>
          <mesh position={[0, -1.5, 0]} castShadow>
            <cylinderGeometry args={[4.6, 5, 3, 28]} />
            <meshStandardMaterial color="#d9d3ca" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, -3.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={bulb}>
            <circleGeometry args={[3.4, 28]} />
          </mesh>
          <sprite position={[0, -4, 0.5]} scale={16} material={halo} raycast={() => null} />
          <group quaternion={tilt} position={[0, -3.2, 0]}>
            <mesh position={[0, -BEAM_H / 2, 0]} material={beam} raycast={() => null} renderOrder={2}>
              <coneGeometry args={[30, BEAM_H, 32, 1, true]} />
            </mesh>
          </group>
          <spotLight
            ref={(s) => { spots.current[i] = s }}
            position={[0, -3.5, 0]} target={targets[i]} color={color}
            angle={0.78} penumbra={0.8} decay={0} distance={0}
            castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} shadow-normalBias={0.25}
            shadow-camera-near={1} shadow-camera-far={260}
          />
        </group>
      ))}
    </group>
  )
}
