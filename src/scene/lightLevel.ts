import { useMuseum } from '../store'

// How far the scene is into "lights on": 0 is daylight with the museum lights off,
// 1 is evening with them glowing. Eased every frame so switching fades.
export const lightLevel = { k: useMuseum.getState().lights ? 1 : 0 }
