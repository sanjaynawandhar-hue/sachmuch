import { isDiscoveryFact } from "@sachmuch/core";
import type { BilingualMobileFact, MobileFact } from "@sachmuch/core";
export function selectLanguageFacts(
  facts: BilingualMobileFact[],
  language: "en" | "hi",
): MobileFact[] {
  return facts.filter(f => isDiscoveryFact(f.en)).flatMap((f) => (f[language] ? [f[language]!] : []));
}
export function resolveCurrentId(
  facts: MobileFact[],
  previousId: string | null,
): string | null {
  return facts.some((f) => f.id === previousId)
    ? previousId
    : (facts[0]?.id ?? null);
}
