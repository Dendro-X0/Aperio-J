import type { RoleCategory } from "@aperio-j/core";

export interface RoleRule {
  category: RoleCategory;
  patterns: RegExp[];
}

/** Rule-based role classification — auditable, no LLM. */
export const ROLE_RULES: RoleRule[] = [
  {
    category: "production-line",
    patterns: [
      /流水线/,
      /产线/,
      /组装/,
      /普工/,
      /操作工/,
      /生产员/,
      /assembly/i,
      /production line/i,
      /line operator/i,
    ],
  },
  {
    category: "qc",
    patterns: [
      /质检/,
      /品检/,
      /iqc|oqc|fqc/i,
      /qc\b/i,
      /quality (?:control|inspect)/i,
      /检验员/,
      /测试员/,
    ],
  },
  {
    category: "warehouse",
    patterns: [/仓储/, /仓库/, /仓管/, /物流/, /warehouse/i, /logistics/i, /拣货/, /理货/],
  },
  {
    category: "materials",
    patterns: [/物料/, /备料/, /发料/, /material/i, /kitting/i],
  },
  {
    category: "equipment-maintenance",
    patterns: [
      /设备维护/,
      /机修/,
      /维修/,
      /保养/,
      /maintenance/i,
      /technician/i,
      /设备工程/,
    ],
  },
  {
    category: "office-admin",
    patterns: [
      /文职/,
      /行政/,
      /跟单/,
      /资料员/,
      /文员/,
      /后勤/,
      /office admin/i,
      /coordinator/i,
    ],
  },
  {
    category: "sales",
    patterns: [
      /销售/,
      /业务员/,
      /推广/,
      /电话营销/,
      /客户经理/,
      /\bsales\b/i,
      /business development/i,
    ],
  },
  {
    category: "food-service",
    patterns: [/服务员/, /餐饮/, /后厨/, /收银/, /waiter/i, /hospitality/i],
  },
  {
    category: "general-labor",
    patterns: [/杂工/, /搬运/, /保洁/, /保安/, /general labor/i],
  },
];

export function classifyRoleCategories(text: string): RoleCategory[] {
  const hits = new Set<RoleCategory>();
  for (const rule of ROLE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      hits.add(rule.category);
    }
  }
  return hits.size > 0 ? [...hits] : ["other"];
}
