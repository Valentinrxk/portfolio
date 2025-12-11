import { useEffect, useState, useRef } from 'react';
import './CustomCursor.css';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trailPosition, setTrailPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const animationFrameRef = useRef(null);
  const targetPositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateCursor = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      targetPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    // Detect Chrome for performance optimizations
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    // Only animate trail if not Chrome (disable for better performance)
    if (!isChrome) {
      let lastTime = 0;
      const throttleDelay = 1000 / 60; // 60fps for non-Chrome browsers
      
      const animateTrail = (currentTime) => {
        if (currentTime - lastTime >= throttleDelay) {
          setTrailPosition(prev => {
            const dx = targetPositionRef.current.x - prev.x;
            const dy = targetPositionRef.current.y - prev.y;
            const lerp = 0.2;
            return {
              x: prev.x + dx * lerp,
              y: prev.y + dy * lerp,
            };
          });
          lastTime = currentTime;
        }
        animationFrameRef.current = requestAnimationFrame(animateTrail);
      };
      
      animationFrameRef.current = requestAnimationFrame(animateTrail);
    }

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Detect hover on interactive elements
    const handleMouseOver = (e) => {
      const target = e.target;
      const isInteractive = 
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.closest('.nav__link') ||
        target.closest('.hero__cta') ||
        target.closest('.project-card') ||
        target.closest('.contact__link') ||
        target.closest('.contact__email') ||
        target.closest('.nav__theme-toggle') ||
        target.closest('.project-card__link');
      
      setIsHovering(isInteractive);
    };

    const handleMouseOut = () => setIsHovering(false);

    window.addEventListener('mousemove', updateCursor);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    return () => {
      window.removeEventListener('mousemove', updateCursor);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // Hide default cursor only on desktop
  useEffect(() => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.body.style.cursor = 'none';
      return () => {
        document.body.style.cursor = 'auto';
      };
    }
  }, []);

  // Detect Chrome
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

  return (
    <>
      {/* Main cursor - follows immediately */}
      <div
        className={`custom-cursor ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''} ${isChrome ? 'chrome-optimized' : ''}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      />
      
      {/* Trailing cursor - disable in Chrome for better performance */}
      {!isChrome && (
        <div
          className="custom-cursor-trail"
          style={{
            transform: `translate(${trailPosition.x}px, ${trailPosition.y}px)`,
          }}
        />
      )}
    </>
  );
}

