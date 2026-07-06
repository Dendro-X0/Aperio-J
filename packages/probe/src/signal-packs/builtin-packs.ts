import type { RegistryStreamDef } from "../probe-packs.js";

export interface SignalPack {
  id: string;
  locale: string;
  /** URL slugs, e.g. shenzhen */
  citySlugs: string[];
  cityLabels?: string[];
  /** Match when any keyword appears in profile intent corpus */
  roleKeywords: string[];
  streams: RegistryStreamDef[];
}

export const BUILTIN_SIGNAL_PACKS: SignalPack[] = [
  {
    id: "zh-CN-shenzhen-factory",
    locale: "zh-CN",
    citySlugs: ["shenzhen"],
    cityLabels: ["深圳", "深圳市"],
    roleKeywords: [
      "普工",
      "产线",
      "流水线",
      "组装",
      "操作工",
      "质检",
      "iqc",
      "oqc",
      "fqc",
      "工厂",
      "电子厂",
      "制造",
      "制造业",
      "factory worker",
      "assembler",
    ],
    streams: [
      {
        id: "sz-58-jobs",
        label: "58同城·深圳招聘",
        seedUrl: "https://sz.58.com/job/",
        kind: "list_page",
        domainTier: "aggregator",
      },
      {
        id: "sz-talent-network",
        label: "深圳人才网",
        seedUrl: "https://www.szrc.com/",
        kind: "list_page",
        domainTier: "aggregator",
      },
    ],
  },
  {
    id: "zh-CN-shenzhen-warehouse",
    locale: "zh-CN",
    citySlugs: ["shenzhen"],
    cityLabels: ["深圳", "深圳市"],
    roleKeywords: ["仓储", "仓管", "物料", "叉车", "仓库", "warehouse", "picker", "理货"],
    streams: [
      {
        id: "sz-58-warehouse",
        label: "58同城·深圳仓储物流",
        seedUrl: "https://sz.58.com/job/?key=%E4%BB%93%E5%82%A8",
        kind: "list_page",
        domainTier: "aggregator",
      },
    ],
  },
  {
    id: "zh-CN-dongguan-factory",
    locale: "zh-CN",
    citySlugs: ["dongguan"],
    cityLabels: ["东莞", "东莞市"],
    roleKeywords: ["普工", "产线", "质检", "工厂", "电子厂", "制造", "操作工", "组装"],
    streams: [
      {
        id: "dg-58-jobs",
        label: "58同城·东莞招聘",
        seedUrl: "https://dg.58.com/job/",
        kind: "list_page",
        domainTier: "aggregator",
      },
    ],
  },
  {
    id: "zh-CN-guangzhou-factory",
    locale: "zh-CN",
    citySlugs: ["guangzhou"],
    cityLabels: ["广州", "广州市"],
    roleKeywords: ["普工", "产线", "质检", "工厂", "制造", "操作工", "组装"],
    streams: [
      {
        id: "gz-58-jobs",
        label: "58同城·广州招聘",
        seedUrl: "https://gz.58.com/job/",
        kind: "list_page",
        domainTier: "aggregator",
      },
    ],
  },
  {
    id: "zh-CN-huizhou-factory",
    locale: "zh-CN",
    citySlugs: ["huizhou"],
    cityLabels: ["惠州", "惠州市"],
    roleKeywords: ["普工", "产线", "工厂", "电子厂", "制造", "操作工"],
    streams: [
      {
        id: "hz-58-jobs",
        label: "58同城·惠州招聘",
        seedUrl: "https://huizhou.58.com/job/",
        kind: "list_page",
        domainTier: "aggregator",
      },
    ],
  },
];
