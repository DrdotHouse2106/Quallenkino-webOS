import type { ComponentChildren } from 'preact'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { Icon, type IconName } from '../ui/Icon'

interface Props {
  focusKey: string
  label: string
  icon?: IconName
  active?: boolean
  dimmed?: boolean
  onPress: () => void
}

/** Knopf der Detailseite (gleiches Aussehen wie die Banner-Knöpfe). */
export function ActionButton({ focusKey, label, icon, active, dimmed, onPress }: Props) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey, onEnterPress: onPress })
  return (
    <div ref={ref} class={`qk-bb-button ${focused ? 'focused' : ''} ${dimmed ? 'dimmed' : ''} ${active ? 'active' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>
      {icon && <Icon name={icon} />}
      <span class="qk-label">{label}</span>
    </div>
  )
}

/** Reihe von Knöpfen; merkt sich den zuletzt gewählten. */
export function ActionRow({ focusKey, children }: { focusKey: string; children: ComponentChildren }) {
  const { ref, focusKey: key } = useFocusable({ focusKey, trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={key}>
      <div ref={ref} class="qk-billboard-buttons">{children}</div>
    </FocusContext.Provider>
  )
}
