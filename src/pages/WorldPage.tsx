import { useEffect, useMemo, useState } from 'preact/hooks'
import type { Api, Item } from '../api/items'
import { backdropUrl } from '../api/images'
import { chronologySections, worldMissing, worlds as loadWorlds, worldLogo, worldSections, withShowMore, type World, type WorldMissing, type WorldSection } from '../api/worlds'
import { available as jellyseerrAvailable } from '../api/jellyseerr'
import { openItem } from '../nav/open'
import { ActionButton } from './ActionButton'
import { useAuthorizedImage } from '../ui/authImage'
import { HeroBackdrop } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { Page } from './Page'
import { focusSoon } from '../nav/focus'

/**
 * Seite einer Welt (wie Android): Logo bzw. Name fest oben, darunter „Für dich in dieser Welt“,
 * „Neu dazugekommen“, die Filmreihen, „Filme“ und „Serien aus der Welt von …“.
 */
export function WorldPage({ api, id }: { api: Api; id: string }) {
  const router = useRouter()
  const [world, setWorld] = useState<World | null>(null)
  const [sections, setSections] = useState<WorldSection[] | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)
  // „Chronologisch (Handlungszeit)“ nur, wenn die Welt eine Reihenfolge hat (Plugin ab 12.55); Standard bleibt das Erscheinungsjahr
  const [chronological, setChronological] = useState(false)
  const [chronoSections, setChronoSections] = useState<WorldSection[] | null>(null)
  // Fehlende Titel (Plugin ab 12.60) nur mit verknüpftem Jellyseerr – im Hintergrund, die Seite wartet nicht darauf
  const [missing, setMissing] = useState<WorldMissing | null>(null)
  const [seerr, setSeerr] = useState(false)
  // Reihen, in denen „Alle anzeigen“ die wenig bekannten fehlenden Titel aufgeklappt hat
  const [expanded, setExpanded] = useState<string[]>([])
  useEffect(() => {
    if (!world) return
    let active = true
    jellyseerrAvailable(api)
      .then(ok => {
        if (active) setSeerr(ok)
        return ok ? worldMissing(api, world) : null
      })
      .then(result => active && setMissing(result))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [world?.Id])
  const hasChronology = !!(missing?.chronology ?? world?.Chronology)?.some(entry => entry.ItemId || entry.Missing)
  useEffect(() => {
    if (!chronological || !world) return
    let active = true
    chronologySections(api, world, missing).then(result => active && setChronoSections(result)).catch(() => active && setChronoSections([]))
    return () => {
      active = false
    }
  }, [chronological, world?.Id, missing])
  // Normale Ansicht: Abschnitte vom Plugin zeigen ihre fehlenden Titel hinter den eigenen (persönlich sortiert);
  // ohne Abschnitte am Ende „Noch nicht in der Bibliothek“. Wenig bekannte erst nach „Alle anzeigen“.
  const normalSections = useMemo(() => {
    if (!sections) return null
    const more = (list: Item[], key: string) => withShowMore(list, key, expanded.includes(key), t.worldShowMore)
    const withGaps = sections.map(section => (seerr && section.missing?.length ? { ...section, items: [...section.items, ...more(section.missing, section.key)] } : section))
    const inSections = sections.some(section => section.missing?.length)
    return missing && !inSections ? [...withGaps, { key: 'missing', title: t.worldMissingRow, items: more(missing.items, 'missing') }] : withGaps
  }, [sections, missing, seerr, expanded])
  const shownSections = chronological ? chronoSections : normalSections

  useEffect(() => {
    let active = true
    loadWorlds(api).then(list => {
      const found = list.find(w => w.Id === id) ?? null
      if (!active) return
      setWorld(found)
      if (!found) return setSections([])
      worldSections(api, found).then(result => {
        if (!active) return
        setSections(result)
        if (result.length) focusSoon(`row-w-${result[0].key}`)
      })
    })
    return () => {
      active = false
    }
  }, [id])

  const backdropItem = (shownSections ?? sections)?.flatMap(s => s.items).find(item => backdropUrl(api, item))
  const logo = useAuthorizedImage(api, world ? worldLogo(api, world) : null)
  return (
    <Page focusKey="world" class="qk-details qk-world-page">
      <HeroBackdrop api={api} item={backdropItem ?? null} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />
      <div class="qk-page-main">
        <div class="qk-world-head">
          {logo && !logoFailed && <img class="qk-world-logo" src={logo} alt="" onError={() => setLogoFailed(true)} />}
          <div class={logo && !logoFailed ? 'qk-hero-subtitle' : 'qk-hero-title'}>{world?.Name}</div>
          {world?.ItemCount ? <div class="qk-hero-facts">{t.worldCount(world.ItemCount)}{missing ? ` · ${t.worldMissingCount(missing.items.length)}` : ''}</div> : null}
          {hasChronology && (
            <div class="qk-series-actions">
              <ActionButton focusKey="world-order-year" label={t.worldOrderYear} active={!chronological} onPress={() => setChronological(false)} />
              <ActionButton focusKey="world-order-chrono" label={t.worldOrderChrono} active={chronological} onPress={() => setChronological(true)} />
            </div>
          )}
        </div>
        <div class="qk-rows qk-page-rows">
          {shownSections === null && <p class="qk-muted">{t.loading}</p>}
          {shownSections?.length === 0 && <p class="qk-muted">{t.worldEmpty}</p>}
          {shownSections?.map(section => (
            <Row key={section.key} api={api} row={{ key: `w-${section.key}`, title: section.title, items: section.items, kind: 'posters' }}
              onFocusItem={() => {}} onOpen={item => {
                if (item.ShowMore) {
                  setExpanded(list => [...list, item.ShowMore!])
                  focusSoon(`row-w-${section.key}`)
                } else if (item.Missing) openItem(router, item)
                else router.push({ name: 'details', id: item.Id })
              }} />
          ))}
        </div>
      </div>
    </Page>
  )
}
