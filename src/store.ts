import { create } from 'zustand'
import { DESIGNS, FIGURINES, MAX_FIGURINES, TEMPLATE_LAYOUT, type DesignId, type FigurineId, type FloorId, type WallId } from './data/catalog'
import { clampToWall, crowding, findFreeSpot, fits, type Rotation } from './data/layout'

export interface Photo { url: string; aspect: number; zoom: number; ox: number; oy: number }

export interface PlacedFrame {
  uid: string
  design: DesignId
  x: number
  y: number
  rot: Rotation
  photo?: Photo
  bornAt: number
}

export interface PlacedFigurine {
  uid: string
  kind: FigurineId
  x: number
  z: number
  turn: number // eighths of a full turn
  bornAt: number
}

// The museum floor, in mm: x across the wall, z from the wall (0) to the open front.
export const FLOOR_Z = { min: 9, max: 27 }
export const FLOOR_X = 103

export const TABS = ['Frames', 'Wall', 'Floor', 'Vibe', 'Finish', 'Figurines'] as const
export type Tab = (typeof TABS)[number]

interface MuseumState {
  frames: PlacedFrame[]
  figurines: PlacedFigurine[]
  lights: boolean
  tab: Tab
  selected: string | null
  dragging: boolean
  wall: WallId
  floor: FloorId
  vibe: string
  finish: string
  caseFinish: string
  toast: string | null
  addFrame: (design: DesignId) => boolean // false when there's no room left for it
  removeFrame: (uid: string) => void
  moveFrame: (uid: string, x: number, y: number) => void
  rotateFrame: (uid: string) => void
  addFigurine: (kind: FigurineId) => void
  moveFigurine: (uid: string, x: number, z: number) => void
  turnFigurine: (uid: string) => void
  removeFigurine: (uid: string) => void
  setPhoto: (uid: string, photo: Photo | undefined) => void
  updatePhoto: (uid: string, patch: Partial<Photo>) => void
  select: (uid: string | null) => void
  setTab: (tab: Tab) => void
  setDragging: (v: boolean) => void
  set: (patch: Partial<Pick<MuseumState, 'wall' | 'floor' | 'vibe' | 'finish' | 'caseFinish' | 'lights'>>) => void
  resetLayout: () => void
  notify: (msg: string) => void
}

