/**
 * Generates 800x533 WebP placeholders for every inspiration entry that sets
 * `publishAsset: true` but has no real asset on disk yet.
 *
 * Usage: npx tsx scripts/make-placeholder.ts <family-id>/<entry-id> [...]
 * With no arguments it regenerates the Phase 1 sample set.
 */
import { mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const SAMPLES = [
  'print-tech-paper/dither-mono',
  'print-tech-paper/tabular-ledger',
  'vast-quiet-cinematic/salt-flat-horizon',
  'warm-analog-editorial/quarterly-spread',
  'soft-clinical/pale-intake',
  'archival-museum/plate-forty-one',
]

const W = 800
const H = 533

function svg(label: string, seed: number) {
  const hue = (seed * 47) % 360
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="hsl(${hue} 12% 14%)"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="hsl(${hue} 20% 30%)" stroke-width="1"/>
  <text x="${W / 2}" y="${H / 2}" fill="hsl(${hue} 30% 62%)" font-family="monospace" font-size="22" text-anchor="middle">${label}</text>
  <text x="${W / 2}" y="${H / 2 + 30}" fill="hsl(${hue} 15% 42%)" font-family="monospace" font-size="13" text-anchor="middle">placeholder ${W}x${H}</text>
</svg>`
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : SAMPLES

for (const [i, key] of targets.entries()) {
  const out = resolve(root, `src/assets/inspirations/${key}.thumb.webp`)
  mkdirSync(dirname(out), { recursive: true })
  if (existsSync(out) && !process.env.FORCE) {
    console.log(`skip (exists): ${key}.thumb.webp`)
    continue
  }
  await sharp(Buffer.from(svg(key, i + 1))).webp({ quality: 82 }).toFile(out)
  console.log(`wrote: src/assets/inspirations/${key}.thumb.webp`)
}
