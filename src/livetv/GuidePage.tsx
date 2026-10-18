import { FocusContext, setFocus, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Api, Item } from '../api/items'
import { airing, channels as loadChannels, clock, credits as loadCredits, creditLines, matchesFilter, programs as loadPrograms, type Credits, type GuideFilter } from '../api/livetv'
import { cleanOverview } from '../home/format'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { Img } from '../ui/Img'
import { Page } from '../pages/Page'

/** Raster: so viele Stunden ab jetzt, sichtbar sind 2,5 Stunden, je Minute so viele Pixel. */
const HOURS = 12
const VISIBLE_MINUTES = 150
const PX_PER_MINUTE = 10
const ROW_HEIGHT = 92
const VISIBLE_ROWS = 6
/** Sendungen werden für so viele Sender auf einmal geladen. */
const BATCH = 20

const FILTERS: { key: GuideFilter; label: string }[] = [
  { key: 'all', label: t.guideAll },
  { key: 'favorites', label: t.guideFavorites },
  { key: 'movies', label: t.guideMovies },
  { key: 'series', label: t.guideSeries },
  { key: 'news', label: t.guideNews },
  { key: 'kids', label: t.guideKids },
  { key: 'sports', label: t.guideSports },
]

const minutesBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60_000

/** Beginn des Rasters: jetzt, abgerundet auf :00 bzw. :30. */
export function guideStart(now = new Date()): Date {
  const start = new Date(now)
  start.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0)
  return start
}

/** Sendung, die zu einer Zeit läuft (sonst die nächste danach, sonst die letzte). */
export function programAt(list: Item[], time: Date): number {
  if (list.length === 0) return -1
  const at = list.findIndex(p => p.StartDate && p.EndDate && Date.parse(p.StartDate) <= time.getTime() && Date.parse(p.EndDate) > time.getTime())
  if (at >= 0) return at
  const after = list.findIndex(p => p.StartDate && Date.parse(p.StartDate) > time.getTime())
  return after >= 0 ? after : list.length - 1
}

/**
 * Programmführer wie in der Android-App: Sender untereinander, Sendungen als Zeitleiste.
 * Das Raster steuert die Pfeiltasten selbst (bei vielen Sendern wären es sonst Tausende Knöpfe);
 * gezeichnet werden nur die sichtbaren Zeilen. Oben: Filter und die ausgewählte Sendung mit Besetzung.
 */
export function GuidePage({ api }: { api: Api }) {
  return (
    <Page focusKey="guide" class="qk-guide-page">
      <Guide api={api} />
    </Page>
  )
}

