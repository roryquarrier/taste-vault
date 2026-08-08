import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTokens } from '../src/tokens/schema.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const file = loadTokens(JSON.parse(readFileSync(resolve(root, 'src/tokens/tokens.json'), 'utf8')))
const active = file.tokens.filter((t) => t.enabled)

const rootDecls = active.map((t) => `  ${t.name}: ${t.derived ? t.expr : t.default};`).join('\n')

// [G1][G2] @theme inline is the ONLY bridge. Never plain @theme.
const themeDecls = active
  .filter((t) => t.themeKey && !t.derived)
  .map((t) => `  --${t.themeKey}: var(${t.name});`)
  .join('\n')

const css = `/* GENERATED from src/tokens/tokens.json by scripts/build-tokens.ts — DO NOT EDIT */
:root {
${rootDecls}
}

/* [G1] @theme inline preserves the var() reference so runtime mutation of the
   --tv-* properties propagates through every Tailwind utility. */
@theme inline {
${themeDecls}
}

/* [G5] Grain consumption path. Any element with .tv-graded gets a noise overlay
   whose opacity is driven by --tv-grade-grain. filter() alone cannot do grain. */
.tv-graded { position: relative; isolation: isolate; }
.tv-graded > img, .tv-graded > picture > img {
  object-position: var(--tv-hero-object-position);
  filter: var(--tv-hero-filter);
  transform: scale(var(--tv-hero-scale));
}
.tv-graded::after {
  content: "";
  position: absolute; inset: 0;
  pointer-events: none;
  opacity: var(--tv-grade-grain);
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  background-size: 140px 140px;
}
`
mkdirSync(resolve(root, 'src/styles'), { recursive: true })
writeFileSync(resolve(root, 'src/styles/tokens.css'), css)
console.log(
  `tokens.css: ${active.length} tokens, ${active.filter((t) => t.themeKey && !t.derived).length} theme keys`,
)
