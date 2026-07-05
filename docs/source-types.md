# 信息源类型

aperio-j 从 **公开 Web 页面** 抓取职位信息（列表页 → 详情页），不是 API 聚合商。用户只配置城市与意向；引擎自动发现「信号源」并抓取。

## 当前支持

| 类型 | 说明 | 示例 |
|------|------|------|
| **政府 / 人社门户** | `.gov.cn`、`mohrss.gov.cn` 列表与公告 | `hrss.sz.gov.cn`、`rsj.gz.gov.cn` |
| **搜索引擎发现** | 按城市搜索「人社 招聘」，从结果页提取 gov 链接 | Baidu search probe |
| **招聘网站（列表页）** | HTML 列表 + 详情二跳 | 智联、BOSS、51job、拉勾 |
| **RSS** | 稳定 feed URL（较少） | 部分门户 RSS |
| **远程板** | 用户接受远程时 | WeWorkRemotely RSS |

## 暂不支持（路线图）

| 类型 | 原因 |
|------|------|
| **论坛 / 贴吧 / 小红书** | 需专用解析与合规策略；未接入 |
| **Indeed / LinkedIn 大规模爬取** | 明确 non-goal |
| **登录后内容** | 无账号体系与 OAuth |
| **私信 / IM** | 不在公开 Web 范围 |

## 数据流

```
Profile 城市
  → Probe（registry / search / autodiscover）
  → 验证 → StreamRegistry（每用户）
  → fetch list_page / RSS
  → detail page 二跳（正文）
  → parseOpportunity（分类 + 联系方式提取）
  → 匹配排序 → Inbox
```

## Inbox 展示字段

每条匹配机会包含：

| 字段 | 来源 |
|------|------|
| **职位详情** | 详情页正文摘要（`body`） |
| **信息源** | StreamRegistry：名称、类型、站点、种子 URL |
| **原文链接** | 单条 listing 的 `url` |
| **联系方式** | 从正文规则提取：手机、座机、邮箱、微信、QQ |
| **雇主/地点/直招** | 解析器 heuristic |

联系方式仅当原文中出现时展示；引擎不生成虚假联系信息。

## 关闭某项能力

| 变量 | 效果 |
|------|------|
| `APERO_J_SEARCH_PROBE=false` | 关闭搜索引擎发现 |
| `APERO_J_DETAIL_FETCH=false` | 列表页不抓详情（仅标题） |

完整信号源列表见 App **信号源** 页。
