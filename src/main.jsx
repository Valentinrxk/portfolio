import { createRoot } from 'react-dom/client'
import './styles/reset.css'
import './styles/variables.css'
import './styles/typography.css'
import './styles/animations.css'
import './App.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <App />
)
