import type { TravelSource } from './concierge-types';

/** A citation is usable only when its exact index has one unambiguous returned URL. */
export function checkedResearchSummary(summary: string, sources: TravelSource[]) {
  const urls = new Map<number, Set<string>>();
  for (const source of sources) {
    if (!source.index) continue;
    const entries = urls.get(source.index) || new Set<string>();
    entries.add(source.url);
    urls.set(source.index, entries);
  }
  const warnings = new Set<string>();
  const paragraphs = summary.split(/\n\s*\n/).filter(paragraph => {
    let usable = true;
    for (const match of paragraph.matchAll(/\[([^\]]+)\](?:\((https?:\/\/[^)]+)\))?/g)) {
      if (match[2] && sources.some(source => source.url === match[2])) continue;
      const refs = match[1].split(/\s*[,，]\s*/).map(Number);
      if (refs.some(ref => !Number.isInteger(ref) || ref <= 0 || urls.get(ref)?.size !== 1)) {
        usable = false;
        warnings.add(`Omitted a research paragraph with an unresolved or ambiguous citation [${match[1].slice(0, 100)}].`);
      }
    }
    return usable;
  });
  return { summary: paragraphs.join('\n\n'), warnings: [...warnings] };
}

/** Generated claims do not become supported facts merely by using that label. */
export function checkedDraftProse(value: string, sources: TravelSource[]) {
  return value.split(/(?<=[.!?。！？])\s*/).filter(sentence => {
    if (/\b(?:source[- ]supported|source[- ]confirmed|verified (?:restaurant|dining|food))\b/i.test(sentence)) return false;
    return checkedResearchSummary(sentence, sources).warnings.length === 0;
  }).join(' ').trim();
}
