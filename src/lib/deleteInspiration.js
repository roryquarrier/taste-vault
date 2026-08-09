import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src/content/inspirations')

/**
 * Delete one inspiration markdown file by its collection id
 * (e.g. `vast-quiet-cinematic/cloud-sea`).
 *
 * Plain JS so both the Astro route and the dev-server middleware in
 * astro.config.mjs can import it.
 *
 * @param {unknown} slug
 * @returns {Promise<{ status: number, body: { success: boolean, error?: string } }>}
 */
export async function deleteInspiration(slug) {
  if (typeof slug !== 'string' || !slug.trim()) {
    return { status: 400, body: { success: false, error: 'missing `path`' } }
  }

  const target = path.resolve(ROOT, `${slug}.md`)
  // [security] the resolved file must live inside src/content/inspirations/
  if (!target.startsWith(ROOT + path.sep)) {
    return { status: 400, body: { success: false, error: 'path outside inspirations/' } }
  }

  try {
    await fs.unlink(target)
    return { status: 200, body: { success: true } }
  } catch (err) {
    return {
      status: 500,
      body: { success: false, error: err instanceof Error ? err.message : String(err) },
    }
  }
}
