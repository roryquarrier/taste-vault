import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * VariationViewer
 *
 * A React island that lets the user connect a folder of generated website
 * variations (HTML files) and view them side-by-side via a tab / sub-tab
 * hierarchy.
 *
 * Hierarchy:
 *   main tab  (e.g. "V1 Print-Tech")   ← derived from the top-level subfolder
 *     └─ sub-tab (e.g. "3a", "3b")       ← each .html inside that subfolder
 *
 * If files live directly in the root of the connected folder (no subfolders),
 * they become flat main tabs with no sub-tabs.
 *
 * Folder selection uses the File System Access API (`showDirectoryPicker`)
 * when available (Chrome/Edge). Otherwise it falls back to an
 * `<input type="file" webkitdirectory>` (works in Firefox/Safari, but cannot
 * persist a live handle across reloads). A third fallback — a plain multi-file
 * `<input type="file">` — covers browsers that reject the directory attribute.
 *
 * IMPORTANT LIMITATION: each variation renders inside a sandboxed <iframe>.
 * The TweaksPanel sets CSS custom properties on documentElement of the *parent*
 * document, which does NOT cascade into cross-origin iframe content. So tweaks
 * affect the reference page chrome and any same-document token previews, but
 * NOT the loaded HTML variation. A note is shown in the UI to make this clear.
 */

// ---- types -----------------------------------------------------------------

type LoadedFile = {
  /** stable id */
  id: string
  /** original name, e.g. "iteration-a.html" */
  name: string
  /** object URL that can be set as the iframe src */
  url: string
}

type Variation = {
  /** unique id for the main tab */
  id: string
  /** editable label shown in the main tab */
  label: string
  /** iteration files belonging to this variation */
  files: LoadedFile[]
}

type FolderHandle = {
  /** human readable path for the breadcrumb */
  path: string
  /** the live FileSystemDirectoryHandle, when FS Access API was used */
  dir?: FileSystemDirectoryHandle
}

// ---- helpers ---------------------------------------------------------------

/** Sort .html files alphabetically for stable ordering. */
function byName(a: LoadedFile, b: LoadedFile): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true })
}

/**
 * Derive a readable label for a variation folder / file.
 * Strips common extensions and leading "v"/"iteration-" prefixes.
 */
