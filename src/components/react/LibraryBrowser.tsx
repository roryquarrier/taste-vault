import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import type { CardData } from '../../lib/cards'

export type FamilyMeta = { id: string; name: string; order: number }

type Props = {
  cards: CardData[]
  families: FamilyMeta[]
}

/**
 * React mirror of `src/components/astro/Card.astro`.
 *
 * An island cannot render a `.astro` component, so this markup is duplicated by
 * necessity. The two are kept identical by sharing every class name with the
 * `.tv-card*` rules in `src/styles/global.css` — if you change one, change the
 * other, and never move these styles into a scoped <style> block.
 *
 * [G7] `image === null` ⇒ metadata-only tile. No <img> is emitted at all.
 */
function CardTile({ card }: { card: CardData }) {
  const monogram = card.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  return (
    <a className="tv-card" href={card.href}>
      {card.image === null ? (
        <div className="tv-card-tile tv-card-tile--meta">
          <span className="tv-monogram">{monogram}</span>
        </div>
      ) : (
        /* [G5] .tv-graded wrapper so grade + hero tokens apply. */
        <div className="tv-card-tile tv-graded">
          <img
            src={card.image.src}
            width={card.image.width}
            height={card.image.height}
            alt={card.image.alt}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="tv-card-body">
        <p className="tv-card-family">
          {card.familyName}
          {card.featured ? ' · featured' : ''}
        </p>
        <h3 className="tv-card-title">{card.title}</h3>
        <p className="tv-card-desc">{card.description}</p>
        <div className="tv-card-vocab">
          {card.vocabulary.slice(0, 4).map((v) => (
            <span className="tv-vocab" key={v}>
              {v}
            </span>
          ))}
        </div>
        {card.image === null && <p className="tv-card-meta">metadata only · {card.license}</p>}
      </div>
    </a>
  )
}

export default function LibraryBrowser({ cards, families }: Props) {
  // No localStorage read during render — the input starts empty on server and client.
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState<string>('all')

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cards) m.set(c.familyId, (m.get(c.familyId) ?? 0) + 1)
    return m
  }, [cards])

  const tabs = useMemo(
    () => [...families].sort((a, b) => a.order - b.order),
    [families],
  )

  const fuse = useMemo(
    () =>
      new Fuse(cards, {
        threshold: 0.35,
        keys: [
          { name: 'title', weight: 2 },
          { name: 'description', weight: 1 },
          { name: 'vocabulary', weight: 1.5 },
        ],
      }),
    [cards],
  )

  const visible = useMemo(() => {
    // Empty query bypasses Fuse entirely.
    const searched = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : cards
    return family === 'all' ? searched : searched.filter((c) => c.familyId === family)
  }, [cards, fuse, query, family])

  return (
    <div className="tv-browser">
      <div className="tv-tabs">
        <button
          type="button"
          className="tv-tab"
          aria-pressed={family === 'all'}
          onClick={() => setFamily('all')}
        >
          all {cards.length}
        </button>
        {tabs.map((f) => {
          const n = counts.get(f.id) ?? 0
          return (
            <button
              key={f.id}
              type="button"
              className="tv-tab"
              disabled={n === 0}
              aria-pressed={family === f.id}
              onClick={() => setFamily(f.id)}
            >
              {f.name} {n}
            </button>
          )
        })}
      </div>

      <input
        className="tv-search"
        type="search"
        placeholder="search title, description, vocabulary…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search references"
      />

      <p className="tv-count" aria-live="polite">
        {visible.length} of {cards.length} references
      </p>

      {visible.length === 0 ? (
        <p className="tv-card-desc">Nothing matches that.</p>
      ) : (
        <div className="tv-card-grid">
          {visible.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  )
}
