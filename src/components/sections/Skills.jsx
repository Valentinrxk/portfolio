import { useRef } from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import {
  SiReact,
  SiVuedotjs,
  SiNextdotjs,
  SiAstro,
  SiPython,
  SiPhp,
  SiNodedotjs,
  SiFigma
} from 'react-icons/si';
import { FaPalette } from 'react-icons/fa';
import AsciiDecoration from '../ui/AsciiDecoration';
import DecryptedText from '../ui/DecryptedText';
import './Skills.css';

// Mapeo de iconos para cada tecnología
const skillIcons = {
  'React': SiReact,
  'Vue': SiVuedotjs,
  'Next.js': SiNextdotjs,
  'Astro': SiAstro,
  'Python': SiPython,
  'PHP': SiPhp,
  'Node.js': SiNodedotjs,
  'UI/UX Design': FaPalette,
  'Figma': SiFigma,
};

const SKILL_GROUPS = [
  {
    category: 'FRAMEWORKS JS',
    skills: [
      { name: 'React' },
      { name: 'Vue' },
      { name: 'Next.js' },
      { name: 'Astro' },
    ],
  },
  {
    category: 'BACKEND',
    skills: [
      { name: 'Python' },
      { name: 'PHP' },
      { name: 'Node.js' },
    ],
  },
  {
    category: 'DISEÑO',
    skills: [
      { name: 'UI/UX Design' },
      { name: 'Figma' },
    ],
  },
];

export default function Skills() {
  const sectionRef = useRef(null);
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.2 });

  return (
    <section id="skills" className="skills" ref={sectionRef}>
      {/* ASCII Decorations */}
      {isVisible && (
        <>
          <AsciiDecoration position="top-left" type="brackets" lines={3} />
          <AsciiDecoration position="bottom-right" type="code" lines={4} />
        </>
      )}
      <div className={`skills__container ${isVisible ? 'is-visible' : ''}`}>
        <h2 className="skills__title">HABILIDADES</h2>
        <div className="skills__grid">
          {SKILL_GROUPS.map((group, groupIndex) => (
            <div
              key={group.category}
              className="skill-group"
              style={{ '--group-delay': `${groupIndex * 0.15}s` }}
            >
              <h3 className="skill-group__title">
                <DecryptedText
                  text={group.category}
                  animateOn="view"
                  speed={45}
                  maxIterations={18}
                  characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                  revealDirection="start"
                  sequential={true}
                  className="skill-group__title--revealed"
                  encryptedClassName="skill-group__title--encrypted"
                />
              </h3>
              <div className="skill-group__list">
                {group.skills.map((skill, skillIndex) => (
                  <div
                    key={skill.name}
                    className="skill-item"
                    style={{ '--skill-delay': `${(groupIndex * 0.15) + (skillIndex * 0.08)}s` }}
                  >
                    <div className="skill-item__icon-wrapper">
                      {skillIcons[skill.name] ? (
                        (() => {
                          const IconComponent = skillIcons[skill.name];
                          return <IconComponent className="skill-icon" />;
                        })()
                      ) : (
                        <FaPalette className="skill-icon" />
                      )}
                    </div>
                    <span className="skill-item__name">
                      <DecryptedText
                        text={skill.name}
                        animateOn="view"
                        speed={50}
                        maxIterations={12}
                        characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/."
                        revealDirection="start"
                        sequential={true}
                        className="skill-item__name--revealed"
                        encryptedClassName="skill-item__name--encrypted"
                      />
                    </span>
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
