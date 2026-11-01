import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect } from 'preact/hooks'
import { focusSoon } from '../nav/focus'
import { Logo } from './Logo'

export interface Choice {
  key: string
  label: string
  onPress: () => void
}

/** Kleine Auswahl über der Startseite (Beenden, Profil); „Zurück“ schließt sie (bei der Startseite). */
export function ChoiceDialog({ title, subtitle, choices, initial }: { title: string; subtitle?: string; choices: Choice[]; initial: string }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'choice-dialog', isFocusBoundary: true, trackChildren: true })
  useEffect(() => focusSoon(`choice-${initial}`), [])
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-overlay">
        <Logo size={120} />
        <h1>{title}</h1>
        {subtitle && <p class="qk-muted">{subtitle}</p>}
        <div class="qk-actions">
          {choices.map(choice => <DialogButton key={choice.key} focusKey={`choice-${choice.key}`} label={choice.label} onPress={choice.onPress} />)}
        </div>
      </div>
    </FocusContext.Provider>
  )
}

function DialogButton({ focusKey, label, onPress }: { focusKey: string; label: string; onPress: () => void }) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey, onEnterPress: onPress })
  return <div ref={ref} class={`qk-button ${focused ? 'focused' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>{label}</div>
}

