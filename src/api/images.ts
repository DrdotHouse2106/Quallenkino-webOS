import type { Api, Item } from './items'

function imageUrl(api: Api, itemId: string, type: string, tag: string, size: string): string {
  return `${api.url.replace(/\/+$/, '')}/Items/${itemId}/Images/${type}?tag=${encodeURIComponent(tag)}&${size}&quality=85`
}

/** Großes Hintergrundbild: eigenes, sonst das der Serie. */
export function backdropUrl(api: Api, item: Item, width = 1280): string | null {
  if (item.BackdropImageTags?.length) return imageUrl(api, item.Id, 'Backdrop', item.BackdropImageTags[0], `maxWidth=${width}`)
  if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.length) {
    return imageUrl(api, item.ParentBackdropItemId, 'Backdrop', item.ParentBackdropImageTags[0], `maxWidth=${width}`)
  }
  return null
}

/** Querformat für Karten: Vorschaubild, sonst Hintergrund, bei Folgen das Folgenbild. */
export function thumbUrl(api: Api, item: Item, width = 480): string | null {
  const size = `maxWidth=${width}`
  if (item.ImageTags?.Thumb) return imageUrl(api, item.Id, 'Thumb', item.ImageTags.Thumb, size)
  if (item.Type === 'Episode' && item.ImageTags?.Primary) return imageUrl(api, item.Id, 'Primary', item.ImageTags.Primary, size)
  if (item.ParentThumbItemId && item.ParentThumbImageTag) return imageUrl(api, item.ParentThumbItemId, 'Thumb', item.ParentThumbImageTag, size)
  return backdropUrl(api, item, width) ?? primaryUrl(api, item, width)
}

/** Hochformat (Plakat). */
export function primaryUrl(api: Api, item: Item, width = 300): string | null {
  return item.ImageTags?.Primary ? imageUrl(api, item.Id, 'Primary', item.ImageTags.Primary, `maxWidth=${width}`) : null
}

/** Schriftzug (Logo) des Titels bzw. der Serie. */
export function logoUrl(api: Api, item: Item, width = 600): string | null {
  if (item.ImageTags?.Logo) return imageUrl(api, item.Id, 'Logo', item.ImageTags.Logo, `maxWidth=${width}`)
  if (item.ParentLogoItemId && item.ParentLogoImageTag) return imageUrl(api, item.ParentLogoItemId, 'Logo', item.ParentLogoImageTag, `maxWidth=${width}`)
  return null
}
