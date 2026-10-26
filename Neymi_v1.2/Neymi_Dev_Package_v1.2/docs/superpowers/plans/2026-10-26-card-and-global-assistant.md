# 基础名片与全局 AI 助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让新用户直接填写完整基础信息、展示一项真实内容，并通过全局助手完成针对个人或活动的名片准备。

**Architecture:** 复用现有 Vault、ProfileModule、分享投影、ResearchPanel、StrategyPanel 和活动准备服务。仅在需要共享状态的创建者页面加入一个助手 Provider；不重写加密、研究服务或卡片渲染体系。商业系统独立分期。

**Tech Stack:** 现有 Next.js、React、TypeScript、Zod、Vitest、Playwright；不新增依赖。

**Spec:** `docs/superpowers/specs/2026-10-26-card-and-global-assistant-design.md`

## Global Constraints

- 本轮仅写计划；执行时逐项完成、验证和提交。
- 基础信息说明：“联系方式加密保存在此浏览器，不会自动上传。分享前，由你选择公开哪些信息。”
- 免费：六款模板、四类联系方式、一个网站或社交记录、一个 Story 或 Project 展示位。
- 不删除、隐藏或阻断导出已有超额或自定义模块；新限制只约束新增。
- 账号/支付未就绪时只能明确展示即将开放的目录预览。
- AI：每次发送确认实际上下文，应用草稿与最终分享分别确认；联系方式不得进入模型输入。
- 三句静态提示按 7 秒间隔轮换一轮；输入、悬停、聚焦、打开面板、隐藏页面时暂停；可关闭、无自动语音。
- 页面范围：`/`、`/prepare`、`/activity`、`/cards`；不在公开名片或接收页暴露创建者会话。
- MBTI/星座仅自填，不推断接收人心理或职业能力；不为星座收集完整生日。
- 保留 `tests/e2e/*.temp.spec.ts` 本地探针，不把它们当正式验收或一并提交。

## Review Focus

1. 锁定保险库与未初始化状态不能被空表单覆盖：任务 1 验证原密文和联系方式不变。
2. 老资料超额、未知模块及导入数据不能丢失：任务 2 验证加载、编辑、导出和恢复。
3. 外部链接、社交账号不能绕过分享白名单：任务 3 验证危险协议和逐项排除。
4. 切换页面或资料版本变化不能丢输入、覆盖新资料：任务 4/5 验证状态和陈旧建议处理。
5. 手机键盘、焦点、减少动画偏好与服务故障：任务 4/6 验证浮窗可达、可关闭和真实失败状态。

## 阶段与交付顺序

| 阶段 | 任务 | 可评审交付 |
| --- | --- | --- |
| A 完整免费名片 | 1–3 | 直接填写联系方式，免费内容/链接编辑，扩展模块预览 |
| B 全局 AI 助手 | 4–6 | 跨页助手及单人、活动、亮点三个真实任务流程 |
| C 商业权益 | 7 | 独立商业规格与后续实施计划；当前不实现收费 |

依赖：1 → 2 → 3；4 的外壳可独立于 A 实现，5 依赖 2/3/4，6 汇总验收 A/B。默认顺序实施，避免共享表单和资料状态被同时改动。

## Task 1：将联系方式纳入基础表单

**Files:** Modify `src/app/page.tsx`, `src/modules/card/editor.tsx`, `src/modules/card/contact-panel.tsx`, `src/modules/card/styles.css`; reuse `src/modules/card/contacts.ts`, `src/modules/vault/vault.ts`, `src/modules/vault/unlock-panel.tsx`. Test `tests/unit/contacts.test.ts`, `tests/unit/vault.test.ts`, `tests/e2e/card.spec.ts`。

**Interfaces:** 保留 `ContactValues`、`Vault.readContacts(): Promise<ContactValues>`、`Vault.saveContacts(values: ContactValues): Promise<LocalProfile>` 和 `saveOrdinaryProfile` 的数据边界；表单草稿为内存态，不把联系字段合并到普通 profile。

- [ ] 增加失败用例：初次访问直接看到四个联系方式输入框；仅名称可保存；填写电话后取消密码设置无明文落盘；锁定用户保存普通资料不改变联系方式；错误密码不清空数据。
- [ ] 运行 `npm test -- tests/unit/contacts.test.ts tests/unit/vault.test.ts`，新增浏览器用例用 `npm run test:e2e -- tests/e2e/card.spec.ts`，记录预期失败。
- [ ] 将联系方式表单移入“创建你的名片”视觉分组，复用原有保险库设置/解锁；未解锁已有值呈锁定态，首次填写呈内存草稿。显示各保存步骤的实际结果与固定隐私文案。
- [ ] 验证上述命令通过，并检查名称保存成功、联系方式保存失败时不会误报全部成功。
- [ ] 只暂存本任务文件并提交：`feat: integrate encrypted contacts into card form`。

## Task 2：免费展示位与扩展模块目录

