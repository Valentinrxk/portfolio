import { useState, useEffect } from 'react';

/**
 * Custom hook for scroll-triggered animations using Intersection Observer
 * @param {React.RefObject} ref - Reference to the element to observe
 * @param {Object} options - Intersection Observer options
 * @param {number} options.threshold - Visibility threshold (0-1)
 * @param {string} options.rootMargin - Margin around the root
 * @param {boolean} options.triggerOnce - Only trigger once
 * @returns {boolean} - Whether the element is visible
 */
export default function useScrollAnimation(ref, options = {}) {
  const [isVisible, setIsVisible] = useState(false);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin, triggerOnce]);

  return isVisible;
}
