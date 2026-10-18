import { useEffect, useRef, useState } from 'preact/hooks'

/** Lautstärke der Vorschau (wie in der Android-App). */
export const TRAILER_VOLUME = 0.75
/** Läuft bis dahin kein Bild, wird der Trailer verworfen (z. B. Format, das der Fernseher nicht kann). */
const NO_PICTURE_TIMEOUT_MS = 6_000

interface Props {
  url: string
  onEnded: () => void
  onPlayingChange: (playing: boolean) => void
  /** Lautstärke (0–1); 0 = stumm. Ohne Angabe die der Trailer-Vorschau. */
  volume?: number
}

/**
 * Trailer-Vorschau ohne Bedienelemente; erst sichtbar, sobald wirklich Bilder laufen (Größe bekannt,
 * Zeit läuft), sanft eingeblendet. Sonst bliebe auf dem Fernseher ein schwarzes Feld stehen.
 */
export function TrailerVideo({ url, onEnded, onPlayingChange, volume = TRAILER_VOLUME }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = video.current
    if (!element) return
    element.volume = Math.max(0, Math.min(1, volume))
    element.muted = volume === 0
    const watchdog = setTimeout(() => {
      if (!(element.videoWidth > 0 && element.currentTime > 0.2)) {
        onPlayingChange(false)
        onEnded()
      }
    }, NO_PICTURE_TIMEOUT_MS)
    element.play().catch(() => {
      // Ohne Ton erneut versuchen (falls der Browser Ton beim Autostart verbietet)
      element.muted = true
      element.play().catch(() => onEnded())
    })
    return () => {
      clearTimeout(watchdog)
      onPlayingChange(false)
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
  }, [url])

  return (
    <video
      ref={video}
      class={`qk-trailer ${visible ? 'visible' : ''}`}
      src={url}
      playsInline
      onTimeUpdate={() => {
        const element = video.current
        if (visible || !element || element.videoWidth === 0 || element.currentTime < 0.2) return
        setVisible(true)
        onPlayingChange(true)
      }}
      onEnded={() => {
        setVisible(false)
        onPlayingChange(false)
        onEnded()
      }}
      onError={() => {
        onPlayingChange(false)
        onEnded()
      }}
    />
  )
}
