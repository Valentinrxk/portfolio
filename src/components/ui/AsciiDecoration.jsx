import { useState, useEffect } from 'react';
import './AsciiDecoration.css';

const PATTERNS = {
  corners: ['┌', '┐', '└', '┘'],
  brackets: ['[', ']', '{', '}', '<', '>'],
  lines: ['─', '│', '═', '║'],
  dots: ['·', '•', '○', '●'],
  symbols: ['◊', '◆', '▪', '▫', '□', '■'],
  code: ['0', '1', '/', '\\', '|', '_', '-', '+', '*', '#'],
};

function generateRandomPattern(type = 'code', length = 12) {
  const chars = PATTERNS[type] || PATTERNS.code;
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AsciiDecoration({
  position = 'top-left',
  type = 'code',
  animated = true,
  lines = 3
}) {
  const [patterns, setPatterns] = useState(() =>
    Array.from({ length: lines }, () => generateRandomPattern(type, 8 + Math.floor(Math.random() * 8)))
  );

  useEffect(() => {
    if (!animated) return;

    const interval = setInterval(() => {
      setPatterns(prev =>
        prev.map((line, i) => {
          // Only update one random character per line for subtle animation
          const chars = line.split('');
          const randomIndex = Math.floor(Math.random() * chars.length);
          const availableChars = PATTERNS[type] || PATTERNS.code;
          chars[randomIndex] = availableChars[Math.floor(Math.random() * availableChars.length)];
          return chars.join('');
        })
      );
    }, 150);

    return () => clearInterval(interval);
  }, [animated, type]);

  return (
    <div className={`ascii-decoration ascii-decoration--${position}`} aria-hidden="true">
      {patterns.map((pattern, index) => (
        <div
          key={index}
          className="ascii-decoration__line"
          style={{ '--line-delay': `${index * 0.1}s` }}
        >
          {pattern}
        </div>
      ))}
    </div>
  );
}
