import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation'
import type { Api, Item } from '../api/items'
import { primaryUrl, thumbUrl } from '../api/images'
import { progress, title } from './format'

export interface RowData {
  key: string
  title: string
  items: Item[]
  kind: 'cards' | 'top10'
}

interface RowProps {
  api: Api
  row: RowData
  onFocusItem: (item: Item) => void
  onOpen: (item: Item) => void
}

/** Ausgewählte Reihe ganz nach oben schieben, ausgewählte Karte waagerecht ins Bild holen. */
function scrollIntoPlace(node: HTMLElement) {
  const row = node.closest('.qk-row') as HTMLElement | null
  const rows = row?.parentElement
  if (row && rows) rows.scrollTop = row.offsetTop
  const track = node.parentElement
  if (!track) return
  const margin = 64
  if (node.offsetLeft - margin < track.scrollLeft) track.scrollLeft = Math.max(0, node.offsetLeft - margin)
  else if (node.offsetLeft + node.offsetWidth + margin > track.scrollLeft + track.clientWidth) {
    track.scrollLeft = node.offsetLeft + node.offsetWidth + margin - track.clientWidth
  }
}

export function Row({ api, row, onFocusItem, onOpen }: RowProps) {
  const { ref, focusKey } = useFocusable({ focusKey: `row-${row.key}`, trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-row">
        <div class="qk-row-title">{row.title}</div>
        <div class="qk-row-track">
          {row.items.map((item, index) => (
            <Card
              key={item.Id}
              api={api}
              item={item}
              rank={row.kind === 'top10' ? index + 1 : undefined}
              onFocus={node => {
                scrollIntoPlace(node)
                onFocusItem(item)
              }}
              onOpen={() => onOpen(item)}
            />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  )
}

interface CardProps {
  api: Api
  item: Item
  rank?: number
  onFocus: (node: HTMLElement) => void
  onOpen: () => void
}

/** Karte im Querformat ohne Titel (der steht im Infobereich), bei Top 10 Plakat mit großer Zahl. */
function Card({ api, item, rank, onFocus, onOpen }: CardProps) {
  const { ref, focused, focusSelf } = useFocusable({
    onEnterPress: onOpen,
    onFocus: layout => onFocus(layout.node as HTMLElement),
  })
  const percent = progress(item)
  if (rank !== undefined) {
    const poster = primaryUrl(api, item, 240)
    return (
      <div ref={ref} class={`qk-top10 ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <span class="qk-top10-rank">{rank}</span>
        <div class="qk-top10-poster">{poster ? <img src={poster} alt="" loading="lazy" /> : <span>{title(item)}</span>}</div>
      </div>
    )
  }
  const image = thumbUrl(api, item)
  return (
    <div ref={ref} class={`qk-card ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
      {image ? <img src={image} alt="" loading="lazy" /> : <span class="qk-card-title">{title(item)}</span>}
      {percent !== null && <div class="qk-card-progress"><div style={{ width: `${percent}%` }} /></div>}
    </div>
  )
}
