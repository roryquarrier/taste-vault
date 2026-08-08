import raw from './tokens.json'
import { loadTokens, type Token } from './schema'

export const TOKENS = loadTokens(raw)
export const ACTIVE: Token[] = TOKENS.tokens.filter((t) => t.enabled)
/** user-editable tokens only — derived ones are CSS-composed. [G4] */
export const EDITABLE: Token[] = ACTIVE.filter((t) => !t.derived)
export const DEFAULTS: Record<string, string> = Object.fromEntries(
  EDITABLE.map((t) => [t.name, t.default]),
)
export const BY_NAME = new Map(ACTIVE.map((t) => [t.name, t]))
