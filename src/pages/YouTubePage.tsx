import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef, useState } from 'preact/hooks'
import { FULL_VOLUME } from '../home/TrailerVideo'
import { t } from '../i18n'
import { focusSoon } from '../nav/focus'
import { Keys } from '../nav/keys'
import { useRouter } from '../nav/router'
import { commandPlayer, listenToPlayer, openYouTube, playerUrl } from '../platform/youtube'
import { toast } from '../ui/Toast'
import { isTizen } from '../platform/platform'
import { Page } from './Page'

/** Kommt der Player bis dahin nicht in Gang (z. B. ohne Internet), wird die YouTube-App versucht. */
const READY_TIMEOUT_MS = 10_000

/**
 * YouTube-Trailer im eigenen Fenster (wie die Android-App, nur über den Knopf „Trailer“): der offizielle
 * Player bildschirmfüllend, ohne etwas darüberzulegen oder ihn zu beschneiden. OK bzw. Play/Pause hält
 * an, „Zurück“ schließt. Geht der Player nicht (Fehler, nicht einbettbar), öffnet sich die YouTube-App.
 */
export function YouTubePage({ videoKey }: { videoKey: string }) {
  const router = useRouter()
  // Samsung: Der eingebettete Player ruckelt dort (Software-Dekodierung im Browser) – zuerst die YouTube-App
  // des Fernsehers öffnen, nur wenn das nicht geht, der eingebettete Player
  const [embedded, setEmbedded] = useState(!isTizen)
  useEffect(() => {
    if (embedded) return
    let active = true
    openYouTube(videoKey).then(opened => {
      if (!active) return
      if (opened) router.pop()
      else setEmbedded(true)
    })
    return () => {
      active = false
    }
  }, [videoKey])
  if (!embedded) return <Page focusKey="youtube" class="qk-youtube-page"><FocusHolder onEnter={() => {}} /></Page>
  return <YouTubeFrame videoKey={videoKey} />
}

function YouTubeFrame({ videoKey }: { videoKey: string }) {
  const router = useRouter()
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let closed = false
    let ready = false
    const close = () => {
      if (closed) return
      closed = true
      router.pop()
    }
    const fallback = () => {
      if (closed) return
      close()
      openYouTube(videoKey).then(opened => opened || toast(t.youtubeMissing))
    }
    const timer = setTimeout(() => ready || fallback(), READY_TIMEOUT_MS)
    const stop = listenToPlayer(() => frame.current, message => {
      if (message.event === 'ready') {
        ready = true
        // Die Fernbedienung bleibt bei der App
        window.focus()
      } else if (message.event === 'state' && message.data === 0) close()
      else if (message.event === 'error') fallback()
    })
    // Play/Pause der Fernbedienung (OK übernimmt der unsichtbare Fokus-Halter unten)
    const keys = (event: KeyboardEvent) => {
      const code = event.keyCode
      if ([...Keys.play, ...Keys.pause, ...Keys.playPause].includes(code as never)) {
        event.preventDefault()
        commandPlayer(frame.current, 'toggle')
      }
    }
    window.addEventListener('keydown', keys, true)
    return () => {
      closed = true
      clearTimeout(timer)
      stop()
      window.removeEventListener('keydown', keys, true)
    }
  }, [videoKey])

  return (
    <Page focusKey="youtube" class="qk-youtube-page">
      <iframe ref={frame} class="qk-youtube" src={playerUrl(videoKey, FULL_VOLUME)} allow="autoplay; encrypted-media" tabIndex={-1} />
      <FocusHolder onEnter={() => commandPlayer(frame.current, 'toggle')} />
    </Page>
  )
}

/**
 * Unsichtbarer Fokus-Halter: Der Fokus bleibt auf dieser Seite (sonst würde OK den Knopf der Seite
 * darunter auslösen). Er liegt nicht über dem Player und zeigt nichts an.
 */
function FocusHolder({ onEnter }: { onEnter: () => void }) {
  const { ref } = useFocusable({ focusKey: 'youtube-focus', onEnterPress: onEnter, onArrowPress: () => false })
  useEffect(() => focusSoon('youtube-focus'), [])
  return <div ref={ref} class="qk-youtube-focus" />
}

/** YouTube-Id aus einer Trailer-Adresse (watch?v=, youtu.be/, embed/, shorts/). */
export function youtubeKey(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return match ? match[1] : null
}
