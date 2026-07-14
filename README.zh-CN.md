# aperio-j

[English](./README.md) · **简体中文**

面向 **远程 / 零工 / 运营** 的档案驱动职位发现引擎：聚合国际远程源与 API 连接器，按你的技能与意向匹配职位，并为每条结果提供可解释的评分 — 无广告、无付费排名。

**产品重心：** 远程岗位、电商/直播/客服/内容等运营零工、合同制灵活用工 — 不是中国本地工厂到岗招聘。

可选 **城市标签** 仅在你选择 **仅到岗** 时启用本地源；远程 / 混合档案优先扫描国际远程招聘板（Work Best 风格）。

## 下载安装

预构建安装包见 [GitHub Releases](https://github.com/Dendro-X0/Aperio-J/releases)。

| 平台 | 文件 | 体积 | 说明 |
|------|------|------|------|
| Windows | `Aperio-J-windows-setup.exe` | ~12–18 MB | 轻量壳 → 打开 [aperio-j.onrender.com](https://aperio-j.onrender.com) |
| Android | `Aperio-J-android.apk` | ~15 MB | 同上，移动端壳 |
| 浏览器 | 任意现代浏览器 | — | **推荐给国内用户** — 无需安装 |

**完整本地桌面版**（离线 + SQLite 存于 `%AppData%`，约 50 MB）：`APERO_J_DESKTOP_LOCAL=1 pnpm build:desktop`

**GitHub 发布包**在配置了 `release-web-url.txt` 或 `APERIO_J_WEB_URL` 时使用 **轻量壳**，不打包 Node/Next 服务端（与 Android 相同）。

**Android APK** 会打开你的自托管实例（`APERIO_J_WEB_URL`）。发布前请在 GitHub Secret 中设置 `APERIO_J_WEB_URL`，或将公网 URL 写入 [`apps/desktop/release-web-url.txt`](./apps/desktop/release-web-url.txt)。朋友也可直接在 Chrome 打开 Render 链接并 **添加到主屏幕**。

详见 [docs/deployment.md](./docs/deployment.md) 与 [docs/desktop-mobile.md](./docs/desktop-mobile.md)。

## 与招聘网站的区别

| Indeed / 招聘站 | aperio-j |
|-----------------|----------|
| 关键词搜索 | 按档案反向匹配 |
| 雇主付费展示 | 无广告 |
| 单一来源 | 多源（RSS、API、自定义 URL） |
| 简历关键词 | 意向 + 能力 + 信任 + 地理 评分与解释 |

在 [Aperio](https://github.com/Dendro-X0/Aperio) 发现管线之上，用 **证据型求职者档案**（经历、技能、问卷）替代 GitHub 作品集。

**适合：** 远程运营、零工友好、技术类岗位（WWR、Remote OK、Remotive、Himalayas 等）。

**不适合：** 替代 BOSS/智联服务非技术用户；从海外服务器爬取需登录的中国招聘 App。

详见 [docs/vision.md](./docs/vision.md)。

## 快速开始

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm db:push
pnpm dev          # http://localhost:3010
```

1. 打开 **Profile settings** → 使用 **远程运营 / 零工** 或 **电商 & 直播运营** 快捷模板（或手动填写行业与角色）。
2. 若在大陆网络环境，设置 **网络环境**（自动 / 中国大陆 / 海外）。
3. 纯远程可留空城市；需要本地到岗源时再添加城市标签。
4. 打开 **Matches** → **Refresh matches**。
5. 在收件箱粘贴职位链接，抓取 feed 未覆盖的 listing。

引擎测试：

```bash
pnpm test
pnpm fixture:run
```

文档索引见 [START-HERE.md](./START-HERE.md)。

## 本地搜索与连接器

- 城市标签对接都市圈目录（约 164 城），支持别名与自动补全。
- 按城市标签运行 city-scoped 连接器；geo-scoped 按国家/地区去重。
- **仅到岗** + 中国城市 → 本地聚合源（实验性；大陆 IP 效果最佳）。
- **远程 / 混合** → 国际远程板；云端部署不会自动爬 BOSS/拉勾。
- **大陆用户：** 优先 CN-friendly 源（电鸭、猪八戒）；可选 `APERO_J_RSS_RELAY_URL` 经新加坡中继拉国际 RSS。

## 包结构

| 包 | 职责 |
|----|------|
| `@aperio-j/core` | 类型：`SeekerProfile`、`Opportunity`、`MatchResult` |
| `@aperio-j/discovery` | 解析 feed、API 连接器、角色分类 |
| `@aperio-j/matcher` | 对档案评分排序 |
| `@aperio-j/probe` | Probe 包 + 远程板注册表 |

## 许可

私有项目 — 开源发布待定。版本历史见 [CHANGELOG.md](./CHANGELOG.md)。

## 界面语言

- **English** (`en`) — 默认 UI 与引擎语言
- **简体中文** (`zh-CN`) — 完整 UI + 引擎
- **Español** (`es`) — UI 模板（主要界面已翻译；高级设置回退英文）
