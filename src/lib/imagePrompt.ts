export type ImageRecipe = {
  subject: string
  medium: string
  lighting?: string
  palette: string[]
  composition?: string
  negative: string[]
  aspect: '1:1' | '3:2' | '16:9' | '4:5' | '2:3'
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export function buildImagePrompt(recipe: ImageRecipe, form: 'natural' | 'structured'): string {
  if (form === 'natural') {
    const parts: string[] = [`${cap(recipe.medium)} of ${recipe.subject}.`]
    if (recipe.lighting) parts.push(`Lit by ${recipe.lighting}.`)
    if (recipe.palette.length) parts.push(`The palette is ${recipe.palette.join(', ')}.`)
    if (recipe.composition) parts.push(`${cap(recipe.composition)}.`)
    if (recipe.negative.length) {
      parts.push(`${recipe.negative.map((n, i) => (i === 0 ? `No ${n}` : `no ${n}`)).join(', ')}.`)
    }
    parts.push(`Aspect ratio ${recipe.aspect}.`)
    return parts.join(' ')
  }

  const clauses = [recipe.subject, recipe.medium]
  if (recipe.lighting) clauses.push(recipe.lighting)
  if (recipe.palette.length) clauses.push(...recipe.palette)
  if (recipe.composition) clauses.push(recipe.composition)

  const head = `${clauses.join(', ')} --ar ${recipe.aspect} --style raw`
  // Omit the --no line entirely when there are no negatives.
  return recipe.negative.length ? `${head}\n--no ${recipe.negative.join(', ')}` : head
}
