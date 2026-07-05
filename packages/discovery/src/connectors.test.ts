import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { normalizeAdzunaResponse } from "./connectors/adzuna.js";
import { normalizeArbeitnowResponse } from "./connectors/arbeitnow.js";
import { normalizeBundesagenturResponse } from "./connectors/bundesagentur.js";
import {
  isKoreanCity,
  isSingaporeCity,
  isUkCity,
  resolveAdzunaCountry,
  resolveJobicyGeo,
} from "./connectors/geo.js";
import { normalizeFranceTravailResponse } from "./connectors/francetravail.js";
import { normalizeHimalayasResponse } from "./connectors/himalayas.js";
import { normalizeJobicyResponse } from "./connectors/jobicy.js";
import { normalizeMcfResponse } from "./connectors/mycareersfuture.js";
import { dedupeRawFeedItems } from "./connectors/normalize.js";
import { normalizeRemotiveResponse } from "./connectors/remotive.js";
import { normalizeRemoteOkResponse } from "./connectors/remoteok.js";
import { normalizeReedResponse } from "./connectors/reed.js";
import { normalizeUsajobsResponse } from "./connectors/usajobs.js";
import { normalizeWorknetJobs, parseWorknetXml } from "./connectors/worknet.js";
import { resolveConnectorsForProfile } from "./connectors/resolve-connectors.js";

function minimalProfile(overrides: Partial<SeekerProfile> = {}): SeekerProfile {
  return {
    id: "profile-test",
    constraints: {
      primaryCity: "Frankfurt",
      acceptableCities: [],
      remotePreference: "hybrid-ok",
      employmentTypes: [],
      allowAgencyPostings: true,
      hideRedFlagListings: false,
      preferDirectHire: false,
    },
    intent: {
      desiredRoles: ["Full-stack"],
      desiredIndustries: [],
      avoidRoles: [],
      avoidPhrases: [],
      industryProximity: "open-to-any",
      excludeProductionLine: false,
      excludeSales: false,
      excludeFoodService: false,
    },
    artifacts: [],
    skillTokens: [],
    certificates: [],
    experienceYears: 2,
    educationLevel: "high-school",
    languages: ["English"],
    inferredCapabilities: [],
    ...overrides,
  };
}

describe("connectors/geo", () => {
  it("maps EU and APAC cities to Adzuna country codes", () => {
    assert.equal(resolveAdzunaCountry("Paris"), "fr");
    assert.equal(resolveAdzunaCountry("Amsterdam"), "nl");
    assert.equal(resolveAdzunaCountry("Singapore"), "sg");
    assert.equal(resolveAdzunaCountry("新加坡"), "sg");
    assert.equal(resolveAdzunaCountry("Mumbai"), "in");
    assert.equal(resolveAdzunaCountry("Toronto"), "ca");
  });

  it("detects Singapore profiles for MyCareersFuture", () => {
    assert.equal(isSingaporeCity("Singapore"), true);
    assert.equal(isSingaporeCity("新加坡"), true);
    assert.equal(isSingaporeCity("Frankfurt"), false);
  });

  it("maps CJK/APAC cities to Jobicy geo slugs", () => {
    assert.equal(resolveJobicyGeo("Singapore"), "singapore");
    assert.equal(resolveJobicyGeo("東京"), "japan");
    assert.equal(resolveJobicyGeo("Seoul"), "south-korea");
    assert.equal(resolveJobicyGeo("深圳"), "china");
  });

  it("detects regional cities for Phase 7B connectors", () => {
    assert.equal(isUkCity("London"), true);
    assert.equal(isKoreanCity("Seoul"), true);
    assert.equal(isKoreanCity("서울"), true);
    assert.equal(resolveAdzunaCountry("Paris"), "fr");
  });
});

describe("connectors/remotive", () => {
  it("normalizes fixture jobs to RawFeedItem rows", () => {
    const items = normalizeRemotiveResponse(
      {
        jobs: [
          {
            title: "Senior Full-Stack Engineer",
            company_name: "Acme Corp",
            url: "https://remotive.com/remote-jobs/example-1",
            description: "React and Node.js",
          },
        ],
      },
      "stream-remotive",
    );

    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "Senior Full-Stack Engineer");
    assert.match(items[0]?.body ?? "", /Acme Corp/);
  });
});

