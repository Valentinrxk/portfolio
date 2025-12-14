import { useEffect, useState } from 'react';
import './ScrollProgress.css';

export default function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;

      setScrollProgress(progress);
      setIsVisible(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAsciiChar = (progress) => {
    if (progress < 20) return '░';
    if (progress < 40) return '▒';
    if (progress < 60) return '▓';
    if (progress < 80) return '█';
    return '▓';
  };

  return (
    <div className={`scroll-progress ${isVisible ? 'scroll-progress--visible' : ''}`}>
      {/* Vertical progress bar */}
      <div className="scroll-progress__bar">
        <div
          className="scroll-progress__fill"
          style={{ height: `${scrollProgress}%` }}
        />
        <div className="scroll-progress__markers">
          {[0, 25, 50, 75, 100].map((mark) => (
            <div
              key={mark}
              className={`scroll-progress__marker ${scrollProgress >= mark ? 'active' : ''}`}
              style={{ top: `${mark}%` }}
            >
              <span className="scroll-progress__marker-line" />
              <span className="scroll-progress__marker-label">{mark}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ASCII character indicator */}
      <div className="scroll-progress__ascii">
        {getAsciiChar(scrollProgress)}
      </div>

      {/* Numeric display */}
      <div className="scroll-progress__number">
        {Math.round(scrollProgress)}
        <span className="scroll-progress__percent">%</span>
      </div>
    </div>
  );
}
