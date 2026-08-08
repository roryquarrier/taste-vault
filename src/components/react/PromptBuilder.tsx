import { useMemo, useState, useEffect } from 'react'
import { EDITABLE } from '../../tokens/defaults'
import { copyText } from '../../lib/clipboard'

type Family = { id: string; name: string; description: string; vocabulary: string[]; guardrails: { always: string[]; never: string[] } }
type Inspiration = {
  id: string
  title: string
  familyId: string
  familyName: string
  description: string
  vocabulary: string[]
  intent: string
  imageRecipe: { subject: string; medium: string; palette: string[]; aspect: string }
}

type Props = {
  families: Family[]
  inspirations: Inspiration[]
}

function emptyDirection() {
  return { familyId: '', inspirationId: '', customAesthetic: '', customReference: '', futureHero: '', placement: '' }
}

export default function PromptBuilder({ families, inspirations }: Props) {
  // --- Selection state ---
  const [directions, setDirections] = useState<Record<number, ReturnType<typeof emptyDirection>>>({
    1: emptyDirection(),
    2: emptyDirection(),
    3: emptyDirection(),
    4: emptyDirection(),
    5: emptyDirection(),
  })

  // Pre-fill from library selections via ?refs=id1,id2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const refs = params.get('refs')
    if (!refs) return
    const ids = refs.split(',').filter(Boolean).slice(0, 5)
    if (!ids.length) return

    setDirections(prev => {
      const next = { ...prev }
      ids.forEach((inspId, i) => {
        const num = i + 1
        const insp = inspirations.find(x => x.id === inspId)
        if (insp) {
          next[num] = {
            ...emptyDirection(),
            familyId: insp.familyId,
            inspirationId: insp.id,
          }
        }
      })
      return next
    })
    // Auto-set numVersions to match
    if (ids.length > 0) {
      setNumVersions(Math.min(ids.length, 5))
    }
  }, [inspirations])

  // --- Master prompt fields ---
  const [productName, setProductName] = useState('')
  const [productType, setProductType] = useState('')
  const [conversionGoal, setConversionGoal] = useState('book a demo')
  const [messaging, setMessaging] = useState('')
  const [guardAlways, setGuardAlways] = useState('one monumental image anchors the page; imagery is processed, never raw (halftone, dither, grain); type at extremes')
  const [guardNever, setGuardNever] = useState('purple gradients, 3D SaaS blobs, untextured stock photography, Inter-only typography')
  const [numVersions, setNumVersions] = useState(5)

  const [copied, setCopied] = useState(false)

  // Token contract list
  const tokenContract = useMemo(() =>
    EDITABLE.filter(t => t.exposeToGenerator).map(t => t.name).join(', '),
  [])

  // Build the master prompt
  function buildPrompt(): string {
    const sections: string[] = []

    sections.push(`Build a landing page for "${productName || '[PRODUCT NAME]'}" — ${productType || '[WHAT IT IS]'}.
Conversion goal: ${conversionGoal}. Primary CTA on every version is "${conversionGoal}".
It must appear in the hero and repeat at the end of the page.`)

    if (messaging) {
      sections.push(`\nPrimary messaging: ${messaging}`)
    }

    sections.push(`\nGUARDRAILS — always: ${guardAlways}.`)
    sections.push(`Never: ${guardNever}.`)

    sections.push(`\nCreate ${numVersions} version${numVersions > 1 ? 's' : ''} of this page, each in its own folder (v1/ ... v${numVersions}/), one per direction below. Do NOT blend directions — each version commits fully to its own aesthetic.`)

    sections.push(`\nIMPORTANT — hero images come later. Do NOT generate or source any imagery. Each version, reserve the hero slot with a flat CSS stunt that matches the direction's palette.`)

    // Per-direction blocks
    for (let i = 1; i <= numVersions; i++) {
      const d = directions[i]
      if (!d) continue

      const fam = families.find(f => f.id === d.familyId)
      const insp = inspirations.find(x => x.id === d.inspirationId)

      const aesthetic = d.customAesthetic || (fam ? `${fam.name} — ${fam.vocabulary.join(', ')}` : `[AESTHETIC ${i}]`)

      sections.push(`\n--- DIRECTION ${i} (v${i}) ---`)
      sections.push(`Aesthetic: ${aesthetic}`)

      // Family context (full detail when available)
      if (fam) {
        sections.push(`Family: ${fam.name}`)
        sections.push(`Family description: ${fam.description}`)
        sections.push(`Family vocabulary: ${fam.vocabulary.join(', ')}`)
        if (fam.guardrails.always.length) sections.push(`Family always: ${fam.guardrails.always.join('; ')}`)
        if (fam.guardrails.never.length) sections.push(`Family never: ${fam.guardrails.never.join('; ')}`)
      }

      // Reference inspiration (full detail when selected from library)
      if (insp) {
        sections.push(`Reference: ${insp.title} — match feel, not content.`)
        sections.push(`Reference description: ${insp.description}`)
        sections.push(`Reference vocabulary: ${insp.vocabulary.join(', ')}`)
        if (insp.intent) {
          sections.push(`Reference intent: ${insp.intent.trim()}`)
        }
        if (insp.imageRecipe) {
          sections.push(`Hero image suggestion: ${insp.imageRecipe.subject}`)
          sections.push(`Hero medium: ${insp.imageRecipe.medium}`)
          if (insp.imageRecipe.palette.length) {
            sections.push(`Hero palette: ${insp.imageRecipe.palette.join(', ')}`)
          }
          sections.push(`Hero aspect: ${insp.imageRecipe.aspect}`)
        }
        if (insp.familyName && insp.familyName !== fam?.name) {
          sections.push(`Reference family: ${insp.familyName}`)
        }
      } else if (d.customReference) {
        sections.push(`Reference: ${d.customReference}`)
      } else {
        sections.push(`Reference: [REFERENCE ${i}]`)
      }

      if (d.futureHero) {
        sections.push(`Future hero: ${d.futureHero}`)
      }
      if (d.placement) {
        sections.push(`Placement: ${d.placement}`)
      }
    }

    sections.push(`\n--- TOKEN CONTRACT ---`)
    sections.push(`Emit CSS that reads these custom properties. Do not hardcode their values.`)
    sections.push(tokenContract)
    sections.push(`Hero images: object-position: var(--tv-hero-object-position); filter: var(--tv-hero-filter); transform: scale(var(--tv-hero-scale));`)

    return sections.join('\n')
  }

  const prompt = useMemo(() => buildPrompt(), [productName, productType, conversionGoal, messaging, guardAlways, guardNever, numVersions, directions, tokenContract])

  function updateDirection(num: number, field: string, value: string) {
    setDirections(prev => {
      const next = { ...prev, [num]: { ...prev[num], [field]: value } }
      // When reference is set, auto-fill family from the inspiration
      if (field === 'inspirationId' && value) {
        const insp = inspirations.find(x => x.id === value)
        if (insp && !next[num].familyId) {
          next[num].familyId = insp.familyId
        }
      }
      return next
    })
  }

  // When family changes manually, clear reference if it doesn't belong
  function updateFamily(num: number, familyId: string) {
    setDirections(prev => {
      const next = { ...prev, [num]: { ...prev[num], familyId } }
      const insp = inspirations.find(x => x.id === next[num].inspirationId)
      if (insp && insp.familyId !== familyId) {
        next[num].inspirationId = ''
      }
      return next
    })
  }

  async function copyPrompt() {
    const ok = await copyText(prompt)
    setCopied(ok)
    setTimeout(() => setCopied(false), 1500)
  }

  const inspirationsForFamily = (famId: string) => inspirations.filter(i => i.familyId === famId)

  return (
    <div className="tv-prompt-builder">
      {/* Product Info */}
      <section className="tv-pb-section">
        <h2 className="tv-pb-section-title">1 · Product</h2>
        <div className="tv-pb-grid2">
          <div className="tv-pb-field">
            <span>Product Name</span>
            <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="e.g. Kestrel, Book Restorer" className="tv-pb-input" />
          </div>
          <div className="tv-pb-field">
            <span>What is it?</span>
            <input type="text" value={productType} onChange={e => setProductType(e.target.value)}
              placeholder="e.g. AI analytics platform for small startups" className="tv-pb-input" />
          </div>
          <div className="tv-pb-field">
            <span>Conversion Goal / CTA</span>
            <input type="text" value={conversionGoal} onChange={e => setConversionGoal(e.target.value)}
              placeholder="book a demo" className="tv-pb-input" />
          </div>
          <div className="tv-pb-field">
            <span>Number of Versions</span>
            <select value={numVersions} onChange={e => setNumVersions(Number(e.target.value))} className="tv-pb-input tv-select-trigger">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="tv-pb-field" style={{marginTop: "calc(var(--tv-space-unit) * 3)"}}>
          <span>Messaging / Intent (what should it feel like and why)</span>
          <textarea value={messaging} onChange={e => setMessaging(e.target.value)}
            placeholder="Intelligence = calm and confident, not loud SaaS hype. A founder should think 'these people understand data' within 3 seconds."
            rows={3} className="tv-pb-input tv-pb-textarea" />
        </div>
      </section>

      {/* Guardrails */}
      <section className="tv-pb-section">
        <h2 className="tv-pb-section-title">2 · Guardrails</h2>
        <div className="tv-pb-field">
          <span>ALWAYS (constants)</span>
          <textarea value={guardAlways} onChange={e => setGuardAlways(e.target.value)}
            rows={2} className="tv-pb-input tv-pb-textarea" />
        </div>
        <div className="tv-pb-field" style={{marginTop: "calc(var(--tv-space-unit) * 2)"}}>
          <span>NEVER (bans)</span>
          <textarea value={guardNever} onChange={e => setGuardNever(e.target.value)}
            rows={2} className="tv-pb-input tv-pb-textarea" />
        </div>
      </section>

      {/* Per-direction blocks */}
      <section className="tv-pb-section">
        <h2 className="tv-pb-section-title">3 · Aesthetic Directions</h2>
        <p className="tv-pb-hint">Pick a family from the library for each direction, or type a custom aesthetic. Each version commits fully to its own aesthetic.</p>
        {Array.from({ length: numVersions }, (_, i) => i + 1).map(num => {
          const d = directions[num]
          const fam = families.find(f => f.id === d.familyId)
          return (
            <div key={num} className="tv-pb-direction">
              <div className="tv-pb-direction-header">
                <span className="tv-pb-direction-num">v{num}</span>
                {fam && <span className="tv-pb-direction-fam">{fam.name}</span>}
              </div>
              <div className="tv-pb-grid2">
                <div className="tv-pb-field">
                  <span>Aesthetic Family (from library)</span>
                  <select value={d.familyId} onChange={e => updateFamily(num, e.target.value)} className="tv-pb-input tv-select-trigger">
                    <option value="">— custom —</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="tv-pb-field">
                  <span>Reference (from library)</span>
                  <select value={d.inspirationId} onChange={e => updateDirection(num, 'inspirationId', e.target.value)} className="tv-pb-input tv-select-trigger" disabled={!d.familyId}>
                    <option value="">— none —</option>
                    {inspirationsForFamily(d.familyId).map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
                  </select>
                </div>
              </div>
              {!d.familyId && (
                <div className="tv-pb-field" style={{marginTop: "calc(var(--tv-space-unit) * 2)"}}>
                  <span>Custom Aesthetic (5-8 vocabulary terms)</span>
                  <input type="text" value={d.customAesthetic} onChange={e => updateDirection(num, 'customAesthetic', e.target.value)}
                    placeholder="e.g. brutalist-editorial B&W, heavy dither, stark dark" className="tv-pb-input" />
                </div>
              )}
              <div className="tv-pb-grid2" style={{marginTop: "calc(var(--tv-space-unit) * 2)"}}>
                <div className="tv-pb-field">
                  <span>Future Hero Image</span>
                  <input type="text" value={d.futureHero} onChange={e => updateDirection(num, 'futureHero', e.target.value)}
                    placeholder="e.g. vast desaturated aerial mountain ridge" className="tv-pb-input" />
                </div>
                <div className="tv-pb-field">
                  <span>Placement</span>
                  <input type="text" value={d.placement} onChange={e => updateDirection(num, 'placement', e.target.value)}
                    placeholder="e.g. full-bleed, headline left on darkest area" className="tv-pb-input" />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* Output */}
      <section className="tv-pb-section">
        <div className="tv-pb-output-header">
          <h2 className="tv-pb-section-title">4 · Generated Prompt</h2>
          <button type="button" className="tv-btn" onClick={copyPrompt}>
            {copied ? 'COPIED ✓' : 'COPY PROMPT'}
          </button>
        </div>
        <pre className="tv-pb-output">{prompt}</pre>
      </section>
    </div>
  )
}
