export function normalizeTagInput(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizedTagKey(value: string): string {
  return normalizeTagInput(value).toLowerCase();
}
