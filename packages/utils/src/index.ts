export function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value != null);
}

