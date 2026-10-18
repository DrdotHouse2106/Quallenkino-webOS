import { describe, expect, it } from 'vitest'
import { castOf, ratingTarget } from '../src/api/items'
import { initials } from '../src/home/Rows'
import { formatDate } from '../src/pages/PersonPage'

describe('Detailseite', () => {
  it('Besetzung: Schauspieler vor Regie, Regie mit Beschriftung', () => {
    const cast = castOf({
      Id: 'x',
      People: [
        { Id: 'd', Name: 'Bora Dagtekin', Type: 'Director' },
        { Id: 'a', Name: 'Elyas M’Barek', Role: 'Zeki Müller', Type: 'Actor', PrimaryImageTag: 't' },
        { Id: 'p', Name: 'Jemand', Type: 'Producer' },
      ],
    })
    expect(cast.map(p => p.Id)).toEqual(['a', 'd'])
    expect(cast[0].ImageTags?.Primary).toBe('t')
    expect(cast[1].Role).toBe('Regie')
  })

  it('Folgen werden über ihre Serie bewertet', () => {
    expect(ratingTarget({ Id: 'e', Type: 'Episode', SeriesId: 's' })).toBe('s')
    expect(ratingTarget({ Id: 'm', Type: 'Movie' })).toBe('m')
    expect(ratingTarget({ Id: 'p', Type: 'Person' })).toBeNull()
  })
})

describe('Personenseite', () => {
  it('Geburtsdatum deutsch', () => {
    expect(formatDate('1982-05-29T00:00:00.0000000Z')).toBe('29.5.1982')
    expect(formatDate(undefined)).toBeNull()
  })

  it('Initialen aus Vor- und Nachname', () => {
    expect(initials('Elyas M’Barek')).toBe('EM')
    expect(initials('Helmfried von Lüttichau')).toBe('HL')
    expect(initials('Cher')).toBe('C')
  })
})