**Files:** Create `src/modules/card/module-catalog.ts`, `src/modules/card/module-picker.tsx`; Modify `src/modules/card/editor.tsx`, `src/modules/card/styles.css`; Test `tests/unit/module-catalog.test.ts`, `tests/e2e/card.spec.ts`。

**Interfaces:** `moduleCatalog` 描述稳定 kind、中文标题、示例、分组和 `availability: 'free' | 'planned_registration' | 'planned_premium'`；`canAddFreeModule(profile: LocalProfile, kind: string): boolean` 仅控制新增。保持 `ProfileModule` 和旧模块 ID 不变；已有泛用模块占用一个免费内容位，允许将其显式改为 Story/Project。

- [ ] 增加失败用例：新卡可新增一个 Story 或 Project、一个网站或社交记录；第二个新增被解释性阻止；已有多模块可继续编辑/导出；未知 kind 保留；示例不会污染 profile。
- [ ] 运行 `npm test -- tests/unit/module-catalog.test.ts`，确认失败原因对应新规则缺失。
- [ ] 实现目录、免费编辑和可点击锁定预览。分组及列表按设计文档；暂未开放项写“即将开放”，不制作假账号、购买成功或权益状态。
- [ ] 验证单元测试与目录浏览器操作、键盘导航、对比度；测试恢复旧备份不丢内容。
- [ ] 提交：`feat: add free card content and module previews`。

## Task 3：社交记录与链接贯穿编辑、展示和分享

**Files:** Create `src/modules/card/links.ts`; Modify `src/modules/card/editor.tsx`, `src/modules/card/card-experience.tsx`, `src/modules/sharing/projection.ts`, `src/modules/sharing/export.ts`, `src/modules/sharing/import.ts`；按实际校验需要修改 `src/domain/schemas.ts`。Test `tests/unit/links.test.ts`, `tests/unit/sharing.test.ts`, `tests/unit/receiver.test.ts`, `tests/e2e/exchange.spec.ts`。

**Interfaces:** `normalizeCardUrl(value: string): string` 返回经过 URL 解析的 http/https 地址；无协议域名补 https，拒绝带凭据 URL 和其他协议。沿用现有模块 items 表示标题、平台、账号、URL；不引入不必要的 Profile schema 版本。Social 子项仍逐项授权，账号与链接不相互强制披露。

- [ ] 测试合法 https/无协议域名、javascript/data/file URL、带凭据 URL、未勾选账号或 URL 不出现在序列化输出；旧卡仍可导入。
- [ ] 运行 `npm test -- tests/unit/links.test.ts tests/unit/sharing.test.ts tests/unit/receiver.test.ts` 确认新增用例失败。
- [ ] 实现结构化输入与受控外链；仅用户主动点击打开链接。JSON/vCard/PNG/公开卡共享同一白名单投影，网页地址在 vCard 中使用 URL 字段，平台账号不伪装成电话号码。
- [ ] 运行相同测试及 `npm run test:e2e -- tests/e2e/exchange.spec.ts`，验证选择与排除的实际导出结果。
- [ ] 提交：`feat: support selective social and website sharing`。

## Task 4：全局助手外壳、跨页状态与提示气泡

**Files:** Create `src/modules/assistant/provider.tsx`, `src/modules/assistant/panel.tsx`, `src/modules/assistant/prompts.ts`, `src/modules/assistant/styles.css`; Modify `src/app/layout.tsx`。Test `tests/unit/assistant-prompts.test.ts`, `tests/e2e/assistant.spec.ts`。

**Interfaces:** `AssistantIntent = 'person' | 'event' | 'highlight'`；Provider 暴露 `openAssistant(intent?: AssistantIntent): void`、关闭、当前任务及内存会话状态。不在 localStorage 保存聊天/联系方式；仅可用 sessionStorage 记录提示已关闭标记。

- [ ] 增加失败用例：7 秒轮播、三句后结束、各暂停条件和关闭后不再弹出；创建者页切换保留输入；公开/接收/交接页不显示或读取会话；刷新清除未保存对话。
- [ ] 运行 `npm test -- tests/unit/assistant-prompts.test.ts` 与 `npm run test:e2e -- tests/e2e/assistant.spec.ts` 确认失败。
- [ ] 在根布局挂载共享 Provider；按路由渲染面板，隐藏时关闭展示但不对外传递数据。桌面侧栏、手机大面板；实现 Escape、焦点进入/返回、键盘可达、减少动画和可关闭提示。
- [ ] 验证 360/390/768/1440 宽度、虚拟键盘占位和窗口高度变化下输入/提交可见；轮播不请求 AI、不自动播音。
- [ ] 提交：`feat: add persistent global assistant shell`。

## Task 5：将三个任务连接到真实的已有流程

**Files:** Create `src/modules/assistant/coach.tsx`; Modify `src/modules/assistant/provider.tsx`, `src/modules/assistant/panel.tsx`, `src/app/prepare/page.tsx`, `src/app/activity/page.tsx`, `src/modules/research/panel.tsx`, `src/modules/strategy/panel.tsx`；复用 `src/modules/self/facts.ts`、`src/modules/activity/planning.ts`、`src/modules/prepared/store.ts`。Test `tests/e2e/assistant.spec.ts`, `tests/e2e/personalization.spec.ts`, `tests/integration/strategy-boundary.test.ts`。

