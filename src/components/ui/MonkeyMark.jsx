import './MonkeyMark.css';

/**
 * La marca: cabeza de monito chibi en ASCII de verdad — caracteres mono en
 * una grilla de 72×27. El [v/r] vive en la cara: la nariz es una V y la
 * oreja derecha dibuja una R, las dos en rojo.
 *
 * eyes y mouth eligen sellos que se estampan sobre el arte: la cara cambia
 * de expresión como animación ASCII (ver el splash).
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

// Tramos en rojo por fila, como [desde, hasta] inclusive.
const RED = {
  // R — oreja derecha: asta, panza y pata
  11: [[52, 66]],
  12: [[53, 66]],
  13: [[53, 66]],
  14: [[53, 65]],
  15: [[53, 66]],
  // V — nariz (en las dos primeras filas convive con la pata de la R)
  16: [[31, 39], [53, 67]],
  17: [[31, 39], [53, 68]],
  18: [[32, 38]],
  19: [[33, 37]],
  20: [[34, 35]],
};

// Sellos: cada uno pisa el arte desde { row, col } con sus líneas.
const EYE_ROW = 10;
const LEFT_EYE_COL = 22;
const RIGHT_EYE_COL = 39;

const EYE_SHUT = [
  '         ',
  '         ',
  '         ',
  '@%:   :%@',
  '=#@@@@@#=',
  '         ',
];

const EYE_WINK = [
  '         ',
  '         ',
  '=#@@@@@#=',
  '@%:   :%@',
  '         ',
  '         ',
];

const EYES = {
  open: [],
  shut: [
    { row: EYE_ROW, col: LEFT_EYE_COL, lines: EYE_SHUT },
    { row: EYE_ROW, col: RIGHT_EYE_COL, lines: EYE_SHUT },
  ],
  wink: [{ row: EYE_ROW, col: RIGHT_EYE_COL, lines: EYE_WINK }],
};

const MOUTHS = {
  rest: [],
  flat: [{ row: 21, col: 27, lines: ['                 ', '     -#####-     '] }],
  smile: [{ row: 21, col: 27, lines: ['#+             +#', ' :%###########%: '] }],
};

const buildArt = (eyes, mouth) => {
  const rows = [...ART];
  const stamps = [...(EYES[eyes] ?? []), ...(MOUTHS[mouth] ?? [])];

  stamps.forEach(({ row, col, lines }) => {
    lines.forEach((text, i) => {
      const line = rows[row + i];
      rows[row + i] = line.slice(0, col) + text + line.slice(col + text.length);
    });
  });

  return rows;
};

// Parte una fila en tramos [texto, esRojo] para no envolver cada carácter.
const segment = (line, spans = []) => {
  const parts = [];
  let cursor = 0;

  spans.forEach(([from, to]) => {
    if (from > cursor) parts.push([line.slice(cursor, from), false]);
    parts.push([line.slice(from, to + 1), true]);
    cursor = to + 1;
  });
  if (cursor < line.length) parts.push([line.slice(cursor), false]);

  return parts;
};

export default function MonkeyMark({ size = 26, eyes = 'open', mouth = 'rest', className = '' }) {
  const art = buildArt(eyes, mouth);
  const fontSize = size / art.length;

  return (
    <pre className={`monkey-mark ${className}`} style={{ fontSize }} aria-hidden="true">
      {art.map((line, i) => (
        <div key={i}>
          {segment(line, RED[i]).map(([text, red], j) =>
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
