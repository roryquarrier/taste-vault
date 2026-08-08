const KEY = 'taste-vault:tokens:v1'

type Payload = { schemaVersion: number; tokens: Record<string, string> }

/**
 * Returns `{}` when nothing is stored, the payload is malformed, or its
 * schemaVersion does not match `version`. Any key not in `valid` is dropped —
 * a stale or tampered payload can never inject an arbitrary custom property.
 * All access is wrapped: private-mode Safari throws on localStorage.
 */
export function loadStored(valid: Set<string>, version: number): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Payload | null
    if (!p || p.schemaVersion !== version || !p.tokens || typeof p.tokens !== 'object') return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(p.tokens)) {
      if (valid.has(k) && typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

/** Caller debounces. */
export function saveStored(tokens: Record<string, string>, version: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: version, tokens } satisfies Payload))
  } catch {
    /* quota or private mode — losing persistence is acceptable, crashing is not */
  }
}

export function clearStored(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
