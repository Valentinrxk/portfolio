import { useRef, useState, useEffect } from 'react';
import './MagneticButton.css';

export default function MagneticButton({
  children,
  href,
  className = '',
  strength = 0.3,
  onClick
}) {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseMove = (e) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 100;

      if (distance < maxDistance) {
        setPosition({
          x: deltaX * strength,
          y: deltaY * strength
        });
      }
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    button.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  const Component = href ? 'a' : 'button';

  return (
    <Component
      ref={buttonRef}
      href={href}
      className={`magnetic-button ${className}`}
      onClick={onClick}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      <span className="magnetic-button__content">
        {children}
      </span>
    </Component>
  );
}
