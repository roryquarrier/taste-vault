import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { deleteInspiration } from './src/lib/deleteInspiration.js'

/**
 * Dev-only DELETE endpoint for library inspirations. Lives here rather than in
 * the Astro route because `output: 'static'` has no adapter, and prerendered
 * routes in dev are invoked without a request body. See
 * src/pages/api/inspirations/delete.ts.
 */
const deleteInspirationDevApi = {
  name: 'tv-delete-inspiration-dev-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/api/inspirations/delete', async (req, res, next) => {
      if (req.method !== 'POST') return next()
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      let slug
      try {
        slug = JSON.parse(Buffer.concat(chunks).toString('utf8'))?.path
      } catch {
        res.statusCode = 400
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ success: false, error: 'invalid JSON body' }))
        return
      }
      const { status, body } = await deleteInspiration(slug)
      res.statusCode = status
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(body))
    })
  },
}

export default defineConfig({
  site: 'https://roryquarrier.github.io',
  base: '/taste-vault',
  integrations: [react()],
  vite: { plugins: [tailwindcss(), deleteInspirationDevApi] },
  output: 'static',
})
