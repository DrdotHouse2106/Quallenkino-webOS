import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation'
import { memo } from 'preact/compat'
import { useRef } from 'preact/hooks'
import type { Api, Item } from '../api/items'
import { primaryUrl, thumbUrl } from '../api/images'
import { progress, title } from './format'
import { Img } from '../ui/Img'
import { worldBackdrop, worldLogo } from '../api/worlds'
import { useAuthorizedImage } from '../ui/authImage'
import { clock, dayLabel, programProgress } from '../api/livetv'

/** Initialen für Personen ohne Foto (Vor- und Nachname). */
export function initials(name: string): string {
  const parts = name.split(/[\s-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export interface RowData {
  key: string
  title: string
  items: Item[]
  kind: 'cards' | 'top10' | 'posters' | 'people' | 'episodes' | 'worlds'
}

interface RowProps {
  api: Api
  row: RowData
  onFocusItem: (item: Item) => void
  onOpen: (item: Item) => void
  /** Pfeiltasten an einer Karte; true = normal weiter navigieren. */
  onArrow?: (direction: string) => boolean
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

/**
 * Reihe (mit memo: zeichnet nur neu, wenn sich Inhalt oder Server ändern – nicht bei jedem Fokuswechsel
 * auf der Startseite). Die Rückrufe laufen über eine Referenz und sind so immer aktuell.
 */
export const Row = memo(RowView, (a, b) => a.api === b.api && a.row === b.row)

function RowView({ api, row, onFocusItem, onOpen, onArrow }: RowProps) {
  const { ref, focusKey } = useFocusable({ focusKey: `row-${row.key}`, trackChildren: true, saveLastFocusedChild: true })
  const latest = useRef({ onFocusItem, onOpen, onArrow })
  latest.current = { onFocusItem, onOpen, onArrow }
  const arrow = useRef((direction: string) => (latest.current.onArrow ? latest.current.onArrow(direction) : true)).current
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-row">
        {row.title && <div class="qk-row-title">{row.title}</div>}
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
                latest.current.onFocusItem(item)
              }}
              onOpen={() => latest.current.onOpen(item)}
              onArrow={arrow}
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
  onArrow?: (direction: string) => boolean
}

/** Karte im Querformat ohne Titel (der steht im Infobereich), bei Top 10 Plakat mit großer Zahl. */
/** Karte (mit memo: zeichnet nur neu, wenn sich Titel, Art oder Platz ändern). */
const Card = memo(CardView, (a, b) => a.focusKey === b.focusKey && a.api === b.api && a.item === b.item && a.kind === b.kind && a.rank === b.rank)

function CardView({ focusKey, api, item, kind, rank, onFocus, onOpen, onArrow }: CardProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onEnterPress: onOpen,
    onArrowPress: direction => (onArrow ? onArrow(direction) : true),
    onFocus: layout => onFocus(layout.node as HTMLElement),
  })
  const percent = progress(item)
  const worldLogoSrc = useAuthorizedImage(api, item.World ? worldLogo(api, item.World) : null)
  if (item.World) {
    // Welt: Hintergrund eines Titels abgedunkelt, darauf das Logo (vom Server) bzw. der Name
    const logo = worldLogoSrc
    const backdrop = worldBackdrop(api, item.World)
    return (
      <div ref={ref} class={`qk-card qk-world ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        {backdrop && <img class="qk-world-backdrop" src={backdrop} alt="" loading="lazy" />}
        <div class="qk-world-shade" />
        <Img src={logo} fallback={<span class="qk-world-name large">{item.World.Name}</span>} />
        {logo && <span class="qk-world-name">{item.World.Name}</span>}
      </div>
    )
  }
  if (rank !== undefined) {
    const poster = primaryUrl(api, item, 240)
    return (
      <div ref={ref} class={`qk-top10 ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <span class="qk-top10-rank">{rank}</span>
        <div class="qk-top10-poster"><Img src={poster} fallback={<span>{title(item)}</span>} /></div>
      </div>
    )
  }
  if (kind === 'posters') {
    const poster = primaryUrl(api, item, 240)
    return (
      <div ref={ref} class={`qk-poster ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <div class="qk-poster-image">
          <Img src={poster} fallback={<span>{title(item)}</span>} />
          {item.Badge && <span class="qk-badge" style={{ background: item.Badge.color }}>{item.Badge.label}</span>}
        </div>
        <div class="qk-card-caption">{title(item)}</div>
        {item.ProductionYear && item.ImageUrl !== undefined ? <div class="qk-card-caption muted">{item.ProductionYear}</div> : null}
      </div>
    )
  }
  if (kind === 'people') {
    const photo = primaryUrl(api, item, 200)
    return (
      <div ref={ref} class={`qk-person ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <div class="qk-person-photo"><Img src={photo} fallback={<span>{initials(item.Name ?? '')}</span>} /></div>
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
          <Img src={image} fallback={<span class="qk-card-title">{item.Name}</span>} />
          {percent !== null && <div class="qk-card-progress"><div style={{ width: `${percent}%` }} /></div>}
        </div>
        <div class="qk-card-caption">{item.IndexNumber != null ? `${item.IndexNumber}. ` : ''}{item.Name}</div>
      </div>
    )
  }
  if (item.StartDate && item.ChannelName) {
    // Sendung: Titel und „Heute 20:15 · Sender“ unter dem Bild (wie Android)
    return (
      <div ref={ref} class={`qk-episode ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
        <div class="qk-card">
          <Img src={image} fallback={<span class="qk-card-title">{item.Name}</span>} />
          {programProgress(item) !== null && <div class="qk-card-progress"><div style={{ width: `${programProgress(item)}%` }} /></div>}
        </div>
        <div class="qk-card-caption">{item.Name}</div>
        <div class="qk-card-caption muted">{startLine(item)}</div>
      </div>
    )
  }
  return (
    <div ref={ref} class={`qk-card ${focused ? 'focused' : ''}`} onClick={onOpen} onMouseEnter={() => focusSelf()}>
      <Img src={image} fallback={<span class="qk-card-title">{title(item)}</span>} />
      {percent !== null && <div class="qk-card-progress"><div style={{ width: `${percent}%` }} /></div>}
    </div>
  )
}

/** „Heute 20:15 · Das Erste“ bzw. „Läuft · Das Erste“. */
function startLine(item: Item): string {
  const start = new Date(item.StartDate!)
  const running = programProgress(item) !== null
  return [running ? 'Läuft' : `${dayLabel(start)} ${clock(start)}`, item.ChannelName].filter(Boolean).join(' · ')
}
