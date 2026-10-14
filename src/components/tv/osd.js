// El número de canal en pantalla, como un OSD de los 90: bloques gruesos,
// borde negro y sombra dura. Se dibuja en un canvas y va al tubo.
const FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
};

const INK = '#eef0f3';
const EDGE = '#000';

function blocks(g, text, x, y, p, gap, fill, grow = 0, dx = 0, dy = 0) {
  g.fillStyle = fill;
  [...text].forEach((ch, n) => {
    const rows = FONT[ch];
    if (!rows) return;
    const ox = x + n * (5 + gap) * p;
    rows.forEach((row, r) => {
      [...row].forEach((bit, c) => {
        if (bit === '1') g.fillRect(ox + c * p - grow + dx, y + r * p - grow + dy, p + grow * 2, p + grow * 2);
      });
    });
  });
}

/** → { canvas, x, y, w, h } en px de dispositivo, arriba a la derecha. */
export function drawOsd(number, grid) {
  const P = Math.max(4, Math.round(grid.ch * 0.4));
  const p = Math.max(2, Math.round(P * 0.26));
  const edge = Math.max(2, Math.round(P * 0.2));
  const digits = String(number);
  const bigW = (digits.length * 6 - 1) * P;
  const labelW = 11 * p;
  const pad = edge * 3;
  const w = pad * 2 + labelW + Math.round(P * 0.9) + bigW;
  const h = pad * 2 + 7 * P;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const lx = pad;
  const ly = pad + 7 * P - 7 * p;
  const bx = pad + labelW + Math.round(P * 0.9);
  const by = pad;
  // sombra dura, borde negro, y la tinta
  for (const [grow, dx, dy, fill] of [[edge, edge, edge, 'rgba(0,0,0,0.55)'], [edge, 0, 0, EDGE], [0, 0, 0, INK]]) {
    blocks(g, 'CH', lx, ly, p, 1, fill, Math.min(grow, Math.ceil(p * 0.5)), dx, dy);
    blocks(g, digits, bx, by, P, 1, fill, grow, dx, dy);
  }
  // inset: dentro de la zona segura del tubo
  const x = Math.round(grid.width - w - grid.width * 0.075);
  const y = Math.round(grid.height * 0.06);
  return { canvas, x, y, w, h };
}
