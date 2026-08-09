import { useMemo, useState, useEffect } from 'react'
import Fuse from 'fuse.js'
import type { CardData } from '../../lib/cards'

export type FamilyMeta = { id: string; name: string; order: number }

type Props = {
  cards: CardData[]
  families: FamilyMeta[]
}

function CardTile({
  card,
  selected,
  onToggle,
  onDelete,
  deleting,
}: {
  card: CardData
  selected: boolean
  onToggle?: (id: string) => void
  onDelete: (card: CardData) => void
  deleting: boolean
}) {
  const monogram = card.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  return (
    <div className={`tv-card-wrap${selected ? ' tv-card-wrap--selected' : ''}`}>
      <a className="tv-card" href={onToggle ? undefined : card.href}>
        {card.image === null ? (
          <div className="tv-card-tile tv-card-tile--meta">
            <span className="tv-monogram">{monogram}</span>
          </div>
        ) : (
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
      {onToggle && (
        <button
          type="button"
          className={`tv-card-select${selected ? ' tv-card-select--active' : ''}`}
          onClick={() => onToggle(card.id)}
          aria-pressed={selected}
        >
          {selected ? '✓ selected' : '+ select'}
        </button>
      )}
      <button
        type="button"
        className="tv-card-delete"
        onClick={() => onDelete(card)}
        disabled={deleting}
        title={`Delete ${card.title}`}
        aria-label={`Delete ${card.title}`}
      >
        {deleting ? '…' : '✕'}
      </button>
    </div>
  )
}

export default function LibraryBrowser({ cards: initialCards, families }: Props) {
  const [cards, setCards] = useState<CardData[]>(initialCards)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState<string>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Pre-select from URL params (?refs=id1,id2)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const refs = params.get('refs')
    if (refs) {
      const ids = refs.split(',').filter(Boolean)
      if (ids.length) {
        setSelected(new Set(ids))
        setSelectMode(true)
      }
    }
  }, [])

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
    const searched = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : cards
    return family === 'all' ? searched : searched.filter((c) => c.familyId === family)
  }, [cards, fuse, query, family])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 5) {
        next.add(id)
      }
      return next
    })
  }

  async function deleteCard(card: CardData) {
    if (!window.confirm(`Delete '${card.title}'?`)) return
    setDeletingId(card.id)
    setStatus('')
    try {
      const res = await fetch('/api/inspirations/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: card.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data?.error ?? 'delete failed')
      setCards((prev) => prev.filter((c) => c.id !== card.id))
      setSelected((prev) => {
        if (!prev.has(card.id)) return prev
        const next = new Set(prev)
        next.delete(card.id)
        return next
      })
      setStatus(`deleted '${card.title}'`)
    } catch (err) {
      setStatus(`failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDeletingId(null)
    }
  }

  function sendToGenerate() {
    const ids = Array.from(selected).join(',')
    window.location.href = `/generate?refs=${ids}`
  }

  const selectedCards = cards.filter(c => selected.has(c.id))

  return (
    <div className="tv-browser">
      <div className="tv-library-toolbar">
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
        <button
          type="button"
          className={`tv-tab${selectMode ? '' : ' tv-tab--outline'}`}
          aria-pressed={selectMode}
          onClick={() => setSelectMode(s => !s)}
        >
          {selectMode ? '✓ selecting' : ' select mode'}
        </button>
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
        {selectMode && selected.size > 0 && ` · ${selected.size}/5 selected`}
        {status && ` · ${status}`}
      </p>

      {visible.length === 0 ? (
        <p className="tv-card-desc">Nothing matches that.</p>
      ) : (
        <div className="tv-card-grid">
          {visible.map((c) => (
            <CardTile
              key={c.id}
              card={c}
              selected={selected.has(c.id)}
              onToggle={selectMode ? toggleSelect : undefined}
              onDelete={deleteCard}
              deleting={deletingId === c.id}
            />
          ))}
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="tv-selection-bar">
          <div className="tv-selection-chips">
            {selectedCards.map(c => (
              <span key={c.id} className="tv-sel-chip">
                {c.title}
                <button type="button" onClick={() => toggleSelect(c.id)}>✕</button>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="tv-btn"
            onClick={sendToGenerate}
          >
            SEND TO GENERATE ({selected.size})
          </button>
        </div>
      )}
    </div>
  )
}
