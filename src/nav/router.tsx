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
  | { name: 'discover' }
  | { name: 'request'; type: 'movie' | 'tv'; id: number }
  | { name: 'seerrPerson'; id: number }

export interface Router {
  push: (page: Page) => void
  pop: () => void
  /** Oberste Seite ersetzen (z. B. nächste Folge im Player). */
  replace: (page: Page) => void
  /** Zur Navigation links (Startseite), Fokus auf den Eintrag mit dieser Beschriftung. */
  toRail: (label: string) => void
}

export const RouterContext = createContext<Router>({ push: () => {}, pop: () => {}, replace: () => {}, toRail: () => {} })

export const useRouter = () => useContext(RouterContext)
