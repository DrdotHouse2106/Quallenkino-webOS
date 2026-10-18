import { describe, expect, it } from 'vitest'
import { cleanOverview, facts, interleave, progress, subtitle, title } from '../src/home/format'
import { reasonKey } from '../src/api/items'

describe('Infobereich', () => {
  it('Folgen zeigen die Serie als Titel und „S1:F3 · Name“', () => {
    const episode = { Id: '1', Type: 'Episode', Name: 'Pilot', SeriesName: 'Frieren', ParentIndexNumber: 1, IndexNumber: 3 }
    expect(title(episode)).toBe('Frieren')
    expect(subtitle(episode)).toBe('S1:F3 · Pilot')
    expect(subtitle({ Id: '2', Type: 'Movie', Name: 'Venom' })).toBeNull()
  })

  it('Eckdaten wie in der Android-App', () => {
    const movie = { Id: '1', Type: 'Movie', ProductionYear: 2021, OfficialRating: 'FSK 12', RunTimeTicks: 97 * 600_000_000, CommunityRating: 6.4, Genres: ['Action', 'Science Fiction', 'Abenteuer'] }
    expect(facts(movie)).toEqual(['2021', 'FSK 12', '1 Std. 37 Min.', '★ 6,4', 'Action, Science Fiction'])
    expect(facts({ Id: '2', Type: 'Series', RunTimeTicks: 30 * 600_000_000 })).toEqual([])
  })

  it('Beschreibung ohne Links, HTML und wörtliche Zeilenumbrüche', () => {
    expect(cleanOverview('Mit [Elyas](http://x) <b>M’Barek</b>\\n\\nund  mehr')).toBe('Mit Elyas M’Barek und mehr')
  })

  it('Banner: Filme und Serien abwechselnd', () => {
    const list = [{ Id: 'm1', Type: 'Movie' }, { Id: 'm2', Type: 'Movie' }, { Id: 's1', Type: 'Series' }]
    expect(interleave(list).map(i => i.Id)).toEqual(['m1', 's1', 'm2'])
  })

  it('Fortschritt nur zwischen 0 und 100 %', () => {
    expect(progress({ Id: '1', UserData: { PlayedPercentage: 42 } })).toBe(42)
    expect(progress({ Id: '1', UserData: { PlayedPercentage: 100 } })).toBeNull()
  })

  it('Schlüssel der Begründungen', () => {
    expect(reasonKey('2A34445F-BE38-9AAA-2A27-61E2E0AA0160')).toBe('2a34445fbe389aaa2a2761e2e0aa0160')
  })
})
