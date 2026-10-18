import { useEffect, useState } from 'preact/hooks'

let show: (text: string) => void = () => {}

/** Kurzer Hinweis unten am Bildschirm. */
export function toast(text: string) {
  show(text)
}

export function ToastHost() {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    show = value => {
      setText(value)
      clearTimeout(timer)
      timer = setTimeout(() => setText(null), 3_000)
    }
    return () => clearTimeout(timer)
  }, [])
  return text ? <div class="qk-toast">{text}</div> : null
}
