import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULTS, EDITABLE } from '../../../tokens/defaults'
import { TOKENS_SCHEMA_VERSION } from '../../../tokens/schema'
import { clearStored, loadStored, saveStored } from '../../../lib/storage'
import { $tokens } from '../../../lib/tokenStore'
import { applyTokensToFrames, clearTokensOnFrames } from '../../../lib/iframeTokens'

const EDITABLE_NAMES = new Set(EDITABLE.map((t) => t.name))

/**
 * [G4] This hook NEVER computes --tv-hero-filter or --tv-hero-object-position.
 * Those are derived tokens, composed once in tokens.css out of var() references
 * to their parts. Writing --tv-grade-saturate is sufficient: the composed filter
 * re-resolves automatically. If you ever find JS setting a derived token, delete
 * it — resolving it in JS would freeze the expression into a literal string and
 * break every subsequent part update.
 */
export function useTokens() {
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS) // SSR-safe
  const [mounted, setMounted] = useState(false)

  // one rAF per frame; pending DOM writes coalesce into this Map
  const pending = useRef(new Map<string, string>())
  const frame = useRef<number | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(values)

  const flush = useCallback(() => {
    frame.current = null
    const style = document.documentElement.style
    for (const [name, value] of pending.current) style.setProperty(name, value)
    // Custom properties don't cross the iframe boundary — fan the same writes
    // out to every loaded variation frame. [iframeTokens]
    applyTokensToFrames(pending.current)
    pending.current.clear()
  }, [])

  const applyAll = useCallback((next: Record<string, string>) => {
    const style = document.documentElement.style
    for (const [name, value] of Object.entries(next)) style.setProperty(name, value)
    applyTokensToFrames(next)
  }, [])

  useEffect(() => {
    // localStorage is touched ONLY here — never during render.
    const stored = loadStored(EDITABLE_NAMES, TOKENS_SCHEMA_VERSION)
    if (Object.keys(stored).length) {
      const merged = { ...DEFAULTS, ...stored }
      latest.current = merged
      setValues(merged)
      $tokens.set(merged)
      applyAll(stored)
    }
    setMounted(true)
  }, [applyAll])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    [],
  )

  const set = useCallback(
    (name: string, value: string) => {
      if (!EDITABLE_NAMES.has(name)) return

      const next = { ...latest.current, [name]: value }
      latest.current = next
      setValues(next)
      $tokens.setKey(name, value)

      // batch the DOM write into a single rAF per frame
      pending.current.set(name, value)
      if (frame.current === null) frame.current = requestAnimationFrame(flush)

      // debounce persistence
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveStored(latest.current, TOKENS_SCHEMA_VERSION)
      }, 250)
    },
    [flush],
  )

  const reset = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    pending.current.clear()
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const style = document.documentElement.style
    for (const name of EDITABLE_NAMES) style.removeProperty(name)
    clearTokensOnFrames(EDITABLE_NAMES)
    clearStored()
    latest.current = DEFAULTS
    setValues(DEFAULTS)
    $tokens.set({ ...DEFAULTS })
  }, [])

  return { values, set, reset, mounted }
}
