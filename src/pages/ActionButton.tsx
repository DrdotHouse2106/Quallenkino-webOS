import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
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
      {label}
    </div>
  )
}
