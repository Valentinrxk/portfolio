// ASCII characters for rendering
const ASCII_CHARS = '.,-~:;=!*#$@';

// Code symbols for the matrix rain effect
const CODE_SYMBOLS = '<>/{}[]();:=+-*&|!?#@$%^~`"\'\\01';

/**
 * Generate Matrix-style code rain with programming symbols
 */
export function generateCodeRain(width, height, time) {
  const output = Array(height).fill(null).map(() => Array(width).fill(' '));

  // Number of falling columns
  const numColumns = Math.floor(width * 0.6);

  for (let col = 0; col < numColumns; col++) {
    // Each column has its own speed and position
    const seed = col * 127.1;
    const x = Math.floor((Math.sin(seed) * 0.5 + 0.5) * width);
    const speed = 0.002 + (Math.sin(seed * 2.3) * 0.5 + 0.5) * 0.003;
    const length = 8 + Math.floor((Math.sin(seed * 3.7) * 0.5 + 0.5) * 12);

    // Calculate head position
    const headY = ((time * speed) % (height + length)) - length;

    // Draw the falling trail
    for (let i = 0; i < length; i++) {
      const y = Math.floor(headY + i);
      if (y >= 0 && y < height && x >= 0 && x < width) {
        // Brightness fades from head to tail
        const brightness = 1 - (i / length);

        // Pick a symbol based on position and time
        const symbolIndex = Math.floor((time * 0.01 + y * 0.3 + seed) % CODE_SYMBOLS.length);
        let char = CODE_SYMBOLS[symbolIndex];

        // Head of the trail is brightest
        if (i === 0) {
          char = CODE_SYMBOLS[Math.floor(time * 0.05) % CODE_SYMBOLS.length];
        } else if (brightness < 0.3) {
          char = '.';
        } else if (brightness < 0.5) {
          char = ':';
        }

        output[y][x] = char;
      }
    }
  }

  // Add some static floating code symbols
  const floatingSymbols = ['<>', '/>', '{…}', '( )', '[ ]', '&&', '||', '=>', '::'];
  for (let i = 0; i < 5; i++) {
    const seed = i * 234.5;
    const x = Math.floor(width * 0.1 + (Math.sin(seed + time * 0.0003) * 0.5 + 0.5) * width * 0.8);
    const y = Math.floor(height * 0.2 + (Math.cos(seed * 1.3 + time * 0.0002) * 0.5 + 0.5) * height * 0.6);
    const symbol = floatingSymbols[i % floatingSymbols.length];

    if (y >= 0 && y < height) {
      for (let j = 0; j < symbol.length && x + j < width; j++) {
        if (x + j >= 0) {
          output[y][x + j] = symbol[j];
        }
      }
    }
  }

  return output.map(row => row.join('')).join('\n');
}

/**
 * Generate a morphing organic sphere with spikes
 */
export function generateMorphingShape(width, height, time) {
  const output = [];
  const zbuffer = [];

  for (let i = 0; i < width * height; i++) {
    output[i] = ' ';
    zbuffer[i] = 0;
  }

  const A = time * 0.0008;
  const B = time * 0.0012;
  const morphFactor = (Math.sin(time * 0.0015) + 1) / 2;

  const cosA = Math.cos(A), sinA = Math.sin(A);
  const cosB = Math.cos(B), sinB = Math.sin(B);

  const radius = 1.8;
  const K2 = 5;
  const K1 = width * K2 * 3 / (8 * 4);

  for (let theta = 0; theta < Math.PI; theta += 0.05) {
    for (let phi = 0; phi < 2 * Math.PI; phi += 0.02) {
      const spikeFactor = 1 + morphFactor * 0.5 * Math.sin(6 * theta) * Math.sin(6 * phi);
      const r = radius * spikeFactor;

      const x0 = r * Math.sin(theta) * Math.cos(phi);
      const y0 = r * Math.sin(theta) * Math.sin(phi);
      const z0 = r * Math.cos(theta);

      const y1 = y0 * cosA - z0 * sinA;
      const z1 = y0 * sinA + z0 * cosA;
      const x2 = x0 * cosB + z1 * sinB;
      const z2 = -x0 * sinB + z1 * cosB;

      const z = K2 + z2;
      const ooz = 1 / z;

      const xp = Math.floor(width / 2 + K1 * ooz * x2);
      const yp = Math.floor(height / 2 - K1 * ooz * y1 * 0.5);

      const nx = Math.sin(theta) * Math.cos(phi);
      const ny = Math.sin(theta) * Math.sin(phi);
      const nz = Math.cos(theta);
      const L = 0.7 * nx + 0.5 * ny + 0.5 * nz;

      if (L > 0 && xp >= 0 && xp < width && yp >= 0 && yp < height) {
        const idx = xp + yp * width;
        if (ooz > zbuffer[idx]) {
          zbuffer[idx] = ooz;
          const luminanceIndex = Math.floor(L * 10);
          output[idx] = ASCII_CHARS[Math.min(luminanceIndex, ASCII_CHARS.length - 1)];
        }
      }
    }
  }

  let result = '';
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      result += output[i + j * width];
    }
    result += '\n';
  }
  return result;
}

