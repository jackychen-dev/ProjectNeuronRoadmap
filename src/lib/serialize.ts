/**
 * Safe serialize for passing server data to client components.
 * Handles BigInt, Date, and avoids JSON.parse errors from malformed data.
 */
export function serializeForClient<T>(data: T): T {
  try {
    const json = JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") return Number(value);
      if (value instanceof Date) return value.toISOString();
      return value;
    });
    return JSON.parse(json) as T;
  } catch {
    // Fallback: avoid crashing the page if data has circular refs or other issues
    if (Array.isArray(data)) return [] as T;
    if (data !== null && typeof data === "object") return {} as T;
    return data;
  }
}