describe("connectors/adzuna", () => {
  it("normalizes search results with location and salary", () => {
    const items = normalizeAdzunaResponse(
      {
        results: [
          {
            title: "Full Stack Developer",
            redirect_url: "https://www.adzuna.de/land/ad/1",
            company: { display_name: "FinTech GmbH" },
            location: { display_name: "Frankfurt am Main" },
            salary_min: 65000,
            salary_max: 85000,
            description: "React team",
          },
        ],
      },
      "stream-adzuna",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Frankfurt am Main/);
    assert.match(items[0]?.body ?? "", /65000/);
  });
});

describe("connectors/bundesagentur", () => {
  it("normalizes stellenangebote with jobdetail fallback URL", () => {
    const items = normalizeBundesagenturResponse(
      {
        stellenangebote: [
          {
            refnr: "10001-1002716922-S",
            beruf: "Softwareentwickler/in",
            arbeitgeber: "Example Tech GmbH",
            arbeitsort: { ort: "Frankfurt", land: "Deutschland" },
          },
        ],
      },
      "stream-ba",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.url ?? "", /arbeitsagentur\.de/);
    assert.match(items[0]?.body ?? "", /Frankfurt/);
  });
});

describe("connectors/remoteok", () => {
  it("skips legal notice row and normalizes jobs", () => {
    const items = normalizeRemoteOkResponse(
      [
        { legal: "Terms of Service" },
        {
          position: "Senior Full-Stack Engineer",
          company: "Acme Corp",
          url: "https://remoteok.com/remote-jobs/example",
          description: "React team",
          salary_min: 120000,
          salary_max: 160000,
        },
      ],
      "stream-remoteok",
    );

    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "Senior Full-Stack Engineer");
    assert.match(items[0]?.body ?? "", /Acme Corp/);
    assert.match(items[0]?.body ?? "", /120,000/);
  });

  it("filters by search terms in the job title", () => {
    const items = normalizeRemoteOkResponse(
      [
        { position: "Senior Full-Stack Engineer", company: "Acme", url: "https://remoteok.com/a" },
        { position: "Sales Manager", company: "Other", url: "https://remoteok.com/b" },
      ],
      "stream-remoteok",
      { search: "Full-stack" },
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.title ?? "", /Full-Stack/i);
  });

  it("falls back to unfiltered feed when role search matches nothing", () => {
    const items = normalizeRemoteOkResponse(
      [
        { position: "Sales Manager", company: "Other", url: "https://remoteok.com/b" },
        { position: "DevOps Engineer", company: "Ops Co", url: "https://remoteok.com/c" },
      ],
      "stream-remoteok",
      { search: "Full-stack" },
    );

    assert.equal(items.length, 2);
  });
});

describe("connectors/himalayas", () => {
  it("normalizes search results with company and salary", () => {
    const items = normalizeHimalayasResponse(
      {
        jobs: [
          {
            title: "Senior Full-Stack Engineer",
            companyName: "Acme Remote",
            applicationLink: "https://himalayas.app/companies/acme/jobs/full-stack",
            minSalary: 120000,
            maxSalary: 160000,
            currency: "USD",
            locationRestrictions: ["Worldwide"],
            description: "React team",
          },
        ],
      },
      "stream-himalayas",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Acme Remote/);
    assert.match(items[0]?.body ?? "", /120,000/);
  });

  it("falls back to unfiltered feed when role search matches nothing", () => {
    const items = normalizeHimalayasResponse(
      {
        jobs: [
          {
            title: "Sales Manager",
            companyName: "Other Co",
            applicationLink: "https://himalayas.app/companies/other/jobs/sales",
          },
          {
            title: "DevOps Engineer",
            companyName: "Ops Co",
            applicationLink: "https://himalayas.app/companies/ops/jobs/devops",
          },
        ],
      },
      "stream-himalayas",
      { search: "Full-stack" },
    );

    assert.equal(items.length, 2);
  });
});

