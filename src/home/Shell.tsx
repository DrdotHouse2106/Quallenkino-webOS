import { getCurrentFocusKey } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { reasons as loadReasons, type Api } from '../api/items'
import type { ServerInfo } from '../api/server'
import type { Session } from '../api/users'
import { RouterContext, type Page } from '../nav/router'
import { focusSoon } from '../nav/focus'
import { openItem } from '../nav/open'
import { loadSettings } from '../settings'
import { Screensaver } from './Screensaver'
import { DetailsPage } from '../pages/DetailsPage'
import { PersonPage } from '../pages/PersonPage'
import { SearchPage } from '../pages/SearchPage'
import { SettingsPage } from '../pages/SettingsPage'
import { TrailerPage } from '../pages/TrailerPage'
import { YouTubePage } from '../pages/YouTubePage'
import { PlayerPage } from '../player/PlayerPage'
import { GuidePage } from '../livetv/GuidePage'
import { ProgramPage } from '../livetv/ProgramPage'
import { WorldPage } from '../pages/WorldPage'
import { DiscoverPage } from '../discover/DiscoverPage'
import { RequestPage } from '../discover/RequestPage'
import { SeerrPersonPage } from '../discover/SeerrPersonPage'
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
  /** Bereich (z. B. Entdecken), aus dem es per „Links“ in die Navigation ging – „Rechts“ führt zurück. */
  const railReturn = useRef<Page | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})

  useEffect(() => {
    loadReasons(api).then(setReasons)
  }, [api])

  // Bildschirmschoner nach einiger Zeit ohne Tastendruck – nicht während der Wiedergabe
  const [idle, setIdle] = useState(false)
  const top = stack[stack.length - 1]?.name
  const playing = top === 'player' || top === 'trailer' || top === 'youtube'
  useEffect(() => {
    if (playing) return
    let timer: ReturnType<typeof setTimeout>
    const restart = () => {
      clearTimeout(timer)
      const minutes = loadSettings().screensaver
      if (minutes > 0) timer = setTimeout(() => setIdle(true), minutes * 60_000)
    }
    restart()
    window.addEventListener('keydown', restart, true)
    window.addEventListener('mousemove', restart)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', restart, true)
      window.removeEventListener('mousemove', restart)
    }
  }, [playing])

  const router = useMemo(() => ({
    push: (page: Page) => {
      railReturn.current = null
      focusMemory.current.push(getCurrentFocusKey())
      setStack(s => [...s, page])
    },
    pop: () => {
      setStack(s => s.slice(0, -1))
      const previous = focusMemory.current.pop()
      if (previous) focusSoon(previous)
    },
    toRail: (label: string) => {
      setStack(s => {
        railReturn.current = s[0] ?? null
        return []
      })
      focusMemory.current = []
      focusSoon(`rail-${label}`)
    },
    replace: (page: Page) => setStack(s => [...s.slice(0, -1), page]),
    resume: () => {
      const page = railReturn.current
      if (!page) return false
      railReturn.current = null
      focusMemory.current.push(getCurrentFocusKey())
      setStack([page])
      return true
    },
    forget: () => {
      railReturn.current = null
    },
  }), [])

  return (
    <RouterContext.Provider value={router}>
      <div class={stack.length ? 'qk-covered' : ''}>
        <HomeScreen api={api} session={session} covered={stack.length > 0 || idle} onSwitchProfile={onSwitchProfile} onSignOut={onSignOut} />
      </div>
      {stack.map((page, index) => {
        // Verdeckt: eine Seite liegt darüber oder der Bildschirmschoner läuft (dann keine Trailer)
        const covered = index < stack.length - 1 || idle
        // Nur die oberste Seite ist sichtbar; die darunter bleiben erhalten (Fokus, Daten)
        return (
          <div key={index} class={`qk-layer ${covered ? 'hidden' : ''}`}>
            {page.name === 'details' && <DetailsPage api={api} id={page.id} reasons={reasons} covered={covered} />}
            {page.name === 'person' && <PersonPage api={api} id={page.id} />}
            {page.name === 'search' && <SearchPage api={api} />}
            {page.name === 'trailer' && <TrailerPage url={page.url} />}
            {page.name === 'youtube' && <YouTubePage videoKey={page.key} />}
            {page.name === 'settings' && <SettingsPage server={server} session={session} onSwitchProfile={onSwitchProfile} onSignOut={onSignOut} onChangeServer={onChangeServer} />}
            {page.name === 'guide' && <GuidePage api={api} />}
            {page.name === 'program' && <ProgramPage api={api} id={page.id} />}
            {page.name === 'world' && <WorldPage api={api} id={page.id} />}
            {page.name === 'discover' && <DiscoverPage api={api} />}
            {page.name === 'request' && <RequestPage api={api} type={page.type} id={page.id} covered={covered} />}
            {page.name === 'seerrPerson' && <SeerrPersonPage api={api} id={page.id} />}
            {page.name === 'player' && <PlayerPage key={page.id} api={api} id={page.id} startTicks={page.startTicks} />}
          </div>
        )
      })}
      {idle && !playing && (
        <Screensaver
          api={api}
          onClose={() => setIdle(false)}
          onOpen={item => {
            setIdle(false)
            openItem(router, item)
          }}
        />
      )}
    </RouterContext.Provider>
  )
}
