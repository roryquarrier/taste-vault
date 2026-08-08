import { z } from 'zod'

export const TOKENS_SCHEMA_VERSION = 1

export const TokenControl = z.enum(['slider', 'select', 'color', 'text', 'toggle'])
export const TokenType = z.enum(['length', 'number', 'color', 'fontStack', 'percent', 'angle'])

export const TokenSchema = z
  .object({
    /** the CSS custom property, verbatim, including leading `--`. */
    name: z.string().regex(/^--[a-z0-9-]+$/),
    group: z.string(),
    label: z.string(),
    control: TokenControl,
    type: TokenType,
    default: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    unit: z.string().optional(),
    /**
     * Tailwind 4 theme key WITHOUT the leading `--`, e.g. "text-h1".
     * null  => :root-only, never enters the @theme inline block.
     * [G6] `--tv-space-unit` MUST be null. Never emit the bare key "spacing".
     */
    themeKey: z.string().nullable(),
    exposeToGenerator: z.boolean().default(true),
    description: z.string().default(''),
    /** derived tokens are computed by CSS composition, not by the panel. [G4] */
    derived: z.boolean().default(false),
    /** CSS value expression for derived tokens; required iff derived. */
    expr: z.string().optional(),
    enabled: z.boolean().default(true),
  })
  .superRefine((t, ctx) => {
    if (t.derived && !t.expr)
      ctx.addIssue({ code: 'custom', message: `${t.name}: derived token needs expr` })
    if (t.derived && t.control !== 'text' && !t.expr)
      ctx.addIssue({ code: 'custom', message: `${t.name}: bad derived` })
    // [G2] hard guard: a token may never generate its own name.
    if (t.themeKey && `--${t.themeKey}` === t.name) {
      ctx.addIssue({
        code: 'custom',
        message: `${t.name}: circular self-alias — rename the token side (use --tv- prefix)`,
      })
    }
    // [G6] hard guard: never rebind Tailwind's global spacing multiplier.
    if (t.themeKey === 'spacing') {
      ctx.addIssue({
        code: 'custom',
        message: `${t.name}: themeKey "spacing" rebinds ALL spacing utilities. Use null.`,
      })
    }
    if (t.control === 'slider' && (t.min === undefined || t.max === undefined || t.step === undefined)) {
      ctx.addIssue({ code: 'custom', message: `${t.name}: slider needs min/max/step` })
    }
  })

export const GroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int(),
})

export const TokensFileSchema = z
  .object({
    schemaVersion: z.literal(TOKENS_SCHEMA_VERSION), // [G8] required, no default
    groups: z.array(GroupSchema).min(1),
    tokens: z.array(TokenSchema).min(1),
  })
  .superRefine((f, ctx) => {
    const groups = new Set(f.groups.map((g) => g.id))
    const names = new Set<string>()
    for (const t of f.tokens) {
      if (!groups.has(t.group))
        ctx.addIssue({ code: 'custom', message: `${t.name}: unknown group "${t.group}"` })
      if (names.has(t.name)) ctx.addIssue({ code: 'custom', message: `duplicate token ${t.name}` })
      names.add(t.name)
    }
    const themeKeys = new Set<string>()
    for (const t of f.tokens) {
      if (!t.themeKey) continue
      if (themeKeys.has(t.themeKey))
        ctx.addIssue({ code: 'custom', message: `duplicate themeKey ${t.themeKey}` })
      themeKeys.add(t.themeKey)
    }
  })

export type Token = z.infer<typeof TokenSchema>
export type TokensFile = z.infer<typeof TokensFileSchema>

export function loadTokens(raw: unknown): TokensFile {
  return TokensFileSchema.parse(raw)
}
