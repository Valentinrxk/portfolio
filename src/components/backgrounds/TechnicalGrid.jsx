import { useEffect, useRef } from 'react';
import './TechnicalGrid.css';

export default function TechnicalGrid({
  opacity = 0.08,
  gridSize = 40,
  accentLineEvery = 5,
  animated = false
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const setCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      drawGrid();
    };

    const drawGrid = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      // Get CSS variable colors
      const styles = getComputedStyle(document.documentElement);
      const textColor = styles.getPropertyValue('--color-text').trim();
      const accentColor = styles.getPropertyValue('--color-accent').trim();

      // Draw vertical lines
      for (let x = 0; x <= w; x += gridSize) {
        const isAccent = (x / gridSize) % accentLineEvery === 0;
        ctx.strokeStyle = isAccent ? accentColor : textColor;
        ctx.lineWidth = isAccent ? 0.75 : 0.35;
        ctx.globalAlpha = isAccent ? opacity * 2 : opacity * 1.3;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = 0; y <= h; y += gridSize) {
        const isAccent = (y / gridSize) % accentLineEvery === 0;
        ctx.strokeStyle = isAccent ? accentColor : textColor;
        ctx.lineWidth = isAccent ? 0.75 : 0.35;
        ctx.globalAlpha = isAccent ? opacity * 2 : opacity * 1.3;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Add subtle corner markers (architectural style)
      ctx.globalAlpha = opacity * 2.5;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;

      const markerSize = 20;
      const corners = [
        [0, 0], [w, 0], [0, h], [w, h]
      ];

      corners.forEach(([x, y]) => {
        // Horizontal marker
        ctx.beginPath();
        ctx.moveTo(x === 0 ? 0 : w - markerSize, y);
        ctx.lineTo(x === 0 ? markerSize : w, y);
        ctx.stroke();

        // Vertical marker
        ctx.beginPath();
        ctx.moveTo(x, y === 0 ? 0 : h - markerSize);
        ctx.lineTo(x, y === 0 ? markerSize : h);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Optional subtle animation
    let animationFrame;
    if (animated) {
      let offset = 0;
      const animate = () => {
        offset += 0.1;
        if (offset >= gridSize) offset = 0;
        drawGrid();
        animationFrame = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [opacity, gridSize, accentLineEvery, animated]);

  return (
    <canvas
      ref={canvasRef}
      className="technical-grid"
      aria-hidden="true"
    />
  );
}
