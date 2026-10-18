import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { reasons as loadReasons, type Api } from '../api/items'
import type { ServerInfo } from '../api/server'
import type { Session } from '../api/users'
import { RouterContext, type Page } from '../nav/router'
import { DetailsPage } from '../pages/DetailsPage'
import { PersonPage } from '../pages/PersonPage'
import { SearchPage } from '../pages/SearchPage'
import { SettingsPage } from '../pages/SettingsPage'
import { TrailerPage } from '../pages/TrailerPage'
import { PlayerPage } from '../player/PlayerPage'
import { GuidePage } from '../livetv/GuidePage'
import { ProgramPage } from '../livetv/ProgramPage'
import { WorldPage } from '../pages/WorldPage'
import { HomeScreen } from './HomeScreen'

interface Props {
  server: ServerInfo
  session: Session
  onSwitchProfile: () => void
  onSignOut: () => void
  onChangeServer: () => void
}

/**
 * Angemeldeter Bereich: Startseite unten, darüber gestapelte Seiten (Details, Person, Suche, Trailer).
 * „Zurück“ schließt die oberste Seite und setzt den Fokus dorthin, wo er vorher war.
 */
export function Shell({ server, session, onSwitchProfile, onSignOut, onChangeServer }: Props) {
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
    replace: (page: Page) => setStack(s => [...s.slice(0, -1), page]),
  }), [])

  return (
    <RouterContext.Provider value={router}>
      <div class={stack.length ? 'qk-covered' : ''}>
        <HomeScreen api={api} session={session} covered={stack.length > 0} onSwitchProfile={onSwitchProfile} />
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
            {page.name === 'settings' && <SettingsPage server={server} session={session} onSwitchProfile={onSwitchProfile} onSignOut={onSignOut} onChangeServer={onChangeServer} />}
            {page.name === 'guide' && <GuidePage api={api} />}
            {page.name === 'program' && <ProgramPage api={api} id={page.id} />}
            {page.name === 'world' && <WorldPage api={api} id={page.id} />}
            {page.name === 'player' && <PlayerPage key={page.id} api={api} id={page.id} startTicks={page.startTicks} />}
          </div>
        )
      })}
    </RouterContext.Provider>
  )
}
