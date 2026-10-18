import { createContext } from 'preact'
import { useContext } from 'preact/hooks'

/** Seiten über der Startseite (die Startseite bleibt darunter erhalten, samt Fokus). */
export type Page =
  | { name: 'details'; id: string }
  | { name: 'person'; id: string }
  | { name: 'search' }
  | { name: 'trailer'; url: string }

export interface Router {
  push: (page: Page) => void
  pop: () => void
}

export const RouterContext = createContext<Router>({ push: () => {}, pop: () => {} })

export const useRouter = () => useContext(RouterContext)
