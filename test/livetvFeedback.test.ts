import { describe, expect, it } from 'vitest'
import { feedbackBody, feedbackGenre, undoPath } from '../src/api/livetvFeedback'
import type { Item } from '../src/api/items'

const tatort = { Id: 'c2b157ea3dc84584a30bcb96492eda16', Type: 'Program', Name: 'Tatort', Genres: ['Series', 'Krimi', 'Drama'] } as Item

describe('Heute im TV: Seltener vorschlagen', () => {
  it('Genre: erstes aussagekräftiges, allgemeine werden übersprungen', () => {
    expect(feedbackGenre(tatort)).toBe('Krimi')
    expect(feedbackGenre({ ...tatort, Genres: ['News'] })).toBeUndefined()
  })

  it('Body für den Server', () => {
    expect(feedbackBody(tatort, 'weniger')).toEqual({ ProgramId: tatort.Id, Title: 'Tatort', Art: 'weniger' })
    expect(feedbackBody(tatort, 'genre_weniger')).toEqual({ ProgramId: tatort.Id, Title: 'Tatort', Genre: 'Krimi', Art: 'genre_weniger' })
  })

  it('Rückgängig über Key bzw. Genre', () => {
    expect(undoPath({ kind: 'nie', key: 'tatort' }, tatort)).toBe('/LocalRecs/LiveTv/Feedback?key=tatort')
    expect(undoPath({ kind: 'genre_weniger', genre: 'Krimi' }, tatort)).toBe('/LocalRecs/LiveTv/Feedback?genre=Krimi')
  })
})