let counter = 0
const uid = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`

const templateFrames = (): PlacedFrame[] =>
  TEMPLATE_LAYOUT.map((t, i) => ({ uid: uid(), design: t.design, x: t.x, y: t.y, rot: 0, bornAt: performance.now() + i * 140 }))

const STORAGE_KEY = 'museum-of-us:v1'

function loadSaved(): Partial<MuseumState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const s = JSON.parse(raw)
    const born = (f: object, i: number) => ({ ...f, bornAt: performance.now() + i * 140 })
    return { ...s, frames: s.frames?.map(born), figurines: s.figurines?.map(born) ?? [] }
  } catch {
    return {}
  }
}

let toastTimer: number | undefined
// A drag ends with a click that lands off the moved object; that click shouldn't deselect.
export let lastDragEnd = 0

export const useMuseum = create<MuseumState>((set, get) => ({
  frames: templateFrames(),
  figurines: [],
  lights: true,
  tab: 'Frames',
  selected: null,
  dragging: false,
  wall: 'cream',
  floor: 'herringbone',
  vibe: 'warm',
  finish: 'gilded',
  caseFinish: 'walnut',
  toast: null,
  ...loadSaved(),

  addFrame: (design) => {
    const { frames, notify } = get()
    let rot: Rotation = 0
    let spot = findFreeSpot(frames, design, 0)
    if (!spot && DESIGNS[design].canRotate) {
      rot = 90
      spot = findFreeSpot(frames, design, 90)
    }
    if (!spot) {
      notify(`No room left for a ${DESIGNS[design].label} — slide frames closer, pick a smaller one, or take one down.`)
      return false
    }
    const f: PlacedFrame = { uid: uid(), design, rot, ...spot, bornAt: performance.now() }
    set({ frames: [...frames, f], selected: f.uid })
    return true
  },

  removeFrame: (id) => set((s) => ({ frames: s.frames.filter((f) => f.uid !== id), selected: s.selected === id ? null : s.selected })),

  moveFrame: (id, x, y) => {
    const { frames } = get()
    const f = frames.find((q) => q.uid === id)
    if (!f) return
    const c = clampToWall(f.design, f.rot, x, y)
    // Try the full move, then slide along each axis so frames glide past each other.
    const tries = [c, { x: c.x, y: f.y }, { x: f.x, y: c.y }]
    // A frame that's already too close (from an older save) may still move if it eases the crowding.
    const now = crowding(frames, id, f.design, f.rot, f.x, f.y)
    const ok = tries.find((t) => fits(frames, id, f.design, f.rot, t.x, t.y) || (now > 0 && crowding(frames, id, f.design, f.rot, t.x, t.y) < now))
    if (ok) set({ frames: frames.map((q) => (q.uid === id ? { ...q, ...ok } : q)) })
  },

  rotateFrame: (id) => {
    const { frames, notify } = get()
    const f = frames.find((q) => q.uid === id)
    if (!f || !DESIGNS[f.design].canRotate) return
    const rot: Rotation = f.rot === 0 ? 90 : 0
    const c = clampToWall(f.design, rot, f.x, f.y)
    if (!fits(frames, id, f.design, rot, c.x, c.y)) return notify('Not enough room to turn it here — give it some space first.')
    set({ frames: frames.map((q) => (q.uid === id ? { ...q, rot, ...c } : q)) })
  },

  addFigurine: (kind) => {
    const { figurines, notify } = get()
    if (figurines.length >= MAX_FIGURINES) return notify(`There’s room for ${MAX_FIGURINES} little extras.`)
    const w = FIGURINES.find((f) => f.id === kind)!.w
    // Stand it in the first gap along the floor, nearest the middle.
    const xs = Array.from({ length: 35 }, (_, i) => (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 6)
    const free = xs.find((x) => Math.abs(x) <= FLOOR_X - w / 2 && figurines.every((f) =>
      Math.abs(f.x - x) >= (w + FIGURINES.find((q) => q.id === f.kind)!.w) / 2))
    const f: PlacedFigurine = { uid: `g${uid()}`, kind, x: free ?? 0, z: 18, turn: 0, bornAt: performance.now() }
    set({ figurines: [...figurines, f], selected: f.uid })
  },

  moveFigurine: (id, x, z) => set((s) => ({
    figurines: s.figurines.map((f) => {
      if (f.uid !== id) return f
      const def = FIGURINES.find((q) => q.id === f.kind)!
      const mx = FLOOR_X - def.w / 2
      return { ...f, x: Math.max(-mx, Math.min(mx, x)), z: Math.max(FLOOR_Z.min, Math.min(FLOOR_Z.max, z)) }
    }),
  })),

  turnFigurine: (id) => set((s) => ({ figurines: s.figurines.map((f) => (f.uid === id ? { ...f, turn: f.turn + 1 } : f)) })),

  removeFigurine: (id) => set((s) => ({ figurines: s.figurines.filter((f) => f.uid !== id), selected: s.selected === id ? null : s.selected })),

  setPhoto: (id, photo) => set((s) => ({ frames: s.frames.map((f) => (f.uid === id ? { ...f, photo } : f)) })),

  updatePhoto: (id, patch) =>
    set((s) => ({ frames: s.frames.map((f) => (f.uid === id && f.photo ? { ...f, photo: { ...f.photo, ...patch } } : f)) })),

  select: (selected) => set({ selected }),
  setTab: (tab) => { document.body.style.cursor = ''; set({ tab, selected: null }) },
  setDragging: (dragging) => {
    if (!dragging) lastDragEnd = performance.now()
    set({ dragging })
  },
  set: (patch) => set(patch),
  resetLayout: () => set((s) => {
    // Keep photos, in order, when going back to the template arrangement.
    const photos = s.frames.map((f) => f.photo).filter(Boolean) as Photo[]
    return { frames: templateFrames().map((f, i) => ({ ...f, photo: photos[i] })), selected: null }
  }),
  notify: (msg) => {
    window.clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = window.setTimeout(() => set({ toast: null }), 3200)
  },
}))

// Persist the museum (photos are already downscaled data URLs). Storage can be
// full or blocked; the museum still works without it.
let saveTimer: number | undefined
useMuseum.subscribe((s) => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    const { frames, figurines, lights, wall, floor, vibe, finish, caseFinish } = s
    const rest = { figurines, lights, wall, floor, vibe, finish, caseFinish }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ frames, ...rest }))
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ frames: frames.map(({ photo: _p, ...f }) => f), ...rest }))
      } catch { /* storage unavailable */ }
    }
  }, 400)
})

export async function readPhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bitmap.width * scale)
  c.height = Math.round(bitmap.height * scale)
  c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height)
  return { url: c.toDataURL('image/jpeg', 0.86), aspect: c.width / c.height, zoom: 1, ox: 0, oy: 0 }
}

if (import.meta.env.DEV) (window as unknown as { museum: typeof useMuseum }).museum = useMuseum

// Handy for poking at the scene from the dev console.
if (import.meta.env.DEV) (window as unknown as { museum: typeof useMuseum }).museum = useMuseum
