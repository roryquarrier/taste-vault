import { useEffect, useRef, useState } from 'react'
import { copyText } from '../../lib/clipboard'

export type CopyVariant = { key: string; label: string; text: string }

type Props = {
  label: string
  /** Ignored when `variants` is supplied. */
  text?: string
  variants?: CopyVariant[]
}

export default function CopyButton({ label, text = '', variants }: Props) {
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const payload = variants?.length ? variants[active].text : text

  async function onCopy() {
    const ok = await copyText(payload)
    setStatus(ok ? 'copied' : 'failed')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus(''), 1500)
  }

  return (
    <span className="tv-copy">
      <button type="button" className="tv-btn" onClick={onCopy}>
        {label}
      </button>

      {variants && variants.length > 1 && (
        /* Segmented toggle — used for the natural / structured image prompt. */
        <span className="tv-copy" role="group" aria-label={`${label} format`}>
          {variants.map((v, i) => (
            <button
              key={v.key}
              type="button"
              className="tv-btn"
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              {v.label}
            </button>
          ))}
        </span>
      )}

      <span className="tv-copy-status" aria-live="polite">
        {status}
      </span>
    </span>
  )
}
