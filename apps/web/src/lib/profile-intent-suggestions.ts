import type { EmploymentType } from "@aperio-j/core";
import type { ProfileSettingsForm } from "@/lib/profile-form";
import { splitProfileList } from "@/lib/profile-form";
import { inboxFilterPresetLabel } from "@/lib/inbox-filter-presets";
import { resolveIndustryGroupFromLabel } from "@/lib/industry-options";
import { roleSuggestionsForIndustries } from "@/lib/role-options";

export type ProfileIntentPresetId =
  | "remote-ops-gig"
  | "remote-ecommerce-live"
  | "digital-nomad"
  | "remote-developer"
  | "remote-frontend"
  | "remote-backend"
  | "devops-platform"
  | "product-ux"
  | "data-ml"
  | "factory-upgrade"
  | "flexible-hours";

export interface ProfileIntentPreset {
  id: ProfileIntentPresetId;
  titleKey: `presets.${ProfileIntentPresetId}.title`;
  descriptionKey: `presets.${ProfileIntentPresetId}.description`;
}

export const PROFILE_INTENT_PRESETS: ProfileIntentPreset[] = [
  {
    id: "remote-ops-gig",
    titleKey: "presets.remote-ops-gig.title",
    descriptionKey: "presets.remote-ops-gig.description",
  },
  {
    id: "remote-ecommerce-live",
    titleKey: "presets.remote-ecommerce-live.title",
    descriptionKey: "presets.remote-ecommerce-live.description",
  },
  {
    id: "digital-nomad",
    titleKey: "presets.digital-nomad.title",
    descriptionKey: "presets.digital-nomad.description",
  },
  {
    id: "remote-developer",
    titleKey: "presets.remote-developer.title",
    descriptionKey: "presets.remote-developer.description",
  },
  {
    id: "remote-frontend",
    titleKey: "presets.remote-frontend.title",
    descriptionKey: "presets.remote-frontend.description",
  },
  {
    id: "remote-backend",
    titleKey: "presets.remote-backend.title",
    descriptionKey: "presets.remote-backend.description",
  },
  {
    id: "devops-platform",
    titleKey: "presets.devops-platform.title",
    descriptionKey: "presets.devops-platform.description",
  },
  {
    id: "product-ux",
    titleKey: "presets.product-ux.title",
    descriptionKey: "presets.product-ux.description",
  },
  {
    id: "data-ml",
    titleKey: "presets.data-ml.title",
    descriptionKey: "presets.data-ml.description",
  },
  {
    id: "factory-upgrade",
    titleKey: "presets.factory-upgrade.title",
    descriptionKey: "presets.factory-upgrade.description",
  },
  {
    id: "flexible-hours",
    titleKey: "presets.flexible-hours.title",
    descriptionKey: "presets.flexible-hours.description",
  },
];

function mergeUniqueTags(existing: string[], additions: string[]): string[] {
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  const next = [...existing];
  for (const item of additions) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }
  return next;
}

function mergeCommaList(existing: string, additions: string[]): string {
  return mergeUniqueTags(splitProfileList(existing), additions).join(", ");
}

function taxonomyRole(locale: string, presetId: string): string | null {
  return inboxFilterPresetLabel(presetId, locale);
}

export function isManufacturingLikeProfile(form: Pick<ProfileSettingsForm, "industries">): boolean {
  return form.industries.some((label) => {
    const group = resolveIndustryGroupFromLabel(label);
    return group === "manufacturing" || group === "logistics";
  });
}

export function isOpsLikeProfile(form: Pick<ProfileSettingsForm, "industries" | "occupations" | "desiredRolesText">): boolean {
  const corpus = [...form.industries, ...form.occupations, ...splitProfileList(form.desiredRolesText)].join(" ");
  return /运营|电商|直播|客服|内容|社群|新媒体|e-?commerce|operations|customer\s+support|community|social\s+media|live\s*stream/iu.test(
    corpus,
  );
}

