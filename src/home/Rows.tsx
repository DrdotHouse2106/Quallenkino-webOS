import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation'
import type { Api, Item } from '../api/items'
import { primaryUrl, thumbUrl } from '../api/images'
import { progress, title } from './format'

/** Initialen für Personen ohne Foto (Vor- und Nachname). */
export function initials(name: string): string {
  const parts = name.split(/[\s-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export interface RowData {
  key: string
  title: string
  items: Item[]
  kind: 'cards' | 'top10' | 'posters' | 'people' | 'episodes'
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
              focusKey={`card-${row.key}-${item.Id}`}
              api={api}
              item={item}
              kind={row.kind}
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
  focusKey: string
  api: Api
  item: Item
  kind: RowData['kind']
  rank?: number
  onFocus: (node: HTMLElement) => void
  onOpen: () => void
}

/** Karte im Querformat ohne Titel (der steht im Infobereich), bei Top 10 Plakat mit großer Zahl. */
function Card({ focusKey, api, item, kind, rank, onFocus, onOpen }: CardProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
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
  if (kind === 'posters') {
    const poster = primaryUrl(api, item, 240)
    return (
      <div ref={ref} class={`qk-poster ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <div class="qk-poster-image">{poster ? <img src={poster} alt="" loading="lazy" /> : <span>{title(item)}</span>}</div>
        <div class="qk-card-caption">{title(item)}</div>
      </div>
    )
  }
  if (kind === 'people') {
    const photo = primaryUrl(api, item, 200)
    return (
      <div ref={ref} class={`qk-person ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <div class="qk-person-photo">{photo ? <img src={photo} alt="" loading="lazy" /> : <span>{initials(item.Name ?? '')}</span>}</div>
        <div class="qk-card-caption">{item.Name}</div>
        {item.Role && <div class="qk-card-caption muted">{item.Role}</div>}
      </div>
    )
  }
  const image = thumbUrl(api, item)
  if (kind === 'episodes') {
    return (
      <div ref={ref} class={`qk-episode ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <div class="qk-card">
          {image ? <img src={image} alt="" loading="lazy" /> : <span class="qk-card-title">{item.Name}</span>}
          {percent !== null && <div class="qk-card-progress"><div style={{ width: `${percent}%` }} /></div>}
        </div>
        <div class="qk-card-caption">{item.IndexNumber != null ? `${item.IndexNumber}. ` : ''}{item.Name}</div>
      </div>
    )
  }
  return (
    <div ref={ref} class={`qk-card ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
      {image ? <img src={image} alt="" loading="lazy" /> : <span class="qk-card-title">{title(item)}</span>}
      {percent !== null && <div class="qk-card-progress"><div style={{ width: `${percent}%` }} /></div>}
    </div>
  )
}
