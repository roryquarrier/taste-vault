import { useMemo, useState } from 'react'
import { EDITABLE, TOKENS } from '../../tokens/defaults'
import { exportCss, exportJson } from '../../tokens/export'
import { copyText } from '../../lib/clipboard'
import { useTokens } from './hooks/useTokens'
import SliderControl from './controls/SliderControl'
import ColorControl from './controls/ColorControl'
import FontSelect from './controls/FontSelect'
import type { Token } from '../../tokens/schema'

/**
 * The panel UI is GENERATED from tokens.json. Adding a token to tokens.json must
 * produce a working control here with no change to this file — so never special-
 * case a token by name below; branch only on `control`.
 */
function Control({
  token,
  value,
  background,
  onChange,
}: {
  token: Token
  value: string
  background: string
  onChange: (v: string) => void
}) {
  switch (token.control) {
    case 'slider':
      return <SliderControl token={token} value={value} onChange={onChange} />
    case 'color':
      return <ColorControl token={token} value={value} background={background} onChange={onChange} />
    case 'select':
      return <FontSelect token={token} value={value} onChange={onChange} />
    default:
      return (
        <div className="tv-ctrl">
          <div className="tv-ctrl-head">
            <label htmlFor={`c${token.name}`}>{token.label}</label>
          </div>
          <input
            id={`c${token.name}`}
            type="text"
            className="tv-color-hex"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )
  }
}

export default function TweaksPanel() {
  const { values, set, reset, mounted } = useTokens()
  const [open, setOpen] = useState(true)
  const [exportAll, setExportAll] = useState(false)
  const [status, setStatus] = useState('')

  const groups = useMemo(
    () =>
      [...TOKENS.groups]
        .sort((a, b) => a.order - b.order)
        .map((g) => ({ ...g, tokens: EDITABLE.filter((t) => t.group === g.id) }))
        .filter((g) => g.tokens.length > 0),
    [],
  )

  async function copy(kind: 'css' | 'json') {
    const text =
      kind === 'css'
        ? exportCss(values, { all: exportAll, stamp: new Date().toISOString().slice(0, 10) })
        : exportJson(values, { all: exportAll })
    const ok = await copyText(text)
    setStatus(ok ? `${kind} copied` : 'copy failed')
    setTimeout(() => setStatus(''), 1500)
  }

  function downloadCss() {
    const css = exportCss(values, { all: exportAll, stamp: new Date().toISOString().slice(0, 10) })
    const blob = new Blob([css], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taste-vault-styles-${new Date().toISOString().slice(0, 10)}.css`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setStatus('downloaded')
    setTimeout(() => setStatus(''), 1500)
  }

  return (
    <aside className={`tv-panel${open ? '' : ' tv-panel--closed'}`} aria-label="Tweaks">
      <button type="button" className="tv-panel-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'tweaks ✕' : 'tweaks'}
      </button>

      {/* Body is gated behind `mounted` so the server render and the first client
          render agree — stored values only exist after the mount effect. */}
      {open && mounted && (
        <>
          <div className="tv-panel-body">
            {groups.map((g) => (
              <section key={g.id} className="tv-panel-group">
                <h2 className="tv-panel-group-title">{g.label}</h2>
                {g.tokens.map((t) => (
                  <Control
                    key={t.name}
                    token={t}
                    value={values[t.name] ?? t.default}
                    background={values['--tv-bg'] ?? '#0B0B0C'}
                    onChange={(v) => set(t.name, v)}
                  />
                ))}
              </section>
            ))}
          </div>

          <footer className="tv-panel-footer">
            <button type="button" className="tv-btn" onClick={reset}>
              reset
            </button>
            <button type="button" className="tv-btn" onClick={() => copy('css')}>
              copy css
            </button>
            <button type="button" className="tv-btn" onClick={() => copy('json')}>
              copy json
            </button>
            <button type="button" className="tv-btn tv-btn--download" onClick={downloadCss}>
              download .css
            </button>
            <div className="tv-panel-all">
              <input
                type="checkbox"
                id="tv-export-all"
                checked={exportAll}
                onChange={(e) => setExportAll(e.target.checked)}
              />
              <span>export all</span>
            </div>
            <span className="tv-copy-status" aria-live="polite">
              {status}
            </span>
          </footer>
        </>
      )}
    </aside>
  )
}
