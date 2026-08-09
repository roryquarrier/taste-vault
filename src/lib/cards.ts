import type { CollectionEntry } from 'astro:content'
import { getImage } from 'astro:assets'

export type CardData = {
  id: string
  title: string
  familyId: string
  familyName: string
  description: string
  vocabulary: string[]
  featured: boolean
  href: string
  /** the source license, shown on the metadata-only tile. */
  license: string
  /** null ⇒ metadata-only card. [G7] */
  image: { src: string; width: number; height: number; alt: string } | null
}

/**
 * `family` is declared with `reference('families')`. Depending on the loader it
 * surfaces either as the bare id string or as `{ collection, id }` — normalise.
 */
export function familyIdOf(e: CollectionEntry<'inspirations'>): string {
  const f = e.data.family as unknown
  return typeof f === 'string' ? f : (f as { id: string }).id
}

export async function toCardData(
  e: CollectionEntry<'inspirations'>,
  familyName: string,
): Promise<CardData> {
  let image: CardData['image'] = null
  // [G7] publishAsset === false ⇒ no <Image>, nothing enters the pipeline.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (e.data.publishAsset && e.data.thumb) {
    const thumb = e.data.thumb
    // If thumb is a public/ URL path (starts with /), use directly (prepend base for subpath deployments)
    if (typeof thumb === 'string' && thumb.startsWith('/')) {
      image = { src: `${base}${thumb}`, width: 800, height: 533, alt: e.data.alt }
    } else {
      // Otherwise treat as an image asset
      try {
        const img = await getImage({ src: thumb as any, width: 800, format: 'webp' })
        image = {
          src: img.src,
          width: Number(img.attributes.width),
          height: Number(img.attributes.height),
          alt: e.data.alt,
        }
      } catch {
        image = { src: String(thumb), width: 800, height: 533, alt: e.data.alt }
      }
    }
  }
  return {
    id: e.id,
    title: e.data.title,
    familyId: familyIdOf(e),
    familyName,
    description: e.data.description,
    vocabulary: e.data.vocabulary,
    featured: e.data.featured,
    href: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/library/${e.id}`,
    license: e.data.source.license,
    image,
  }
}
