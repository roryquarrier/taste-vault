import * as Slider from '@radix-ui/react-slider'
import type { Token } from '../../../tokens/schema'

type Props = {
  token: Token
  value: string
  onChange: (value: string) => void
}

/** Strip the unit suffix back off a serialized value. */
function toNumber(token: Token, value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : parseFloat(token.default) || 0
}

/** `type: 'number'` tokens emit a bare number; everything else gets its unit. */
export function serialize(token: Token, n: number): string {
  return token.type === 'number' ? String(n) : `${n}${token.unit ?? ''}`
}

export default function SliderControl({ token, value, onChange }: Props) {
  const n = toNumber(token, value)
  const min = token.min ?? 0
  const max = token.max ?? 1
  const step = token.step ?? 0.01

  return (
    <div className="tv-ctrl">
      <div className="tv-ctrl-head">
        <label htmlFor={`c${token.name}`}>{token.label}</label>
        <output className="tv-ctrl-value">{serialize(token, n)}</output>
      </div>
      <Slider.Root
        id={`c${token.name}`}
        className="tv-slider"
        value={[n]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(serialize(token, next))}
        aria-label={token.label}
      >
        <Slider.Track className="tv-slider-track">
          <Slider.Range className="tv-slider-range" />
        </Slider.Track>
        <Slider.Thumb className="tv-slider-thumb" />
      </Slider.Root>
    </div>
  )
}
