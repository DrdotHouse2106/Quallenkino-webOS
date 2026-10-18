import type { MediaSource, MediaStream } from './playback'
import { canPlayAudio } from './profile'
import type { AudioMode, SubtitleMode } from '../settings'

/** Sprachen, die als „eigene Sprache“ gelten (Deutsch). */
const OWN_LANGUAGES = ['ger', 'deu', 'de', 'german', 'deutsch']

export function isOwnLanguage(language?: string): boolean {
  return !!language && OWN_LANGUAGES.includes(language.toLowerCase())
}

export const audioStreams = (source: MediaSource) => (source.MediaStreams ?? []).filter(s => s.Type === 'Audio')
export const subtitleStreams = (source: MediaSource) => (source.MediaStreams ?? []).filter(s => s.Type === 'Subtitle')

/**
 * Tonspur in der eigenen Sprache, sonst die Vorgabe des Servers. Unter mehreren deutschen Spuren
 * gewinnt eine, die der Fernseher selbst kann (AC3 statt DTS) – dann muss nichts umgerechnet werden;
 * danach die Vorgabe des Servers und die als Standard markierte.
 */
export function pickAudio(source: MediaSource, mode: AudioMode = 'own'): number | undefined {
  const audio = audioStreams(source)
  if (mode === 'original') {
    // Originalton: erste Spur in fremder Sprache (bei deutschen Filmen gibt es keine → deutsch)
    const foreign = audio.filter(s => s.Language && !isOwnLanguage(s.Language) && !/kommentar|commentary/i.test(s.Title ?? s.DisplayTitle ?? ''))
    const pick = foreign.find(s => canPlayAudio(s.Codec)) ?? foreign[0]
    if (pick) return pick.Index
  }
  const own = audio.filter(s => isOwnLanguage(s.Language))
  const rank = (s: MediaStream) =>
    (canPlayAudio(s.Codec) ? 0 : 4) + (s.Index === source.DefaultAudioStreamIndex ? 0 : 2) + (s.IsDefault ? 0 : 1)
  const best = [...own].sort((a, b) => rank(a) - rank(b) || a.Index - b.Index)[0]
  return (best ?? audio.find(s => s.Index === source.DefaultAudioStreamIndex) ?? audio[0])?.Index
}

/**
 * Intelligente Untertitel (wie in der Android-App): Ton in der eigenen Sprache → keine Untertitel,
 * außer erzwungene. Fremde Sprache → deutsche Untertitel, sonst die Vorgabe des Servers.
 * „always“: immer deutsche, „off“: keine. -1 = aus.
 */
export function pickSubtitle(source: MediaSource, audioIndex: number | undefined, mode: SubtitleMode = 'smart'): number {
  const subtitles = subtitleStreams(source)
  if (mode === 'off') return -1
  const audio = audioStreams(source).find(s => s.Index === audioIndex)
  if (mode === 'smart' && isOwnLanguage(audio?.Language)) {
    const forced = subtitles.find(s => s.IsForced && (isOwnLanguage(s.Language) || !s.Language))
    return forced?.Index ?? -1
  }
  const own = subtitles.find(s => isOwnLanguage(s.Language) && !s.IsForced) ?? subtitles.find(s => isOwnLanguage(s.Language))
  if (own) return own.Index
  const fallback = subtitles.find(s => s.Index === source.DefaultSubtitleStreamIndex)
  return fallback?.Index ?? -1
}

/** Tonspur, die beim direkten Abspielen ohne Zutun läuft: die als Standard markierte, sonst die erste. */
export function fileDefaultAudio(source: MediaSource): number | undefined {
  const internal = audioStreams(source).filter(s => !s.IsExternal)
  return (internal.find(s => s.IsDefault) ?? internal[0])?.Index
}

/** Stelle der Tonspur in video.audioTracks (nur Spuren in der Datei, in ihrer Reihenfolge); -1 = keine. */
export function audioTrackPosition(source: MediaSource, index: number | undefined): number {
  return audioStreams(source).filter(s => !s.IsExternal).findIndex(s => s.Index === index)
}

/** Anzeigename einer Spur. */
export function trackLabel(stream: MediaStream): string {
  return stream.DisplayTitle || stream.Title || stream.Language || `Spur ${stream.Index}`
}

// --- WebVTT: Untertitel selbst anzeigen (eigene Darstellung, keine CORS-Probleme mit <track>) ---

export interface Cue {
  start: number
  end: number
  text: string
}

/** Zeit aus WebVTT („00:01:02.500“) oder SRT („00:01:02,500“). */
function seconds(time: string): number {
  const parts = time.trim().replace(',', '.').split(':').map(Number)
  return parts.reduce((total, part) => total * 60 + part, 0)
}

export function parseVtt(text: string): Cue[] {
  const cues: Cue[] = []
  const blocks = text.replace(/\r/g, '').split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const timing = lines.findIndex(line => line.includes('-->'))
    if (timing < 0) continue
    const [from, to] = lines[timing].split('-->')
    const content = lines.slice(timing + 1).join('\n').replace(/<[^>]+>/g, '').trim()
    if (content) cues.push({ start: seconds(from), end: seconds(to.trim().split(' ')[0]), text: content })
  }
  return cues
}

export function cueAt(cues: Cue[], time: number): string | null {
  for (const cue of cues) if (time >= cue.start && time <= cue.end) return cue.text
  return null
}
