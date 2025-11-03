import type { ImageMetadata } from 'astro'
import type { GalleryImageSource, GalleryItem, GalleryMetadata } from './types'

type ImageModule =
  | ImageMetadata
  | { default: ImageMetadata }
  | { default: string }
  | string

const IMAGE_GLOB = import.meta.glob<ImageModule>(
  '../../assets/gallery/**/*.{jpg,jpeg,png,webp,avif,gif,svg,JPG,JPEG,PNG,WEBP,AVIF,GIF,SVG}',
  {
    eager: true
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
  order?: number
}

const parseFileParts = (fileName: string): ParsedFileParts => {
  const parts = fileName.split('__').map((segment) => decodeSegment(segment ?? ''))
  const meaningfulParts = parts.filter((part) => part && part.length > 0)

  if (meaningfulParts.length === 0) return {}

  const lastPart = meaningfulParts.at(-1)
  const order = lastPart && /^\d+$/.test(lastPart) ? Number(lastPart) : undefined

  const contentParts = order !== undefined ? meaningfulParts.slice(0, -1) : meaningfulParts

  const [title, subtitle, description] = contentParts

  return {
    title,
    subtitle,
    description,
    order
  }
}

const resolveImageSource = (value: ImageModule): GalleryImageSource => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object') {
    if ('src' in value && typeof value.src === 'string') {
      return value as ImageMetadata
    }

    if ('default' in value) {
      return resolveImageSource(value.default as ImageModule)
    }
  }

  throw new TypeError('Unable to resolve gallery image source')
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

  const items: GalleryItem[] = []

  for (const [path, mod] of Object.entries(IMAGE_GLOB)) {
    const image = resolveImageSource(mod)
    const key = normalizeKey(path)
    const fileName = key.split('/').pop() || key
    const fileParts = parseFileParts(fileName)
    const metadata = metadataMap.get(key) ?? {}

    const title = metadata.title ?? fileParts.title ?? tidy(fileName) ?? 'Untitled'

    items.push({
      image,
      title,
      subtitle: metadata.subtitle ?? fileParts.subtitle,
      description: metadata.description ?? fileParts.description,
      palette: metadata.palette,
      mood: metadata.mood,
      layout: metadata.layout,
      order: metadata.order ?? fileParts.order
    })
  }

  cachedItems = items.sort((a, b) => {
    const orderDiff = (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY)
    if (orderDiff !== 0) return orderDiff

    return (a.title ?? '').localeCompare(b.title ?? '', 'zh-Hans')
  })

  return cachedItems
}
