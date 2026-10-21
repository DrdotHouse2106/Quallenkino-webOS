import { useEffect, useRef } from 'preact/hooks'
import { useRouter } from '../nav/router'
import { FULL_VOLUME } from '../home/TrailerVideo'
import { Page } from './Page'

/** Trailer im Vollbild; am Ende oder mit „Zurück“ geht es zurück. */
export function TrailerPage({ url }: { url: string }) {
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const element = video.current
    if (!element) return
    element.volume = FULL_VOLUME
    element.muted = false
    element.play().catch(() => router.pop())
    return () => element.pause()
  }, [url])
  return (
    <Page focusKey="trailer" class="qk-trailer-page">
      <video ref={video} src={url} playsInline onEnded={() => router.pop()} onError={() => router.pop()} />
    </Page>
  )
}
