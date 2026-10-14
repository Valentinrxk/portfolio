// Los dos televisores. De noche: fósforo pálido sobre vidrio oscuro, la luz
// suma y florece. De día, el negativo: tinta grafito sobre vidrio plateado,
// la tinta resta y se corre apenas. Los canales escriben tono y brillo; acá
// solo cambia qué color es cada tono. Puro, sin DOM.
import { TONE } from './cells.js';

export const THEMES = {
  dark: {
    tones: {
      PALE: '#e6e7eb',
      RED: '#e10600',
      WALL: '#a7acb2',
      STATIC: '#dfe3e8',
      GHOST: '#c9ced6',
      AMBER: '#d8c49c',
      GREEN: '#8fc27a',
      HAZE: '#6f8c68',
      WATER: '#aab4b8',
    },
    glass: '#101112', // el vidrio encendido nunca es negro
    shadow: '#000000', // el fondo de celda en 0 (manchas, franjas)
    knock: '#e6e7eb', // la tinta sobre un fondo sin contraste (de noche no se usa)
    outer: '#020202', // el tubo, fuera del vidrio
    flash: '#fffbf7',
    glow: 'bloom',
    look: { glow: 0.95, shade: 1, inkGamma: 1, scan: 0.3, scanLift: 0.45, mask: 0.94, vignette: 0.45, band: 0.05, sheen: 0.016 },
    osd: { ink: '#eef0f3', edge: '#000000', drop: 'rgba(0,0,0,0.55)' },
  },
  light: {
    tones: {
      PALE: '#1d1e22',
      RED: '#e10600',
      WALL: '#5c5f66',
      STATIC: '#232428',
      GHOST: '#3a3c43',
      AMBER: '#8c4510', // ámbar quemado
      GREEN: '#2f5530', // verde hondo, apagado
      HAZE: '#6c7a69',
      WATER: '#4d585e',
    },
    glass: '#dcdde1',
    shadow: '#2a2b30',
    knock: '#d6d7dc',
    outer: '#a9abb2',
    flash: '#17181b',
    glow: 'bleed',
    // shade > 1: las penumbras (el cuarto de CH2) quedan claras; las manchas, hondas
    look: { glow: 0.42, shade: 3.5, inkGamma: 0.7, scan: 0.05, scanLift: 0, mask: 0.975, vignette: 0.22, band: -0.035, sheen: 0.03 },
    osd: { ink: '#1b1c20', edge: '#eff0f3', drop: 'rgba(20,20,24,0.28)' },
  },
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

/** La paleta lista para el renderer; un tema desconocido cae al claro (el de la casa). */
export function paletteFor(name) {
  const key = name === 'dark' ? 'dark' : 'light';
  const def = THEMES[key];
  const tones = new Float32Array(48);
  for (const [tone, id] of Object.entries(TONE)) tones.set(rgb(def.tones[tone]), id * 3);
  return {
    name: key,
    tones,
    glass: rgb(def.glass),
    shadow: rgb(def.shadow),
    knock: rgb(def.knock),
    outer: rgb(def.outer),
    flash: rgb(def.flash),
    glow: def.glow,
    look: { ...def.look },
    osd: { ...def.osd },
  };
}
