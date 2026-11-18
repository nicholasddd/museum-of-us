import * as THREE from 'three'
import type { FloorId, WallId } from '../data/catalog'

// Hand-painted looking textures, generated on a canvas with layered brush strokes.

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// amt > 0 lightens towards white, < 0 darkens towards black
function shade(hex: string, amt: number, alpha = 1) {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)))
  return `rgba(${r},${g},${b},${alpha})`
}

type R = () => number

interface StrokeOpts { colors: string[]; count: number; len: number; width: number; alpha: number; angle?: number; jitter?: number; wrap?: boolean }

function strokes(ctx: CanvasRenderingContext2D, w: number, h: number, r: R, o: StrokeOpts) {
  ctx.lineCap = 'round'
  for (let i = 0; i < o.count; i++) {
    const x = r() * w
    const y = r() * h
    const a = (o.angle ?? r() * Math.PI) + (r() - 0.5) * (o.jitter ?? 0.6)
    const l = o.len * (0.5 + r())
    const bend = (r() - 0.5) * l * 0.4
    ctx.strokeStyle = o.colors[Math.floor(r() * o.colors.length)]
    ctx.globalAlpha = o.alpha * (0.4 + r() * 0.8)
    ctx.lineWidth = o.width * (0.5 + r())
    // A tiling texture repeats strokes that cross an edge on the opposite side, so there's no seam.
    const offsets = o.wrap ? [-1, 0, 1] : [0]
    for (const ox of offsets) for (const oy of offsets) {
      const sx = x + ox * w, sy = y + oy * h
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(sx + Math.cos(a) * l * 0.5 - Math.sin(a) * bend, sy + Math.sin(a) * l * 0.5 + Math.cos(a) * bend, sx + Math.cos(a) * l, sy + Math.sin(a) * l)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

function paintedWash(ctx: CanvasRenderingContext2D, w: number, h: number, r: R, base: string, spread = 0.12) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  const tones = [shade(base, spread), shade(base, -spread), shade(base, spread * 0.5), shade(base, -spread * 0.4)]
  strokes(ctx, w, h, r, { colors: tones, count: 900, len: w * 0.12, width: w * 0.03, alpha: 0.2 })
  strokes(ctx, w, h, r, { colors: tones, count: 1600, len: w * 0.04, width: w * 0.008, alpha: 0.3 })
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function damaskMotif(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  for (const sx of [1, -1]) {
    ctx.save()
    ctx.scale(sx, 1)
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.bezierCurveTo(s * 0.55, -s * 0.7, s * 0.25, -s * 0.2, s * 0.6, 0)
    ctx.bezierCurveTo(s * 0.25, s * 0.2, s * 0.5, s * 0.7, 0, s)
    ctx.bezierCurveTo(s * 0.15, s * 0.4, s * 0.1, -s * 0.4, 0, -s)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(s * 0.62, -s * 0.55, s * 0.12, 0, Math.PI * 2)
    ctx.arc(s * 0.62, s * 0.55, s * 0.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function paintWall(id: WallId): HTMLCanvasElement {
  const W = 1400, H = 1000
  const [c, ctx] = canvas(W, H)
  const r = rng(id.length * 977 + 13)
  switch (id) {
    case 'cream': paintedWash(ctx, W, H, r, '#eadcc3', 0.14); break
    case 'sage': paintedWash(ctx, W, H, r, '#9fb092', 0.12); break
    case 'rose': paintedWash(ctx, W, H, r, '#d5a39a', 0.14); break
    case 'navy': paintedWash(ctx, W, H, r, '#202c49', 0.18); break
    case 'damask': {
      paintedWash(ctx, W, H, r, '#7a222d', 0.14)
      // About a 14 mm repeat on the 210 mm wall.
      const step = 94
      for (let y = 0; y < H + step; y += step)
        for (let x = 0; x < W + step; x += step)
          damaskMotif(ctx, x + ((y / step) % 2) * (step / 2), y, 30, 'rgba(232,150,128,0.3)')
      strokes(ctx, W, H, r, { colors: [shade('#7a222d', 0.15, 1), shade('#7a222d', -0.3, 1)], count: 900, len: 40, width: 7, alpha: 0.1 })
      break
    }
    case 'sky': {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#7fa8d1')
      g.addColorStop(0.65, '#c9d9e6')
      g.addColorStop(1, '#f3d8c2')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      strokes(ctx, W, H, r, { colors: ['#9dbbdc', '#b6cde3', '#8fb0d6'], count: 700, len: 140, width: 26, alpha: 0.12, angle: 0, jitter: 0.3 })
      for (let i = 0; i < 9; i++) {
        const cx = r() * W, cy = H * (0.15 + r() * 0.55), cw = 160 + r() * 220
        for (let j = 0; j < 26; j++) {
          const px = cx + (r() - 0.5) * cw, py = cy + (r() - 0.5) * cw * 0.25, pr = 30 + r() * 60
          const rg = ctx.createRadialGradient(px, py, 0, px, py, pr)
          rg.addColorStop(0, 'rgba(255,250,244,0.55)')
          rg.addColorStop(1, 'rgba(255,250,244,0)')
          ctx.fillStyle = rg
          ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
        }
      }
      break
    }
  }
  // Soft painted vignette so the wall reads as lit from the centre.
  const v = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H / 2, W * 0.75)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(20,10,5,0.28)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
  return c
}

function plank(ctx: CanvasRenderingContext2D, r: R, x: number, y: number, w: number, h: number, base: string) {
  ctx.fillStyle = shade(base, (r() - 0.5) * 0.25)
  ctx.fillRect(x, y, w, h)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  const horiz = w > h
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = shade(base, -0.25 - r() * 0.2, 0.35)
    ctx.lineWidth = 1 + r() * 2
    ctx.beginPath()
    if (horiz) {
      const yy = y + r() * h
      ctx.moveTo(x, yy)
      ctx.bezierCurveTo(x + w * 0.3, yy + (r() - 0.5) * 8, x + w * 0.7, yy + (r() - 0.5) * 8, x + w, yy)
    } else {
      const xx = x + r() * w
      ctx.moveTo(xx, y)
      ctx.bezierCurveTo(xx + (r() - 0.5) * 8, y + h * 0.3, xx + (r() - 0.5) * 8, y + h * 0.7, xx, y + h)
    }
    ctx.stroke()
  }
  ctx.restore()
  ctx.strokeStyle = shade(base, -0.55, 0.6)
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, w, h)
}

const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

// Seamless chevron parquet, worked out per pixel so it tiles exactly.
function chevron(ctx: CanvasRenderingContext2D, S: number, base: string) {
  const img = ctx.createImageData(S, S)
  const [br, bg, bb] = hexToRgb(base)
  const c = S / 8 // column width
  const p = S / 16 // plank spacing down a column
  const rows = S / p
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const col = Math.floor(x / c)
    const lx = x - col * c
    const yy = y + (col % 2 === 0 ? lx : c - lx)
    const row = Math.floor(yy / p)
    const across = yy / p - row
    const along = lx / c
    const h = hash(col, ((row % rows) + rows) % rows)
    let k = 0.78 + h * 0.42
    k *= 1 - 0.07 * Math.max(0, Math.sin((across * 5 + Math.sin(along * 7 + h * 20) * 0.35) * Math.PI * 2))
    if (across < 0.08 || across > 0.94 || lx < 1.6 || lx > c - 1.6) k *= 0.42
    const i = (y * S + x) * 4
    img.data[i] = br * k; img.data[i + 1] = bg * k; img.data[i + 2] = bb * k; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

function paintFloor(id: FloorId): HTMLCanvasElement {
  const S = 512
  // The runner is one long rug across the whole floor, not a repeating tile.
  const [c, ctx] = id === 'rug' ? canvas(1400, 200) : canvas(S, S)
  const r = rng(id.length * 131 + 7)
  switch (id) {
    case 'herringbone': {
      chevron(ctx, S, '#b07d4f')
      strokes(ctx, S, S, r, { colors: ['#c48d5c', '#8e6038'], count: 400, len: 30, width: 5, alpha: 0.1, wrap: true })
      break
    }
    case 'walnut': {
      const base = '#5e3b26'
      for (let y = 0; y < S; y += 64) {
        const off = r() * S
        plank(ctx, r, -off, y, S, 64, base)
        plank(ctx, r, S - off, y, S, 64, base)
      }
      break
    }
    case 'marble': {
      const t = S / 4
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const dark = (x + y) % 2 === 1
        ctx.fillStyle = dark ? '#3a3735' : '#efe9df'
        ctx.fillRect(x * t, y * t, t, t)
      }
      strokes(ctx, S, S, r, { colors: ['rgba(150,140,130,1)', 'rgba(255,255,255,1)', 'rgba(120,110,105,1)'], count: 220, len: 90, width: 1.6, alpha: 0.35, angle: 0.7, jitter: 1, wrap: true })
      ctx.strokeStyle = 'rgba(60,55,50,0.35)'
      ctx.lineWidth = 3
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, S); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(S, i * t); ctx.stroke()
      }
      break
    }
    case 'terracotta': {
      const t = S / 4
      ctx.fillStyle = '#e9d6bd'
      ctx.fillRect(0, 0, S, S)
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        ctx.fillStyle = shade('#b9603d', (r() - 0.5) * 0.25)
        ctx.fillRect(x * t + 5, y * t + 5, t - 10, t - 10)
      }
      ctx.save()
      ctx.beginPath()
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) ctx.rect(x * t + 5, y * t + 5, t - 10, t - 10)
      ctx.clip()
      strokes(ctx, S, S, r, { colors: ['#c97852', '#9e4c2f', '#d58a62'], count: 500, len: 30, width: 6, alpha: 0.18, wrap: true })
      ctx.restore()
      break
    }
    case 'rug': {
      const W = 1400, H = 200
      ctx.fillStyle = '#e9dcc4'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#8c2a2a'
      ctx.fillRect(24, 14, W - 48, H - 28)
      ctx.strokeStyle = '#e8c98f'
      ctx.lineWidth = 6
      ctx.strokeRect(36, 26, W - 72, H - 52)
      ctx.strokeStyle = '#23305a'
      ctx.lineWidth = 10
      ctx.strokeRect(50, 40, W - 100, H - 80)
      // A row of medallions along the runner, with fringe at both ends.
      for (let i = 0; i < 7; i++) {
        const cx = 100 + i * 200, cy = H / 2
        for (let q = 0; q < 4; q++) {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate((q * Math.PI) / 2)
          damaskMotif(ctx, 0, -22, 16, 'rgba(232,201,143,0.85)')
          ctx.restore()
        }
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = '#23305a'; ctx.fill()
      }
      ctx.strokeStyle = '#efe4cf'
      ctx.lineWidth = 2
      for (let y = 18; y < H - 14; y += 6) for (const x0 of [0, W - 24]) {
        ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x0 + 22, y); ctx.stroke()
      }
      strokes(ctx, W, H, r, { colors: ['#a43b37', '#6e1f22', '#c4574a'], count: 1600, len: 10, width: 2.5, alpha: 0.22 })
      return c
    }
  }
  strokes(ctx, S, S, r, { colors: ['rgba(255,255,255,1)', 'rgba(0,0,0,1)'], count: 500, len: 40, width: 8, alpha: 0.04, wrap: true })
  return c
}

