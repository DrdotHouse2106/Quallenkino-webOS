import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { onBack } from '../nav/keys'
import { useRouter } from '../nav/router'

/** Seite über der Startseite: eigene Fokusgruppe (der Fokus bleibt drin), „Zurück“ schließt sie. */
export function Page({ focusKey, children, class: className = '', onBackPress }: { focusKey: string; children: ComponentChildren; class?: string; onBackPress?: () => boolean }) {
  const router = useRouter()
  const { ref, focusKey: key } = useFocusable({ focusKey, isFocusBoundary: true, trackChildren: true })
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
