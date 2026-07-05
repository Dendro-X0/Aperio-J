import { getTaxonomyNodes, taxonomyLabel } from "@aperio-j/core";
import type { TaxonomyKind } from "@aperio-j/core";

export { matchCityLabelFromGeo, canonicalCityLabel, isRemoteCityLabel } from "@/lib/city-options";

export interface TaxonomyOption {
  id: string;
  label: string;
}

export function taxonomyOptionsForKind(
  kind: TaxonomyKind,
  locale: string,
): TaxonomyOption[] {
  return getTaxonomyNodes()
    .filter((node) => node.kind === kind)
    .map((node) => ({
      id: node.id,
      label: taxonomyLabel(node, locale),
    }));
}