/**
 * Generate rotating code brackets structure
 */
export function generateCodeStructure(width, height, time) {
  const output = Array(height).fill(null).map(() => Array(width).fill(' '));
  const centerX = width / 2;
  const centerY = height / 2;

  const angle = time * 0.001;
  const pulse = Math.sin(time * 0.002) * 0.3 + 1;

  // Rotating brackets at different radii
  const brackets = [
    { chars: '<  >', radius: 8, speed: 1 },
    { chars: '{  }', radius: 12, speed: -0.7 },
    { chars: '[  ]', radius: 16, speed: 0.5 },
    { chars: '(  )', radius: 20, speed: -0.3 },
  ];

  brackets.forEach(({ chars, radius, speed }) => {
    const r = radius * pulse;
    for (let i = 0; i < 8; i++) {
      const a = angle * speed + (i * Math.PI / 4);
      const x = Math.floor(centerX + Math.cos(a) * r);
      const y = Math.floor(centerY + Math.sin(a) * r * 0.5);

      if (y >= 0 && y < height) {
        // Draw opening bracket
        if (x >= 0 && x < width) {
          output[y][x] = chars[0];
        }
        // Draw closing bracket
        const x2 = x + chars.length - 1;
        if (x2 >= 0 && x2 < width) {
          output[y][x2] = chars[chars.length - 1];
        }
      }
    }
  });

  // Center code symbol
  const centerSymbols = ['</>',  '{ }', '(•)', '[+]', '=>='];
  const symbolIndex = Math.floor(time * 0.001) % centerSymbols.length;
  const symbol = centerSymbols[symbolIndex];
  const startX = Math.floor(centerX - symbol.length / 2);

  for (let i = 0; i < symbol.length; i++) {
    if (startX + i >= 0 && startX + i < width && centerY >= 0 && centerY < height) {
      output[Math.floor(centerY)][startX + i] = symbol[i];
    }
  }

  return output.map(row => row.join('')).join('\n');
}

/**
 * Generate a rotating torus knot - complex mathematical shape
 */
export function generateTorusKnot(width, height, time) {
  const output = [];
  const zbuffer = [];

  for (let i = 0; i < width * height; i++) {
    output[i] = ' ';
    zbuffer[i] = 0;
  }

  const A = time * 0.001;
  const B = time * 0.0015;

  const cosA = Math.cos(A), sinA = Math.sin(A);
  const cosB = Math.cos(B), sinB = Math.sin(B);

  const K2 = 5;
  const K1 = width * K2 * 3 / (8 * 4);

  // Torus knot parameters
  const p = 2; // number of times it winds around
  const q = 3; // number of times through the hole
  const tubeRadius = 0.4;
  const torusRadius = 1.5;

  for (let u = 0; u < 2 * Math.PI; u += 0.08) {
    for (let v = 0; v < 2 * Math.PI; v += 0.08) {
      // Torus knot parametric equations
      const r = torusRadius + tubeRadius * Math.cos(v);
      const x0 = r * Math.cos(p * u);
      const y0 = r * Math.sin(p * u);
      const z0 = tubeRadius * Math.sin(v) + torusRadius * Math.sin(q * u);

      // Rotation
      const y1 = y0 * cosA - z0 * sinA;
      const z1 = y0 * sinA + z0 * cosA;
      const x2 = x0 * cosB + z1 * sinB;
      const z2 = -x0 * sinB + z1 * cosB;

      const z = K2 + z2;
      const ooz = 1 / z;

      const xp = Math.floor(width / 2 + K1 * ooz * x2);
      const yp = Math.floor(height / 2 - K1 * ooz * y1 * 0.5);

      // Normal vector for lighting
      const nx = Math.cos(p * u) * Math.cos(v);
      const ny = Math.sin(p * u) * Math.cos(v);
      const nz = Math.sin(v);
      const L = 0.6 * nx + 0.5 * ny + 0.6 * nz;

      if (L > 0 && xp >= 0 && xp < width && yp >= 0 && yp < height) {
        const idx = xp + yp * width;
        if (ooz > zbuffer[idx]) {
          zbuffer[idx] = ooz;
          const luminanceIndex = Math.floor(L * 10);
          output[idx] = ASCII_CHARS[Math.min(luminanceIndex, ASCII_CHARS.length - 1)];
        }
      }
    }
  }

  let result = '';
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      result += output[i + j * width];
    }
    result += '\n';
  }
  return result;
}
