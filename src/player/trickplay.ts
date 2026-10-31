import type { Item } from '../api/items'

/** Trickplay-Kacheln vom Server (wie im Web): mehrere Vorschaubilder je JPEG im Raster. */
export interface TrickplayInfo {
  Width: number
  Height: number
  TileWidth: number
  TileHeight: number
  ThumbnailCount?: number
  Interval: number
}

export interface TrickplayFrame {
  /** Pfad der Kachel-Datei auf dem Server (ohne Basisadresse). */
  path: string
  x: number
  y: number
  width: number
  height: number
  sheetWidth: number
  sheetHeight: number
}

/** Vorschaubild an Stelle [seconds] (testbar); null ohne Trickplay für diese Quelle. */
export function trickplayFrame(item: Item, mediaSourceId: string, seconds: number): TrickplayFrame | null {
  const key = mediaSourceId.replace(/-/g, '').toLowerCase()
  const bySource = item.Trickplay?.[key] ?? item.Trickplay?.[mediaSourceId]
  if (!bySource) return null
  // Kleinste Auflösung reicht für die Vorschau (lädt am schnellsten)
  const widths = Object.keys(bySource).map(Number).filter(n => n > 0).sort((a, b) => a - b)
  const info = widths.length ? bySource[String(widths[0])] : null
  if (!info || !info.Interval || !info.TileWidth || !info.TileHeight) return null
  const perSheet = info.TileWidth * info.TileHeight
  let tile = Math.floor((Math.max(0, seconds) * 1000) / info.Interval)
  if (info.ThumbnailCount) tile = Math.min(tile, info.ThumbnailCount - 1)
  const sheet = Math.floor(tile / perSheet)
  const offset = tile % perSheet
  return {
    path: `/Videos/${item.Id}/Trickplay/${info.Width}/${sheet}.jpg?mediaSourceId=${key}`,
    x: (offset % info.TileWidth) * info.Width,
    y: Math.floor(offset / info.TileWidth) * info.Height,
    width: info.Width,
    height: info.Height,
    sheetWidth: info.Width * info.TileWidth,
    sheetHeight: info.Height * info.TileHeight,
  }
}
