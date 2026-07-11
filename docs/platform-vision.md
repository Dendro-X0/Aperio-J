# Platform vision — local-first, cross-platform

aperio-j 的长期形态：**自托管、本地优先、隐私可控** 的就业机会引擎，与 Aperio 共享「信息流 + 工作流」DNA，但面向全职/兼职就业而非 GitHub 接单。

---

## 与 Aperio 的对齐

| Aperio | aperio-j |
|--------|----------|
| 用户添加 **Information Stream**（RSS / URL） | **信号源** — 自动发现 **+** 用户自定义 URL |
| Portfolio 驱动 query 扩展 | Profile（城市、意向、背景）驱动 probe + 匹配 |
| 本地 SQLite、自托管 | SQLite + 单机 Web（→ Tauri 壳） |
| 无账号也可跑 | 同上 — 数据不出本机 |

**ProbePack / 搜索 probe** 只是冷启动加速器，不是唯一信息源。用户搬到浙江、香港或 OSS 国际用户，应通过：

1. 修改 Profile 城市/意向  
2. **手动添加本地招聘 URL**  
3. 可选：社区贡献 locale probe-pack（非硬编码在引擎里）

---

## 隐私与价值主张

- **Profile、匹配结果、信号源列表** 默认存在本地 SQLite  
- **不向第三方上传** 用户背景（无 GitHub 导入、无云 Profile）  
- 抓取的是 **公开网页**，不替用户登录招聘 App  
- 用户自己决定扫哪些 URL — 减少无关骚扰与数据外泄风险  

适合：流水线工人、转行求职者、不想把简历交给聚合平台的 introvert 用户。

---

## 跨平台：Tauri v2（Phase 5）

| 目标 | 方案 |
|------|------|
| 桌面 + 移动一套代码 | Tauri v2 + 现有 Next/web 或 Vite 前端 |
| 轻量安装包 | Tauri 原生壳 + 内嵌 Next standalone + Node sidecar |
| 本地 cron | 系统调度或 Tauri 后台任务调用 match pipeline |
| 自托管 | Tauri 单机 **或** 自托管 Web（Docker / standalone + 本地 SQLite 文件） |

**Desktop shell (`apps/desktop`):**

```bash
pnpm dev:desktop    # Tauri window → http://127.0.0.1:3010 (Next dev server)
pnpm build:desktop  # bundles Next standalone + SQLite in app data dir
pnpm dev:android    # same web UI on Android emulator/device (dev server)
```

See **[desktop-mobile.md](./desktop-mobile.md)** for mobile setup, self-signing, and platform configs.

当前 **`apps/web`** 是引擎壳的第一版；Tauri 迁移不改动 `@aperio-j/core|discovery|matcher|probe`。

---

## 地理与国际化

引擎 **不按城市写死业务逻辑**：

- `primaryCity` 任意文本（深圳、杭州、Hong Kong、Berlin…）  
- 搜索 probe 按城市生成查询  
- **用户 URL** 覆盖任何 ProbePack 未收录的地区  
- 匹配规则（intent / trust / red-flag）语言可扩展 — CN 劳务 patterns 是一包规则，非引擎核心  

---

## 非目标（保持）

- 中心化 SaaS 简历库  
- 强制第三方登录  
- 替用户投递 / 自动加 HR 微信  
- 大规模封闭 API  scraping（Indeed/LinkedIn at scale）

**Last updated:** 2026-07-03
