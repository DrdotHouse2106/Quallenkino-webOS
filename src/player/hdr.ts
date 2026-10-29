import { isTizen } from '../platform/platform'

/**
 * HDR-Arten, die der Fernseher direkt zeigen kann. Fehlt eine, rechnet der Server mit Tonemapping nach SDR um
 * (sonst wäre das Bild an einem Gerät ohne HDR zu dunkel und blass).
 */
export interface HdrSupport {
  hdr10: boolean
  hlg: boolean
  dolbyVision: boolean
}

export type HdrMode = 'auto' | 'convert' | 'direct'

export const HDR_ALL: HdrSupport = { hdr10: true, hlg: true, dolbyVision: true }
export const HDR_NONE: HdrSupport = { hdr10: false, hlg: false, dolbyVision: false }

interface Probe {
  /** Ergebnis von matchMedia('(dynamic-range: high)'): true/false, null = Abfrage unbekannt (ältere Browser). */
  highDynamicRange: boolean | null
  /** Samsung: webapis.avinfo.isHdrTvSupport(), null = nicht verfügbar. */
  tizenHdr: boolean | null
  /** Kann der Decoder Dolby Vision (Profil 8)? */
  dolbyVisionDecoder: boolean
}

/** Aus den Prüfungen (testbar): Ohne verlässliche Antwort gilt HDR10/HLG als vorhanden – webOS-/Tizen-Fernseher ab 2020 können das. */
export function hdrFromProbe(probe: Probe): HdrSupport {
  const hdr = probe.tizenHdr ?? probe.highDynamicRange ?? true
  return { hdr10: hdr, hlg: hdr, dolbyVision: hdr && probe.dolbyVisionDecoder }
}

function probe(): Probe {
  let highDynamicRange: boolean | null = null
  try {
    const query = window.matchMedia('(dynamic-range: high)')
    // Kennt der Browser die Abfrage nicht, heißt sie „not all“
    if (query.media !== 'not all') highDynamicRange = query.matches
  } catch {
    highDynamicRange = null
  }
  let tizenHdr: boolean | null = null
  if (isTizen) {
    try {
      const avinfo = (window as unknown as { webapis?: { avinfo?: { isHdrTvSupport?: () => boolean } } }).webapis?.avinfo
      if (avinfo?.isHdrTvSupport) tizenHdr = !!avinfo.isHdrTvSupport()
    } catch {
      tizenHdr = null
    }
  }
  let dolbyVisionDecoder = false
  try {
    dolbyVisionDecoder = document.createElement('video').canPlayType('video/mp4; codecs="dvh1.08.06"') !== ''
  } catch {
    dolbyVisionDecoder = false
  }
  return { highDynamicRange, tizenHdr, dolbyVisionDecoder }
}

export function hdrSupport(mode: HdrMode): HdrSupport {
  if (mode === 'convert') return HDR_NONE
  if (mode === 'direct') return HDR_ALL
  return hdrFromProbe(probe())
}

/** Alle Jellyfin-VideoRangeTypes (10.10/10.11). */
export const ALL_RANGE_TYPES = ['SDR', 'HDR10', 'HDR10Plus', 'HLG', 'DOVI', 'DOVIWithHDR10', 'DOVIWithHDR10Plus', 'DOVIWithHLG', 'DOVIWithSDR', 'DOVIWithEL', 'DOVIWithELHDR10Plus', 'DOVIInvalid', 'Unknown']

/** Nicht direkt abspielbare HDR-Arten (Jellyfin VideoRangeType) für das Geräteprofil. */
export function unsupportedRangeTypes(hdr: HdrSupport): string[] {
  const list: string[] = []
  if (!hdr.dolbyVision) list.push('DOVI', 'DOVIWithEL', 'DOVIInvalid')
  if (!hdr.hdr10) {
    list.push('HDR10', 'HDR10Plus')
    if (!hdr.dolbyVision) list.push('DOVIWithHDR10', 'DOVIWithHDR10Plus', 'DOVIWithELHDR10Plus')
  }
  if (!hdr.hlg) {
    list.push('HLG')
    if (!hdr.dolbyVision) list.push('DOVIWithHLG')
  }
  return list
}
