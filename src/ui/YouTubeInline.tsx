import { useEffect, useRef, useState } from 'preact/hooks'
import { TRAILER_VOLUME } from '../home/TrailerVideo'
import { listenToPlayer, playerUrl } from '../platform/youtube'

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
  const frame = useRef<HTMLIFrameElement>(null)
  const [started, setStarted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    setStarted(false)
    setVisible(false)
    setGone(false)
    let ready = false
    const start = setTimeout(() => setStarted(true), START_DELAY_MS)
    const watchdog = setTimeout(() => ready || setGone(true), START_DELAY_MS + READY_TIMEOUT_MS)
    const stop = listenToPlayer(() => frame.current, message => {
      if (message.event === 'ready') {
        ready = true
        window.focus()
      } else if (message.event === 'state' && message.data === 1) setVisible(true)
      else if ((message.event === 'state' && message.data === 0) || message.event === 'error') setGone(true)
    })
    return () => {
      clearTimeout(start)
      clearTimeout(watchdog)
      stop()
    }
  }, [videoKey])

  if (gone || !started) return null
  return (
    <div class={`qk-yt-inline ${visible ? 'visible' : ''}`}>
      <div class="qk-yt-inline-player">
        <iframe ref={frame} src={playerUrl(videoKey, TRAILER_VOLUME)} allow="autoplay; encrypted-media" tabIndex={-1} />
      </div>
      {label && <span class="qk-yt-inline-label">{label}</span>}
    </div>
  )
}
