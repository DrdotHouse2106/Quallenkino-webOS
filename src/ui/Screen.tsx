import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { onBack } from '../nav/keys'

interface ScreenProps {
  focusKey: string
  children: ComponentChildren
  /** „Zurück“ auf diesem Bildschirm; true = erledigt. */
  onBack?: () => boolean
  class?: string
}

/** Ein Bildschirm als eigene Fokusgruppe; der Fokus bleibt innerhalb. */
export function Screen({ focusKey, children, onBack: back, class: className = '' }: ScreenProps) {
  const { ref, focusKey: key } = useFocusable({ focusKey, isFocusBoundary: true, trackChildren: true })
  useEffect(() => (back ? onBack(back) : undefined), [back])
  return (
    <FocusContext.Provider value={key}>
      <div ref={ref} class={`qk-screen ${className}`}>
        {children}
      </div>
    </FocusContext.Provider>
  )
}

/** Gruppe innerhalb eines Bildschirms (z. B. eine Reihe von Profilen). */
export function Group({ focusKey, children, class: className = '' }: { focusKey: string; children: ComponentChildren; class?: string }) {
  const { ref, focusKey: key } = useFocusable({ focusKey, trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={key}>
      <div ref={ref} class={className}>{children}</div>
    </FocusContext.Provider>
  )
}
