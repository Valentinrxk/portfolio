import { useState, useEffect, useRef, useCallback } from 'react';
import { generateCodeRain, generateMorphingShape } from '../../utils/asciiShapes';
import './AsciiCube.css';

export default function AsciiCube({ width = 70, height = 32 }) {
  const [frame, setFrame] = useState('');
  const [glitchLevel, setGlitchLevel] = useState(0); // 0=none, 1=medium, 2=intense
  const [shapeIndex, setShapeIndex] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const shapes = ['code', 'sphere'];

  // Detect Chrome for performance optimizations
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  let lastFrameTime = 0;
  const frameThrottle = isChrome ? 1000 / 30 : 1000 / 60; // 30fps for Chrome, 60fps for others

  const animate = useCallback(() => {
    const currentTime = performance.now();
    if (currentTime - lastFrameTime < frameThrottle) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime = currentTime;
    
    const elapsed = Date.now() - startTimeRef.current;
    const currentShape = shapes[shapeIndex];

    let newFrame;
    if (currentShape === 'code') {
      newFrame = generateCodeRain(width, height, elapsed);
    } else {
      newFrame = generateMorphingShape(width, height, elapsed);
    }

    setFrame(newFrame);
    animationRef.current = requestAnimationFrame(animate);
  }, [width, height, shapeIndex, isChrome, frameThrottle]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);

    // Dramatic glitch effect - more obvious and intentional
    const glitchInterval = setInterval(() => {
      // Trigger intense glitch
      setGlitchLevel(2);

      // After 300ms, reduce to medium
      setTimeout(() => setGlitchLevel(1), 300);

      // After 500ms total, end glitch
      setTimeout(() => setGlitchLevel(0), 500);
    }, 4000);

    // Cycle through shapes - faster transitions
    const shapeInterval = setInterval(() => {
      // Glitch on shape change
      setGlitchLevel(2);
      setTimeout(() => {
        setShapeIndex(prev => (prev + 1) % shapes.length);
        setGlitchLevel(1);
      }, 150);
      setTimeout(() => setGlitchLevel(0), 400);
    }, 5000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearInterval(glitchInterval);
      clearInterval(shapeInterval);
    };
  }, [animate, shapes.length]);

  const glitchClass = glitchLevel === 2
    ? 'ascii-cube--glitch-intense'
    : glitchLevel === 1
      ? 'ascii-cube--glitch-medium'
      : '';

  return (
    <div className="ascii-cube-container">
      <div className="ascii-cube-frame">
        {/* RGB split layers for glitch effect */}
        {glitchLevel > 0 && (
          <>
            <pre className="ascii-cube ascii-cube--red" aria-hidden="true">{frame}</pre>
            <pre className="ascii-cube ascii-cube--blue" aria-hidden="true">{frame}</pre>
          </>
        )}
        <pre
          className={`ascii-cube ascii-cube--main ${glitchClass}`}
          aria-hidden="true"
        >
          {frame}
        </pre>
      </div>
      <div className="ascii-cube-glow" aria-hidden="true" />
      <div className="ascii-cube-scanlines" aria-hidden="true" />
      {glitchLevel === 2 && <div className="ascii-cube-flash" aria-hidden="true" />}
    </div>
  );
}
