import * as Select from '@radix-ui/react-select'
import type { Token } from '../../../tokens/schema'
import { FONTS, FONT_BY_STACK, useFontLoader } from '../hooks/useFontLoader'

type Props = {
  token: Token
  value: string
  onChange: (value: string) => void
}

/** `--tv-font-heading` → `heading`. */
function roleOf(token: Token): string {
  return token.name.replace('--tv-font-', '')
}

export default function FontSelect({ token, value, onChange }: Props) {
  const loadFont = useFontLoader()
  const role = roleOf(token)
  const options = FONTS.filter((f) => f.role.includes(role))

  // A stored value not present in fonts.json still needs a stable Select value.
  const known = FONT_BY_STACK.has(value)

  return (
    <div className="tv-ctrl">
      <div className="tv-ctrl-head">
        <label>{token.label}</label>
      </div>
      <Select.Root
        value={known ? value : undefined}
        onValueChange={(next) => {
          loadFont(FONT_BY_STACK.get(next))
          onChange(next)
        }}
      >
        <Select.Trigger className="tv-select-trigger" aria-label={token.label}>
          <Select.Value placeholder="custom">
            {known ? FONT_BY_STACK.get(value)!.label : 'custom'}
          </Select.Value>
          <Select.Icon>▾</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="tv-select-content" position="popper" sideOffset={4}>
            <Select.Viewport>
              {options.map((f) => (
                <Select.Item key={f.id} value={f.stack} className="tv-select-item">
                  <Select.ItemText>{f.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
