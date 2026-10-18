import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'

/** Bild mit Ersatz: fehlt die Adresse oder lädt das Bild nicht, wird `fallback` gezeigt (z. B. Initialen). */
export function Img({ src, fallback, lazy = true }: { src?: string | null; fallback: ComponentChildren; lazy?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) return <>{fallback}</>
  return <img src={src} alt="" loading={lazy ? 'lazy' : undefined} onError={() => setFailed(src)} />
}
