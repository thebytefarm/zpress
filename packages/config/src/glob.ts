/**
 * Returns true if the string contains glob metacharacters.
 *
 * @param s - String to test for glob metacharacters
 * @returns `true` if the string contains `*`, `?`, `{`, `}`, `[`, or `]`
 */
export function hasGlobChars(s: string): boolean {
  return /[*?{}[\]]/.test(s)
}

/**
 * Normalize an include value to a flat array of strings.
 *
 * @param include - String, array of strings, or undefined/null
 * @returns Array of include patterns (empty array for nullish input)
 */
export function normalizeInclude(
  include: string | readonly string[] | undefined | null
): readonly string[] {
  if (include === null || include === undefined) {
    return []
  }
  if (typeof include === 'string') {
    return [include]
  }
  return include
}

/**
 * Check if include is a single non-glob file string.
 *
 * @param include - Include value from section config
 * @returns True if include is a single string without glob characters
 */
export function isSingleFileInclude(
  include: string | readonly string[] | undefined | null
): boolean {
  return typeof include === 'string' && !hasGlobChars(include)
}

/**
 * Check if an include value has any glob patterns.
 *
 * Returns `true` when include is a string with glob characters,
 * or a non-empty array (arrays always imply glob-based discovery).
 *
 * @param include - Include value from section config
 * @returns True if include contains glob patterns
 */
export function hasAnyGlobInclude(include: string | readonly string[] | undefined | null): boolean {
  if (include === null || include === undefined) {
    return false
  }
  if (typeof include === 'string') {
    return hasGlobChars(include)
  }
  return include.length > 0
}
