import parts from './parts.json'

// Everything is in millimetres, matching the printed 21 x 15 cm museum.
export const WALL_W = 210
export const WALL_H = 150
export const BOX_DEPTH = 30.4

export type DesignId = 'petite' | 'oval' | 'grand' | 'heart' | 'classic' | 'wide'

export interface Design {
  id: DesignId
  label: string
  width: number
  height: number
  depth: number
  opening: { x0: number; x1: number; y0: number; y1: number }
  canRotate: boolean
}

const LABELS: Record<DesignId, string> = {
  petite: 'Petite',
  oval: 'Cameo Oval',
  grand: 'Grand Salon',
  heart: 'Heart',
  classic: 'Classic',
  wide: 'Panorama',
}

export const DESIGNS = Object.fromEntries(
  (Object.keys(LABELS) as DesignId[]).map((id) => {
    const p = parts[id]
    return [
      id,
      {
        id,
        label: LABELS[id],
        width: p.width,
        height: p.height,
        depth: p.depth,
        opening: p.opening,
        canRotate: id !== 'heart',
      },
    ]
  }),
) as Record<DesignId, Design>

export const DESIGN_ORDER: DesignId[] = ['grand', 'wide', 'classic', 'oval', 'heart', 'petite']

// The original 7-frame arrangement from the template (petite left out),
// moved down to fill the space the template kept free for a figurine, and spaced
// so every frame keeps its clearance (layout.ts GAP).
export const TEMPLATE_LAYOUT: { design: DesignId; x: number; y: number }[] = [
  { design: 'grand', x: -1, y: -26 },
  { design: 'wide', x: 23, y: 31 },
  { design: 'heart', x: 77, y: 26 },
  { design: 'classic', x: 71, y: -27 },
  { design: 'classic', x: -33, y: 33 },
  { design: 'oval', x: -72, y: -28 },
  { design: 'oval', x: -78, y: 34 },
]

export interface Finish { id: string; label: string; color: string; metalness: number; roughness: number }

export const FINISHES: Finish[] = [
  { id: 'gilded', label: 'Gilded gold', color: '#e6b85c', metalness: 0.85, roughness: 0.3 },
  { id: 'silver', label: 'Antique silver', color: '#c9cbcf', metalness: 0.75, roughness: 0.36 },
  { id: 'ivory', label: 'Ivory', color: '#f1e8d6', metalness: 0, roughness: 0.62 },
  { id: 'blush', label: 'Blush', color: '#e6b3a6', metalness: 0.25, roughness: 0.48 },
  { id: 'verdigris', label: 'Verdigris', color: '#73a092', metalness: 0.35, roughness: 0.55 },
  { id: 'ebony', label: 'Ebony', color: '#2b2522', metalness: 0.15, roughness: 0.45 },
]

export const CASES: Finish[] = [
  { id: 'walnut', label: 'Walnut', color: '#5b3a28', metalness: 0, roughness: 0.6 },
  { id: 'ivory', label: 'Ivory', color: '#ece2cf', metalness: 0, roughness: 0.65 },
  { id: 'ink', label: 'Ink black', color: '#1e1c1f', metalness: 0.1, roughness: 0.5 },
  { id: 'gold', label: 'Gold', color: '#c99a45', metalness: 0.7, roughness: 0.4 },
]

// The museum is lit by three small hobby lights on its ceiling; a vibe is their colour.
export interface Vibe { id: string; label: string; blurb: string; color: string; intensity: number }

export const VIBES: Vibe[] = [
  { id: 'warm', label: 'Warm white', blurb: 'Cosy and soft, like a lamp at home.', color: '#ffd29a', intensity: 2.4 },
  { id: 'golden', label: 'Golden hour', blurb: 'Honeyed light and long, warm shadows.', color: '#ffb257', intensity: 2.5 },
  { id: 'gallery', label: 'Gallery white', blurb: 'Crisp and clean, true to your photos.', color: '#f4f2ff', intensity: 2.2 },
  { id: 'moon', label: 'Moonlight', blurb: 'Cool blue, quiet and dreamy.', color: '#9fb8ff', intensity: 2.6 },
  { id: 'rose', label: 'Rose', blurb: 'A soft pink blush over everything.', color: '#ff9fb2', intensity: 2.5 },
  { id: 'candle', label: 'Candlelight', blurb: 'Deep amber, a little dramatic.', color: '#ff8a3d', intensity: 2.7 },
]

// Small figures and furniture that stand on the museum floor.
export type FigurineId = 'gent' | 'lady' | 'child' | 'dog' | 'bench' | 'plant' | 'rope' | 'pedestal'

export interface FigurineDef { id: FigurineId; label: string; group: 'People' | 'Furniture'; w: number; d: number }

export const FIGURINES: FigurineDef[] = [
  { id: 'gent', label: 'Visitor', group: 'People', w: 14, d: 9 },
  { id: 'lady', label: 'Lady', group: 'People', w: 15, d: 11 },
  { id: 'child', label: 'Child', group: 'People', w: 10, d: 7 },
  { id: 'dog', label: 'Dog', group: 'People', w: 16, d: 7 },
  { id: 'bench', label: 'Bench', group: 'Furniture', w: 46, d: 12 },
  { id: 'plant', label: 'Plant', group: 'Furniture', w: 16, d: 14 },
  { id: 'rope', label: 'Rope barrier', group: 'Furniture', w: 56, d: 6 },
  { id: 'pedestal', label: 'Pedestal', group: 'Furniture', w: 14, d: 14 },
]

export const MAX_FIGURINES = 8

export const WALLS = [
  { id: 'cream', label: 'Cream plaster' },
  { id: 'sage', label: 'Sage' },
  { id: 'rose', label: 'Dusty rose' },
  { id: 'damask', label: 'Crimson damask' },
  { id: 'navy', label: 'Midnight' },
  { id: 'sky', label: 'Painted sky' },
] as const

// tile: the size in mm one copy of the texture covers on the museum floor (null = a single
// piece stretched to fit, like a rug). Sized so 4-ish rows of tiles fit the 30 mm deep floor.
export const FLOORS = [
  { id: 'herringbone', label: 'Oak chevron', tile: 46 },
  { id: 'marble', label: 'Marble checker', tile: 30 },
  { id: 'terracotta', label: 'Terracotta', tile: 34 },
  { id: 'walnut', label: 'Walnut boards', tile: 36 },
  { id: 'rug', label: 'Persian runner', tile: null },
] as const

export type WallId = (typeof WALLS)[number]['id']
export type FloorId = (typeof FLOORS)[number]['id']