export function targetRoleSuggestionsForProfile(
  form: Pick<ProfileSettingsForm, "industries" | "occupations" | "desiredRolesText">,
  locale: string,
): string[] {
  if (isOpsLikeProfile(form)) {
    return opsRoleSuggestions(locale);
  }

  const fromTaxonomy = roleSuggestionsForIndustries(form.industries, locale);
  if (!isManufacturingLikeProfile(form)) return fromTaxonomy.slice(0, 10);

  const manufacturing = [
    taxonomyRole(locale, "subSector:qc"),
    taxonomyRole(locale, "subSector:warehouse"),
    taxonomyRole(locale, "subSector:materials"),
    taxonomyRole(locale, "subSector:office-admin"),
    taxonomyRole(locale, "subSector:equipment-maintenance"),
    taxonomyRole(locale, "subSector:production-line"),
  ].filter((label): label is string => Boolean(label));

  return [...new Set([...manufacturing, ...fromTaxonomy])].slice(0, 10);
}

function opsRoleSuggestions(locale: string): string[] {
  if (locale === "zh-CN") {
    return ["电商运营", "直播运营", "客服", "内容运营", "社群运营", "店铺运营", "新媒体助理"];
  }
  return [
    "E-commerce operations",
    "Live stream operations",
    "Customer support",
    "Content operations",
    "Community manager",
    "Social media",
    "Virtual assistant",
  ];
}

const AVOID_PHRASES: Record<string, string[]> = {
  "zh-CN": [
    "流水线",
    "夜班",
    "两班倒",
    "重体力",
    "押金",
    "劳务中介",
    "骑手",
    "配送",
    "电话销售",
  ],
  en: [
    "night shift",
    "production line",
    "agency fee",
    "delivery rider",
    "cold calling",
    "heavy labor",
  ],
};

export function avoidPhraseSuggestions(locale: string): string[] {
  return AVOID_PHRASES[locale] ?? AVOID_PHRASES.en!;
}

const BACKGROUND_EXAMPLES: Record<string, string> = {
  "zh-CN":
    "例如：深圳电子厂产线 2 年，小件组装与外观检查；熟悉静电防护、按 SOP 操作、班组协作。想找不用长期站流水线的工作。",
  en: "e.g. 2 years on an electronics assembly line; visual inspection, ESD routines, team shifts. Looking for roles with less line standing.",
};

const TECH_BACKGROUND_EXAMPLES: Record<string, string> = {
  "zh-CN":
    "例如：3 年后端经验，TypeScript / Node.js / PostgreSQL，做过 B2B SaaS API 与部署流水线。希望找远程或异步团队的全职岗位。",
  en: "e.g. 3 years backend experience with TypeScript, Node.js, and PostgreSQL; B2B SaaS APIs and CI/CD. Looking for remote-friendly full-time roles.",
};

const OPS_BACKGROUND_EXAMPLES: Record<string, string> = {
  "zh-CN":
    "例如：熟悉淘宝/抖音店铺后台，做过客服回复、上架与活动页维护；能配合直播排品与售后。希望找远程或兼职的运营类岗位，不限学历。",
  en: "e.g. E-commerce shop admin, customer replies, listing updates, live-stream prep. Looking for remote or part-time ops roles — no degree required.",
};

export function backgroundPlaceholderForProfile(
  form: Pick<ProfileSettingsForm, "industries" | "occupations" | "desiredRolesText">,
  locale: string,
): string {
  if (isOpsLikeProfile(form)) {
    return OPS_BACKGROUND_EXAMPLES[locale] ?? OPS_BACKGROUND_EXAMPLES.en!;
  }
  if (isManufacturingLikeProfile(form)) {
    return BACKGROUND_EXAMPLES[locale] ?? BACKGROUND_EXAMPLES.en!;
  }
  return TECH_BACKGROUND_EXAMPLES[locale] ?? TECH_BACKGROUND_EXAMPLES.en!;
}

