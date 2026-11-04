import { byIds, get, items, type Api, type Item } from './items'
import { request } from './http'
import { discoverItem, type RawDiscoverItem } from './sections'

/** Welten (z. B. Marvel, Pixar) vom Plugin Local Recommendations. */
export interface World {
  Id: string
  Name: string
  ItemCount?: number
  ImageItemId?: string
  LogoUrl?: string
  TrailerItemId?: string
  /** Teile von Sammlungsnamen (klein geschrieben), die zur Welt gehören. */
  Collections?: string[]
  /** Reihenfolge nach Handlungszeit (Plugin ab 12.55), sonst null. */
  Chronology?: ChronologyEntry[] | null
  /** Eigene Abschnitte statt flacher Film-/Serien-Liste (Plugin ab 12.61). */
  HasSections?: boolean
}

/** Eintrag der Chronologie: Abschnitts-Überschrift oder Titel mit Zeitangabe (bei Serien ggf. nur Staffeln). */
export interface ChronologyEntry {
  Section?: string
  ItemId?: string
  /** Fehlender Titel (aus /Worlds/{id}/Missing, Plugin ab 12.60) – mit TMDb-ID statt Jellyfin-ID. */
  Missing?: boolean
  TmdbId?: number
  MediaType?: string
  Label?: string | null
  Seasons?: number[] | null
}

/** Welten mit weniger Titeln werden nicht gezeigt (wie Android). */
const MIN_ITEMS = 5
const base = (api: Api) => api.url.replace(/\/+$/, '')

export async function worlds(api: Api): Promise<World[]> {
  try {
    const list = await get<World[]>(api, '/LocalRecs/Worlds')
    return (Array.isArray(list) ? list : []).filter(w => w.Id && w.Name && (w.ItemCount ?? 0) >= MIN_ITEMS)
  } catch {
    return []
  }
}

/**
 * Logo der Welt (vom Server des Benutzers, nie in der App mitgeliefert). Ohne Token in der Adresse –
 * angezeigt wird es über useAuthorizedImage (Anmeldung im Header).
 */
