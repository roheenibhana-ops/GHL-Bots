/** Counts only (no names or numbers): how the same people appear across GHL and Jobber, by normalised phone. */
export type Sources = Record<string, Set<string>>;

export function overlapStats(src: Sources) {
  const names = Object.keys(src);
  const sizes = Object.fromEntries(names.map((n) => [n, src[n].size]));
  const pairs: Record<string, number> = {};
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      let n = 0;
      for (const p of src[names[i]]) if (src[names[j]].has(p)) n++;
      pairs[`${names[i]} & ${names[j]}`] = n;
    }
  }
  const everyone = new Set<string>();
  for (const n of names) for (const p of src[n]) everyone.add(p);
  let inAll = 0;
  let inMoreThanOne = 0;
  for (const p of everyone) {
    const c = names.filter((n) => src[n].has(p)).length;
    if (c === names.length) inAll++;
    if (c > 1) inMoreThanOne++;
  }
  return { sizes, pairs, uniquePeople: everyone.size, inMoreThanOneSystem: inMoreThanOne, inAllSystems: inAll };
}
