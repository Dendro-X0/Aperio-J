import type { PosterType } from "@aperio-j/core";

const AGENCY_PATTERNS = [
  /劳务(?:公司|派遣|中介)/,
  /人力资源(?:公司|服务|管理)?/,
  /人才(?:市场|中介|派遣|服务)/,
  /招聘代理/,
  /外包招聘/,
  /代招(?:聘)?/,
  /招工代理/,
  /职业介绍/,
  /(?:人力|劳务)资源(?:开发|服务)/,
  /labor dispatch/i,
  /staffing agency/i,
  /recruitment agency/i,
  /manpower/i,
];

const DIRECT_PATTERNS = [
  /(?:公司|企业|工厂)直招/,
  /(?:本厂|本单位|我司)直招/,
  /direct hire/i,
  /we are hiring/i,
  /join our team/i,
  /(?:official|employer) job posting/i,
];

export function classifyPosterType(text: string): PosterType {
  const agency = AGENCY_PATTERNS.some((pattern) => pattern.test(text));
  const direct = DIRECT_PATTERNS.some((pattern) => pattern.test(text));

  if (agency && !direct) return "agency";
  if (direct && !agency) return "direct";
  if (agency && direct) return "unknown";
  return "unknown";
}

export function extractEmployerHint(text: string): string | null {
  const patterns = [
    /(?:公司|企业|单位)[:：]\s*([^\s，,。]{2,30})/,
    /([^\s，,。]{2,20}(?:有限公司|股份|科技|电子|工厂|集团))/,
    /(?:招聘(?:单位|企业))[:：]\s*([^\s，,。]{2,30})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}
