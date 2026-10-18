import { useEffect, useRef, useState } from 'preact/hooks'

/** Lautstärke der Vorschau (wie in der Android-App). */
export const TRAILER_VOLUME = 0.75

interface Props {
  url: string
  onEnded: () => void
  onPlayingChange: (playing: boolean) => void
}

/** Trailer-Vorschau ohne Bedienelemente; erst sichtbar, sobald das Bild läuft, sanft eingeblendet. */
export function TrailerVideo({ url, onEnded, onPlayingChange }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = video.current
    if (!element) return
    element.volume = TRAILER_VOLUME
    element.play().catch(() => {
      // Ohne Ton erneut versuchen (falls der Browser Ton beim Autostart verbietet)
      element.muted = true
      element.play().catch(() => onEnded())
    })
    return () => {
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
      onPlaying={() => {
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
