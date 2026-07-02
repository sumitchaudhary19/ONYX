/**
 * Sanitizes user input before interpolation into Supabase PostgREST
 * `.ilike()` and `.or()` filter strings.
 *
 * - Escapes SQL LIKE wildcards (% and _) so they match literally.
 * - Strips PostgREST filter syntax characters ( ) , that could
 *   break or inject additional filter conditions.
 *
 * @param {string} query - Raw user input
 * @returns {string} Sanitized string safe for PostgREST filters
 */
export function sanitizeSearchQuery(query) {
  if (!query) return ''
  return query
    .replace(/[%_]/g, '\\$&')   // Escape SQL LIKE wildcards
    .replace(/[(),]/g, '')       // Strip PostgREST syntax chars
    .trim()
}
