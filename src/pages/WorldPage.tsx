import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'preact/hooks'
import type { Api } from '../api/items'
import { backdropUrl } from '../api/images'
import { worlds as loadWorlds, worldLogo, worldSections, type World, type WorldSection } from '../api/worlds'
import { HeroBackdrop } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { Page } from './Page'

/**
 * Seite einer Welt (wie Android): Logo bzw. Name fest oben, darunter „Für dich in dieser Welt“,
 * „Neu dazugekommen“, die Filmreihen, „Filme“ und „Serien aus der Welt von …“.
 */
export function WorldPage({ api, id }: { api: Api; id: string }) {
  const router = useRouter()
  const [world, setWorld] = useState<World | null>(null)
  const [sections, setSections] = useState<WorldSection[] | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)

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
        if (result.length) requestAnimationFrame(() => setFocus(`row-w-${result[0].key}`))
      })
    })
    return () => {
      active = false
    }
  }, [id])

  const backdropItem = sections?.flatMap(s => s.items).find(item => backdropUrl(api, item))
  const logo = world ? worldLogo(api, world) : null
  return (
    <Page focusKey="world" class="qk-details qk-world-page">
      <HeroBackdrop api={api} item={backdropItem ?? null} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />
      <div class="qk-page-main">
        <div class="qk-world-head">
          {logo && !logoFailed && <img class="qk-world-logo" src={logo} alt="" onError={() => setLogoFailed(true)} />}
          <div class={logo && !logoFailed ? 'qk-hero-subtitle' : 'qk-hero-title'}>{world?.Name}</div>
          {world?.ItemCount ? <div class="qk-hero-facts">{t.worldCount(world.ItemCount)}</div> : null}
        </div>
        <div class="qk-rows qk-page-rows">
          {sections === null && <p class="qk-muted">{t.loading}</p>}
          {sections?.length === 0 && <p class="qk-muted">{t.worldEmpty}</p>}
          {sections?.map(section => (
            <Row key={section.key} api={api} row={{ key: `w-${section.key}`, title: section.title, items: section.items, kind: 'posters' }}
              onFocusItem={() => {}} onOpen={item => router.push({ name: 'details', id: item.Id })} />
          ))}
        </div>
      </div>
    </Page>
  )
}
