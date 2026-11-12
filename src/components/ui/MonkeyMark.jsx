import './MonkeyMark.css';

/**
 * La marca: cabeza de monito chibi en ASCII de verdad — caracteres mono en
 * una grilla de 72×27. El [v/r] vive en la cara: la nariz es una V y la
 * oreja derecha dibuja una R, las dos en rojo.
 *
 * eyes y mouth eligen sellos que se estampan sobre el arte: la cara cambia
 * de expresión como animación ASCII (ver el splash). compact usa el
 * símbolo, sin expresiones.
 */
const ART = [
  '                              +**####**=                                ',
  '                        -+@@@@@@@@@@@@@@@@@%*++                         ',
  '                    -+%@@@@@@@@@@@@@@@@@@@@@@@@@@-:                     ',
  '                  =%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*-                   ',
  '                =#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*                  ',
  '              :#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*                ',
  '             =@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#:              ',
  '       ::::  @@@@@@@@@@@%%##%@@@@@@@@@@@@%%%###@@@@@@@@@@*  :::::       ',
  '    -+@@@@@%#@@@@@@@@*-      ::#%@@@@%#+:      -+%@@@@@@@@%%@@@@@*=     ',
  '   +%@@@@@@@@@@@@@@#:            =*%+             =%@@@@@@@@@@@@@@@%=   ',
  '  #@@%+    *@@@@@@*     ----:             ----     :%@@@@@@@:    =%@@%  ',
  ':%@@@:=@@@*%@@@@@#:   +%@@@@@#          *%@@@@%-    :%@@@@@@@@@@%+:=@@@-',
  '-@@@- ::::#@@@@@@*    *@@@@@@@-         @@@@@@@@     #@@@@@@-: :@@+ @@@-',
  '-@@#    =#@@@@@@@*    *@@@@@@@-         @@@@@@@@     #@@@@@@****@@= @@@-',
  '-@@#    #@@@@@@@@*    *@@@@@@@-        :@@@@@@@@     #@@@@@@#*@@@: #@@@-',
  ':@@@#   #@*%@@@@@*     =#####-          :+#####      #@@@@@@: -#@@+ #@@-',
  ' =%@@*  :-:*@@@@@*             --:   --:             #@@@@@@:   *@@%@@: ',
  '  :#@@@+   *@@@@@*             @@%: -@@=             #@@@@@@:   +@@@@=  ',
  '    :%@@@@@@@@@@@@+             #@%=@@=             =%@@@@@@@@@@@@%+    ',
  '      :#####%@@@@@@=             =%@%:             =@@@@@@@######:      ',
  '            :#@@@@@@+             :-              +@@@@@@%=             ',
  '             :*@@@@@@#-       :::::::::::       -#@@@@@@*:              ',
  '               -%@@@@@@#-    -###########-    -#@@@@@@%=                ',
  '                 :*@@@@@@#+                :*%@@@@@@*=                  ',
  '                   :%%@@@@@@##::       :=+%@@@@%%%=                     ',
  '                      -=*@@@@@@@@@@@@@@@@@@@@#=                         ',
  '                           :==+########*==+                             ',
];

// Tramos en rojo del arte base por fila, como [desde, hasta] inclusive.
const RED = {
  // R — oreja derecha: asta, panza y pata. El asta toma solo el borde
  // interno del contorno de la cabeza, con el mismo grosor que la panza.
  11: [[58, 66]],
  12: [[58, 66]],
  13: [[58, 66]],
  14: [[58, 65]],
  15: [[58, 66]],
  16: [[58, 67]],
  17: [[58, 68]],
};

const overwrite = (line, col, text) => line.slice(0, col) + text + line.slice(col + text.length);

// Grilla paralela al arte: 'r' marca las celdas rojas.
const BASE_RED = ART.map((line, row) =>
  (RED[row] ?? []).reduce(
    (cells, [from, to]) => overwrite(cells, from, 'r'.repeat(to - from + 1)),
    ' '.repeat(line.length)
  )
);

// Sellos: cada uno pisa el arte desde { row, col } con sus líneas. Los
// rasgos van dibujados a mano y el tono se da solo con la densidad de los
// caracteres, como en el resto del arte: nada de opacidades.
const EYE_ROW = 12;
const LEFT_EYE_COL = 23;
const RIGHT_EYE_COL = 41;

// Ojo: un punto macizo, chico y redondo. Sin reflejos ni textura, así el
// mismo dibujo sirve con tinta clara u oscura.
const EYE_OPEN = [
  ' =#@#= ',
  '#@@@@@#',
  '#@@@@@#',
  ' =#@#= ',
];

const EYE_SHUT = [
  '       ',
  '       ',
  '@%: :%@',
  '=#@@@#=',
];

// Ojo sonriente (arco hacia arriba), para el guiño.
const EYE_HAPPY = [
  '       ',
  '=#@@@#=',
  '@%: :%@',
  '       ',
];

// Los ojos del arte original (dos bloques de 9×6) se borran antes de sellar.
const ORIGINAL_EYE = Array(6).fill(' '.repeat(9));

