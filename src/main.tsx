import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { empty, type Snapshot } from './types'
import './styles.css'

const root = document.getElementById('root')!
const payload = document.getElementById('tripaware-data')?.textContent
const snapshot = payload ? JSON.parse(payload) as Snapshot : empty
if (import.meta.env.DEV) {
  import('./snapshot.json').then(module => {
    createRoot(root).render(<BrowserRouter><App initial={module.default as Snapshot}/></BrowserRouter>)
  })
} else {
  const app = <BrowserRouter><App initial={snapshot}/></BrowserRouter>
  if (root.firstElementChild && !location.search) hydrateRoot(root, app)
  else createRoot(root).render(app)
}

