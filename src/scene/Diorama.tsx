import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BOX_DEPTH, CASES, FINISHES, FLOORS, VIBES, WALL_H, WALL_W, type Finish } from '../data/catalog'
import { LivingRoom } from './LivingRoom'
import { HobbyLights } from './HobbyLights'
import { Figurine } from './Figurine'
import { lightLevel } from './lightLevel'
import { viewRequest } from './view'
import { lastDragEnd, useMuseum } from '../store'
import { paintedTexture } from '../paint/textures'
import { Painterly } from '../paint/PainterlyEffect'
import { Frame } from './Frame'

const CASE_BACK = 3.02
// ?raw shows the scene without the painted look (handy when tuning lights).
const RAW = new URLSearchParams(location.search).has('raw')

function useFinishMaterial(f: Finish) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial(), [])
  useEffect(() => {
    mat.color.set(f.color)
    mat.metalness = f.metalness
    mat.roughness = f.roughness
  }, [mat, f])
  return mat
}

function Case({ material }: { material: THREE.Material }) {
  const gltf = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}models/box.glb`)
  const geometry = useMemo(() => {
    const g = (gltf.scene.children[0] as THREE.Mesh).geometry
    if (!g.attributes.normal) g.computeVertexNormals()
    return g
  }, [gltf])
  return (
    // The case is a tray with a 3 mm back; its inner back face is the museum wall (z = 0).
    <mesh geometry={geometry} material={material} rotation={[0, 0, Math.PI / 2]} position={[0, 0, -CASE_BACK]} castShadow receiveShadow />
  )
}

function Interior() {
  const wall = useMuseum((s) => s.wall)
  const floor = useMuseum((s) => s.floor)
  const select = useMuseum((s) => s.select)
  const floorTex = useMemo(() => {
    const t = paintedTexture(`floor:${floor}`).clone()
    const tile = FLOORS.find((f) => f.id === floor)?.tile
    if (tile) t.repeat.set((WALL_W + 4) / tile, BOX_DEPTH / tile)
    t.needsUpdate = true
    return t
  }, [floor])
  return (
    <group>
      <mesh position={[0, 0, 0.05]} receiveShadow onClick={() => { if (performance.now() - lastDragEnd > 250) select(null) }}>
        <planeGeometry args={[WALL_W + 4, WALL_H + 4]} />
        <meshStandardMaterial map={paintedTexture(`wall:${wall}`)} roughness={0.9} />
      </mesh>
      <mesh position={[0, -WALL_H / 2, BOX_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WALL_W + 4, BOX_DEPTH]} />
        <meshStandardMaterial map={floorTex} roughness={0.7} />
      </mesh>
    </group>
  )
}

function Dust({ color }: { color: string }) {
  const N = 110
  const points = useRef<THREE.Points>(null!)
  const material = useRef<THREE.PointsMaterial>(null!)
  const seeds = useMemo(() => Float32Array.from({ length: N * 4 }, () => Math.random()), [])
  const positions = useMemo(() => new Float32Array(N * 3), [])
  const sprite = useMemo(() => paintedTexture('pool'), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < N; i++) {
      const a = seeds[i * 4], b = seeds[i * 4 + 1], c = seeds[i * 4 + 2], d = seeds[i * 4 + 3]
      positions[i * 3] = (a - 0.5) * WALL_W + Math.sin(t * 0.15 + d * 40) * 6
      positions[i * 3 + 1] = (((b + t * (0.006 + c * 0.01)) % 1) - 0.5) * WALL_H
      positions[i * 3 + 2] = 3 + c * (BOX_DEPTH - 4) + Math.cos(t * 0.2 + a * 30) * 2
    }
    points.current.geometry.attributes.position.needsUpdate = true
    material.current.opacity = 0.75 * lightLevel.k
  })
  return (
    <points ref={points} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={material} map={sprite} color={color} size={1.8} sizeAttenuation transparent
        depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}

// Daylight with the museum lights off, or evening with them on; fades between the two.
const DAY = {
  ambient: new THREE.Color('#fff2e2'), ambientI: 0.45,
  sky: new THREE.Color('#fff8ee'), ground: new THREE.Color('#9c876e'), hemiI: 0.75,
  sun: new THREE.Color('#fff0d4'), sunI: 2.4, env: 1,
}
const NIGHT = {
  ambient: new THREE.Color('#53618f'), ambientI: 0.1,
  sky: new THREE.Color('#44548a'), ground: new THREE.Color('#120d0a'), hemiI: 0.16,
  sun: new THREE.Color('#8ea6ff'), sunI: 0.22, env: 0.3,
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

function Lighting() {
  const lights = useMuseum((s) => s.lights)
  const scene = useThree((s) => s.scene)
  const amb = useRef<THREE.AmbientLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const sun = useRef<THREE.DirectionalLight>(null!)
  useFrame((_, dt) => {
    lightLevel.k += ((lights ? 1 : 0) - lightLevel.k) * (1 - Math.exp(-dt * 3.2))
    const k = lightLevel.k
    amb.current.color.lerpColors(DAY.ambient, NIGHT.ambient, k)
    amb.current.intensity = lerp(DAY.ambientI, NIGHT.ambientI, k)
    hemi.current.color.lerpColors(DAY.sky, NIGHT.sky, k)
    hemi.current.groundColor.lerpColors(DAY.ground, NIGHT.ground, k)
    hemi.current.intensity = lerp(DAY.hemiI, NIGHT.hemiI, k)
    sun.current.color.lerpColors(DAY.sun, NIGHT.sun, k)
    sun.current.intensity = lerp(DAY.sunI, NIGHT.sunI, k)
    scene.environmentIntensity = lerp(DAY.env, NIGHT.env, k)
  })
  return (
    <>
      <ambientLight ref={amb} />
      <hemisphereLight ref={hemi} />
      {/* Sunlight (or moonlight) falling in through the window on the right */}
      <directionalLight
        ref={sun} position={[1300, 900, 900]} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.6}
        shadow-camera-left={-750} shadow-camera-right={750} shadow-camera-top={600} shadow-camera-bottom={-700}
        shadow-camera-near={100} shadow-camera-far={4000}
      />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={5} color="#fff3df" position={[0, 5, 6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[6, 2, 4]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffd9a8" position={[-6, -1, 4]} scale={[3, 4, 1]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[2, 4, 5]} scale={2} />
      </Environment>
    </>
  )
}

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<any>(null)
  const intro = useRef(0)
  const glide = useRef<{ from: THREE.Vector3; t: number } | null>(null)
  const handled = useRef(viewRequest.front)
  const dist = useMemo(() => {
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const aspect = size.width / size.height
    // Show some of the room around the museum; tighter on tall phone screens.
    return Math.max((aspect < 1 ? 260 : 330) / t, (aspect < 1 ? 285 : 520) / (t * aspect))
  }, [camera.fov, size.width, size.height])

  // Straight on, close enough that the museum fills the view.
  const frontDist = useMemo(() => {
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    return Math.max(220 / t, 268 / (t * (size.width / size.height)))
  }, [camera.fov, size.width, size.height])

  // Grabbing the view mid-glide hands it straight back to the person.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => { glide.current = null; intro.current = 1 }
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [])

  useFrame((_, dt) => {
    if (!controls.current) return
    if (viewRequest.front !== handled.current) {
      handled.current = viewRequest.front
      intro.current = 1
      glide.current = { from: camera.position.clone(), t: 0 }
    }
    const g = glide.current
    if (g) {
      g.t = Math.min(1, g.t + dt / 0.9)
      const e = g.t < 0.5 ? 4 * g.t ** 3 : 1 - (-2 * g.t + 2) ** 3 / 2
      camera.position.lerpVectors(g.from, new THREE.Vector3(0, -4, frontDist), e)
      controls.current.update()
      if (g.t >= 1) glide.current = null
      return
    }
    if (intro.current >= 1) return
    // Open on the whole room, then glide in to the museum.
    intro.current = Math.min(1, intro.current + dt / 3.2)
    const e = 1 - Math.pow(1 - intro.current, 3)
    camera.position.set(-380 * (1 - e), 160 * (1 - e) + 40, dist * (2.5 - 1.5 * e))
    controls.current.update()
  })

  return (
    <OrbitControls ref={controls} makeDefault target={[0, -4, 0]} enablePan={false} enableDamping dampingFactor={0.08}
      minDistance={dist * 0.3} maxDistance={dist * 2.6}
      minAzimuthAngle={-0.65} maxAzimuthAngle={0.65} minPolarAngle={1.05} maxPolarAngle={1.85} />
  )
}

const GRADE = {
  day: { warmth: 0.05, saturation: 1.02, paper: 0.6, edges: 0.35 },
  night: { warmth: 0.02, saturation: 1.08, paper: 0.5, edges: 0.45 },
}

export function Diorama() {
  const frames = useMuseum((s) => s.frames)
  const figurines = useMuseum((s) => s.figurines)
  const lights = useMuseum((s) => s.lights)
  const vibeId = useMuseum((s) => s.vibe)
  const finishId = useMuseum((s) => s.finish)
  const caseId = useMuseum((s) => s.caseFinish)
  const vibe = VIBES.find((v) => v.id === vibeId) ?? VIBES[0]
  const finish = FINISHES.find((f) => f.id === finishId) ?? FINISHES[0]
  const caseFinish = CASES.find((f) => f.id === caseId) ?? CASES[0]
  const frameMat = useFinishMaterial(finish)
  const caseMat = useFinishMaterial(caseFinish)
  const dpr = useThree((s) => s.viewport.dpr)
  const narrow = useThree((s) => s.size.width < 700)
  const grade = lights ? GRADE.night : GRADE.day

  return (
    <>
      <Lighting />
      <LivingRoom />
      <group>
        <Interior />
        <Case material={caseMat} />
        {frames.map((f) => <Frame key={f.uid} frame={f} material={frameMat} />)}
        {figurines.map((f) => <Figurine key={f.uid} fig={f} />)}
        <HobbyLights color={vibe.color} intensity={vibe.intensity} />
        <Dust color={vibe.color} />
      </group>

      <CameraRig />

      {!RAW && (
        <EffectComposer multisampling={0}>
          <Painterly brush={narrow ? 3 : 4} scale={dpr} edges={grade.edges}
            paper={grade.paper} warmth={grade.warmth} saturation={grade.saturation} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  )
}
