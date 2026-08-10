import { useState } from 'react'
import Intro from './components/cinema/Intro'
import Hud from './components/cinema/Hud'
import CustomCursor from './components/ui/CustomCursor'
import ClickBurst from './components/ui/ClickBurst'
import ScrollToTop from './components/ui/ScrollToTop'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
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
      <ClickBurst />
      <Hud live={introDone} />
      <main>
        <Hero play={introDone} />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <ScrollToTop />
      <div className="film-layer" aria-hidden="true">
        <div className="film-layer__grain" />
        <div className="film-layer__vignette" />
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
