/**
 * Natural sort comparison for issue IDs (handles numeric suffixes correctly)
 * e.g., "xqkm.3" comes before "xqkm.23" (not after like string comparison)
 */
export const compareIdsNaturally = (idA: string, idB: string): number => {
  // Extract prefix and number: "xqkm.23" -> ["xqkm", 23]
  const parseId = (id: string): [string, number] => {
    const lastDotIndex = id.lastIndexOf('.');
    if (lastDotIndex === -1) return [id, 0];
    const prefix = id.substring(0, lastDotIndex);
    const numPart = parseInt(id.substring(lastDotIndex + 1), 10);
    return [prefix, isNaN(numPart) ? 0 : numPart];
  };

  const [prefixA, numA] = parseId(idA);
  const [prefixB, numB] = parseId(idB);

  // Compare prefixes first
  const prefixCompare = prefixA.localeCompare(prefixB);
  if (prefixCompare !== 0) return prefixCompare;

  // Same prefix, compare numbers
  return numA - numB;
};
