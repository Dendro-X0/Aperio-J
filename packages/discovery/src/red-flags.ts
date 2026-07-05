import {
  createEngineTranslator,
  type EngineLocale,
  type EngineTranslator,
} from "@aperio-j/core";

export type RedFlagSeverity = "exclude" | "warn";

export interface RedFlagPatternRule {
  id: string;
  pattern: RegExp;
  severity: RedFlagSeverity;
}

/** Pattern-only rules; labels come from JSON locale packs (`redFlags.{id}`). */
export const RED_FLAG_PATTERN_RULES: RedFlagPatternRule[] = [
  { id: "deposit", pattern: /押金|保证金|入职费|报名费|服装费|工衣费/, severity: "exclude" },
  { id: "training-fee", pattern: /培训费|先培训后|交.*费.*入职|收费培训/, severity: "exclude" },
  {
    id: "medical-fee",
    pattern: /体检费.*(?:自理|自付|交|先付)|(?:自理|自付).*体检费/,
    severity: "exclude",
  },
  { id: "id-collection", pattern: /押身份证|收身份证|上交身份证|扣身份证/, severity: "exclude" },
  { id: "pay-to-apply", pattern: /付费应聘|交.*才能面试|面试费|资料费/, severity: "exclude" },
  {
    id: "contract-trap",
    pattern: /签(?:订|署).*(?:空白|阴阳)合同|不签(?:合同|协议)不能|强制(?:签|买)保险/,
    severity: "exclude",
  },
  {
    id: "labor-broker",
    pattern: /劳务(?:公司|派遣|中介)|人力资源(?:公司|服务)|人才(?:市场|中介|派遣)|外包招聘|代招|招工代理/,
    severity: "warn",
  },
  {
    id: "high-salary-lure",
    pattern: /高薪直招|日薪\d{3,}|月薪[12]\d{4,}|轻松(?:月入|日入)|零门槛高薪/,
    severity: "warn",
  },
  {
    id: "advance-pay",
    pattern: /日结预支|预支工资|当天领钱|日结(?:可)?预支|先领工资/,
    severity: "warn",
  },
  {
    id: "off-platform",
    pattern: /加微信|加QQ|扫码联系|私聊|telegram|whatsapp|line联系/i,
    severity: "warn",
  },
  {
    id: "vague-employer",
    pattern: /(?:多家|各大)(?:工厂|企业)|不限(?:经验|学历).*包(?:吃|住)|大量要人|急招\d+人/,
    severity: "warn",
  },
  {
    id: "illegal-overtime",
    pattern: /(?:两班倒|12小时|连轴转).*(?:不扣|无休息)|自愿(?:放弃|加班)/,
    severity: "warn",
  },
];

/** @deprecated Use RED_FLAG_PATTERN_RULES; labels are locale-specific. */
export interface RedFlagRule extends RedFlagPatternRule {
  label: string;
}

export function getRedFlagRules(locale?: EngineLocale): RedFlagRule[] {
  const translator = createEngineTranslator(locale);
  return RED_FLAG_PATTERN_RULES.map((rule) => ({
    ...rule,
    label: translator.t(`redFlags.${rule.id}`),
  }));
}

/** Default-locale rules for backward compatibility. */
export const RED_FLAG_RULES: RedFlagRule[] = getRedFlagRules();

export interface RedFlagTiers {
  hard: string[];
  warn: string[];
}

function resolveTranslator(locale?: EngineLocale | EngineTranslator): EngineTranslator {
  if (locale && typeof locale === "object" && "t" in locale) return locale;
  return createEngineTranslator(locale);
}

export function detectRedFlagTiers(
  text: string,
  locale?: EngineLocale | EngineTranslator,
): RedFlagTiers {
  const translator = resolveTranslator(locale);
  const hard: string[] = [];
  const warn: string[] = [];

  for (const rule of RED_FLAG_PATTERN_RULES) {
    if (!rule.pattern.test(text)) continue;
    const label = translator.t(`redFlags.${rule.id}`);
    if (rule.severity === "exclude") hard.push(label);
    else warn.push(label);
  }

  return { hard, warn };
}

/** Hard-exclude red flags only (legacy helper). */
export function detectRedFlags(
  text: string,
  locale?: EngineLocale | EngineTranslator,
): string[] {
  return detectRedFlagTiers(text, locale).hard;
}
