import type { TaxonomyRef } from "./taxonomy/types.js";

export type EmploymentType = "full-time" | "part-time" | "contract" | "unknown";

export type RemotePreference = "remote-only" | "hybrid-ok" | "onsite-only";

/** How feeds should be fetched given Great Firewall / regional reachability. */
export type NetworkEnvironment = "auto" | "mainland-cn" | "overseas";

export type IndustryProximity =
  | "same-industry-non-production"
  | "adjacent-industries"
  | "open-to-any";

export type EducationLevel =
  | "below-high-school"
  | "high-school"
  | "vocational"
  | "associate"
  | "bachelor"
  | "above-bachelor";

export type PosterType = "direct" | "agency" | "unknown";

export type RoleCategory =
  | "production-line"
  | "qc"
  | "warehouse"
  | "materials"
  | "equipment-maintenance"
  | "office-admin"
  | "sales"
  | "food-service"
  | "general-labor"
  | "frontend-dev"
  | "backend-dev"
  | "fullstack-dev"
  | "devops"
  | "mobile-dev"
  | "game-dev"
  | "data-ml"
  | "qa-automation"
  | "product-design"
  | "ecommerce-ops"
  | "livestream-ops"
  | "customer-support"
  | "content-ops"
  | "community-ops"
  | "other";

export interface GeoProfile {
  primaryCity: string;
  acceptableCities: string[];
  preferredDistricts?: string[];
  remotePreference: RemotePreference;
  maxCommuteMinutes?: number;
}

export interface SeekerConstraints {
  primaryCity: string;
  acceptableCities: string[];
  preferredDistricts?: string[];
  remotePreference: RemotePreference;
  /** Defaults to auto (infer from city tags). */
  networkEnvironment?: NetworkEnvironment;
  maxCommuteMinutes?: number;
  employmentTypes: EmploymentType[];
  minMonthlySalaryCny?: number;
  allowAgencyPostings: boolean;
  hideRedFlagListings: boolean;
  preferDirectHire: boolean;
}

export interface SeekerIntent {
  desiredRoles: string[];
  desiredIndustries: string[];
  avoidRoles: string[];
  avoidPhrases: string[];
  industryProximity: IndustryProximity;
  excludeProductionLine: boolean;
  excludeSales: boolean;
  excludeFoodService: boolean;
}

export interface EvidenceArtifact {
  id: string;
  title: string;
  industry: string;
  employerType?: string;
  duties: string;
  tools: string[];
  period: string;
}

export interface SeekerProfile {
  id: string;
  constraints: SeekerConstraints;
  intent: SeekerIntent;
  artifacts: EvidenceArtifact[];
  skillTokens: string[];
  certificates: string[];
  experienceYears: number;
  educationLevel: EducationLevel;
  languages: string[];
  inferredCapabilities: string[];
  seekerDigest?: string;
}

export interface RawFeedItem {
  title: string;
  body: string;
  url: string;
  sourceId: string;
  fetchedAt: string;
}

export interface ContactHints {
  phones: string[];
  emails: string[];
  wechat: string[];
  qq: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  body: string;
  url: string;
  sourceId: string;
  fetchedAt: string;
  /** Hostname of the listing URL for traceability. */
  sourceSite: string | null;
  employerHint: string | null;
  locationText: string | null;
  employmentType: EmploymentType;
  posterType: PosterType;
  roleCategories: RoleCategory[];
  requiredSignals: string[];
  redFlags: string[];
  /** Non-blocking trust cautions (shown in inbox, affect trust score). */
  trustWarnings: string[];
  contactHints: ContactHints;
  /** Resolved city / industry / sub-sector refs for structured matching. */
  taxonomyRefs: TaxonomyRef[];
}

export interface MatchScoreBreakdown {
  intentScore: number;
  capabilityScore: number;
  trustScore: number;
  geoScore: number;
  finalScore: number;
}

export type MatchConfidence = "high" | "medium" | "low";

export interface MatchResult {
  opportunityId: string;
  excluded: boolean;
  exclusionReason?: string;
  breakdown: MatchScoreBreakdown;
  confidence: MatchConfidence;
  intentHits: string[];
  capabilityHits: string[];
  taxonomyHits: TaxonomyRef[];
  cautions: string[];
  explanation: string;
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export {
  createEngineTranslator,
  DEFAULT_ENGINE_LOCALE,
  loadEngineCatalog,
  resolveEngineLocale,
  type EngineCatalog,
  type EngineCatalogMeta,
  type EngineLocale,
  type EngineTranslator,
} from "./locale/index.js";

export {
  getTaxonomyNode,
  getTaxonomyNodes,
  loadTaxonomyCatalog,
  taxonomyLabel,
  cityIdentityKey,
  cityIsChinaRegion,
  cityMatchTerms,
  citiesShareIdentity,
  displayCityLabel,
  localizeCityList,
  resolveCityNode,
  resolveMetro,
  resolveAdzunaRoute,
  searchMetros,
  isAdzunaCountrySupported,
  getMetroEntries,
  type MetroEntry,
  type MetroSearchResult,
  type TaxonomyCatalog,
  type TaxonomyKind,
  type TaxonomyNodeDef,
  type TaxonomyOverlap,
  type TaxonomyRef,
} from "./taxonomy/index.js";

// --- Source discovery (Layer 1) ---

export type SourceProbeKind =
  | "rss_autodiscover"
  | "url_template"
  | "seed_page_crawl"
  | "registry_lookup"
  | "search_discovery";

export type StreamKind = "rss" | "list_page" | "url_pattern" | "connector";

export type StreamHealth = "unknown" | "healthy" | "stale" | "dead";

export type ValidationTier = "candidate" | "proven";

export type PollLane = "hot" | "warm" | "cold";

export interface SourceProbe {
  id: string;
  kind: SourceProbeKind;
  label: string;
  seed: string;
  regionHint: string;
  intentTerms: string[];
  rationale: string;
}

export interface StreamCandidate {
  id: string;
  label: string;
  kind: StreamKind;
  seedUrl: string;
  discoveredVia: string;
  regionHint: string;
  confidence: number;
  sampleItemCount: number;
  lastValidatedAt: string;
  health: StreamHealth;
  validationTier: ValidationTier;
}

export interface StreamRegistryEntry extends StreamCandidate {
  seekerProfileId: string;
  enabled: boolean;
  pollLane: PollLane;
  opportunityYield: number;
  matchYield: number;
  learningWeight: number;
}

export interface SourceDiscoveryManifest {
  probes: SourceProbe[];
  candidates: StreamCandidate[];
  /** Proven streams polled on match refresh. */
  enabled: StreamCandidate[];
  /** Candidate-tier streams stored but deferred until fetch promotion. */
  deferred: StreamCandidate[];
  errors: string[];
  ranAt: string;
}

export {
  classifyStreamWorkCategory,
  isRemoteBoardUrl,
  type StreamWorkCategory,
} from "./stream-category.js";
