import { useEffect, useRef, useState } from 'preact/hooks'
import { TRAILER_VOLUME } from '../home/TrailerVideo'
import { loadYouTubeApi, type YTPlayer } from '../platform/youtube'

/** Wartezeit bis zur Vorschau (wie Android) und wie lange der Player höchstens zum Start braucht. */
const START_DELAY_MS = 2_000
const READY_TIMEOUT_MS = 12_000

/**
 * YouTube-Trailer automatisch oben rechts (wie in der Android-App): ein sauberes 16:9-Rechteck mit dem
 * offiziellen Player, ohne Bedienung, nicht fokussierbar und ohne etwas darüberzulegen – der Verlauf
 * liegt nur außerhalb. Die Kennzeichnung („EN“, „OmU“) steht unter dem Player. Bei Fehlern oder am
 * Ende verschwindet er einfach.
 */
export function YouTubeInline({ videoKey, label }: { videoKey: string; label?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    setVisible(false)
    setGone(false)
    let closed = false
    let player: YTPlayer | null = null
    const hide = () => {
      closed = true
      setGone(true)
    }
    const watchdog = setTimeout(() => player || hide(), READY_TIMEOUT_MS)
    const start = setTimeout(() => {
      loadYouTubeApi()
        .then(YT => {
          if (closed || !host.current) return
          const target = document.createElement('div')
          host.current.appendChild(target)
          player = new YT.Player(target, {
            width: '100%',
            height: '100%',
            videoId: videoKey,
            playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, disablekb: 1 },
            events: {
              onReady: (event: { target: YTPlayer }) => {
                clearTimeout(watchdog)
                event.target.setVolume(Math.round(TRAILER_VOLUME * 100))
                event.target.playVideo()
                // Die Fernbedienung bleibt bei der App
                event.target.getIframe().setAttribute('tabindex', '-1')
                window.focus()
              },
              onStateChange: (event: { data: number }) => {
                if (event.data === 1) setVisible(true)
                if (event.data === 0) hide()
              },
              onError: hide,
            },
          })
        })
        .catch(hide)
    }, START_DELAY_MS)
    return () => {
      closed = true
      clearTimeout(start)
      clearTimeout(watchdog)
      player?.destroy()
    }
  }, [videoKey])

  if (gone) return null
  return (
    <div class={`qk-yt-inline ${visible ? 'visible' : ''}`}>
      <div ref={host} class="qk-yt-inline-player" />
      {label && <span class="qk-yt-inline-label">{label}</span>}
    </div>
  )
}
