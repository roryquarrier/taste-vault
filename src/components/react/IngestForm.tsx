import { useState } from 'react'
import { copyText } from '../../lib/clipboard'

type Props = {
  families: { id: string; name: string }[]
}

export default function IngestForm({ families }: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [source, setSource] = useState<'x' | 'dribbble' | 'pinterest' | 'web' | 'screenshot'>('x')
  const [notes, setNotes] = useState('')
  const [suggestedFamily, setSuggestedFamily] = useState('')
  const [copied, setCopied] = useState(false)

  const submission = [
    `NEW INSPIRATION FOR TASTE-VAULT`,
    ``,
    `Source: ${source}`,
    url ? `URL: ${url}` : `Screenshot: dropped in hermes-drop`,
    suggestedFamily ? `Suggested family: ${suggestedFamily}` : `Family: AI to decide`,
    notes ? `Notes: ${notes}` : '',
    ``,
    `@Hermes — please analyze this design, label it with vocabulary, write the description + intent + image recipe, and add it to the library.`,
  ].filter(Boolean).join('\n')

  async function copySubmission() {
    const ok = await copyText(submission)
    setCopied(ok)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tv-ingest">
      <button
        type="button"
        className="tv-tab"
        onClick={() => setOpen(o => !o)}
        aria-pressed={open}
      >
        {open ? '− close' : '+ add inspiration'}
      </button>

      {open && (
        <div className="tv-ingest-body">
          <p className="tv-ingest-hint">
            Paste a link or drop a screenshot in <code>hermes-drop</code>. Hermes will analyze it, label it,
            and add it to the library with full metadata.
          </p>

          <div className="tv-ingest-row">
            <div className="tv-pb-field">
              <span>Source</span>
              <select value={source} onChange={e => setSource(e.target.value as typeof source)} className="tv-pb-input tv-select-trigger">
                <option value="x">X / Twitter</option>
                <option value="dribbble">Dribbble</option>
                <option value="pinterest">Pinterest</option>
                <option value="web">Other website</option>
                <option value="screenshot">Screenshot (hermes-drop)</option>
              </select>
            </div>

            {source !== 'screenshot' && (
              <div className="tv-pb-field" style={{flex: 2}}>
                <span>URL</span>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="tv-pb-input"
                />
              </div>
            )}
          </div>

          <div className="tv-pb-field">
            <span>Suggested family (optional — AI will decide if blank)</span>
            <select value={suggestedFamily} onChange={e => setSuggestedFamily(e.target.value)} className="tv-pb-input tv-select-trigger">
              <option value="">— AI decides —</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="tv-pb-field">
            <span>Notes (what you like about it)</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. love the colour palette and the typography hierarchy"
              className="tv-pb-input tv-pb-textarea"
            />
          </div>

          <div className="tv-ingest-actions">
            <button type="button" className="tv-btn" onClick={copySubmission}>
              {copied ? 'COPIED ✓ — paste in Telegram' : 'COPY SUBMISSION'}
            </button>
            <span className="tv-ingest-or">or just send the link to Hermes in Telegram directly</span>
          </div>

          {url && (
            <pre className="tv-pb-output" style="margin-top: calc(var(--tv-space-unit) * 3)">{submission}</pre>
          )}
        </div>
      )}
    </div>
  )
}
