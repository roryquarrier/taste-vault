import { useCallback } from 'react'
import fonts from '../../../tokens/fonts.json'

export type FontFace = {
  id: string
  stack: string
  label: string
  source: string
  family: string
  weights: number[]
  role: string[]
}

export const FONTS = fonts as FontFace[]
export const FONT_BY_STACK = new Map(FONTS.map((f) => [f.stack, f]))

/** Module-level so the set survives remounts — injection must be idempotent. */
const injected = new Set<string>()

function href(font: FontFace): string {
  const family = font.family.replace(/ /g, '+')
  const weights = [...font.weights].sort((a, b) => a - b).join(';')
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`
}

export function useFontLoader() {
  return useCallback((font: FontFace | undefined) => {
    if (!font || font.source !== 'google' || injected.has(font.id)) return
    injected.add(font.id)
    const url = href(font)
    // Belt and braces: a matching <link> may already exist from a prior page.
    if (document.head.querySelector(`link[href="${url}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
  }, [])
}
