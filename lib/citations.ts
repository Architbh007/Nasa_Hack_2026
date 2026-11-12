/** Turn [bass-ii] or [bass-ii, flex] citations into markdown links to the Explorer. Unknown ids are left as text. */
export function linkifyCitations(text: string, ids: ReadonlySet<string>, acronym: (id: string) => string): string {
  return text.replace(/\[([a-z0-9-]+(?:\s*,\s*[a-z0-9-]+)*)\](?!\()/g, (whole, inner: string) => {
    const parts = inner.split(/\s*,\s*/);
    if (!parts.every((p) => ids.has(p))) return whole;
    return parts.map((p) => `[${acronym(p)}](/explore?id=${p})`).join(", ");
  });
}

/** Investigation ids cited in a text, in order of first appearance. */
export function citedIds(text: string, ids: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\[([a-z0-9-]+(?:\s*,\s*[a-z0-9-]+)*)\]/g)) {
    for (const p of (m[1] ?? "").split(/\s*,\s*/)) if (ids.has(p) && !out.includes(p)) out.push(p);
  }
  return out;
}
