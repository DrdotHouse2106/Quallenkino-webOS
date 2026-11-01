import { describe, expect, it } from 'vitest'
import { holdScreensaver, videoActive } from '../src/platform/videoHold'

const doc = (videos: Array<{ paused: boolean; ended: boolean }>) => ({ querySelectorAll: () => videos }) as never

describe('Bildschirmschoner während Videos', () => {
  it('ein laufendes Video hält ihn zurück, ein angehaltenes oder beendetes nicht', () => {
    expect(videoActive(doc([{ paused: false, ended: false }]))).toBe(true)
    expect(videoActive(doc([{ paused: true, ended: false }, { paused: false, ended: true }]))).toBe(false)
  })

  it('YouTube-Vorschau hält ihn zurück, bis sie freigegeben wird (auch bei doppelter Freigabe)', () => {
    const release = holdScreensaver()
    expect(videoActive(doc([]))).toBe(true)
    release()
    release()
    expect(videoActive(doc([]))).toBe(false)
  })
})
