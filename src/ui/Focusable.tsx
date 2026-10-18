import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation'

interface ButtonProps {
  focusKey?: string
  onPress: () => void
  children: ComponentChildren
  class?: string
  autoFocus?: boolean
}

/** Knopf für die Fernbedienung: Fokus per Pfeiltasten, OK löst aus, Magic-Remote-Klick ebenso. */
export function Button({ focusKey, onPress, children, class: className = '', autoFocus }: ButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey, onEnterPress: onPress })
  useEffect(() => {
    if (autoFocus) focusSelf()
  }, [autoFocus])
  return (
    <div
      ref={ref}
      class={`qk-button ${focused ? 'focused' : ''} ${className}`}
      onClick={onPress}
      onMouseEnter={() => focusSelf()}
    >
      {children}
    </div>
  )
}

interface InputProps {
  focusKey?: string
  value: string
  placeholder: string
  type?: 'text' | 'password' | 'url'
  onInput: (value: string) => void
  onSubmit?: () => void
  autoFocus?: boolean
}

/**
 * Textfeld: Die Pfeiltasten führen hin, OK öffnet die Bildschirmtastatur des Fernsehers.
 * Die Bestätigen-Taste der Tastatur schickt ab.
 */
export function TextInput({ focusKey, value, placeholder, type = 'text', onInput, onSubmit, autoFocus }: InputProps) {
  const input = useRef<HTMLInputElement>(null)
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onEnterPress: () => input.current?.focus(),
    onBlur: () => input.current?.blur(),
  })
  useEffect(() => {
    if (autoFocus) focusSelf()
  }, [autoFocus])
  return (
    <div ref={ref} class={`qk-input ${focused ? 'focused' : ''}`} onMouseEnter={() => focusSelf()}>
      <input
        ref={input}
        type={type}
        value={value}
        placeholder={placeholder}
        autocomplete="off"
        spellcheck={false}
        onInput={event => onInput((event.target as HTMLInputElement).value)}
        onKeyDown={event => {
          if (event.keyCode === 13) {
            event.preventDefault()
            input.current?.blur()
            onSubmit?.()
          }
        }}
      />
    </div>
  )
}

export { setFocus }
