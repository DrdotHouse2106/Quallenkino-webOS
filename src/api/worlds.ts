import { byIds, get, items, type Api, type Item } from './items'

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
}

/** Eintrag der Chronologie: Abschnitts-Überschrift oder Titel mit Zeitangabe (bei Serien ggf. nur Staffeln). */
export interface ChronologyEntry {
  Section?: string
  ItemId?: string
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
}

/** Abschnitte der Welt-Seite in der Reihenfolge der Android-App; leere fallen weg. */
export async function worldSections(api: Api, world: World): Promise<WorldSection[]> {
  const id = encodeURIComponent(world.Id)
  const [forYou, added, movies, series, collections] = await Promise.all([
    ids(api, `/LocalRecs/Worlds/${id}/Recommendations?limit=20`).then(list => byIds(api, list)).catch(() => []),
    ids(api, `/LocalRecs/Worlds/${id}/Items?sort=added&limit=20`).then(list => byIds(api, list)).catch(() => []),
    ids(api, `/LocalRecs/Worlds/${id}/Items?type=movies&sort=year&limit=40`).then(list => byIds(api, list)).catch(() => []),
    ids(api, `/LocalRecs/Worlds/${id}/Items?type=series&sort=year&limit=40`).then(list => byIds(api, list)).catch(() => []),
    collectionSections(api, world).catch(() => []),
  ])
  return [
    { key: 'for-you', title: 'Für dich in dieser Welt', items: forYou },
    { key: 'added', title: 'Neu dazugekommen', items: added },
    ...collections,
    { key: 'movies', title: 'Filme', items: movies },
    { key: 'series', title: `Serien aus der Welt von ${world.Name}`, items: series },
  ].filter(section => section.items.length > 0)
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
    else if (entry.ItemId) {
      if (!groups.length) groups.push({ title: 'Chronologisch', entries: [] })
      groups[groups.length - 1].entries.push(entry)
    }
  }
  return groups.filter(group => group.entries.length > 0)
}

/** Welt-Seite „Chronologisch (Handlungszeit)“: Abschnitte und Karten in Handlungsreihenfolge mit Zeitangabe. */
export async function chronologySections(api: Api, world: World): Promise<WorldSection[]> {
  const groups = chronologyGroups(world.Chronology ?? [])
  const ids = [...new Set(groups.flatMap(g => g.entries.map(e => e.ItemId!)))]
  const loaded = await byIds(api, ids).catch(() => [] as Item[])
  const norm = (id: string) => id.replace(/-/g, '').toLowerCase()
  const byId = new Map(loaded.map(item => [norm(item.Id), item]))
  return groups.map((group, index) => ({
    key: `chrono-${index}`,
    title: group.title,
    items: group.entries
      .map((entry, n): Item | null => {
        const item = byId.get(norm(entry.ItemId!))
        return item ? { ...item, Caption: chronologyCaption(entry) || undefined, CardKey: `${item.Id}-${index}-${n}` } : null
      })
      .filter((item): item is Item => !!item),
  })).filter(section => section.items.length > 0)
}
