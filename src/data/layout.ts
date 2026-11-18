import { DESIGNS, WALL_H, WALL_W, type DesignId } from './catalog'

export type Rotation = 0 | 90

// Every frame keeps this much clear wall around it, so neighbours never crowd each other.
// There's no fixed frame count: you can keep adding until no frame fits with this clearance.
export const GAP = 5
const WALL_MARGIN = 3

export interface Rect { x0: number; x1: number; y0: number; y1: number }

export function frameSize(design: DesignId, rot: Rotation) {
  const d = DESIGNS[design]
  return rot === 90 ? { w: d.height, h: d.width } : { w: d.width, h: d.height }
}

// The frame's outline grown by half the gap on every side; two frames are far enough
// apart exactly when these don't overlap.
export function frameRect(design: DesignId, rot: Rotation, x: number, y: number): Rect {
  const { w, h } = frameSize(design, rot)
  const p = GAP / 2
  return { x0: x - w / 2 - p, x1: x + w / 2 + p, y0: y - h / 2 - p, y1: y + h / 2 + p }
}

const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))

export function clampToWall(design: DesignId, rot: Rotation, x: number, y: number) {
  const { w, h } = frameSize(design, rot)
  const mx = WALL_W / 2 - w / 2 - WALL_MARGIN
  const my = WALL_H / 2 - h / 2 - WALL_MARGIN
  return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) }
}

interface Placed { uid: string; design: DesignId; rot: Rotation; x: number; y: number }

// How much a frame at this spot cuts into its neighbours' clearance (0 = it fits).
export function crowding(frames: Placed[], uid: string | null, design: DesignId, rot: Rotation, x: number, y: number) {
  const r = frameRect(design, rot, x, y)
  return frames.reduce((sum, f) => (f.uid === uid ? sum : sum + overlapArea(r, frameRect(f.design, f.rot, f.x, f.y))), 0)
}

export function fits(frames: Placed[], uid: string | null, design: DesignId, rot: Rotation, x: number, y: number) {
  const c = clampToWall(design, rot, x, y)
  if (Math.abs(c.x - x) > 0.01 || Math.abs(c.y - y) > 0.01) return false
  return crowding(frames, uid, design, rot, x, y) === 0
}

// Of every spot where the frame fits, take the one nearest the middle of the wall, snug
// against its neighbours. Packing from the centre out leaves the most room for the next frame,
// so people can keep adding (smaller) frames until the wall is genuinely full.
export function findFreeSpot(frames: Placed[], design: DesignId, rot: Rotation) {
  const { w, h } = frameSize(design, rot)
  let best: { x: number; y: number } | null = null
  let bestD = Infinity
  for (let y = WALL_H / 2 - h / 2 - WALL_MARGIN; y >= -WALL_H / 2 + h / 2 + WALL_MARGIN; y -= 1) {
    for (let x = -WALL_W / 2 + w / 2 + WALL_MARGIN; x <= WALL_W / 2 - w / 2 - WALL_MARGIN; x += 1) {
      const d = x * x + 1.6 * y * y
      if (d < bestD && fits(frames, null, design, rot, x, y)) { bestD = d; best = { x, y } }
    }
  }
  return best
}

// Share of the wall taken up by frames and the clear space each one keeps around it.
export function wallUsed(frames: Placed[]) {
  const area = frames.reduce((sum, f) => {
    const r = frameRect(f.design, f.rot, f.x, f.y)
    return sum + (r.x1 - r.x0) * (r.y1 - r.y0)
  }, 0)
  return Math.min(1, area / (WALL_W * WALL_H))
}
