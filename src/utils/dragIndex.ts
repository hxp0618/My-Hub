export const parseDragIndex = (rawValue: string, maxExclusive: number): number | null => {
  if (!/^\d+$/.test(rawValue)) return null;
  const index = Number(rawValue);
  if (!Number.isInteger(index) || index < 0 || index >= maxExclusive) return null;
  return index;
};