/** Inhalt des Programmführers – innerhalb der Seite, damit der Fokus in ihr bleibt. */
function Guide({ api }: { api: Api }) {
  const router = useRouter()
  const start = useMemo(() => guideStart(), [])
  const end = useMemo(() => new Date(start.getTime() + HOURS * 3_600_000), [start])
  const [allChannels, setAllChannels] = useState<Item[] | null>(null)
  const [filter, setFilter] = useState<GuideFilter>('all')
  const [programs, setPrograms] = useState<Record<string, Item[]>>({})
  const requested = useRef(new Set<string>())
  const [row, setRow] = useState(0)
  const [cursor, setCursor] = useState(() => new Date())
  const [offset, setOffset] = useState(0)
  const [gridFocused, setGridFocused] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [creditsFor, setCreditsFor] = useState<{ id: string; value: Credits | null } | null>(null)

  useEffect(() => {
    loadChannels(api).then(setAllChannels).catch(() => setAllChannels([]))
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [api])

  const channelList = useMemo(
    () => (allChannels ?? []).filter(c => filter !== 'favorites' || c.UserData?.IsFavorite),
    [allChannels, filter],
  )

  // Sendungen für die Sender um die Auswahl herum nachladen
  useEffect(() => {
    if (!channelList.length) return
    const from = Math.max(0, row - 2)
    const missing = channelList.slice(from, from + BATCH).filter(c => !requested.current.has(c.Id))
    if (!missing.length) return
    missing.forEach(c => requested.current.add(c.Id))
    loadPrograms(api, missing.map(c => c.Id), start, end)
      .then(list => {
        const grouped: Record<string, Item[]> = {}
        for (const c of missing) grouped[c.Id] = []
        for (const p of list) if (p.ChannelId && grouped[p.ChannelId]) grouped[p.ChannelId].push(p)
        setPrograms(current => ({ ...current, ...grouped }))
      })
      .catch(() => missing.forEach(c => requested.current.delete(c.Id)))
  }, [channelList, row])

  const channel = channelList[row]
  const list = channel ? programs[channel.Id] ?? [] : []
  const index = programAt(list, cursor)
  const selected = gridFocused && index >= 0 ? list[index] : null

  // Sichtbaren Ausschnitt nachführen
  useEffect(() => {
    if (!selected?.StartDate) return
    const startMin = Math.max(0, minutesBetween(start, new Date(selected.StartDate)))
    if (startMin < offset) setOffset(Math.max(0, startMin))
    else if (startMin > offset + VISIBLE_MINUTES - 40) setOffset(Math.max(0, startMin - 30))
  }, [selected?.Id])

  // Besetzung der ausgewählten Sendung (kurz verzögert, damit schnelles Blättern nicht bremst)
  useEffect(() => {
    if (!selected) return
    if (creditsFor?.id === selected.Id) return
    const timer = setTimeout(() => {
      loadCredits(api, selected.Id).then(value => setCreditsFor({ id: selected.Id, value }))
    }, 400)
    return () => clearTimeout(timer)
  }, [selected?.Id])

  function move(direction: string): boolean {
    if (!channelList.length) return true
    if (direction === 'up') {
      if (row === 0) return true
      setRow(row - 1)
      return false
    }
    if (direction === 'down') {
      if (row < channelList.length - 1) setRow(row + 1)
      return false
    }
    if (index < 0) return direction === 'left'
    if (direction === 'left') {
      const previous = list[index - 1]
      if (!previous?.StartDate || !previous.EndDate || Date.parse(previous.EndDate) <= start.getTime()) return false
      setCursor(new Date(Math.max(Date.parse(previous.StartDate), start.getTime())))
      return false
    }
    const next = list[index + 1]
    if (next?.StartDate) setCursor(new Date(next.StartDate))
    return false
  }

  const { ref, focusKey, focused } = useFocusable({
    focusKey: 'guide-grid',
    onArrowPress: move,
    onEnterPress: () => selected && router.push({ name: 'program', id: selected.Id }),
    onFocus: () => setGridFocused(true),
    onBlur: () => setGridFocused(false),
  })

  useEffect(() => {
    if (allChannels) requestAnimationFrame(() => setFocus(channelList.length ? 'guide-grid' : 'guide-filter-all'))
  }, [allChannels === null])

  const firstRow = Math.max(0, Math.min(row - 1, channelList.length - VISIBLE_ROWS))
  const shown = channelList.slice(firstRow, firstRow + VISIBLE_ROWS)
  const lines = creditsFor && selected && creditsFor.id === selected.Id ? creditLines(creditsFor.value) : []
  const nowLeft = minutesBetween(start, now) * PX_PER_MINUTE
  const hours: Date[] = []
  for (let m = 0; m <= HOURS * 60; m += 30) hours.push(new Date(start.getTime() + m * 60_000))

  return (
      <div class="qk-page-main">
        <div class="qk-guide-head">
          <h1>{t.guideTitle}</h1>
          <FilterBar value={filter} onChange={value => { setFilter(value); setRow(0) }} />
        </div>
        <div class="qk-guide-info">
          {selected ? (
            <>
              <div class="qk-guide-info-title">{selected.Name}{selected.EpisodeTitle ? ` – ${selected.EpisodeTitle}` : ''}</div>
              <div class="qk-guide-info-meta">{[airing(selected, now), selected.ProductionYear, selected.OfficialRating].filter(Boolean).join('  ·  ')}</div>
              {lines.map(line => <div class="qk-guide-info-credits">{line}</div>)}
              <div class="qk-guide-info-overview">{cleanOverview(selected.Overview)}</div>
            </>
          ) : (
            <div class="qk-muted">{allChannels === null ? t.loading : channelList.length ? t.guideHint : filter === 'favorites' ? t.guideNoFavorites : t.guideNoChannels}</div>
          )}
        </div>
        <FocusContext.Provider value={focusKey}>
          <div ref={ref} class={`qk-guide ${focused ? 'focused' : ''}`}>
            <div class="qk-guide-times">
              <div class="qk-guide-times-track" style={{ transform: `translateX(${-offset * PX_PER_MINUTE}px)` }}>
                {hours.map(h => <span style={{ left: `${minutesBetween(start, h) * PX_PER_MINUTE}px` }}>{clock(h)}</span>)}
              </div>
            </div>
            {shown.map((c, i) => {
              const rowIndex = firstRow + i
              const items = programs[c.Id]
              return (
                <div key={c.Id} class={`qk-guide-row ${rowIndex === row && focused ? 'current' : ''}`} style={{ height: `${ROW_HEIGHT}px` }}>
                  <div class="qk-guide-channel">
                    <span class="qk-guide-channel-logo"><Img src={channelLogo(api, c)} lazy={false} fallback={<span>{c.Number ?? ''}</span>} /></span>
                    <span class="qk-guide-channel-name">{c.UserData?.IsFavorite ? '★ ' : ''}{c.Name}</span>
                  </div>
                  <div class="qk-guide-programs">
                    <div class="qk-guide-programs-track" style={{ transform: `translateX(${-offset * PX_PER_MINUTE}px)` }}>
                      {!items && <span class="qk-guide-empty">{t.loading}</span>}
                      {items?.length === 0 && <span class="qk-guide-empty">{t.guideNoData}</span>}
                      {items?.map(p => {
                        const left = Math.max(0, minutesBetween(start, new Date(p.StartDate!)))
                        const right = Math.min(HOURS * 60, minutesBetween(start, new Date(p.EndDate!)))
                        const isSelected = focused && rowIndex === row && p.Id === selected?.Id
                        return (
                          <div
                            key={p.Id}
                            class={`qk-guide-cell ${isSelected ? 'selected' : ''} ${matchesFilter(p, filter) ? '' : 'dimmed'} ${p.EndDate && Date.parse(p.EndDate) <= now.getTime() ? 'past' : ''}`}
                            style={{
                              left: `${left * PX_PER_MINUTE}px`,
                              width: `${Math.max(0, (right - left) * PX_PER_MINUTE - 4)}px`,
                              // Titel bleibt lesbar, wenn die Sendung links aus dem Bild ragt
                              paddingLeft: `${12 + Math.max(0, (offset - left) * PX_PER_MINUTE)}px`,
                            }}
                          >
                            <div class="qk-guide-cell-title">{p.Name}</div>
                            <div class="qk-guide-cell-time">{clock(new Date(p.StartDate!))}</div>
                          </div>
                        )
                      })}
                      {nowLeft >= 0 && <div class="qk-guide-now" style={{ left: `${nowLeft}px` }} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </FocusContext.Provider>
      </div>
  )
}

export function channelLogo(api: Api, channel: Item): string | null {
  const tag = channel.ImageTags?.Primary
  return tag ? `${api.url.replace(/\/+$/, '')}/Items/${channel.Id}/Images/Primary?tag=${encodeURIComponent(tag)}&maxHeight=80&quality=90` : null
}

function FilterBar({ value, onChange }: { value: GuideFilter; onChange: (filter: GuideFilter) => void }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'guide-filters', trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-guide-filters">
        {FILTERS.map(f => <FilterButton key={f.key} focusKey={`guide-filter-${f.key}`} label={f.label} selected={value === f.key} onPress={() => onChange(f.key)} />)}
      </div>
    </FocusContext.Provider>
  )
}

function FilterButton({ focusKey, label, selected, onPress }: { focusKey: string; label: string; selected: boolean; onPress: () => void }) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey, onEnterPress: onPress })
  return <div ref={ref} class={`qk-chip ${focused ? 'focused' : ''} ${selected ? 'selected' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>{label}</div>
}
