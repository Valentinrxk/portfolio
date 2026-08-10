import './MonkeyMark.css';

/**
 * La marca: cara de mono en ASCII de verdad — caracteres mono en grilla.
 * El [v/r] vive en la cara: la V roja es la nariz y la oreja derecha
 * está dibujada con R rojas. Mismo arte que el favicon.
 *
 * eyes y mouth son franjas de 5 caracteres intercambiables: la cara
 * cambia de expresión como animación ASCII (ver el splash).
 */
const buildArt = (eyes, mouth) => [
  '   .==#%#==.   ',
  ' =%+.:#%#:.+%= ',
  '(@:   ...   :R)',
  `(@.  ${eyes}  .R)`,
  '(@:    V    :R)',
  ` =%= ${mouth} =%= `,
  '  .=#%%%#=.    ',
];

export default function MonkeyMark({ size = 26, eyes = 'o   o', mouth = '.===.', className = '' }) {
  const art = buildArt(eyes, mouth);
  const fontSize = size / art.length;

  return (
    <pre className={`monkey-mark ${className}`} style={{ fontSize }} aria-hidden="true">
      {art.map((line, i) => (
        <div key={i}>
          {[...line].map((ch, j) =>
            ch === 'V' || ch === 'R' ? (
              <span key={j} className="monkey-mark__red">{ch}</span>
            ) : (
              ch
            )
          )}
        </div>
      ))}
    </pre>
  );
}