export function worldLogo(api: Api, world: World): string | null {
  if (!world.LogoUrl) return null
  if (/^https?:\/\//i.test(world.LogoUrl)) return world.LogoUrl
  const path = world.LogoUrl.startsWith('/') ? world.LogoUrl : `/${world.LogoUrl}`
  return `${base(api)}${path}`
}

export function worldBackdrop(api: Api, world: World, width = 640): string | null {
  return world.ImageItemId ? `${base(api)}/Items/${world.ImageItemId}/Images/Backdrop?maxWidth=${width}&quality=80` : null
}

/** Welt als Karte für eine Reihe der Startseite. */
export function worldCard(world: World): Item {
  return { Id: `world-${world.Id}`, Name: world.Name, Type: 'World', World: world }
}

/** Das Plugin liefert Ids als Liste oder als { Items: [{ Id }] }. */
async function ids(api: Api, path: string): Promise<string[]> {
  const result = await get<unknown>(api, path).catch(() => null)
  const list = Array.isArray(result) ? result : (result as { Items?: unknown[] } | null)?.Items ?? []
  return list.map(entry => (typeof entry === 'string' ? entry : (entry as { Id?: string }).Id)).filter((id): id is string => !!id)
}

export interface WorldSection {
  key: string
  title: string
  items: Item[]
  /** Fehlende Titel dieses Abschnitts (persönlich sortiert); nur mit Jellyseerr anzeigen. */
  missing?: Item[]
}

/** Fehlende Titel als Karten: abgedunkelt, „Fehlt“, Grund (sonst Termin) unter der Karte. */
function missingCard(baseUrl: string, entry: RawDiscoverItem): Item {
  const item = discoverItem(baseUrl, entry, true)
  return { ...item, Missing: true, Badge: { label: 'Fehlt', color: '#5A5A5A' }, Caption: item.Discover?.reason ?? item.Caption }
}

/**
 * Bekannte fehlende Titel zuerst; wenig bekannte (Minor) erst nach „Alle anzeigen (n weitere)“ (testbar).
 * [rowKey] kennzeichnet die Karte, [expanded] zeigt alle.
 */
export function withShowMore(missing: Item[], rowKey: string, expanded: boolean, label: (n: number) => string): Item[] {
  const minor = missing.filter(item => item.Discover?.minor)
  if (expanded || !minor.length) return missing
  const main = missing.filter(item => !item.Discover?.minor)
  return [...main, { Id: `more-${rowKey}`, Name: label(minor.length), ImageUrl: null, ShowMore: rowKey }]
}

/** Abschnitte der Welt vom Plugin (ab 12.61): eigene Titel (neueste zuerst) und fehlende je Abschnitt (testbar). */
export function parseWorldSections(baseUrl: string, raw: { MissingEnabled?: boolean; Sections?: { Key?: string; Title?: string; ItemIds?: string[]; Missing?: RawDiscoverItem[] }[] } | null, loaded: Item[]): WorldSection[] {
  const norm = (id: string) => id.replace(/-/g, '').toLowerCase()
  const byId = new Map(loaded.map(item => [norm(item.Id), item]))
  return (raw?.Sections ?? [])
    .filter(section => section.Title)
    .map((section, index) => ({
      key: `section-${section.Key ?? index}`,
      title: section.Title!,
      items: (section.ItemIds ?? []).map(id => byId.get(norm(id))).filter((item): item is Item => !!item),
      missing: raw?.MissingEnabled === false ? [] : (section.Missing ?? []).filter(entry => entry.Title && entry.TmdbId != null).map(entry => missingCard(baseUrl, entry)),
    }))
    .filter(section => section.items.length > 0 || (section.missing?.length ?? 0) > 0)
}

async function pluginSections(api: Api, world: World): Promise<WorldSection[]> {
  type Raw = Parameters<typeof parseWorldSections>[1]
  const raw = await request<Raw>(api.url, `/LocalRecs/Worlds/${encodeURIComponent(world.Id)}/Sections`, { token: api.token, timeoutMs: 30_000 })
  const ids = [...new Set((raw?.Sections ?? []).flatMap(section => section.ItemIds ?? []))]
  const loaded = ids.length ? await byIds(api, ids) : []
  return parseWorldSections(api.url, raw, loaded)
}

/** Abschnitte der Welt-Seite in der Reihenfolge der Android-App; leere fallen weg. */
export async function worldSections(api: Api, world: World): Promise<WorldSection[]> {
  const id = encodeURIComponent(world.Id)
  const [forYou, added, movies, series, collections, sections] = await Promise.all([
    ids(api, `/LocalRecs/Worlds/${id}/Recommendations?limit=20`).then(list => byIds(api, list)).catch(() => []),
    ids(api, `/LocalRecs/Worlds/${id}/Items?sort=added&limit=20`).then(list => byIds(api, list)).catch(() => []),
    ids(api, `/LocalRecs/Worlds/${id}/Items?type=movies&sort=year&limit=40`).then(list => byIds(api, list)).catch(() => []),
    ids(api, `/LocalRecs/Worlds/${id}/Items?type=series&sort=year&limit=40`).then(list => byIds(api, list)).catch(() => []),
    collectionSections(api, world).catch(() => []),
    world.HasSections ? pluginSections(api, world).catch(() => [] as WorldSection[]) : Promise.resolve([] as WorldSection[]),
  ])
  // Abschnitte vom Plugin ersetzen die flache Film-/Serien-Liste (ohne Abschnitte bleibt sie)
  const flat = sections.length ? sections : [
    { key: 'movies', title: 'Filme', items: movies },
    { key: 'series', title: `Serien aus der Welt von ${world.Name}`, items: series },
  ]
  return [
    { key: 'for-you', title: 'Für dich in dieser Welt', items: forYou },
    { key: 'added', title: 'Neu dazugekommen', items: added },
    ...collections,
    ...flat,
  ].filter(section => section.items.length > 0 || (section.missing?.length ?? 0) > 0)
}

/** Eine Reihe je Sammlung der Welt (z. B. „Iron Man“), Teile in Erscheinungsreihenfolge. */
async function collectionSections(api: Api, world: World): Promise<WorldSection[]> {
  const parts = (world.Collections ?? []).map(c => c.toLowerCase()).filter(Boolean)
  if (!parts.length) return []
  const sets = await items(api, `/Users/${api.userId}/Items?IncludeItemTypes=BoxSet&Recursive=true&SortBy=SortName&EnableImages=false&Limit=1000`)
  const matching = parts
    .map(part => sets.find(set => (set.Name ?? '').toLowerCase().includes(part)))
    .filter((set, index, list): set is Item => !!set && list.indexOf(set) === index)
  const rows = await Promise.all(
    matching.map(async set => ({
      key: `set-${set.Id}`,
      title: collectionTitle(set.Name ?? ''),
      items: await items(api, `/Users/${api.userId}/Items?ParentId=${set.Id}&SortBy=PremiereDate&SortOrder=Ascending&Fields=Overview,ProductionYear&EnableImageTypes=Primary,Backdrop,Thumb&ImageTypeLimit=1&Limit=200`).catch(() => []),
    })),
  )
  return rows
}

/** „Iron Man Filmreihe“ → „Iron Man“. */
export function collectionTitle(name: string): string {
  return name.replace(/\s*[-–]?\s*\b(Filmreihe|Collection|Sammlung|Reihe)\b\s*/gi, ' ').trim() || name
}

/** „Staffel 1–2“, „Staffel 3“, „Staffel 1, 3“ (testbar). */
export function seasonsText(seasons?: number[] | null): string {
  if (!seasons?.length) return ''
  const sorted = [...seasons].sort((a, b) => a - b)
  const consecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)
  if (sorted.length === 1) return `Staffel ${sorted[0]}`
  return consecutive ? `Staffel ${sorted[0]}–${sorted[sorted.length - 1]}` : `Staffel ${sorted.join(', ')}`
}

