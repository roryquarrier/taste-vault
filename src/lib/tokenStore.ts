import { map } from 'nanostores'
import { DEFAULTS } from '../tokens/defaults'

/**
 * Mirror of the panel's live token values, so a second island can read the
 * current state without prop-drilling. The `/reference` page reads nothing from
 * here — it is pure CSS, driven by the custom properties on <html>.
 */
export const $tokens = map<Record<string, string>>({ ...DEFAULTS })
