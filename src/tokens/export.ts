import { ACTIVE, EDITABLE } from './defaults'
import { TOKENS_SCHEMA_VERSION, type Token } from './schema'

/** Derived tokens are emitted verbatim as their `expr` — never resolved. [G4] */
const DERIVED: Token[] = ACTIVE.filter((t) => t.derived)

/** Groups whose changes make the composed hero tokens meaningful. */
const DERIVED_TRIGGER_GROUPS = new Set(['grade', 'image'])

function changed(values: Record<string, string>, all: boolean): Token[] {
  return EDITABLE.filter((t) => (all ? true : (values[t.name] ?? t.default) !== t.default))
}

function valueOf(values: Record<string, string>, t: Token): string {
  return values[t.name] ?? t.default
}

export function exportCss(
  values: Record<string, string>,
  opts: { all?: boolean; stamp: string },
): string {
  const all = opts.all ?? false
  const delta = changed(values, all)
  if (delta.length === 0) return '/* no changes from defaults */\n'

  const lines: string[] = [`/* taste-vault export · schema v${TOKENS_SCHEMA_VERSION} · ${opts.stamp} */`]

  // [G1] `@theme inline`, always. Never a bare `@theme {`.
  const themed = delta.filter((t) => t.themeKey)
  if (themed.length) {
    lines.push('', '@theme inline {')
    // The theme side uses --<themeKey>; the :root side uses the --tv-* name.
    // Same value, two names — that is the themeKey mapping, which is why it is
    // data in tokens.json rather than a string transform.
    for (const t of themed) lines.push(`  --${t.themeKey}: ${valueOf(values, t)};`)
    lines.push('}')
  }

  lines.push('', ':root {')
  for (const t of delta) lines.push(`  ${t.name}: ${valueOf(values, t)};`)

  if (delta.some((t) => DERIVED_TRIGGER_GROUPS.has(t.group))) {
    for (const d of DERIVED) lines.push(`  ${d.name}: ${d.expr};`)
  }
  lines.push('}')

  return `${lines.join('\n')}\n`
}

export function exportJson(values: Record<string, string>, opts: { all?: boolean } = {}): string {
  const delta = changed(values, opts.all ?? false)
  const tokens: Record<string, string> = {}
  for (const t of delta) tokens[t.name] = valueOf(values, t)
  return `${JSON.stringify(
    { schemaVersion: TOKENS_SCHEMA_VERSION, generator: 'taste-vault', tokens },
    null,
    2,
  )}\n`
}
