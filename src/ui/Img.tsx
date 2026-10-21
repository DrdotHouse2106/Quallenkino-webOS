import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * Bilder erst laden, wenn sie fast sichtbar sind. `loading="lazy"` lädt auf dem alten Chromium der Fernseher
 * mit großem Vorlauf fast alle Karten; hier sieht ein IntersectionObserver je Reihe nur knapp über ihren Rand.
 */
const observers = new WeakMap<Element, IntersectionObserver>()
let screenObserver: IntersectionObserver | undefined
const waiting = new WeakMap<Element, () => void>()

function observe(element: Element, onVisible: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onVisible()
    return () => {}
  }
  // In einer Reihe gilt deren Rand (sonst schneidet sie die Karten ab), außerhalb der Bildschirm
  const root = element.closest('.qk-row-track')
  let observer = root ? observers.get(root) : screenObserver
  if (!observer) {
    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          waiting.get(entry.target)?.()
        }
      },
      { root, rootMargin: root ? '0px 640px' : '400px' },
    )
    if (root) observers.set(root, observer)
    else screenObserver = observer
  }
  const current = observer
  const stop = () => {
    waiting.delete(element)
    current.unobserve(element)
  }
  waiting.set(element, () => {
    stop()
    onVisible()
  })
  current.observe(element)
  return stop
}

/** Bild mit Ersatz: fehlt die Adresse oder lädt das Bild nicht, wird `fallback` gezeigt (z. B. Initialen). */
export function Img({ src, fallback, lazy = true, className }: { src?: string | null; fallback: ComponentChildren; lazy?: boolean; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const [visible, setVisible] = useState(!lazy)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (visible || !ref.current) return
    return observe(ref.current, () => setVisible(true))
  }, [visible, src])
  if (!src || failed === src) return <>{fallback}</>
  return <img ref={ref} class={className} src={visible ? src : undefined} alt="" onError={() => setFailed(src)} />
}
