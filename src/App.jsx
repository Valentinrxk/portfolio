import Navigation from './components/layout/Navigation'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import Projects from './components/sections/Projects'
import Skills from './components/sections/Skills'
import Contact from './components/sections/Contact'
import CustomCursor from './components/ui/CustomCursor'
import ScrollToTop from './components/ui/ScrollToTop'
import ScrollProgress from './components/ui/ScrollProgress'
import PageTransition from './components/ui/PageTransition'
import useTheme from './hooks/useTheme'

function App() {
  useTheme() // Inicializa el tema al cargar la aplicación

  return (
    <>
      <PageTransition />
      <CustomCursor />
      <ScrollProgress />
      <Navigation />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <ScrollToTop />
    </>
  )
}

export default App
