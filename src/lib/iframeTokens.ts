/**
 * Token → iframe bridge.
 *
 * CSS custom properties set on the parent document's <html> do NOT cascade into
 * an <iframe>'s document — each frame has its own tree. Variations are loaded
 * from blob: URLs created by this origin and the iframe carries
 * `allow-same-origin`, so `contentDocument` is reachable and we can write the
 * same properties straight onto the frame's own documentElement (inline styles,
 * so they beat any :root rule the variation ships).
 *
 * If a frame ever turns out to be inaccessible (opaque origin / sandbox change),
 * every helper here fails silently and we fall back to postMessage — a frame
 * that wants live tokens can listen for `{ type: 'tv-tokens', payload }`.
 */

export const TV_TOKENS_MESSAGE = 'tv-tokens'

/** Variation iframes in the current document (scoped to avoid bleeding into unrelated embeds). */
function frames(): HTMLIFrameElement[] {
  if (typeof document === 'undefined') return []
  return Array.from(document.querySelectorAll('iframe[data-variation-frame]'))
}

/** Write a set of custom properties into one frame. Returns true if it landed. */
export function applyTokensToFrame(
  frame: HTMLIFrameElement,
  props: Record<string, string> | Map<string, string>,
): boolean {
  const entries = props instanceof Map ? [...props] : Object.entries(props)
  if (entries.length === 0) return true

  try {
    const doc = frame.contentDocument
    if (doc?.documentElement) {
      const style = doc.documentElement.style
      for (const [name, value] of entries) style.setProperty(name, value)
      return true
    }
  } catch {
    // cross-origin — fall through to postMessage
  }

  try {
    frame.contentWindow?.postMessage(
      { type: TV_TOKENS_MESSAGE, payload: Object.fromEntries(entries) },
      '*',
    )
  } catch {
    /* nothing else we can do */
  }
  return false
}

/** Fan a set of custom properties out to every iframe on the page. */
export function applyTokensToFrames(
  props: Record<string, string> | Map<string, string>,
): void {
  for (const frame of frames()) applyTokensToFrame(frame, props)
}

/** Remove custom properties from every iframe (used by reset). */
export function clearTokensOnFrames(names: Iterable<string>): void {
  const list = [...names]
  for (const frame of frames()) {
    try {
      const style = frame.contentDocument?.documentElement?.style
      if (!style) continue
      for (const name of list) style.removeProperty(name)
    } catch {
      /* inaccessible frame — ignore */
    }
  }
}
