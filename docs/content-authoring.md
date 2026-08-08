# Content authoring

## Image path convention [G9]

> Markdown lives at `src/content/inspirations/<family-id>/<entry-id>.md`.
> Images live at `src/assets/inspirations/<family-id>/<entry-id>.thumb.webp` (and `.full.webp`).
> From the markdown file, that is **exactly three `../`**:
> `../../../assets/inspirations/<family-id>/<entry-id>.thumb.webp`
> Never use a path starting with `/` or `~` for `thumb:`/`full:` — `image()` resolves relative to the markdown file, and an absolute path silently escapes the asset pipeline.

This rule is enforced by `src/content/paths.test.ts` (Step 9.6).

## `publishAsset` [G7]

`publishAsset: false` means the entry is **metadata-only**: no image enters the
asset pipeline and a placeholder tile is rendered instead. Such an entry should
have **no `thumb:` field at all**.

`publishAsset: true` **requires** a `thumb:`. The collection schema enforces this
with a `.refine()`; omitting the thumb fails the build with
`[G7] publishAsset: true requires a 'thumb:' image path`.

## `schemaVersion` [G8]

`schemaVersion: 1` is required in every content file. There is no default —
omitting it fails the build. This is deliberate: a silent default would let a
stale file pass validation after the schema moves on.

## Canonical frontmatter

```yaml
---
schemaVersion: 1
title: Dither Mono
family: print-tech-paper
description: A masthead-led broadsheet layout where every datum is monospaced.
vocabulary: [halftone dither, monospace data, hairline rules, cold neutrals, tabular density]
thumb: ../../../assets/inspirations/print-tech-paper/dither-mono.thumb.webp
alt: A folded broadsheet newspaper shot flat under overcast daylight.
publishAsset: true
source:
  url: https://example.com/post/123
  author: unknown
  platform: web
  license: fair-use-reference
intent: >
  Should feel like a technical journal that respects the reader's time — dense but
  never cramped, with the authority of print and the precision of a terminal.
guardrails:
  always: [use CSS custom properties for every typographic and color value]
  never: [hardcode font sizes in px]
imageRecipe:
  subject: a folded broadsheet newspaper on an uncoated paper surface
  medium: editorial photograph
  lighting: flat overcast daylight from the upper left
  palette: [cold neutrals, newsprint grey, warm vermilion accent]
  composition: strict three-column grid, generous top margin, hairline rule under the masthead
  negative: [legible text, logos, people, drop shadows, glossy surfaces]
  aspect: "3:2"
featured: true
---

Free-text notes about why this reference matters.
```