function prettyLabel(raw: string): string {
  return raw
    .replace(/\.html?$/i, '')
    .replace(/^iteration[-_]?/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
}

/** Build a short id ("V1", "V2"...) for a main tab index. */
function mainId(index: number): string {
  return `V${index + 1}`
}

/**
 * Ingest a flat list of files (with relative paths) into the Variation[] tree.
 *
 * A file's relative path may be:
 *   "index.html"            → root, becomes its own main tab
 *   "v1/index.html"         → main tab "v1", single file
 *   "v1/iteration-a.html"   → main tab "v1", sub-tab "iteration-a"
 *   "v1/sub/iter-a.html"    → collapsed: main tab "v1", sub-tab "iter-a"
 */
function buildVariations(files: { path: string; file: File }[]): Variation[] {
  const groups = new Map<string, { path: string; file: File }[]>()

  for (const entry of files) {
    const parts = entry.path.split('/').filter(Boolean)
    if (parts.length <= 1) {
      // root-level file — treat as its own group keyed by filename
      const key = `\u0000root:${entry.path}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(entry)
    } else {
      // group by the FIRST path segment (the variation folder)
      const key = parts[0]
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(entry)
    }
  }

  // Stable ordering: root files first by name, then folders alphabetically.
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const aRoot = a.startsWith('\u0000root:')
    const bRoot = b.startsWith('\u0000root:')
    if (aRoot !== bRoot) return aRoot ? -1 : 1
    return a.localeCompare(b, undefined, { numeric: true })
  })

  const variations: Variation[] = []
  let mainIdx = 0

  for (const key of sortedKeys) {
    const entries = groups.get(key)!
    const isRoot = key.startsWith('\u0000root:')

    const label = isRoot
      ? prettyLabel(entries[0].path)
      : prettyLabel(key)

    const loaded: LoadedFile[] = entries
      .map(({ path, file }) => {
        const parts = path.split('/').filter(Boolean)
        const leaf = parts[parts.length - 1]
        return {
          id: path,
          name: leaf,
          url: URL.createObjectURL(file),
        }
      })
      .sort(byName)

    variations.push({
      id: `${mainId(mainIdx)}:${label}`,
      label: `${mainId(mainIdx)} ${label}`.trim(),
      files: loaded,
    })
    mainIdx++
  }

  return variations
}

/** Revoke all object URLs in a variations tree (memory hygiene). */
function revokeAll(variations: Variation[]): void {
  for (const v of variations) for (const f of v.files) URL.revokeObjectURL(f.url)
}

// ---- feature detection -----------------------------------------------------

/** Minimal typing for the File System Access API (not in stock DOM lib). */
type FsWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}

const hasFsAccess =
  typeof window !== 'undefined' &&
  'showDirectoryPicker' in (window as FsWindow)

// ---- component -------------------------------------------------------------

export default function VariationViewer() {
  const [variations, setVariations] = useState<Variation[]>([])
  const [folder, setFolder] = useState<FolderHandle | null>(null)
  const [activeMain, setActiveMain] = useState(0)
  const [activeSub, setActiveSub] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  const dirInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // SSR guard: only do browser-only work after mount.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Clean up object URLs on unmount.
  useEffect(() => {
    return () => {
      revokeAll(variations)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = variations[activeMain]
  const currentFile = current?.files[activeSub]

  /** Ingest File[] with their webkitRelativePath (or name fallback). */
  function ingestFiles(files: File[], path: string) {
    const entries = files
      .filter((f) => /\.html?$/i.test(f.name))
      .map((f) => ({
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
          f.name,
        file: f,
      }))

    if (entries.length === 0) {
      setStatus('No .html files found in selection.')
      setTimeout(() => setStatus(''), 2500)
      return
    }

    revokeAll(variations)
    const built = buildVariations(entries)
    setVariations(built)
    setFolder({ path })
    setActiveMain(0)
    setActiveSub(0)
    setStatus(`Loaded ${entries.length} file${entries.length === 1 ? '' : 's'}`)
    setTimeout(() => setStatus(''), 2000)
  }

  // --- connect via File System Access API ----------------------------------

  async function connectFsAccess() {
    try {
      const handle = await (window as FsWindow).showDirectoryPicker!()
      const collected: { path: string; file: File }[] = []
      await collectHtml(handle, '', collected)
      const files = collected.map((c) => c.file)
      // attach webkitRelativePath-ish info via a wrapper map
      const wrapped = files.map(
        (f, i) =>
          Object.assign(f, {
            webkitRelativePath: collected[i].path,
          }) as File,
      )
      ingestFiles(wrapped, handle.name)
      // remember the live handle for the breadcrumb
      setFolder((prev) => (prev ? { ...prev, dir: handle } : prev))
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        setStatus(`Folder error: ${(err as Error).message}`)
        setTimeout(() => setStatus(''), 3000)
      }
    }
  }

  /** Recursively walk a FileSystemDirectoryHandle for .html files. */
  async function collectHtml(
    dir: FileSystemDirectoryHandle,
    prefix: string,
    out: { path: string; file: File }[],
  ) {
    for await (const entry of dir.values()) {
      const next = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.kind === 'file') {
        if (/\.html?$/i.test(entry.name)) {
          const file = await (entry as FileSystemFileHandle).getFile()
          out.push({ path: next, file })
        }
      } else if (entry.kind === 'directory') {
        await collectHtml(entry as FileSystemDirectoryHandle, next, out)
      }
    }
  }

  // --- connect via <input webkitdirectory> ---------------------------------

  function onDirInput(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list || list.length === 0) return
    const files = Array.from(list)
    const top = files[0] as File & { webkitRelativePath?: string }
    const rootName = top.webkitRelativePath?.split('/')[0] ?? 'folder'
    ingestFiles(files, rootName)
    // reset so selecting the same folder again fires onChange
    e.target.value = ''
  }

  // --- connect via plain multi-file input (last-resort fallback) -----------

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list || list.length === 0) return
    ingestFiles(Array.from(list), 'selected files')
    e.target.value = ''
  }

  function disconnect() {
    revokeAll(variations)
    setVariations([])
    setFolder(null)
    setActiveMain(0)
    setActiveSub(0)
    setStatus('Disconnected')
    setTimeout(() => setStatus(''), 1500)
  }

  // keep activeSub in range when switching main tabs
  useEffect(() => {
    setActiveSub(0)
  }, [activeMain])

  const subCount = current?.files.length ?? 0

  const breadcrumb = useMemo(() => {
    if (!folder) return null
    const parts = [folder.path]
    if (current) parts.push(current.label)
    if (subCount > 1 && currentFile) parts.push(currentFile.name)
    return parts.join(' / ')
  }, [folder, current, currentFile, subCount])

  return (
    <div className="tv-vv">
      {/* --- top bar: connect button + breadcrumb --- */}
      <div className="tv-vv-topbar">
        <div className="tv-vv-connect">
          {mounted && hasFsAccess ? (
            <button
              type="button"
              className="tv-vv-connect-btn"
              onClick={connectFsAccess}
            >
              ⬆ CONNECT FOLDER
            </button>
          ) : (
            <>
              <button
                type="button"
                className="tv-vv-connect-btn"
                onClick={() => dirInputRef.current?.click()}
              >
                ⬆ CONNECT FOLDER
              </button>
              <input
                ref={dirInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is a non-standard but widely
                // supported attribute; React's types don't include it.
                webkitdirectory=""
                directory=""
                multiple
                onChange={onDirInput}
                style={{ display: 'none' }}
              />
            </>
          )}

          {/* last-resort fallback for browsers that reject webkitdirectory */}
          <button
            type="button"
            className="tv-vv-connect-btn tv-vv-connect-btn--ghost"
            onClick={() => fileInputRef.current?.click()}
            title="Select individual HTML files"
          >
            + FILES
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,text/html"
            multiple
            onChange={onFileInput}
            style={{ display: 'none' }}
          />

          {folder && (
            <button
              type="button"
              className="tv-vv-connect-btn tv-vv-connect-btn--ghost"
              onClick={disconnect}
            >
              ✕ DISCONNECT
            </button>
          )}
        </div>

        <div className="tv-vv-breadcrumb" aria-live="polite">
          {breadcrumb ? (
            <span>{breadcrumb}</span>
          ) : (
            <span className="tv-vv-breadcrumb--empty">
              No folder connected — pick a folder of generated HTML variations.
            </span>
          )}
          {status && <span className="tv-vv-status">{status}</span>}
        </div>
      </div>

      {/* --- empty state --- */}
      {!current && (
        <div className="tv-vv-empty">
          <p className="tv-vv-empty-title">No variations loaded</p>
          <p className="tv-vv-empty-sub">
            Connect a folder containing your generated HTML files. Each
            top-level subfolder becomes a main tab (V1, V2…); each .html file
            inside becomes an iteration sub-tab.
          </p>
        </div>
      )}

      {/* --- main tabs --- */}
      {current && (
        <>
          <div className="tv-vv-maintabs" role="tablist" aria-label="Variations">
            {variations.map((v, i) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={i === activeMain}
                className={`tv-vv-maintab${i === activeMain ? ' tv-vv-maintab--active' : ''}`}
                onClick={() => setActiveMain(i)}
              >
                <input
                  className="tv-vv-maintab-label"
                  value={v.label}
                  aria-label={`Label for ${v.id}`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setVariations((prev) =>
                      prev.map((p, idx) =>
                        idx === i ? { ...p, label: e.target.value } : p,
                      ),
                    )
                  }}
                />
                {v.files.length > 1 && (
                  <span className="tv-vv-maintab-count">{v.files.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* --- sub tabs --- */}
          {subCount > 1 && (
            <div className="tv-vv-subtabs" role="tablist" aria-label="Iterations">
              {current.files.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeSub}
                  className={`tv-vv-subtab${i === activeSub ? ' tv-vv-subtab--active' : ''}`}
                  onClick={() => setActiveSub(i)}
                >
                  {f.name.replace(/\.html?$/i, '')}
                </button>
              ))}
            </div>
          )}

          {/* --- iframe area --- */}
          <div className="tv-vv-stage">
            {currentFile ? (
              <iframe
                key={currentFile.url}
                src={currentFile.url}
                title={`${current.label} — ${currentFile.name}`}
                className="tv-vv-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="tv-vv-empty">
                <p className="tv-vv-empty-sub">This variation has no HTML file.</p>
              </div>
            )}
          </div>

          {/* --- limitation note --- */}
          <p className="tv-vv-note">
            <strong>Note:</strong> variations render inside a sandboxed iframe.
            The TweaksPanel edits CSS variables on this page's{' '}
            <code>documentElement</code>, which <em>does not</em> cascade into
            cross-origin iframe content — so tweaks won't visually affect the
            loaded variation. They still affect the reference page chrome around it.
          </p>
        </>
      )}
    </div>
  )
}