function paintPlaceholder(): HTMLCanvasElement {
  const S = 512
  const [c, ctx] = canvas(S, S)
  const r = rng(42)
  paintedWash(ctx, S, S, r, '#efe4cf', 0.06)
  ctx.strokeStyle = 'rgba(150,110,70,0.55)'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(S / 2, S / 2 - 60); ctx.lineTo(S / 2, S / 2 + 60)
  ctx.moveTo(S / 2 - 60, S / 2); ctx.lineTo(S / 2 + 60, S / 2)
  ctx.stroke()
  return c
}

function paintPool(): HTMLCanvasElement {
  const S = 256
  const [c, ctx] = canvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S * 0.35, 0, S / 2, S * 0.45, S * 0.5)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return c
}

function paintTable(): HTMLCanvasElement {
  const S = 1024
  const [c, ctx] = canvas(S, S)
  paintedWash(ctx, S, S, rng(5), '#ffffff', 0.08)
  return c
}

function clouds(ctx: CanvasRenderingContext2D, W: number, H: number, r: R, n: number, tint: string) {
  for (let i = 0; i < n; i++) {
    const cx = r() * W, cy = H * (0.1 + r() * 0.5), cw = W * (0.12 + r() * 0.16)
    for (let j = 0; j < 26; j++) {
      const px = cx + (r() - 0.5) * cw, py = cy + (r() - 0.5) * cw * 0.25, pr = W * (0.02 + r() * 0.045)
      const rg = ctx.createRadialGradient(px, py, 0, px, py, pr)
      rg.addColorStop(0, tint)
      rg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = rg
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
    }
  }
}