describe("connectors/jobicy", () => {
  it("normalizes jobs with geo and salary", () => {
    const items = normalizeJobicyResponse(
      {
        jobs: [
          {
            jobTitle: "Senior Full-Stack Engineer",
            companyName: "Acme Remote",
            url: "https://jobicy.com/jobs/1001",
            jobGeo: "Singapore",
            annualSalaryMin: 120000,
            annualSalaryMax: 150000,
            salaryCurrency: "SGD",
            jobDescription: "Platform team",
          },
        ],
      },
      "stream-jobicy",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Singapore/);
    assert.match(items[0]?.body ?? "", /120,000/);
  });
});

describe("connectors/mycareersfuture", () => {
  it("normalizes Singapore gov listings with salary and company", () => {
    const items = normalizeMcfResponse(
      {
        results: [
          {
            uuid: "abc123",
            title: "Software Engineer",
            postedCompany: { name: "Example Tech Pte Ltd" },
            salary: { minimum: 6000, maximum: 9000, type: { salaryType: "Monthly" } },
            address: { street: "1 Marina Boulevard", postalCode: "018989" },
            metadata: {
              jobDetailsUrl:
                "https://www.mycareersfuture.gov.sg/job/information-technology/software-engineer-example-abc123",
              newPostingDate: "2026-07-01",
            },
            description: "Gov digital services",
          },
        ],
      },
      "stream-mcf",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Example Tech Pte Ltd/);
    assert.match(items[0]?.body ?? "", /6,000/);
    assert.match(items[0]?.url ?? "", /mycareersfuture\.gov\.sg/);
  });
});

describe("connectors/arbeitnow", () => {
  it("normalizes jobs with company and location", () => {
    const items = normalizeArbeitnowResponse(
      {
        data: [
          {
            title: "Backend Engineer",
            company_name: "Starter Labs",
            url: "https://www.arbeitnow.com/jobs/example",
            location: "Berlin",
            remote: true,
            description: "Go services",
          },
        ],
      },
      "stream-arbeitnow",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Starter Labs/);
    assert.match(items[0]?.body ?? "", /remote/i);
  });

  it("filters to remote jobs for remote-only profiles", () => {
    const items = normalizeArbeitnowResponse(
      {
        data: [
          {
            title: "Remote Engineer",
            company_name: "Remote Co",
            url: "https://www.arbeitnow.com/jobs/remote",
            remote: true,
          },
          {
            title: "Office Intern",
            company_name: "Local GmbH",
            url: "https://www.arbeitnow.com/jobs/local",
            remote: false,
          },
        ],
      },
      "stream-arbeitnow",
      { search: "", remotePreference: "remote-only" },
    );

    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "Remote Engineer");
  });

  it("falls back to unfiltered feed when role search matches nothing", () => {
    const items = normalizeArbeitnowResponse(
      {
        data: [
          {
            title: "Operations Intern",
            company_name: "Local GmbH",
            url: "https://www.arbeitnow.com/jobs/local",
            remote: false,
          },
          {
            title: "Backend Engineer",
            company_name: "Starter Labs",
            url: "https://www.arbeitnow.com/jobs/remote",
            remote: true,
          },
        ],
      },
      "stream-arbeitnow",
      { search: "Full-stack", remotePreference: "hybrid-ok" },
    );

    assert.equal(items.length, 2);
  });
});

describe("connectors/reed", () => {
  it("normalizes UK listings with salary", () => {
    const items = normalizeReedResponse(
      {
        results: [
          {
            jobTitle: "Senior Full-Stack Developer",
            employerName: "Example Tech Ltd",
            locationName: "London",
            minimumSalary: 65000,
            maximumSalary: 85000,
            currency: "GBP",
            jobUrl: "https://www.reed.co.uk/jobs/full-stack-developer/5001",
          },
        ],
      },
      "stream-reed",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Example Tech Ltd/);
    assert.match(items[0]?.body ?? "", /65,000/);
  });
});

describe("connectors/usajobs", () => {
  it("normalizes government listings with salary band", () => {
    const items = normalizeUsajobsResponse(
      {
        SearchResult: {
          SearchResultItems: [
            {
              MatchedObjectId: "800001000",
              MatchedObjectDescriptor: {
                PositionTitle: "IT Specialist",
                OrganizationName: "Department of Example",
                PositionLocationDisplay: "Washington, DC",
                PositionURI: "https://www.usajobs.gov/job/800001000",
                PositionRemuneration: [{ MinimumRange: "95000", MaximumRange: "120000" }],
              },
            },
          ],
        },
      },
      "stream-usajobs",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Department of Example/);
    assert.match(items[0]?.url ?? "", /usajobs\.gov/);
  });
});