/** Text unter der Karte: „2256–2258 · Staffel 1–2“ (testbar); ohne Zeitangabe nur die Staffeln. */
export function chronologyCaption(entry: ChronologyEntry): string {
  return [entry.Label ?? '', seasonsText(entry.Seasons)].filter(Boolean).join(' · ')
}

/** Chronologie in Abschnitte teilen (testbar): jede „Section“ beginnt eine neue Reihe. */
export function chronologyGroups(entries: ChronologyEntry[]): { title: string; entries: ChronologyEntry[] }[] {
  const groups: { title: string; entries: ChronologyEntry[] }[] = []
  for (const entry of entries) {
    if (entry.Section) groups.push({ title: entry.Section, entries: [] })
    else if (entry.ItemId || (entry.Missing && entry.TmdbId != null)) {
      if (!groups.length) groups.push({ title: 'Chronologisch', entries: [] })
      groups[groups.length - 1].entries.push(entry)
    }
  }
  return groups.filter(group => group.entries.length > 0)
}

/** Fehlende Titel einer Welt (Plugin ab 12.60): Karten und die vollständige, fertig sortierte Chronologie. */
export interface WorldMissing {
  items: Item[]
  chronology: ChronologyEntry[] | null
}

const missingKey = (mediaType?: string, tmdbId?: number) => `${mediaType === 'tv' ? 'tv' : 'movie'}-${tmdbId}`

/** Antwort von GET /LocalRecs/Worlds/{id}/Missing (testbar); null, wenn ausgeschaltet oder leer. */
export function parseMissing(baseUrl: string, raw: { Enabled?: boolean; Items?: RawDiscoverItem[]; Chronology?: ChronologyEntry[] | null } | null): WorldMissing | null {
  if (!raw || raw.Enabled === false) return null
  const items = (raw.Items ?? [])
    .filter(entry => entry.Title && entry.TmdbId != null)
    .map(entry => missingCard(baseUrl, entry))
  if (!items.length) return null
  return { items, chronology: raw.Chronology ?? null }
}

export async function worldMissing(api: Api, world: World): Promise<WorldMissing | null> {
  // Erster Abruf einer großen Welt kann ein paar Sekunden dauern
  const raw = await request<Parameters<typeof parseMissing>[1]>(api.url, `/LocalRecs/Worlds/${encodeURIComponent(world.Id)}/Missing`, { token: api.token, timeoutMs: 30_000 }).catch(() => null)
  return parseMissing(api.url, raw)
}

/**
 * Welt-Seite „Chronologisch (Handlungszeit)“: Abschnitte und Karten in Handlungsreihenfolge mit Zeitangabe.
 * Mit [missing] die Chronologie vom Server inklusive fehlender Titel an ihrer Stelle.
 */
export async function chronologySections(api: Api, world: World, missing?: WorldMissing | null): Promise<WorldSection[]> {
  const groups = chronologyGroups(missing?.chronology ?? world.Chronology ?? [])
  const missingById = new Map((missing?.items ?? []).map(item => [missingKey(item.Discover?.mediaType, item.Discover?.tmdbId), item]))
  const ids = [...new Set(groups.flatMap(g => g.entries.filter(e => e.ItemId).map(e => e.ItemId!)))]
  const loaded = await byIds(api, ids).catch(() => [] as Item[])
  const norm = (id: string) => id.replace(/-/g, '').toLowerCase()
  const byId = new Map(loaded.map(item => [norm(item.Id), item]))
  return groups.map((group, index) => ({
    key: `chrono-${index}`,
    title: group.title,
    items: group.entries
      .map((entry, n): Item | null => {
        if (entry.Missing) {
          const gap = missingById.get(missingKey(entry.MediaType, entry.TmdbId))
          return gap ? { ...gap, Caption: chronologyCaption(entry) || gap.Caption, CardKey: `${gap.Id}-${index}-${n}` } : null
        }
        const item = byId.get(norm(entry.ItemId!))
        return item ? { ...item, Caption: chronologyCaption(entry) || undefined, CardKey: `${item.Id}-${index}-${n}` } : null
      })
      .filter((item): item is Item => !!item),
  })).filter(section => section.items.length > 0)
}
