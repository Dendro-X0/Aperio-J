/** Expand user intent roles to synonym tokens for overlap matching. */

export const INTENT_SYNONYMS: Record<string, string[]> = {
  普工: ["普工", "操作工", "生产员", "产线", "组装", "assembly", "general labor", "line operator"],
  开发: ["开发", "developer", "engineer", "engineering", "programmer"],
  工程师: ["工程师", "engineer", "developer"],
  前端: ["前端", "frontend", "front-end", "react", "vue"],
  后端: ["后端", "backend", "back-end", "api", "server"],
  全栈: ["全栈", "full stack", "full-stack", "fullstack"],
  运维: ["运维", "devops", "sre", "platform", "infrastructure"],
  设计: ["设计", "designer", "ui", "ux", "product design"],
  产品: ["产品", "product manager", "pm", "product owner"],
  质检: ["质检", "品检", "iqc", "oqc", "fqc", "qc", "检验", "quality", "inspect"],
  品检: ["品检", "质检", "iqc", "oqc", "检验"],
  仓储: ["仓储", "仓库", "仓管", "warehouse", "storage"],
  物流: ["物流", "仓储", "配送", "logistics"],
  物料: ["物料", "备料", "发料", "material", "kitting"],
  设备维护: ["设备维护", "机修", "维修", "保养", "maintenance", "technician"],
  机修: ["机修", "设备维护", "维修", "保养"],
  文职: ["文职", "文员", "行政", "跟单", "资料员", "office", "admin"],
  行政: ["行政", "后勤", "文职", "admin"],
  跟单: ["跟单", "文员", "coordinator"],
};

export function expandIntentTerms(terms: string[]): string[] {
  const expanded = new Set<string>();

  for (const term of terms) {
    const key = term.trim();
    if (!key) continue;
    expanded.add(key.toLowerCase());

    const synonyms = INTENT_SYNONYMS[key] ?? INTENT_SYNONYMS[key.replace(/\s/g, "")];
    if (synonyms) {
      for (const synonym of synonyms) expanded.add(synonym.toLowerCase());
    } else {
      expanded.add(key.toLowerCase());
    }
  }

  return [...expanded];
}

export function countIntentHits(corpus: string, expandedTerms: string[]): string[] {
  const lower = corpus.toLowerCase();
  const hits: string[] = [];

  for (const term of expandedTerms) {
    if (term.length <= 3) {
      if (lower.includes(term)) hits.push(term);
    } else if (lower.includes(term)) {
      hits.push(term);
    }
  }

  return [...new Set(hits)];
}
