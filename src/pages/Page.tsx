import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { FocusContext, getCurrentFocusKey, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { onBack } from '../nav/keys'
import { useRouter } from '../nav/router'

/** Seite über der Startseite: eigene Fokusgruppe (der Fokus bleibt drin), „Zurück“ schließt sie. */
/**
 * Bereichsseiten (Suche, Entdecken, Einstellungen): „Links“ am linken Rand führt zur Navigation –
 * wie in der Android-App. Erkannt wird der Rand daran, dass sich der Fokus nicht bewegt hat.
 */
function useRailOnLeftEdge(label: string | undefined, page: { current: HTMLElement | null }) {
  const router = useRouter()
  useEffect(() => {
    if (!label) return
    const handler = (event: KeyboardEvent) => {
      // Nur wenn diese Seite oben liegt (der Fokus in ihr ist), nicht in Textfeldern
      if (event.keyCode !== 37 || document.activeElement?.tagName === 'INPUT' || !page.current?.querySelector('.focused')) return
      const before = getCurrentFocusKey()
      setTimeout(() => {
        if (getCurrentFocusKey() === before) router.toRail(label)
      }, 0)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [label])
}

export function Page({ focusKey, children, class: className = '', onBackPress, rail }: { focusKey: string; children: ComponentChildren; class?: string; onBackPress?: () => boolean; rail?: string }) {
  const router = useRouter()
  const { ref, focusKey: key } = useFocusable({ focusKey, isFocusBoundary: true, trackChildren: true })
  useRailOnLeftEdge(rail, ref)
  useEffect(() => onBack(() => {
    if (onBackPress?.()) return true
    router.pop()
    return true
  }), [onBackPress])
  return (
    <FocusContext.Provider value={key}>
      <div ref={ref} class={`qk-page ${className}`}>{children}</div>
    </FocusContext.Provider>
  )
}
