export interface MetroAdzunaRoute {
  country: string;
  where: string;
}

export interface MetroEntry {
  id: string;
  slug: string;
  countryCode: string;
  labels: Record<string, string>;
  matchTerms: string[];
  taxonomyId?: string;
  adzuna?: MetroAdzunaRoute;
}

export interface MetroCatalog {
  meta: {
    version: string;
    generatedAt: string;
    count: number;
  };
  metros: MetroEntry[];
}

export interface MetroSearchResult {
  id: string;
  label: string;
  countryCode: string;
}
