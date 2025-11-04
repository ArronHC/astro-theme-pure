import type { ImageMetadata } from 'astro'

import type { GalleryItem, GalleryMetadata } from './types'

const IMAGE_GLOB = import.meta.glob<string | ImageMetadata>(
  '../../assets/gallery/**/*.{jpg,jpeg,png,webp,avif,gif,svg}',
  {
    eager: true,
    import: 'default'
  }
)

const METADATA_GLOB = import.meta.glob<{ default: GalleryMetadata }>(
  '../../assets/gallery/**/*.json',
  {
    eager: true
  }
)

const normalizeKey = (value: string) =>
  value
    .replace(/^\.\.\/\.\.\/assets\/gallery\//, '')
    .replace(/\.[^/.]+$/, '')

const tidy = (raw: string | undefined) => raw?.replace(/[-_]+/g, ' ').trim()

interface HydratedGalleryItem extends GalleryItem {
  sortTimestamp?: number
}

const resolveImageSource = (mod: string | ImageMetadata): string | null => {
  if (typeof mod === 'string') return mod
  if (mod && typeof mod === 'object' && 'src' in mod && typeof mod.src === 'string') {
    return mod.src
  }

  return null
}

const decodeSegment = (raw: string) => {
  try {
    return tidy(decodeURIComponent(raw))
  } catch {
    return tidy(raw)
  }
}

interface ParsedFileParts {
  title?: string
  subtitle?: string
  description?: string
  capturedAt?: string
  sortTimestamp?: number
}

const normaliseDate = (value: string): { iso: string; timestamp: number } | null => {
  const match = value.match(/^(\d{2})(?:-(\d{2}))?(?:-(\d{2}))?$/)
  if (!match) return null

  const [, rawYear, rawMonth, rawDay] = match
  const year = Number(rawYear)
  if (Number.isNaN(year)) return null

  const fullYear = 2000 + year
  const month = rawMonth ? Number(rawMonth) : 1
  if (Number.isNaN(month) || month < 1 || month > 12) return null

  const dayFromToken = rawDay ? Number(rawDay) : 1
  const daysInMonth = new Date(Date.UTC(fullYear, month, 0)).getUTCDate()
  const day = Number.isNaN(dayFromToken)
    ? 1
    : Math.min(Math.max(dayFromToken, 1), daysInMonth)

  const date = new Date(Date.UTC(fullYear, month - 1, day))
  return {
    iso: date.toISOString(),
    timestamp: date.getTime()
  }
}

const parseDateValue = (value: string | undefined): { iso: string; timestamp: number } | null => {
  if (!value) return null

  const normalised = normaliseDate(value)
  if (normalised) return normalised

  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return null

  return { iso: parsed.toISOString(), timestamp: parsed.getTime() }
}

const parseFileParts = (fileName: string): ParsedFileParts => {
  const parts = fileName.split('__').map((segment) => decodeSegment(segment ?? ''))
  const meaningfulParts = parts.filter((part) => part && part.length > 0)

  if (meaningfulParts.length === 0) return {}

  const lastPart = meaningfulParts.at(-1)
  const dateInfo = lastPart ? normaliseDate(lastPart) : null

  const contentParts = dateInfo ? meaningfulParts.slice(0, -1) : meaningfulParts

  const [title, subtitle, description] = contentParts

  return {
    title,
    subtitle,
    description,
    capturedAt: dateInfo?.iso,
    sortTimestamp: dateInfo?.timestamp
  }
}

let cachedItems: GalleryItem[] | null = null

export const loadGalleryItems = (): GalleryItem[] => {
  if (cachedItems) return cachedItems

  const metadataMap = new Map<string, GalleryMetadata>()

  for (const [path, mod] of Object.entries(METADATA_GLOB)) {
    const key = normalizeKey(path)
    const moduleValue = (mod as { default?: GalleryMetadata }).default ?? (mod as GalleryMetadata)
    metadataMap.set(key, moduleValue)
  }

  const items: HydratedGalleryItem[] = []

  for (const [path, mod] of Object.entries(IMAGE_GLOB)) {
    const image = resolveImageSource(mod)
    if (!image) continue
    const imageData: Pick<ImageMetadata, 'src'> & Partial<ImageMetadata> =
      mod && typeof mod === 'object' && 'src' in mod
        ? (mod as ImageMetadata)
        : { src: image }
    const key = normalizeKey(path)
    const fileName = key.split('/').pop() || key
    const fileParts = parseFileParts(fileName)
    const metadata = metadataMap.get(key)

    const metadataDate = parseDateValue(metadata?.capturedAt)
    const capturedAt = metadataDate?.iso ?? fileParts.capturedAt
    const sortTimestamp = metadataDate?.timestamp ?? fileParts.sortTimestamp

    const title = metadata?.title ?? fileParts.title ?? tidy(fileName) ?? 'Untitled'
    const width = metadata?.width ?? imageData.width
    const height = metadata?.height ?? imageData.height
    const layout =
      metadata?.layout ??
      (width && height ? (width >= height ? 'landscape' : 'portrait') : undefined)

    items.push({
      image: imageData.src,
      title,
      subtitle: metadata?.subtitle ?? fileParts.subtitle,
      description: metadata?.description ?? fileParts.description,
      capturedAt,
      palette: metadata?.palette,
      mood: metadata?.mood,
      layout,
      width,
      height,
      order: metadata?.order,
      sortTimestamp
    })
  }

  cachedItems = items
    .sort((a, b) => {
      const aTime = a.sortTimestamp ?? Number.NEGATIVE_INFINITY
      const bTime = b.sortTimestamp ?? Number.NEGATIVE_INFINITY
      if (aTime !== bTime) return bTime - aTime

      const orderDiff = (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY)
      if (orderDiff !== 0) return orderDiff

      return (a.title ?? '').localeCompare(b.title ?? '', 'zh-Hans')
    })
    .map(({ sortTimestamp, ...rest }) => {
      void sortTimestamp
      return rest
    })

  return cachedItems
}