function defaultOccupation(locale: string): string {
  const label = taxonomyRole(locale, "subSector:production-line");
  return label ?? (locale === "zh-CN" ? "产线/普工" : "Production line");
}

function defaultIndustries(locale: string): string[] {
  const electronics = inboxFilterPresetLabel("industry:electronics-manufacturing", locale);
  const logistics = inboxFilterPresetLabel("industry:logistics-warehousing", locale);
  return [electronics, logistics].filter((label): label is string => Boolean(label));
}

function targetRolesForUpgrade(locale: string): string[] {
  return [
    taxonomyRole(locale, "subSector:qc"),
    taxonomyRole(locale, "subSector:warehouse"),
    taxonomyRole(locale, "subSector:materials"),
    taxonomyRole(locale, "subSector:office-admin"),
  ].filter((label): label is string => Boolean(label));
}

function applyRemoteRolePreset(
  form: ProfileSettingsForm,
  locale: string,
  config: {
    occupation: string;
    roles: string[];
    industry: string;
    background: string;
    avoid?: string[];
    employmentTypes?: EmploymentType[];
  },
): ProfileSettingsForm {
  return {
    ...form,
    remotePreference: "remote-only",
    industries: mergeUniqueTags(form.industries, [config.industry]),
    occupations: form.occupations.length > 0 ? form.occupations : [config.occupation],
    desiredRolesText: mergeCommaList(form.desiredRolesText, config.roles),
    avoidText: mergeCommaList(
      form.avoidText,
      config.avoid ??
        (locale === "zh-CN"
          ? ["销售", "电话销售", "驻场外包"]
          : ["sales", "cold calling", "onsite body shop"]),
    ),
    excludeSales: true,
    employmentTypes: mergeUniqueTags(
      form.employmentTypes,
      config.employmentTypes ?? (["full-time", "contract"] as EmploymentType[]),
    ) as EmploymentType[],
    backgroundText: form.backgroundText.trim() || config.background,
  };
}

function applyRemoteOpsPreset(
  form: ProfileSettingsForm,
  locale: string,
  config: {
    occupation: string;
    roles: string[];
    industry: string;
    background: string;
  },
): ProfileSettingsForm {
  return {
    ...applyRemoteRolePreset(form, locale, {
      ...config,
      employmentTypes: ["full-time", "part-time", "contract"],
      avoid: locale === "zh-CN" ? ["流水线", "夜班", "重体力", "押金"] : ["night shift", "heavy labor", "agency fee"],
    }),
    excludeProductionLine: true,
    excludeSales: false,
  };
}

