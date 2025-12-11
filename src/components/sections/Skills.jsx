import { useRef } from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import './Skills.css';

const SKILL_GROUPS = [
  {
    category: 'FRAMEWORKS JS',
    skills: [
      { name: 'React', level: 95 },
      { name: 'Vue', level: 85 },
      { name: 'Next.js', level: 90 },
      { name: 'Astro', level: 80 },
    ],
  },
  {
    category: 'BACKEND',
    skills: [
      { name: 'Python', level: 75 },
      { name: 'PHP', level: 70 },
      { name: 'Node.js', level: 80 },
    ],
  },
  {
    category: 'DISEÑO',
    skills: [
      { name: 'UI/UX Design', level: 88 },
      { name: 'Figma', level: 85 },
    ],
  },
];

function AsciiProgressBar({ level, isVisible }) {
  const totalBlocks = 10;
  const filledBlocks = Math.floor(level / 10);
  const emptyBlocks = totalBlocks - filledBlocks;

  const filled = '\u2588'.repeat(filledBlocks);
  const empty = '\u2591'.repeat(emptyBlocks);

  return (
    <span className={`ascii-progress ${isVisible ? 'is-visible' : ''}`}>
      [{filled}{empty}] {level}%
    </span>
  );
}

export default function Skills() {
  const sectionRef = useRef(null);
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.2 });

  return (
    <section id="skills" className="skills" ref={sectionRef}>
      <div className={`skills__container ${isVisible ? 'is-visible' : ''}`}>
        <h2 className="skills__title">HABILIDADES</h2>
        <div className="skills__grid">
          {SKILL_GROUPS.map((group, groupIndex) => (
            <div
              key={group.category}
              className="skill-group"
              style={{ '--group-delay': `${groupIndex * 0.15}s` }}
            >
              <h3 className="skill-group__title">{group.category}</h3>
              <div className="skill-group__list">
                {group.skills.map((skill, skillIndex) => (
                  <div
                    key={skill.name}
                    className="skill-item"
                    style={{ '--skill-delay': `${(groupIndex * 0.15) + (skillIndex * 0.08)}s` }}
                  >
                    <span className="skill-item__name">{skill.name}</span>
                    <AsciiProgressBar level={skill.level} isVisible={isVisible} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