describe("connectors/francetravail", () => {
  it("normalizes French listings with company and location", () => {
    const items = normalizeFranceTravailResponse(
      {
        resultats: [
          {
            id: "1234567",
            intitule: "Développeur Full Stack",
            entreprise: { nom: "Example SAS" },
            lieuTravail: { libelle: "Paris 11e" },
            origineOffre: {
              urlOrigine: "https://candidat.francetravail.fr/offres/recherche/detail/1234567",
            },
          },
        ],
      },
      "stream-ft",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Example SAS/);
    assert.match(items[0]?.body ?? "", /Paris/);
  });
});

describe("connectors/worknet", () => {
  it("parses XML job blocks", () => {
    const jobs = parseWorknetXml(`
      <wantedList>
        <wanted>
          <company>Example Tech Co</company>
          <title>백엔드 개발자</title>
          <wantedInfoUrl>https://www.work.go.kr/example</wantedInfoUrl>
        </wanted>
      </wantedList>
    `);

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.title, "백엔드 개발자");
  });

  it("normalizes parsed jobs with company and salary", () => {
    const items = normalizeWorknetJobs(
      [
        {
          company: "Example Tech Co",
          title: "백엔드 개발자",
          minSal: "4000000",
          maxSal: "5500000",
          region: "서울",
          wantedInfoUrl: "https://www.work.go.kr/example",
        },
      ],
      "stream-worknet",
    );

    assert.equal(items.length, 1);
    assert.match(items[0]?.body ?? "", /Example Tech Co/);
    assert.match(items[0]?.body ?? "", /4,000,000/);
  });
});

describe("connectors/dedupe", () => {
  it("collapses duplicate title|company rows across connector feeds", () => {
    const remotive = normalizeRemotiveResponse(
      {
        jobs: [
          {
            title: "Senior Full-Stack Engineer",
            company_name: "Acme Corp",
            url: "https://remotive.com/remote-jobs/example-1",
            description: "From Remotive",
          },
        ],
      },
      "stream-remotive",
    );
    const remoteok = normalizeRemoteOkResponse(
      [
        {
          position: "Senior Full-Stack Engineer",
          company: "Acme Corp",
          url: "https://remoteok.com/remote-jobs/example-2",
          description: "From RemoteOK",
        },
      ],
      "stream-remoteok",
    );

    const rawCount = remotive.length + remoteok.length;
    const deduped = dedupeRawFeedItems([...remotive, ...remoteok]);

    assert.equal(rawCount, 2);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0]?.url, remotive[0]?.url);
  });
});

