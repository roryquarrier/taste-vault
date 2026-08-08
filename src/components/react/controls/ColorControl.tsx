import { useEffect, useState } from 'react'
import { formatHex, parse, wcagContrast } from 'culori'
import type { Token } from '../../../tokens/schema'

type Props = {
  token: Token
  value: string
  /** current background token value, for the contrast warning */
  background: string
  onChange: (value: string) => void
}

function normalize(input: string): string | null {
  const parsed = parse(input.trim())
  return parsed ? formatHex(parsed) : null
}

export default function ColorControl({ token, value, background, onChange }: Props) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])

  const hex = normalize(value) ?? '#000000'
  const bg = normalize(background)
  // Only warn for tokens that carry text or sit against the page ground.
  const contrast = bg ? wcagContrast(hex, bg) : null
  const lowContrast = contrast !== null && contrast < 3 && token.name !== '--tv-bg'

  function commit(next: string) {
    const norm = normalize(next)
    if (norm) onChange(norm)
  }

  return (
    <div className="tv-ctrl">
      <div className="tv-ctrl-head">
        <label htmlFor={`c${token.name}`}>{token.label}</label>
        {lowContrast && (
          <span className="tv-ctrl-warn" title="Contrast against the background is below 3:1">
            {contrast.toFixed(1)}:1
          </span>
        )}
      </div>
      <div className="tv-color-row">
        <input
          id={`c${token.name}`}
          type="color"
          className="tv-color-swatch"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={token.label}
        />
        <input
          type="text"
          className="tv-color-hex"
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
          }}
          aria-label={`${token.label} hex value`}
        />
      </div>
    </div>
  )
}
