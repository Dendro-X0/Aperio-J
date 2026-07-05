import type { EvidenceArtifact } from "@aperio-j/core";

interface TransferRule {
  pattern: RegExp;
  capabilities: string[];
}

const TRANSFER_RULES: TransferRule[] = [
  {
    pattern: /组装|流水线|手机|pixel|电子|esd/i,
    capabilities: ["精细操作", "电子组件", "ESD防护", "物料识别", "外观检查"],
  },
  {
    pattern: /显示|显示器|老化|测试/i,
    capabilities: ["外观检验", "功能测试", "质检流程", "电子测试"],
  },
  {
    pattern: /工厂|产线|代工|制造/i,
    capabilities: ["安全规范", "班组协作", "排班适应", "制造业环境"],
  },
  {
    pattern: /质检|品检|检验/i,
    capabilities: ["质量意识", "检验记录", "不良判定"],
  },
];

export function inferCapabilitiesFromArtifacts(artifacts: EvidenceArtifact[]): string[] {
  const corpus = artifacts
    .map((artifact) =>
      [artifact.title, artifact.industry, artifact.duties, ...artifact.tools].join(" "),
    )
    .join(" ");

  const capabilities = new Set<string>();
  for (const rule of TRANSFER_RULES) {
    if (rule.pattern.test(corpus)) {
      for (const capability of rule.capabilities) capabilities.add(capability);
    }
  }

  return [...capabilities];
}

export function inferCapabilitiesFromSkills(skillTokens: string[]): string[] {
  return skillTokens.map((skill) => skill.trim()).filter(Boolean);
}

export function buildCapabilityHaystack(
  artifacts: EvidenceArtifact[],
  skillTokens: string[],
): string[] {
  return [
    ...new Set([
      ...inferCapabilitiesFromArtifacts(artifacts),
      ...inferCapabilitiesFromSkills(skillTokens),
      ...skillTokens,
    ]),
  ];
}
