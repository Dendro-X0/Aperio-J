import type { RoleCategory } from "@aperio-j/core";

export interface RoleRule {
  category: RoleCategory;
  patterns: RegExp[];
}

export const TECH_ROLE_CATEGORIES: RoleCategory[] = [
  "frontend-dev",
  "backend-dev",
  "fullstack-dev",
  "devops",
  "mobile-dev",
  "game-dev",
  "data-ml",
  "qa-automation",
  "product-design",
];

export const OPS_ROLE_CATEGORIES: RoleCategory[] = [
  "ecommerce-ops",
  "livestream-ops",
  "customer-support",
  "content-ops",
  "community-ops",
  "office-admin",
];

/** Rule-based role classification — auditable, no LLM. */
export const ROLE_RULES: RoleRule[] = [
  {
    category: "frontend-dev",
    patterns: [
      /前端/,
      /front[- ]?end/i,
      /\bfrontend\b/i,
      /react\s+developer/i,
      /vue\s+developer/i,
      /angular\s+developer/i,
      /web\s+developer/i,
      /ui\s+developer/i,
      /javascript\s+developer/i,
    ],
  },
  {
    category: "backend-dev",
    patterns: [
      /后端/,
      /back[- ]?end/i,
      /\bbackend\b/i,
      /server[- ]side/i,
      /api\s+developer/i,
      /java\s+developer/i,
      /python\s+developer/i,
      /golang\s+developer/i,
      /node\.?js\s+developer/i,
      /php\s+developer/i,
      /\.net\s+developer/i,
    ],
  },
  {
    category: "fullstack-dev",
    patterns: [/全栈/, /full[- ]?stack/i, /\bfullstack\b/i],
  },
  {
    category: "devops",
    patterns: [
      /\bdevops\b/i,
      /\bsre\b/i,
      /site\s+reliability/i,
      /platform\s+engineer/i,
      /infrastructure\s+engineer/i,
      /cloud\s+engineer/i,
      /kubernetes/i,
      /terraform/i,
      /运维工程师/,
      /系统运维/,
    ],
  },
  {
    category: "mobile-dev",
    patterns: [
      /移动开发/,
      /mobile\s+developer/i,
      /ios\s+developer/i,
      /android\s+developer/i,
      /flutter\s+developer/i,
      /react\s+native/i,
      /swift\s+developer/i,
      /kotlin\s+developer/i,
    ],
  },
  {
    category: "game-dev",
    patterns: [
      /游戏开发/,
      /游戏程序/,
      /game\s+developer/i,
      /game\s+engineer/i,
      /\bunity\b/i,
      /\bunreal\b/i,
    ],
  },
  {
    category: "data-ml",
    patterns: [
      /数据科学/,
      /数据工程/,
      /data\s+scientist/i,
      /data\s+engineer/i,
      /machine\s+learning/i,
      /\bmlops\b/i,
      /ai\s+engineer/i,
      /deep\s+learning/i,
      /算法工程师/,
      /数据分析师/,
    ],
  },
  {
    category: "qa-automation",
    patterns: [
      /测试工程师/,
      /\bqa\s+engineer/i,
      /\bsdet\b/i,
      /test\s+automation/i,
      /quality\s+assurance\s+engineer/i,
      /software\s+tester/i,
      /automation\s+engineer/i,
    ],
  },
  {
    category: "product-design",
    patterns: [
      /产品经理/,
      /product\s+manager/i,
      /product\s+owner/i,
      /ux\s+designer/i,
      /ui\s+designer/i,
      /product\s+designer/i,
      /交互设计/,
      /视觉设计/,
      /user\s+experience\s+designer/i,
    ],
  },
  {
    category: "ecommerce-ops",
    patterns: [
      /电商运营/,
      /店铺运营/,
      /e-?commerce\s+operations/i,
      /marketplace\s+operations/i,
      /shop\s+operations/i,
      /amazon\s+seller/i,
      /tiktok\s+shop/i,
    ],
  },
  {
    category: "livestream-ops",
    patterns: [
      /直播运营/,
      /直播助理/,
      /主播助理/,
      /带货/,
      /live\s*stream/i,
      /livestream/i,
      /live\s+commerce/i,
    ],
  },
  {
    category: "customer-support",
    patterns: [
      /客服(?!开发)/,
      /客户支持/,
      /customer\s+support/i,
      /customer\s+service(?!\s+engineer)/i,
      /help\s+desk/i,
      /live\s+chat\s+agent/i,
    ],
  },
  {
    category: "content-ops",
    patterns: [
      /内容运营/,
      /新媒体运营/,
      /content\s+operations/i,
      /content\s+moderator/i,
      /social\s+media\s+content/i,
    ],
  },
  {
    category: "community-ops",
    patterns: [
      /社群运营/,
      /community\s+manager/i,
      /community\s+operations/i,
      /social\s+media\s+manager/i,
      /discord\s+moderator/i,
    ],
  },
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
      /\bqc\b/i,
      /quality (?:control|inspect)/i,
      /检验员/,
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
      /administrative assistant/i,
      /executive assistant/i,
      /virtual assistant/i,
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
