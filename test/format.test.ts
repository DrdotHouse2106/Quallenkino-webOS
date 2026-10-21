import { describe, expect, it } from 'vitest'
import { cleanOverview, facts, interleave, progress, subtitle, title } from '../src/home/format'
import { reasonKey } from '../src/api/items'
import { dailyPick } from '../src/home/useHomeData'

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


describe('Banner: tägliche Auswahl', () => {
  const pool = Array.from({ length: 30 }, (_, i) => i + 1)
  it('gleicher Tag und gleiches Profil ergeben dieselbe Auswahl, anderer Tag eine andere', () => {
    expect(dailyPick(pool, 6, '2026-10-21|u1')).toEqual(dailyPick(pool, 6, '2026-10-21|u1'))
    expect(new Set(dailyPick(pool, 6, '2026-10-21|u1')).size).toBe(6)
    expect(dailyPick(pool, 6, '2026-10-21|u1')).not.toEqual(dailyPick(pool, 6, '2026-10-22|u1'))
  })
  it('vordere Empfehlungen öfter, aber nicht nur die ersten', () => {
    const counts = new Array(31).fill(0)
    for (let day = 1; day <= 300; day++) dailyPick(pool, 4, `day-${day}|u1`).forEach(n => counts[n]++)
    expect(counts[1]).toBeGreaterThan(counts[20])
    expect(counts.slice(5).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  })
})
