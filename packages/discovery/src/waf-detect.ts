/** True when HTML looks like a WAF / anti-bot challenge instead of real content. */
export function isWafBlockedHtml(html: string): boolean {
  if (!html) return false;
  const sample = html.slice(0, 12_000);
  if (
    /(?:访问过于频繁|验证码校验|证码校验|请在五分钟内完成验证)/u.test(sample) &&
    !/(?:招聘|岗位|职位|诚聘)/u.test(sample)
  ) {
    return true;
  }
  if (html.length < 80) return false;
  return /(?:安全验证|滑动验证|人机验证|access denied|cf-browser-verification|challenge-platform)/i.test(
    sample,
  );
}