// The living room the museum stands in.
function paintRoom(id: string): HTMLCanvasElement {
  const r = rng(id.length * 389 + id.charCodeAt(0))
  switch (id) {
    case 'wall': {
      const [c, ctx] = canvas(1024, 1024)
      paintedWash(ctx, 1024, 1024, r, '#d9c8ae', 0.09)
      // Faint limewash stripes give the wall a papered feel.
      for (let x = 0; x < 1024; x += 128) {
        ctx.fillStyle = 'rgba(255,248,235,0.12)'
        ctx.fillRect(x + 8, 0, 48, 1024)
      }
      strokes(ctx, 1024, 1024, r, { colors: ['#e6d8c2', '#c9b597'], count: 600, len: 120, width: 18, alpha: 0.08, angle: Math.PI / 2, jitter: 0.2 })
      return c
    }
    case 'floor': {
      const [c, ctx] = canvas(1024, 1024)
      for (let y = 0; y < 1024; y += 128) {
        const off = r() * 1024
        plank(ctx, r, -off, y, 1024, 128, '#a7774c')
        plank(ctx, r, 1024 - off, y, 1024, 128, '#a7774c')
      }
      strokes(ctx, 1024, 1024, r, { colors: ['rgba(255,240,220,1)'], count: 300, len: 160, width: 16, alpha: 0.05, angle: 0, jitter: 0.1 })
      return c
    }
    case 'wood': {
      const [c, ctx] = canvas(1024, 512)
      paintedWash(ctx, 1024, 512, r, '#7b5134', 0.1)
      strokes(ctx, 1024, 512, r, { colors: [shade('#7b5134', -0.35, 1), shade('#7b5134', 0.18, 1)], count: 700, len: 220, width: 2.5, alpha: 0.3, angle: 0, jitter: 0.06 })
      return c
    }
    case 'skyday': {
      const [c, ctx] = canvas(512, 1024)
      const g = ctx.createLinearGradient(0, 0, 0, 1024)
      g.addColorStop(0, '#7fb0de'); g.addColorStop(0.6, '#c7def0'); g.addColorStop(1, '#f6e6cf')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 1024)
      clouds(ctx, 512, 1024, r, 6, 'rgba(255,252,246,0.6)')
      // Distant trees along the bottom of the view.
      strokes(ctx, 512, 1024, r, { colors: ['#7f9a6b', '#5f7b52', '#9db084'], count: 260, len: 50, width: 26, alpha: 0.5, angle: -Math.PI / 2, jitter: 0.8 })
      return c
    }
    case 'skynight': {
      const [c, ctx] = canvas(512, 1024)
      const g = ctx.createLinearGradient(0, 0, 0, 1024)
      g.addColorStop(0, '#0b1230'); g.addColorStop(0.7, '#22305c'); g.addColorStop(1, '#3d3f63')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 1024)
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = `rgba(255,248,230,${0.3 + r() * 0.6})`
        ctx.beginPath(); ctx.arc(r() * 512, r() * 700, 0.8 + r() * 1.6, 0, Math.PI * 2); ctx.fill()
      }
      const mg = ctx.createRadialGradient(360, 210, 0, 360, 210, 120)
      mg.addColorStop(0, 'rgba(255,246,220,0.55)'); mg.addColorStop(1, 'rgba(255,246,220,0)')
      ctx.fillStyle = mg; ctx.fillRect(240, 90, 240, 240)
      ctx.fillStyle = '#fff4d8'
      ctx.beginPath(); ctx.arc(360, 210, 34, 0, Math.PI * 2); ctx.fill()
      clouds(ctx, 512, 1024, r, 4, 'rgba(120,135,190,0.25)')
      strokes(ctx, 512, 1024, r, { colors: ['#121a33', '#1b2442'], count: 260, len: 50, width: 26, alpha: 0.6, angle: -Math.PI / 2, jitter: 0.8 })
      return c
    }
    case 'curtain': {
      const [c, ctx] = canvas(256, 1024)
      paintedWash(ctx, 256, 1024, r, '#eadfcb', 0.08)
      strokes(ctx, 256, 1024, r, { colors: ['#d6c7ad', '#fbf3e4'], count: 400, len: 300, width: 6, alpha: 0.18, angle: Math.PI / 2, jitter: 0.05 })
      return c
    }
    case 'rug': {
      const [c, ctx] = canvas(1024, 640)
      paintedWash(ctx, 1024, 640, r, '#c7b394', 0.08)
      ctx.strokeStyle = 'rgba(120,80,55,0.55)'; ctx.lineWidth = 14
      ctx.strokeRect(40, 40, 944, 560)
      ctx.strokeStyle = 'rgba(90,110,120,0.45)'; ctx.lineWidth = 6
      ctx.strokeRect(70, 70, 884, 500)
      for (let i = 0; i < 9; i++) damaskMotif(ctx, 140 + i * 93, 320, 30, 'rgba(120,80,55,0.25)')
      strokes(ctx, 1024, 640, r, { colors: ['#b49f7f', '#ddcdb2'], count: 1500, len: 10, width: 3, alpha: 0.25 })
      return c
    }
    case 'art': {
      const [c, ctx] = canvas(512, 640)
      paintedWash(ctx, 512, 640, r, '#e9dcc4', 0.05)
      // A loose abstract: a sun, a horizon and a few hills.
      ctx.fillStyle = 'rgba(214,138,92,0.85)'
      ctx.beginPath(); ctx.arc(330, 230, 70, 0, Math.PI * 2); ctx.fill()
      strokes(ctx, 512, 640, r, { colors: ['#7f9a87', '#5d7b6e', '#a8b89a'], count: 160, len: 140, width: 30, alpha: 0.5, angle: 0.1, jitter: 0.4 })
      ctx.fillStyle = 'rgba(233,220,196,1)'; ctx.fillRect(0, 0, 512, 150)
      ctx.fillStyle = 'rgba(233,220,196,1)'; ctx.fillRect(0, 560, 512, 80)
      strokes(ctx, 512, 640, r, { colors: ['#2f4a5c', '#3e5f73'], count: 50, len: 260, width: 18, alpha: 0.5, angle: 0, jitter: 0.2 })
      return c
    }
    default: { // 'beam': bright at the light, fading towards the floor
      const [c, ctx] = canvas(8, 256)
      const g = ctx.createLinearGradient(0, 0, 0, 256)
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256)
      return c
    }
  }
}

