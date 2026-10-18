import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { reasons as loadReasons, type Api } from '../api/items'
import type { ServerInfo } from '../api/server'
import type { Session } from '../api/users'
import { RouterContext, type Page } from '../nav/router'
import { DetailsPage } from '../pages/DetailsPage'
import { PersonPage } from '../pages/PersonPage'
import { SearchPage } from '../pages/SearchPage'
import { TrailerPage } from '../pages/TrailerPage'
import { HomeScreen } from './HomeScreen'

interface Props {
  server: ServerInfo
  session: Session
  onSwitchProfile: () => void
  onSignOut: () => void
}

/**
 * Angemeldeter Bereich: Startseite unten, darüber gestapelte Seiten (Details, Person, Suche, Trailer).
 * „Zurück“ schließt die oberste Seite und setzt den Fokus dorthin, wo er vorher war.
 */
export function Shell({ server, session, onSwitchProfile, onSignOut }: Props) {
  const api: Api = useMemo(() => ({ url: server.url, token: session.token, userId: session.userId }), [server.url, session])
  const [stack, setStack] = useState<Page[]>([])
  const focusMemory = useRef<string[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})

  useEffect(() => {
    loadReasons(api).then(setReasons)
  }, [api])

  const router = useMemo(() => ({
    push: (page: Page) => {
      focusMemory.current.push(getCurrentFocusKey())
      setStack(s => [...s, page])
    },
    pop: () => {
      setStack(s => s.slice(0, -1))
      const previous = focusMemory.current.pop()
      if (previous) requestAnimationFrame(() => setFocus(previous))
    },
  }), [])

  return (
    <RouterContext.Provider value={router}>
      <div class={stack.length ? 'qk-covered' : ''}>
        <HomeScreen api={api} server={server} session={session} covered={stack.length > 0} onSwitchProfile={onSwitchProfile} onSignOut={onSignOut} />
      </div>
      {stack.map((page, index) => {
        const covered = index < stack.length - 1
        // Nur die oberste Seite ist sichtbar; die darunter bleiben erhalten (Fokus, Daten)
        return (
          <div key={index} class={`qk-layer ${covered ? 'hidden' : ''}`}>
            {page.name === 'details' && <DetailsPage api={api} id={page.id} reasons={reasons} covered={covered} />}
            {page.name === 'person' && <PersonPage api={api} id={page.id} />}
            {page.name === 'search' && <SearchPage api={api} />}
            {page.name === 'trailer' && <TrailerPage url={page.url} />}
          </div>
        )
      })}
    </RouterContext.Provider>
  )
}