describe("connectors/resolve-connectors", () => {
  it("includes Remotive for hybrid profiles", () => {
    const configs = resolveConnectorsForProfile(minimalProfile());
    assert.ok(configs.some((row) => row.connectorId === "remotive"));
    assert.ok(configs.some((row) => row.connectorId === "remoteok"));
    assert.ok(configs.some((row) => row.connectorId === "arbeitnow"));
  });

  it("includes Bundesagentur for onsite-only German profiles", () => {
    const configs = resolveConnectorsForProfile(
      minimalProfile({
        constraints: {
          ...minimalProfile().constraints,
          remotePreference: "onsite-only",
        },
      }),
    );
    assert.ok(configs.some((row) => row.connectorId === "bundesagentur"));
    assert.ok(!configs.some((row) => row.connectorId === "remotive"));
    assert.ok(!configs.some((row) => row.connectorId === "remoteok"));
    assert.ok(!configs.some((row) => row.connectorId === "arbeitnow"));
  });

  it("includes Himalayas and Jobicy for hybrid profiles", () => {
    const configs = resolveConnectorsForProfile(minimalProfile());
    assert.ok(configs.some((row) => row.connectorId === "himalayas"));
    assert.ok(configs.some((row) => row.connectorId === "jobicy"));
  });

  it("includes global remote connectors for Chinese city hybrid profiles", () => {
    const configs = resolveConnectorsForProfile(
      minimalProfile({
        constraints: {
          ...minimalProfile().constraints,
          primaryCity: "深圳",
          remotePreference: "hybrid-ok",
        },
      }),
    );
    assert.ok(configs.some((row) => row.connectorId === "remotive"));
    assert.ok(configs.some((row) => row.connectorId === "remoteok"));
  });

  it("skips global remote connectors for Chinese onsite-only profiles", () => {
    const configs = resolveConnectorsForProfile(
      minimalProfile({
        constraints: {
          ...minimalProfile().constraints,
          primaryCity: "深圳",
          remotePreference: "onsite-only",
        },
      }),
    );
    assert.ok(!configs.some((row) => row.connectorId === "remotive"));
    assert.ok(!configs.some((row) => row.connectorId === "remoteok"));
    assert.ok(!configs.some((row) => row.connectorId === "arbeitnow"));
    assert.ok(!configs.some((row) => row.connectorId === "himalayas"));
    assert.ok(!configs.some((row) => row.connectorId === "jobicy"));
  });

  it("includes MyCareersFuture for Singapore profiles", () => {
    const configs = resolveConnectorsForProfile(
      minimalProfile({
        constraints: {
          ...minimalProfile().constraints,
          primaryCity: "Singapore",
        },
      }),
    );
    assert.ok(configs.some((row) => row.connectorId === "mycareersfuture"));
    assert.ok(!configs.some((row) => row.connectorId === "bundesagentur"));
  });

  it("includes Adzuna when credentials are configured", () => {
    process.env.APERO_J_ADZUNA_APP_ID = "test";
    process.env.APERO_J_ADZUNA_APP_KEY = "test";
    try {
      const configs = resolveConnectorsForProfile(minimalProfile());
      assert.ok(configs.some((row) => row.connectorId === "adzuna"));
    } finally {
      delete process.env.APERO_J_ADZUNA_APP_ID;
      delete process.env.APERO_J_ADZUNA_APP_KEY;
    }
  });

  it("includes credentialed local connectors for matching regions", () => {
    process.env.APERO_J_REED_API_KEY = "test";
    process.env.APERO_J_USAJOBS_API_KEY = "test";
    process.env.APERO_J_USAJOBS_EMAIL = "dev@example.com";
    process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_ID = "PAR_test";
    process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET = "secret";
    process.env.APERO_J_WORKNET_AUTH_KEY = "test";
    try {
      assert.ok(
        resolveConnectorsForProfile(
          minimalProfile({ constraints: { ...minimalProfile().constraints, primaryCity: "London" } }),
        ).some((row) => row.connectorId === "reed"),
      );
      assert.ok(
        resolveConnectorsForProfile(
          minimalProfile({
            constraints: { ...minimalProfile().constraints, primaryCity: "New York" },
          }),
        ).some((row) => row.connectorId === "usajobs"),
      );
      assert.ok(
        resolveConnectorsForProfile(
          minimalProfile({ constraints: { ...minimalProfile().constraints, primaryCity: "Paris" } }),
        ).some((row) => row.connectorId === "francetravail"),
      );
      assert.ok(
        resolveConnectorsForProfile(
          minimalProfile({ constraints: { ...minimalProfile().constraints, primaryCity: "Seoul" } }),
        ).some((row) => row.connectorId === "worknet"),
      );
    } finally {
      delete process.env.APERO_J_REED_API_KEY;
      delete process.env.APERO_J_USAJOBS_API_KEY;
      delete process.env.APERO_J_USAJOBS_EMAIL;
      delete process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_ID;
      delete process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET;
      delete process.env.APERO_J_WORKNET_AUTH_KEY;
    }
  });

  it("prefers local connectors before remote for Frankfurt", () => {
    process.env.APERO_J_ADZUNA_APP_ID = "test";
    process.env.APERO_J_ADZUNA_APP_KEY = "test";
    try {
      const configs = resolveConnectorsForProfile(minimalProfile());
      const firstRemoteIndex = configs.findIndex((row) => row.connectorId === "remotive");
      const bundesIndex = configs.findIndex((row) => row.connectorId === "bundesagentur");
      assert.ok(bundesIndex >= 0);
      assert.ok(firstRemoteIndex < 0 || bundesIndex < firstRemoteIndex);
    } finally {
      delete process.env.APERO_J_ADZUNA_APP_ID;
      delete process.env.APERO_J_ADZUNA_APP_KEY;
    }
  });
});
