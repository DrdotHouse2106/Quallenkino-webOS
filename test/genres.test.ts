import { describe, expect, it } from 'vitest'
import { pickGenres } from '../src/home/useHomeData'

describe('Genre-Zeilen', () => {
  it('höchstens 12 Genres, ohne Doppelte (Groß-/Kleinschreibung egal)', () => {
    const names = ['Action', 'action', 'Drama', ...Array.from({ length: 20 }, (_, i) => `Genre ${i}`)]
    const picked = pickGenres(names)
    expect(picked).toHaveLength(12)
    expect(new Set(picked.map(n => n.toLowerCase())).size).toBe(12)
  })

  it('wenige Genres: alle, gemischt', () => {
    expect(pickGenres(['A', 'B', 'C'], 12, () => 0).sort()).toEqual(['A', 'B', 'C'])
  })
})
