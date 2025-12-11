import Navigation from './components/layout/Navigation'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import Projects from './components/sections/Projects'
import Skills from './components/sections/Skills'
import Contact from './components/sections/Contact'
import CustomCursor from './components/ui/CustomCursor'
import useTheme from './hooks/useTheme'

function App() {
  useTheme() // Inicializa el tema al cargar la aplicación

  return (
    <>
      <CustomCursor />
      <Navigation />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
    </>
  )
}

export default App
