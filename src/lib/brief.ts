import type { Token } from '../tokens/schema'

/**
 * Plain-data shapes. Deliberately NOT `CollectionEntry` — this module imports
 * nothing from `astro:content` so it is trivially unit-testable in node.
 */
export type BriefEntry = {
  id: string
  title: string
  description: string
  vocabulary: string[]
  intent: string
  guardrails: { always: string[]; never: string[] }
}

export type BriefFamily = {
  id: string
  name: string
  description: string
  vocabulary: string[]
  guardrails: { always: string[]; never: string[] }
}

const WRAP_COLS = 78

/** Family first, then entry; deduped case-insensitively, first-seen order kept. */
function mergeGuardrails(family: string[], entry: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of [...family, ...entry]) {
    const k = g.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(g.trim())
  }
  return out
}

/** Comma-separated, wrapped at 78 columns. */
function wrapList(items: string[]): string {
  const lines: string[] = []
  let line = ''
  items.forEach((item, i) => {
    const piece = i === items.length - 1 ? item : `${item},`
    if (!line) {
      line = piece
    } else if (line.length + 1 + piece.length > WRAP_COLS) {
      lines.push(line)
      line = piece
    } else {
      line += ` ${piece}`
    }
  })
  if (line) lines.push(line)
  return lines.join('\n')
}

export function buildBriefBlock(input: {
  entry: BriefEntry
  family: BriefFamily
  tokens: Token[]
  siteUrl: string
}): string {
  const { entry, family, tokens, siteUrl } = input

  const always = mergeGuardrails(family.guardrails.always, entry.guardrails.always)
  const never = mergeGuardrails(family.guardrails.never, entry.guardrails.never)

  const contract = tokens
    .filter((t) => t.enabled && t.exposeToGenerator && !t.derived)
    .map((t) => t.name)

  const site = siteUrl.replace(/\/+$/, '')

  const sections = [
    `1. AESTHETIC`,
    `${family.name} — ${family.description}`,
    `Vocabulary: ${family.vocabulary.join(', ')}`,
    ``,
    `2. REFERENCE`,
    `${entry.title} — ${entry.description}`,
    `Vocabulary: ${entry.vocabulary.join(', ')}`,
    `URL: ${site}/library/${entry.id}`,
    ``,
    `3. INTENT`,
    entry.intent.trim(),
    ``,
    `4. GUARDRAILS`,
    `ALWAYS:`,
    ...always.map((g) => `  - ${g}`),
    `NEVER:`,
    ...never.map((g) => `  - ${g}`),
    ``,
    `--- TOKEN CONTRACT ---`,
    `Use these CSS custom properties for every visual value. Do not hardcode.`,
    wrapList(contract),
    ``,
    // [G4] the generator consumes the composed tokens, never the parts.
    `Hero images: object-position: var(--tv-hero-object-position); filter: var(--tv-hero-filter); transform: scale(var(--tv-hero-scale));`,
    ``,
    `taste-vault · schema v1 · ${family.id}/${entry.id}`,
  ]

  // Exactly one trailing newline.
  return `${sections.join('\n').replace(/\n+$/, '')}\n`
}
