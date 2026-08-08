/**
 * Copy text to the clipboard. Falls back to the legacy execCommand path when the
 * async Clipboard API is missing (non-secure origin) or throws (permission denied).
 */
export async function copyText(s: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(s)
      return true
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = s
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
