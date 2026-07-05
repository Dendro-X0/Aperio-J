import type { ContactHints } from "@aperio-j/core";

const PHONE_PATTERNS = [
  /(?<!\d)1[3-9]\d{9}(?!\d)/g,
  /(?<!\d)0\d{2,3}[-\s]?\d{7,8}(?!\d)/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const WECHAT_PATTERNS = [
  /微信(?:号)?[:：\s]+([a-zA-Z][a-zA-Z0-9_-]{3,19})/gi,
  /微信号[:：\s]+([a-zA-Z0-9_-]{4,20})/gi,
  /加微信[:：\s]+([a-zA-Z0-9_-]{4,20})/gi,
];

const QQ_PATTERN = /QQ(?:号)?[:：\s]+(\d{5,12})/gi;

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function extractSourceSite(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function extractContactHints(text: string): ContactHints {
  const phones: string[] = [];
  for (const pattern of PHONE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      phones.push(match[0].replace(/\s/g, ""));
    }
  }

  const emails = unique(text.match(EMAIL_PATTERN) ?? []);

  const wechat: string[] = [];
  for (const pattern of WECHAT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) wechat.push(match[1]);
    }
  }

  const qq: string[] = [];
  for (const match of text.matchAll(QQ_PATTERN)) {
    if (match[1]) qq.push(match[1]);
  }

  return {
    phones: unique(phones),
    emails,
    wechat: unique(wechat),
    qq: unique(qq),
  };
}

export function formatContactHints(hints: ContactHints): string[] {
  const lines: string[] = [];
  for (const phone of hints.phones) lines.push(`电话 ${phone}`);
  for (const email of hints.emails) lines.push(`邮箱 ${email}`);
  for (const id of hints.wechat) lines.push(`微信 ${id}`);
  for (const id of hints.qq) lines.push(`QQ ${id}`);
  return lines;
}

export const EMPTY_CONTACT_HINTS: ContactHints = {
  phones: [],
  emails: [],
  wechat: [],
  qq: [],
};
