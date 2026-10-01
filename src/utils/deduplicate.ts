/**
 * Helper to deduplicate arrays of objects by their `id` property.
 * Keeps the first occurrence and discards subsequent duplicates.
 */
export function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter((item, index) => {
    if (!item) return false;
    const key = item.id ? String(item.id) : `__no_id_${index}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
