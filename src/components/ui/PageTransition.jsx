import { useState, useEffect } from 'react';
import './PageTransition.css';

export default function PageTransition() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading
    const duration = 1500;
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="page-transition">
      <div className="page-transition__content">
        <div className="page-transition__logo">
          <span className="page-transition__bracket">[</span>
          <span className="page-transition__v">V</span>
          <span className="page-transition__slash">/</span>
          <span className="page-transition__r">R</span>
          <span className="page-transition__bracket">]</span>
        </div>
        <div className="page-transition__bar">
          <div
            className="page-transition__bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="page-transition__text">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
