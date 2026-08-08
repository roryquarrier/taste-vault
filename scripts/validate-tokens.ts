import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTokens } from '../src/tokens/schema.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

let file
try {
  file = loadTokens(JSON.parse(readFileSync(resolve(root, 'src/tokens/tokens.json'), 'utf8')))
} catch (err) {
  console.error('tokens.json failed schema validation:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

const EXTS = new Set(['.astro', '.tsx', '.ts', '.css'])
const sources: string[] = []
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (EXTS.has(extname(p)) && !p.endsWith('tokens.css') && !p.includes('src/tokens/'))
      sources.push(readFileSync(p, 'utf8'))
  }
}
walk(resolve(root, 'src'))
const haystack = sources.join('\n')

const unused = file.tokens
  .filter((t) => t.enabled && t.exposeToGenerator)
  .filter((t) => !haystack.includes(t.name))
  .map((t) => t.name)

if (unused.length) {
  console.warn(`warning: ${unused.length} exposed token(s) referenced nowhere in src/:`)
  for (const n of unused) console.warn(`  - ${n}`)
} else {
  console.log('all exposed tokens are referenced in src/')
}
console.log(`validate:tokens OK — ${file.tokens.length} tokens, ${file.groups.length} groups`)
process.exit(0)
