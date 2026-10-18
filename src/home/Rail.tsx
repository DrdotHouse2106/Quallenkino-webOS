import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import type { ComponentChildren } from 'preact'

interface RailItem {
  id: string
  label: string
  icon: ComponentChildren
  active?: boolean
  onPress: () => void
}

/** Navigation am linken Rand (wie in der Android-App); „Rechts“ führt zurück zum Inhalt. */
export function Rail({ items, onRight, preferred }: { items: RailItem[]; onRight: () => void; preferred?: string }) {
  const { ref, focusKey, hasFocusedChild } = useFocusable({
    focusKey: 'rail',
    trackChildren: true,
    // „Links“ landet auf dem aktiven Eintrag (Startseite), nicht auf dem obersten
    preferredChildFocusKey: preferred ? `rail-${preferred}` : undefined,
    onArrowPress: direction => {
      if (direction === 'right') {
        onRight()
        return false
      }
      return true
    },
  })
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class={`qk-rail ${hasFocusedChild ? 'open' : ''}`}>
        {items.map(item => <RailButton key={item.id} {...item} />)}
      </div>
    </FocusContext.Provider>
  )
}

function RailButton({ label, icon, active, onPress }: RailItem) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey: `rail-${label}`, onEnterPress: onPress })
  return (
    <div ref={ref} class={`qk-rail-item ${focused ? 'focused' : ''} ${active ? 'active' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>
      <span class="qk-rail-icon">{icon}</span>
      <span class="qk-rail-label">{label}</span>
    </div>
  )
}
