import { useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Intro from './components/cinema/Intro'
import Hud from './components/cinema/Hud'
import AsciiCut from './components/cinema/AsciiCut'
import CustomCursor from './components/ui/CustomCursor'
import Hero from './components/sections/Hero'
import Experience from './components/sections/Experience'
import Projects from './components/sections/Projects'
import Skills from './components/sections/Skills'
import Contact from './components/sections/Contact'
import useSmoothScroll from './hooks/useSmoothScroll'
import { LangProvider } from './i18n'
import { ThemeProvider } from './theme'

// El splash abre cada carga (es corto y se saltea con un clic);
// solo se omite con reduced-motion
const shouldSkipIntro = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function App() {
  const [introDone, setIntroDone] = useState(shouldSkipIntro)

  useSmoothScroll()

  return (
    <ThemeProvider>
    <LangProvider>
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}
      <CustomCursor />
      <Hud live={introDone} />
      <AsciiCut />
      <main>
        <Hero play={introDone} />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>
      {/* visitas y Core Web Vitals; se activan en el panel de Vercel */}
      <Analytics />
      <SpeedInsights />
      <div className="film-layer" aria-hidden="true">
        <div className="film-layer__grain" />
        <span className="film-layer__corner film-layer__corner--tl" />
        <span className="film-layer__corner film-layer__corner--tr" />
        <span className="film-layer__corner film-layer__corner--bl" />
        <span className="film-layer__corner film-layer__corner--br" />
      </div>
    </LangProvider>
    </ThemeProvider>
  )
}

export default App
