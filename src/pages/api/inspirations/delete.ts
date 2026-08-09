import type { APIRoute } from 'astro'
import { deleteInspiration } from '../../../lib/deleteInspiration.js'

// The site builds as `output: 'static'` with no adapter, so this route must stay
// prerenderable. In dev, Astro serves prerendered routes without a request body,
// so the actual delete is handled by the dev-server middleware in
// astro.config.mjs — both call deleteInspiration(). Once an adapter is added,
// flip this to `false` and the POST below takes over.
export const prerender = true

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request }) => {
  let slug: unknown
  try {
    slug = (await request.json())?.path
  } catch {
    return json({ success: false, error: 'invalid JSON body' }, 400)
  }
  const { status, body } = await deleteInspiration(slug)
  return json(body, status)
}

/** Anything but POST is a hard no. Also satisfies the static build's need for a GET. */
export const GET: APIRoute = () => json({ success: false, error: 'method not allowed' }, 405)
