import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RawFeedItem } from "@aperio-j/core";
import {
  enrichListItemsWithDetails,
  parseDetailPageHtml,
  shouldFetchDetail,
} from "./detail-page-fetch.js";

const GOV_DETAIL_HTML = `<!DOCTYPE html>
<html><head>
<meta name="description" content="龙岗区某电子厂招聘IQC质检员，直招非中介。" />
</head><body>
<nav>首页 &gt; 通知公告</nav>
<div class="article-content TRS_Editor">
  <h1>深圳市龙岗区某电子厂 IQC质检员招聘公告</h1>
  <p>招聘单位：深圳某电子科技有限公司（直招）。</p>
  <p>工作地点：深圳龙岗区坂田街道。岗位职责：来料检验、外观检查、记录不良。</p>
  <p>要求：高中以上学历，1年以上质检经验，熟悉电子厂IQC流程。不接受劳务中介。</p>
</div>
<footer>版权所有 深圳市人力资源和社会保障局</footer>
</body></html>`;

describe("parseDetailPageHtml", () => {
  it("extracts title and long body from gov-style detail page", () => {
    const parsed = parseDetailPageHtml(
      GOV_DETAIL_HTML,
      "https://hrss.sz.gov.cn/xxgk/tzgg/01.html",
      "fallback",
    );

    assert.equal(parsed.title, "深圳市龙岗区某电子厂 IQC质检员招聘公告");
    assert.ok(parsed.body.includes("来料检验"));
    assert.ok(parsed.body.includes("直招"));
    assert.ok(parsed.body.length > 80);
  });
});

describe("shouldFetchDetail", () => {
  it("skips items that already have substantive body", () => {
    const item: RawFeedItem = {
      title: "质检员",
      body: "这是一段已经完整的岗位描述，包含职责、要求、地点与薪资说明，无需再次抓取详情页内容。补充说明：需熟悉仓库管理系统，能独立盘点与发料，适应两班倒，具备基本电脑操作能力。",
      url: "https://example.com/job/1",
      sourceId: "test",
      fetchedAt: new Date().toISOString(),
    };
    assert.equal(shouldFetchDetail(item), false);
  });

  it("fetches when body equals title stub", () => {
    const item: RawFeedItem = {
      title: "质检员招聘",
      body: "质检员招聘",
      url: "https://example.com/job/2",
      sourceId: "test",
      fetchedAt: new Date().toISOString(),
    };
    assert.equal(shouldFetchDetail(item), true);
  });
});

describe("enrichListItemsWithDetails", () => {
  it("respects enabled=false without network", async () => {
    const items: RawFeedItem[] = [
      {
        title: "仓储员",
        body: "仓储员",
        url: "https://example.com/job/3",
        sourceId: "test",
        fetchedAt: new Date().toISOString(),
      },
    ];

    const result = await enrichListItemsWithDetails(items, { enabled: false });
    assert.deepEqual(result, items);
  });
});