const cache = new Map<string, THREE.CanvasTexture>()
const canvases = new Map<string, HTMLCanvasElement>()

function getCanvas(key: string) {
  let c = canvases.get(key)
  if (!c) {
    const [kind, id] = key.split(':')
    c = kind === 'wall' ? paintWall(id as WallId)
      : kind === 'floor' ? paintFloor(id as FloorId)
      : kind === 'pool' ? paintPool()
      : kind === 'table' ? paintTable()
      : kind === 'room' ? paintRoom(id)
      : paintPlaceholder()
    canvases.set(key, c)
  }
  return c
}

export function paintedTexture(key: `${'wall' | 'floor' | 'room'}:${string}` | 'placeholder' | 'pool' | 'table') {
  let t = cache.get(key)
  if (!t) {
    t = new THREE.CanvasTexture(getCanvas(key))
    t.colorSpace = key === 'pool' || key === 'room:beam' ? THREE.NoColorSpace : THREE.SRGBColorSpace
    t.anisotropy = 8
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    cache.set(key, t)
  }
  return t
}

const swatches = new Map<string, string>()
export function swatch(key: `${'wall' | 'floor'}:${string}`) {
  let s = swatches.get(key)
  if (!s) {
    const src = getCanvas(key)
    const [c, ctx] = canvas(120, 120)
    ctx.drawImage(src, src.width * 0.2, src.height * 0.2, src.height * 0.5, src.height * 0.5, 0, 0, 120, 120)
    s = c.toDataURL('image/jpeg', 0.8)
    swatches.set(key, s)
  }
  return s
}
