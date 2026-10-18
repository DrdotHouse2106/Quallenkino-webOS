import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation'

/**
 * Fokus setzen, sobald das Ziel gezeichnet ist. Auf langsamen Fernsehern (und wenn gerade noch eine
 * Taste verarbeitet wird) klappt das nach einem Bild nicht immer – steht der Fokus dann noch wie
 * vorher, ein zweiter Versuch.
 */
export function focusSoon(key: string) {
  const before = getCurrentFocusKey()
  requestAnimationFrame(() => setFocus(key))
  setTimeout(() => {
    if (getCurrentFocusKey() === before) setFocus(key)
  }, 200)
}
