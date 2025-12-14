import { useEffect } from 'react';

export default function useSmoothScroll() {
  useEffect(() => {
    let rafId = null;
    let targetY = window.scrollY;
    let currentY = window.scrollY;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const smoothScroll = () => {
      // Smooth interpolation
      currentY = lerp(currentY, targetY, 0.1);

      // Stop if close enough
      if (Math.abs(targetY - currentY) < 0.5) {
        currentY = targetY;
        window.scrollTo(0, currentY);
        return;
      }

      window.scrollTo(0, currentY);
      rafId = requestAnimationFrame(smoothScroll);
    };

    const handleWheel = (e) => {
      // Let browser handle natural scroll for better performance
      targetY = window.scrollY;
    };

    const handleScroll = () => {
      targetY = window.scrollY;

      if (!rafId) {
        rafId = requestAnimationFrame(smoothScroll);
      }
    };

    // Only apply smooth scroll on desktop
    const isDesktop = window.innerWidth > 1024;

    if (isDesktop) {
      window.addEventListener('wheel', handleWheel, { passive: true });
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}