export function applyProfileIntentPreset(
  form: ProfileSettingsForm,
  presetId: ProfileIntentPresetId,
  locale: string,
): ProfileSettingsForm {
  const avoidBase = avoidPhraseSuggestions(locale);

  if (presetId === "remote-ops-gig") {
    return applyRemoteOpsPreset(form, locale, {
      occupation: locale === "zh-CN" ? "运营助理" : "Operations assistant",
      industry: locale === "zh-CN" ? "电商/互联网" : "E-commerce / Internet",
      roles: opsRoleSuggestions(locale),
      background: OPS_BACKGROUND_EXAMPLES[locale] ?? OPS_BACKGROUND_EXAMPLES.en!,
    });
  }

  if (presetId === "remote-ecommerce-live") {
    return applyRemoteOpsPreset(form, locale, {
      occupation: locale === "zh-CN" ? "直播运营" : "Live stream operations",
      industry: locale === "zh-CN" ? "电商/新媒体" : "E-commerce / Media",
      roles:
        locale === "zh-CN"
          ? ["直播运营", "电商运营", "店铺运营", "主播助理", "内容运营"]
          : ["Live stream operations", "E-commerce ops", "Shop operations", "Stream assistant", "Content ops"],
      background:
        locale === "zh-CN"
          ? "例如：协助直播间排品、话术与售后；熟悉抖音/淘宝后台。希望远程或弹性兼职，有成长空间。"
          : "e.g. Live-stream prep, shop admin, post-sale support on TikTok-style platforms. Remote or flexible part-time.",
    });
  }

  if (presetId === "remote-developer") {
    return applyRemoteRolePreset(form, locale, {
      occupation: locale === "zh-CN" ? "软件工程师" : "Software engineer",
      industry: locale === "zh-CN" ? "软件/互联网" : "Software / Internet",
      roles:
        locale === "zh-CN"
          ? ["后端开发", "全栈开发", "DevOps", "平台工程"]
          : ["Backend engineer", "Full-stack developer", "DevOps", "Platform engineer"],
      background: TECH_BACKGROUND_EXAMPLES[locale] ?? TECH_BACKGROUND_EXAMPLES.en!,
    });
  }

  if (presetId === "remote-frontend") {
    return applyRemoteRolePreset(form, locale, {
      occupation: locale === "zh-CN" ? "前端工程师" : "Frontend engineer",
      industry: locale === "zh-CN" ? "软件/互联网" : "Software / Internet",
      roles:
        locale === "zh-CN"
          ? ["前端开发", "React", "Vue", "Web UI"]
          : ["Frontend engineer", "React", "Vue", "Web UI"],
      background:
        locale === "zh-CN"
          ? "例如：2 年前端经验，React/TypeScript，组件库与性能优化，希望找远程全职岗位。"
          : "e.g. 2 years frontend with React/TypeScript, design systems, and performance work — seeking remote full-time roles.",
    });
  }

  if (presetId === "remote-backend") {
    return applyRemoteRolePreset(form, locale, {
      occupation: locale === "zh-CN" ? "后端工程师" : "Backend engineer",
      industry: locale === "zh-CN" ? "软件/互联网" : "Software / Internet",
      roles:
        locale === "zh-CN"
          ? ["后端开发", "API", "分布式系统", "Go", "Node.js"]
          : ["Backend engineer", "API design", "distributed systems", "Go", "Node.js"],
      background: TECH_BACKGROUND_EXAMPLES[locale] ?? TECH_BACKGROUND_EXAMPLES.en!,
    });
  }

  if (presetId === "devops-platform") {
    return applyRemoteRolePreset(form, locale, {
      occupation: locale === "zh-CN" ? "DevOps 工程师" : "DevOps engineer",
      industry: locale === "zh-CN" ? "软件/互联网" : "Software / Internet",
      roles:
        locale === "zh-CN"
          ? ["DevOps", "SRE", "平台工程", "Kubernetes", "CI/CD"]
          : ["DevOps", "SRE", "Platform engineer", "Kubernetes", "CI/CD"],
      background:
        locale === "zh-CN"
          ? "例如：熟悉 Kubernetes、Terraform、GitHub Actions，负责过生产环境发布与可观测性。"
          : "e.g. Kubernetes, Terraform, GitHub Actions — production releases and observability.",
    });
  }

  if (presetId === "product-ux") {
    return applyRemoteRolePreset(form, locale, {
      occupation: locale === "zh-CN" ? "产品经理" : "Product manager",
      industry: locale === "zh-CN" ? "互联网" : "Internet",
      roles:
        locale === "zh-CN"
          ? ["产品经理", "UX 设计", "UI 设计", "B2B SaaS"]
          : ["Product manager", "UX designer", "UI designer", "B2B SaaS"],
      background:
        locale === "zh-CN"
          ? "例如：B2B SaaS 产品经验，用户研究、原型与跨职能协作，希望远程产品/设计岗位。"
          : "e.g. B2B SaaS product work — research, prototyping, cross-functional delivery; remote product/design roles.",
      avoid: locale === "zh-CN" ? ["电话销售"] : ["cold calling"],
    });
  }

  if (presetId === "data-ml") {
    return applyRemoteRolePreset(form, locale, {
      occupation: locale === "zh-CN" ? "数据工程师" : "Data engineer",
      industry: locale === "zh-CN" ? "软件/互联网" : "Software / Internet",
      roles:
        locale === "zh-CN"
          ? ["数据工程", "机器学习", "MLOps", "数据分析"]
          : ["Data engineer", "Machine learning", "MLOps", "Analytics"],
      background:
        locale === "zh-CN"
          ? "例如：数据管道、SQL/Spark、模型部署与实验跟踪，寻找远程数据/ML 岗位。"
          : "e.g. Data pipelines, SQL/Spark, model deployment and experiment tracking — remote data/ML roles.",
    });
  }

  if (presetId === "digital-nomad") {
    const nomadRoles =
      locale === "zh-CN"
        ? ["远程运营", "电商运营", "内容运营", "客服", "自由职业项目"]
        : ["Remote operations", "E-commerce ops", "Content", "Customer support", "Freelance projects"];
    return {
      ...form,
      remotePreference: "remote-only",
      industries: mergeUniqueTags(form.industries, [locale === "zh-CN" ? "互联网" : "Internet"]),
      occupations:
        form.occupations.length > 0
          ? form.occupations
          : [locale === "zh-CN" ? "自由职业" : "Freelancer"],
      desiredRolesText: mergeCommaList(form.desiredRolesText, nomadRoles),
      employmentTypes: mergeUniqueTags(form.employmentTypes, [
        "full-time",
        "part-time",
        "contract",
      ]) as EmploymentType[],
      backgroundText:
        form.backgroundText.trim() ||
        (OPS_BACKGROUND_EXAMPLES[locale] ?? OPS_BACKGROUND_EXAMPLES.en!),
    };
  }

  if (presetId === "factory-upgrade") {
    const targets = targetRolesForUpgrade(locale);
    return {
      ...form,
      industries: mergeUniqueTags(form.industries, defaultIndustries(locale)),
      occupations:
        form.occupations.length > 0 ? form.occupations : [defaultOccupation(locale)],
      desiredRolesText: mergeCommaList(form.desiredRolesText, targets),
      avoidText: mergeCommaList(form.avoidText, avoidBase),
      excludeProductionLine: true,
      excludeSales: true,
      remotePreference: "onsite-only",
      employmentTypes: mergeUniqueTags(form.employmentTypes, ["full-time"]) as EmploymentType[],
      backgroundText:
        form.backgroundText.trim() ||
        (locale === "zh-CN"
          ? "电子厂产线经验，熟悉组装与外观检查，想找质检/仓储等相对轻松的岗位。"
          : "Factory line experience with assembly and inspection; targeting QC or warehouse roles."),
    };
  }

  const flexibleTargets = [
    taxonomyRole(locale, "subSector:warehouse"),
    taxonomyRole(locale, "subSector:materials"),
    taxonomyRole(locale, "subSector:qc"),
    taxonomyRole(locale, "subSector:office-admin"),
  ].filter((label): label is string => Boolean(label));

  return {
    ...form,
    industries: mergeUniqueTags(form.industries, defaultIndustries(locale)),
    occupations:
      form.occupations.length > 0 ? form.occupations : [defaultOccupation(locale)],
    desiredRolesText: mergeCommaList(form.desiredRolesText, flexibleTargets),
    avoidText: mergeCommaList(
      form.avoidText,
      locale === "zh-CN" ? ["夜班", "两班倒", "重体力"] : ["night shift", "heavy labor"],
    ),
    excludeProductionLine: true,
    remotePreference: "onsite-only",
    employmentTypes: mergeUniqueTags(form.employmentTypes, ["full-time", "part-time"]) as EmploymentType[],
  };
}

export function addTagsToCommaField(existing: string, tag: string): string {
  return mergeCommaList(existing, [tag]);
}