**Interfaces:** 从 prepare 页提取对话 UI/状态到共享 coach，继续调用现有 facts/session API。单人和活动入口分别携带内存任务进入现有页面；其输入与进度提升至共享状态以避免卸载丢失，完成结果回到同一助手。复用 ConnectionStrategy、CardRecipe 和既有 consent，不创建第二套策略或授权协议。

- [ ] 新增用例：三入口分别完成事实确认、单人策略、活动选择；仅打开入口不发送云请求；发送前可核对实际文字/事实；历史聊天不自动补发；未配置/失败有明确错误；无来源不能生成已验证结论。
- [x] 增加建议应用测试：事实候选只有单条确认后才入本地库；策略草稿复用原本地合成授权，资料 revision 变更标记 stale；最终分享仍需独立选择字段。MBTI/星座不作为职业匹配证据。
- [x] 运行 `npm test -- tests/integration/strategy-boundary.test.ts` 及相关浏览器用例，记录失败点。
- [x] 连接现有流程，保留 prepare/activity 直接入口；名单沿用最多 20 人规则；AI 错误保持页面可读，手工流程仍可继续，不返回伪 AI 结果。
- [x] 单人助手请求测试确认只发送当前文字、不重传历史；联系方式由共享 coach 敏感检测拦截，策略继续沿用原有 context approval。
- [x] 提交：`feat: connect global assistant to card preparation flows`。

## Task 6：集成验收、文档同步与正确预览

**Files:** Update `docs/00_PRODUCT_PRD.md`, `docs/01_USER_JOURNEYS_UX.md`, `docs/04_DATA_CONTRACTS.md`, `docs/06_DELIVERY_BACKLOG.md`, `docs/07_EVAL_AND_QA.md`, `docs/08_DECISIONS_AND_RISKS.md`, `docs/DEVELOPMENT_GUIDE_v1.3_2026-10-25.md`, `README.md`; Create `docs/verification/card-and-assistant-YYYY-MM-DD.md`（执行当天日期）。

- [x] 同步阶段 A/B 的实际能力与尚未开放的注册、付费范围；保留 legacy 原文，记录旧用户额外/未知模块保留政策。
- [x] 执行 `npm run typecheck`、`npm run lint`、`npm test -- --reporter=dot`、`npm run build`。
- [x] 执行正式浏览器套件（`playwright.visual.config.ts`，单 worker）：activity/card/exchange/messaging/personalization/service-worker/smoke/assistant，32 项通过；不运行本地 `*.temp.spec.ts` 探针。
- [x] E2E 检查未勾选联系方式在文件/分享投影中缺席，社交账号与 URL 独立选择；回赠路径无注册墙。
- [x] 视觉验收在 1440/390 宽度通过并保存主题截图；正式浏览器套件检查 service worker 的 network-only 与离线 shell 边界。真实服务 UI 预览截图另记于 verification。
- [x] 记录模拟与真实服务结果；真实调用需项目供应商配置和合成测试数据，未运行明确注明。手机/Safari/微信实机验收独立记录为 NOT RUN。
- [x] 提交文档与必要修复，汇报提交号、预览地址和未通过的发布条件。无推送、部署或收费操作。

## Task 7：商业权益独立设计，暂不编码

2026-10-26：已形成[账户与付费权益草案](../specs/2026-10-26-account-and-billing-design.md)，用户确认面向大陆与海外。套餐、价格及支付渠道仍待确认，账号/支付尚未实现。本任务不同于旧路线 C 的聊天渠道验收。

阶段 A/B 可正常体验后，再形成独立规格和实施计划，确认：账号方式、注册模块额度、AI 试用/付费额度、支付渠道、权益续期/退款、旧资料访问与恢复、服务器校验。登录身份与本地加密资料分开，注册不自动上传保险库。

真实解锁必须有服务器验证的身份/权益；不能仅靠 localStorage 或按钮变色收费。到期不删除数据或阻止导出；未来批量额度限制不破坏已准备名片的读取。

本任务交付商业设计，只有商业配置和验收范围确定后才建立实施任务。第一阶段目录预览不等于已经完成账号和支付。

## 完成定义与自检

- [ ] 每个产品要求映射到任务 1–7；三个 AI 入口均有实际结果路径。
- [ ] 无联系方式明文持久化，无自动外发，无虚假的注册、付费或 AI 成功状态。
- [ ] 新旧资料均能访问和导出，路由切换不丢会话，移动端可用。
- [ ] 免费体验与商业后续范围已在产品文档中对齐；最终以实测结果标记完成。

计划自检：文件名和既有接口已对照工作区；新文件是计划创建项；未执行上述测试、未修改功能代码。执行建议：由主代理在当前会话逐任务顺序实现，每阶段完成后提供可访问预览。
