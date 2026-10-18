import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef } from 'preact/hooks'
import { TRAILER_VOLUME } from '../home/TrailerVideo'
import { t } from '../i18n'
import { Keys } from '../nav/keys'
import { focusSoon } from '../nav/focus'
import { useRouter } from '../nav/router'
import { loadYouTubeApi, openYouTube, type YTPlayer } from '../platform/youtube'
import { toast } from '../ui/Toast'
import { Page } from './Page'

/** Kommt der Player bis dahin nicht in Gang (z. B. ohne Internet), wird die YouTube-App versucht. */
const READY_TIMEOUT_MS = 10_000

/**
 * YouTube-Trailer im eigenen Fenster (wie die Android-App): der offizielle Player bildschirmfüllend,
 * ohne etwas darüberzulegen oder ihn zu beschneiden. OK bzw. Play/Pause hält an, „Zurück“ schließt.
 * Geht der Player nicht (Fehler, nicht einbettbar, keine Verbindung), öffnet sich die YouTube-App.
 */
export function YouTubePage({ videoKey }: { videoKey: string }) {
  const router = useRouter()
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)

  useEffect(() => {
    let closed = false
    let ready = false
    const fallback = () => {
      if (closed) return
      closed = true
      router.pop()
      openYouTube(videoKey).then(opened => opened || toast(t.youtubeMissing))
    }
    const timer = setTimeout(() => ready || fallback(), READY_TIMEOUT_MS)
    loadYouTubeApi()
      .then(YT => {
        if (closed || !host.current) return
        player.current = new YT.Player(host.current, {
          width: '100%',
          height: '100%',
          videoId: videoKey,
          playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3 },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              ready = true
              event.target.setVolume(Math.round(TRAILER_VOLUME * 100))
              event.target.playVideo()
              // Die Fernbedienung bleibt bei der App (sonst landen die Tasten im Player)
              event.target.getIframe().setAttribute('tabindex', '-1')
              window.focus()
            },
            onStateChange: (event: { data: number }) => {
              if (event.data === 0 && !closed) {
                closed = true
                router.pop()
              }
            },
            // 2 ungültig, 5 HTML5, 100 nicht gefunden, 101/150/152/153 nicht einbettbar
            onError: fallback,
          },
        })
      })
      .catch(fallback)

    // Play/Pause der Fernbedienung (OK übernimmt der unsichtbare Fokus-Halter unten)
    const keys = (event: KeyboardEvent) => {
      const code = event.keyCode
      if ((Keys.play as readonly number[]).includes(code) || (Keys.pause as readonly number[]).includes(code)) {
        event.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', keys, true)

    return () => {
      closed = true
      clearTimeout(timer)
      window.removeEventListener('keydown', keys, true)
      player.current?.destroy()
      player.current = null
    }
  }, [videoKey])

  function togglePause() {
    const current = player.current
    if (!current) return
    if (current.getPlayerState() === 1) current.pauseVideo()
    else current.playVideo()
  }

  return (
    <Page focusKey="youtube" class="qk-youtube-page">
      <div class="qk-youtube"><div ref={host} /></div>
      <FocusHolder onEnter={togglePause} />
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
