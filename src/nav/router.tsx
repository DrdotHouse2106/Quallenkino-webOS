import { createContext } from 'preact'
import { useContext } from 'preact/hooks'

/** Seiten über der Startseite (die Startseite bleibt darunter erhalten, samt Fokus). */
export type Page =
  | { name: 'details'; id: string }
  | { name: 'person'; id: string }
  | { name: 'search' }
  | { name: 'trailer'; url: string }
  | { name: 'player'; id: string; startTicks?: number }
  | { name: 'settings' }
  | { name: 'guide' }
  | { name: 'program'; id: string }
  | { name: 'world'; id: string }

export interface Router {
  push: (page: Page) => void
  pop: () => void
  /** Oberste Seite ersetzen (z. B. nächste Folge im Player). */
  replace: (page: Page) => void
}

export const RouterContext = createContext<Router>({ push: () => {}, pop: () => {}, replace: () => {} })

export const useRouter = () => useContext(RouterContext)
