import { useEffect, useState } from 'preact/hooks'
import type { Api, Item } from '../api/items'
import { feedbackGenre, feedbackTitle, sendFeedback, undoFeedback, type FeedbackKind, type FeedbackMark } from '../api/livetvFeedback'
import { t } from '../i18n'
import { ChoiceDialog } from '../ui/ChoiceDialog'
import { toast } from '../ui/Toast'

/** So lange bleibt der Hinweis mit „Rückgängig“ stehen. */
const UNDO_VISIBLE_MS = 8_000

/**
 * „Heute im TV für dich“: Menü „Seltener vorschlagen“, „Weniger <Genre>“, „Nie mehr vorschlagen“, danach ein
 * kurzer Hinweis mit „Rückgängig“. [onChanged] zeichnet die Startseite neu (Karte weg bzw. wieder da).
 */
export function FeedbackDialog({ api, item, onClose, onChanged }: { api: Api; item: Item; onClose: () => void; onChanged: () => void }) {
  const [mark, setMark] = useState<FeedbackMark | null>(null)
  const genre = feedbackGenre(item)
  const title = feedbackTitle(item) ?? item.Name ?? ''

  useEffect(() => {
    if (!mark) return
    const timer = setTimeout(onClose, UNDO_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [mark])

  function choose(kind: FeedbackKind) {
    sendFeedback(api, item, kind)
      .then(result => {
        setMark(result)
        onChanged()
      })
      .catch(() => {
        toast(t.tvFeedbackFailed)
        onClose()
      })
  }

  function undo(current: FeedbackMark) {
    onClose()
    undoFeedback(api, item, current).then(onChanged).catch(() => toast(t.tvFeedbackFailed))
  }

  if (mark) {
    const message = mark.kind === 'nie' ? t.tvNeverDone : mark.kind === 'genre_weniger' ? t.tvGenreDone(mark.genre ?? genre ?? '') : t.tvLessDone
    return (
      <ChoiceDialog
        key="done"
        title={message}
        subtitle={title}
        initial="ok"
        choices={[
          { key: 'ok', label: t.ok, onPress: onClose },
          { key: 'undo', label: t.tvUndo, onPress: () => undo(mark) },
        ]}
      />
    )
  }
  return (
    <ChoiceDialog
      key="menu"
      title={title}
      initial="less"
      choices={[
        { key: 'less', label: t.tvLess, onPress: () => choose('weniger') },
        ...(genre ? [{ key: 'genre', label: t.tvLessGenre(genre), onPress: () => choose('genre_weniger') }] : []),
        { key: 'never', label: t.tvNever, onPress: () => choose('nie') },
        { key: 'cancel', label: t.cancel, onPress: onClose },
      ]}
    />
  )
}
