import { defineCollection, reference, z } from 'astro:content'
import { glob, file } from 'astro/loaders'

const SCHEMA_VERSION = 1
/** [G8] required, NO .default() — a file omitting this must fail loudly. */
const schemaVersion = z.literal(SCHEMA_VERSION)

const families = defineCollection({
  loader: file('src/content/families.json'),
  schema: ({ image }) =>
    z.object({
      schemaVersion,
      // [G3] `id` is supplied by the file() loader from each array element's `id`
      // field and is NOT declared here. `slug` is deleted — id is the slug.
      name: z.string(),
      order: z.number().int(),
      description: z.string(),
      vocabulary: z.array(z.string()).min(3).max(12),
      representativeImage: image().optional(),
      guardrails: z
        .object({
          always: z.array(z.string()).default([]),
          never: z.array(z.string()).default([]),
        })
        .default({ always: [], never: [] }),
    }),
})

const inspirations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/inspirations' }),
  schema: ({ image }) =>
    z
      .object({
        schemaVersion,
        title: z.string(),
        family: reference('families'),
        description: z.string(),
        vocabulary: z.array(z.string()).min(3).max(12),

        // thumb can be a public/ URL path (/inspirations/...) or an image() asset
        thumb: z.string().optional(),
        full: z.string().optional(),
        alt: z.string(),

        source: z
          .object({
            url: z.string().url().optional(),
            author: z.string().optional(),
            platform: z.enum(['dribbble', 'pinterest', 'x', 'behance', 'web', 'own']).default('web'),
            license: z.enum(['unknown', 'fair-use-reference', 'cc', 'owned']).default('unknown'),
          })
          .default({ platform: 'web', license: 'unknown' }),
        publishAsset: z.boolean().default(false),

        intent: z.string(),
        guardrails: z
          .object({
            always: z.array(z.string()).default([]),
            never: z.array(z.string()).default([]),
          })
          .default({ always: [], never: [] }),
        imageRecipe: z.object({
          subject: z.string(),
          medium: z.string(),
          lighting: z.string().optional(),
          palette: z.array(z.string()).default([]),
          composition: z.string().optional(),
          negative: z.array(z.string()).default([]),
          aspect: z.enum(['1:1', '3:2', '16:9', '4:5', '2:3']).default('3:2'),
        }),
        tokenSeed: z.record(z.string(), z.string()).optional(),
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
      })
      .refine((d) => !d.publishAsset || !!d.thumb, {
        message: '[G7] publishAsset: true requires a `thumb:` image path',
        path: ['thumb'],
      }),
})

const variations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/variations' }),
  schema: z.object({
    schemaVersion,
    setId: z.string(),
    name: z.string(),
    iteration: z.number().int().default(1),
    parent: reference('variations').optional(),
    componentPath: z.string(),
    tokens: z.record(z.string(), z.string()),
    inspirations: z.array(reference('inspirations')).default([]),
    promptSnapshot: z.string(),
    status: z.enum(['draft', 'candidate', 'chosen', 'archived']).default('draft'),
    createdAt: z.coerce.date(),
  }),
})

export const collections = { families, inspirations, variations }