const eyeStamps = (left, right) => [
  { row: 10, col: 22, lines: ORIGINAL_EYE },
  { row: 10, col: 39, lines: ORIGINAL_EYE },
  { row: EYE_ROW, col: LEFT_EYE_COL, lines: left },
  { row: EYE_ROW, col: RIGHT_EYE_COL, lines: right },
];

const EYES = {
  open: eyeStamps(EYE_OPEN, EYE_OPEN),
  shut: eyeStamps(EYE_SHUT, EYE_SHUT),
  wink: eyeStamps(EYE_OPEN, EYE_HAPPY),
};

// Boca: chica, pegada a la nariz. Cada sello borra además la boca ancha
// del arte original, que ocupaba todo el renglón.
const MOUTHS = {
  rest: [{ row: 21, col: 27, lines: ['                 ', '     =#####=     '] }],
  flat: [{ row: 21, col: 27, lines: ['                 ', '      -###-      '] }],
  smile: [{ row: 21, col: 27, lines: ['    #+     +#    ', '     =#####=     '] }],
};

// Nariz: la V del arte original era un bloque grande de trazo grueso. Va
// redibujada más chica, con el mismo grosor de trazo que la R.
const NOSE = [
  {
    row: 16,
    col: 31,
    red: true,
    lines: ['         ', '         ', ' @@   @@ ', '  @@ @@  ', '   #@#   '],
  },
];

// Agrupa una fila en tramos [texto, esRojo] para no envolver cada carácter.
const runs = (line, redCells) => {
  const parts = [];

  [...line].forEach((ch, i) => {
    const red = redCells[i] === 'r';
    const last = parts[parts.length - 1];
    if (last && last[1] === red) last[0] += ch;
    else parts.push([ch, red]);
  });

  return parts;
};

const buildArt = (eyes, mouth) => {
  const glyphs = [...ART];
  const redCells = [...BASE_RED];
  const stamps = [...NOSE, ...(EYES[eyes] ?? EYES.open), ...(MOUTHS[mouth] ?? MOUTHS.rest)];

  stamps.forEach(({ row, col, lines, red }) => {
    lines.forEach((text, i) => {
      glyphs[row + i] = overwrite(glyphs[row + i], col, text);
      redCells[row + i] = overwrite(redCells[row + i], col, (red ? 'r' : ' ').repeat(text.length));
    });
  });

  return glyphs.map((line, i) => runs(line, redCells[i]));
};

// Símbolo: la marca reducida, para tamaños chicos como el HUD. El arte
// ASCII no sobrevive a 34px (cada carácter mide ~1px), así que acá va solo
// la silueta sobre una grilla de 23×17: cabeza, máscara de la cara, ojos,
// una V fina y la R como oreja derecha. El único rojo es la R: una nariz
// roja en el medio de la cara se lee como payaso. '#' tinta, 'r' rojo,
// '.' vacío.
const SYMBOL = [
  '........#######........',
  '......###########......',
  '.....#############.....',
  '....###############....',
  '....###############....',
  '.#####....###....rrrrr.',
  '######.....#.....rr..rr',
  '#..###.##.....##.rr..rr',
  '#..###.##.....##.rrrrr.',
  '#..###...........rr.rr.',
  '######...#...#...rr..rr',
  '.#####....#.#....rr..rr',
  '....###....#....###....',
  '.....###.......###.....',
  '......###.....###......',
  '.......#########.......',
  '.........#####.........',
];

// Un solo trazado por color: cada tramo horizontal es un rectángulo de 1 de alto.
const symbolPath = (cell) =>
  SYMBOL.flatMap((row, y) =>
    [...row.matchAll(new RegExp(`${cell}+`, 'g'))].map(
      (run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`
    )
  ).join('');

const SYMBOL_INK = symbolPath('#');
const SYMBOL_RED = symbolPath('r');
const SYMBOL_COLS = SYMBOL[0].length;
const SYMBOL_ROWS = SYMBOL.length;

// Debe coincidir con el line-height de .monkey-mark: size es el alto final.
const LINE_HEIGHT = 1.2;

export default function MonkeyMark({ size = 26, compact = false, eyes = 'open', mouth = 'rest', className = '' }) {
  if (compact) {
    return (
      <svg
        className={`monkey-symbol ${className}`}
        width={(size * SYMBOL_COLS) / SYMBOL_ROWS}
        height={size}
        viewBox={`0 0 ${SYMBOL_COLS} ${SYMBOL_ROWS}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path d={SYMBOL_INK} />
        <path className="monkey-symbol__red" d={SYMBOL_RED} />
      </svg>
    );
  }

  const art = buildArt(eyes, mouth);
  const fontSize = size / (art.length * LINE_HEIGHT);

  return (
    <pre className={`monkey-mark ${className}`} style={{ fontSize }} aria-hidden="true">
      {art.map((parts, i) => (
        <div key={i}>
          {parts.map(([text, red], j) =>
            red ? (
              <span key={j} className="monkey-mark__red">{text}</span>
            ) : (
              text
            )
          )}
        </div>
      ))}
    </pre>
  );
}
