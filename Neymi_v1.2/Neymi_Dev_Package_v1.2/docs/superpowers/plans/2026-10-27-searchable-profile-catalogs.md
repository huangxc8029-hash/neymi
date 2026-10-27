# 可搜索资料目录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 VIP 名片的院校、证书、社交账号提供带本地 Logo 的可搜索下拉选择，同时保留自定义输入。

**Architecture:** 在卡片模块目录侧增加本地 catalog 数据，在 VIP 编辑器中增加共享的搜索选择 UI。所选值仍写入现有 LocalProfile 文本字段；不改存储、分享投影或服务端边界。

**Tech Stack:** Next.js 16、React 19、TypeScript strict、CSS；无新增依赖。

**Spec:** `docs/superpowers/specs/2026-10-27-searchable-profile-catalogs-design.md`

## Global Constraints

- 三类字段搜索框与下拉列表并排，窄屏可换行。
- 院校使用 QS 2027 全球排名前 100。
- 目录与 Logo 随应用本地提供；无在线搜索或第三方图片请求。
- 证书目录覆盖常见职业/技术认证；徽章不可用时展示名称字标。
- 保留手动输入和现有资料格式/保存方式。
- 不改公开分享投影、云端接口或其他名片流程。

## Review Focus

- 大小写、空格、缩写/别名查询：可找到相应目录项。
- 空查询：展示可浏览的目录选项，默认不误选。
- 目录外文本：可手动录入并保存。
- 已保存的非目录值：继续显示和编辑。
- 窄屏与键盘操作：控件不溢出且可完整操作。

---

### Task 1: 定义本地资料目录与标识

**Files:**
- Create: `src/modules/card/profile-catalogs.ts`
- Store local monogram/brand glyphs directly with catalog entries; no remote image URLs
- Reference: QS 2027 ranking source recorded in the catalog module header or adjacent data metadata

**Interfaces:**
- Produces `CatalogOption` (`id`, `name`, `searchTerms`, `logo`, optional `rank`) and exported `universityCatalog`, `credentialCatalog`, `socialCatalog`.

- [x] Add QS 2027 top 100 university entries with stable ids, searchable aliases, ranks, and local logo marks.
- [x] Add common professional/technical credentials with badge-mark fallback; retain existing social platforms and add common options with local marks.
- [x] Confirm logo marks are bundled catalog strings and no remote image URLs or dependencies are introduced.

### Task 2: Add an accessible search-and-select editor

**Files:**
- Modify: `src/modules/card/vip-workspace.tsx`
- Modify: `src/modules/card/styles.css`
- Modify: `src/modules/card/card-experience.tsx` to render the shared social catalog mark

**Interfaces:**
- Consumes the three catalogs from Task 1.
- Keeps `infoFields`/`ProfileModule` value storage shape unchanged.

- [x] Replace university and certificate plain text fields with adjacent search input and dropdown; selected name remains the stored display value.
- [x] Replace the social platform select with adjacent searchable selection; keep account URL input and current save behavior.
- [x] Support matching by case-insensitive name and alias/initials, browsing on empty query, custom values, keyboard navigation, and existing unknown saved values.
- [x] Style desktop side-by-side and narrow-screen wrapped layouts without changing unrelated card styles.

### Task 3: Verify the scoped implementation

**Files:**
- Inspect: `src/modules/card/vip-workspace.tsx`
- Inspect: `src/modules/card/profile-catalogs.ts`
- Inspect: `src/modules/card/styles.css`

- [x] Run the existing typecheck and targeted lint for the changed files.
- [ ] Manually verify university, certificate, and social searches, custom entry, an existing saved value, and narrow-screen layout in the VIP editor. Blocked: local browser connections timed out, and the execution sandbox denied loopback socket access.
- [x] Keep implementation edits scoped to the planned components, catalog data, and related docs; the workspace has many pre-existing modifications.


