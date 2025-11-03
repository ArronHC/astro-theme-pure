import type { ImageMetadata } from 'astro'

export type GalleryImageSource = ImageMetadata | string

export interface GalleryItem {
  /** Public URL or metadata for the image asset. */
  image: GalleryImageSource
  /** Optional title shown beneath the photo. */
  title?: string
  /** Optional small label rendered before the title. */
  subtitle?: string
  /** Optional description displayed under the title. */
  description?: string
  /** Optional colour swatches kept for backwards compatibility. */
  palette?: string[]
  /** Optional mood badge kept for backwards compatibility. */
  mood?: string
  /** Layout hint retained for legacy data. */
  layout?: 'portrait' | 'landscape'
  /** Ordering weight derived from the file name or metadata. Smaller numbers render first. */
  order?: number
}

export interface GalleryMetadata extends Partial<Omit<GalleryItem, 'image'>> {
  /** Provide a deterministic ordering value. Defaults to the numeric suffix or alphabetical order. */
  order?: number
}
