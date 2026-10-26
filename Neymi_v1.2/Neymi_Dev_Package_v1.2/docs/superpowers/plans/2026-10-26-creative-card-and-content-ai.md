# 创意卡片与内容 AI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax. This plan is for later execution; no code is changed while drafting it.

**Goal:** 在保留游客制卡与本地资料边界的基础上，交付马赛克、多巴胺、动漫首批高级视觉模板、可追溯展示模块、语音/文件转内容流程，以及能完成对应任务的 AI 助手。

**Architecture:** 以现有 `LocalProfile`、`ProfileModule`、`CardConfig`/`CardRecipe`、Vault、Cloud consent、Research/Strategy 流程为基础增加受 schema 约束的模板注册表、带来源的内容候选及任务型助手意图。文件解析优先客户端运行；云端 AI 仅收到用户预览并授权的最小文字。所有 AI 卡片建议用模板注册表中的固定 ID 表达，最终分享仍走现有 allowlist projector 和用户确认。

**Tech Stack:** 现有 Next.js + React + TypeScript + Zod + IndexedDB/Vault + Vitest + Playwright；复用已有 `pdfjs-dist`。新增 ASR、OCR、文件解析依赖及收费渠道必须先做区域/许可证/设备核验，计划不默认引入特定供应商。

**Spec:** `docs/superpowers/specs/2026-10-26-creative-card-and-content-ai-design.md`; account/pricing context: `docs/superpowers/specs/2026-10-26-account-and-billing-design.md`.

## Global Constraints

- 不改游客可免费制卡、接收、保存、回赠的当前核心流程。
- 不上传完整 `LocalProfile`/Vault；上传前显示解析范围，云端发送每次预览和授权；敏感字段从 AI 上下文排除。
- AI/用户文件均为不可信数据；文件指令不能触发工具、外联、写入权限或分享。
- 候选事实带来源和确认状态，未由用户确认不得持久化为已确认事实。
- 仅允许模板/模块注册表中的 `templateId`、`layoutId`、`moduleKind`；不执行模型输出的 HTML/CSS/SVG/脚本。
- 最终文件导出/发布沿用 `projectShare` 与 `ShareConfirmation`，不能因登录/Pro/AI 同意而自动分享。
- 原有未知模块可读、编辑、导出；新限制只作用于新建入口，不删除旧资料。
- Pro 模板、语音或 AI 额度需有真实权益校验；前端锁图标不是权限安全边界。
- 不在此计划中实现账号/OAuth/商业支付；读取其权益 port 并用 fixture 测试，真实 COM 计划独立执行。
- 目标市场大陆和海外均覆盖；语音/AI provider 按允许地区、留存、费用和准确率单独核准。

## Review Focus

- 重复任务/跨步失败会否覆盖用户资料：在 Task 2/4 验证拒绝/失败保持原状态。
- 恶意上传内容会否触发行为：在 Task 4 验证文本/文件注入不能执行工具或外发。
- 中文姓名、专业名词、数字与单位转写是否错误：在 Task 5 校对、来源跳转、低置信提示验收。
- 注册表淘汰/会员到期会否使旧卡无法打开：在 Task 3/7 覆盖未知及过期模板回退、编辑、导出。
- 并发重试是否重复扣额度或重复调用昂贵 provider：在 Task 7 用幂等键、模拟回调与失败注入检查。

---

## 文件结构与职责

| 文件 | 职责 |
|---|---|
| `src/domain/types.ts`, `schemas.ts` | 新模板、内容来源、任务状态的稳定数据合同与严格解析 |
| `src/modules/card/templates.ts` | 主题注册表：风格 id、token、可用布局/动效；保留旧 id 映射 |
| `src/modules/card/module-catalog.ts` | 六组用户模块目录、添加规则、兼容旧 kind |
| `src/modules/card/renderer.tsx`, `identity-card.css`, `styles.css` | 主题渲染、不同模块外观、移动端/导出表现 |
| `src/modules/card/template-picker.tsx` | 系列筛选、免费/Pro 状态、风格与布局预览 |
| `src/modules/card/editor.tsx`, `module-picker.tsx` | 以表达目标添加模块、来源提示和编辑入口 |
| `src/modules/content/` (new) | 上传验证、解析 job、候选事实/来源映射、任务状态和本地草稿服务；新增前核对既有 activity 解析可复用部分 |
| `src/modules/assistant/provider.tsx`, `prompts.ts` | 新任务意图、路由、确认/取消状态；继续复用现有单人/活动任务 |
| `src/modules/consent/cloud.ts` | 保留 hash-bound approval；上传材料形成的内容须经敏感检测及独立授权 |
| `src/modules/sharing/projection.ts`, `export.ts` | 复用并验证模板字段与模块投影，不把来源/私有备注分享出去 |
| `tests/unit/` | schema、模板、模块、来源与解析器边界测试 |
| `tests/integration/` | 候选、授权、Vault 持久化、额度/任务幂等测试 |
| `tests/e2e/` | 用户关键路径及 360/390/桌面模板验证 |
| `public/card-backgrounds/` | 仅存原创或获得授权的静态背景；写清来源/许可证和无障碍替代 |

## 实施任务

### Task 1：模块与来源契约

**Files:** `src/domain/types.ts`, `src/domain/schemas.ts`, new `src/modules/content/types.ts` (if separating module types), `tests/unit/domain.test.ts`, new `tests/unit/content-schema.test.ts`.

- [ ] 定义 `ContentSourceRef`：`kind: 'user_text'|'voice_transcript'|'file'|'public_url'`，`sourceId`、可选 page/paragraph/time range、`createdAt`；严格拒绝未知字段及越界范围。
- [ ] 定义 `ContentCandidate`：`id`、`kind`、`title`、`items`、`sourceRefs`、`status: 'candidate'|'needs_review'|'confirmed'|'rejected'`、`revision`；默认生成 candidate。
- [ ] 在 `ProfileItem` 或其宿主模块中以可选 `sourceRefs`/`confirmedAt` 向前兼容；旧 `schemaVersion:1` fixture 必须仍能 parse/read/export。
- [ ] 新增严格 schema 测试：无 sourceRef、非法时间范围、未知 module kind、未确认 candidate 的持久化请求必须拒绝或留在 draft。
- [ ] Run `npm test -- tests/unit/domain.test.ts tests/unit/content-schema.test.ts`；预期新负例通过、现存 v1 fixtures 兼容。

### Task 2：用户目标模块目录

**Files:** `src/modules/card/module-catalog.ts`, `src/modules/card/module-picker.tsx`, `src/modules/card/editor.tsx`, `tests/unit/module-catalog.test.ts`, `tests/e2e/card.spec.ts`.

- [ ] 将目录按认识我/我能提供什么/我的证明/我的观点/与我合作/个人特点与联系展示；旧 `story/project/services/portfolio/skills/collaboration/availability/social/website/booking` kind 做显式映射。
- [ ] 添加“项目案例”多实例合同，字段为背景、角色、行动、结果、时间、证据与可选媒体；用户可重复添加且不覆盖同类模块。
- [ ] 添加“来源与确认状态”编辑呈现，只有私有编辑/审阅区可见，不进入卡片、vCard、Ncard、PNG 或公开投影。
- [ ] 保留 Pro 和免费权限接口作为调用边界；本任务只连接现有 entitlement abstraction/fixture，不创建虚假的解锁 UI。
- [ ] E2E：添加两个项目、重排、保存/刷新恢复；现有多余未知 kind 保留读取编辑导出。
- [ ] Run `npm test -- tests/unit/module-catalog.test.ts` and `npx playwright test tests/e2e/card.spec.ts --config playwright.visual.config.ts --workers=1`。

### Task 3：多风格模板注册表与九款首发

**Files:** `src/modules/card/templates.ts`, `src/modules/card/renderer.tsx`, `src/modules/card/identity-card.css`, `src/modules/card/styles.css`, `src/modules/card/template-picker.tsx`, `src/modules/sharing/export.ts`, `tests/unit/card.test.ts`, `tests/e2e/card-design.spec.ts`, authorized original artwork under `public/card-backgrounds/`.

- [ ] 定义固定 `templateId` 和 registry 的 token/layout/module-shell/motion capability；首发分别是 `mosaic-*`、`dopamine-*`、`anime-*` 各三款，注册表对未知 ID 回退到既有兼容主题。
- [ ] 保留既有 `paper/midnight/evergreen/coast/clay/lilac` ID 和旧别名，既有 CardConfig 不静默换风格或失去导出能力。
- [ ] 每款定义可测试的结构差异：身份优先/故事优先/作品优先布局和对应模块外壳；系列之间不能仅颜色或背景不同。
- [ ] 模板选择器增加系列标签、免费/Pro 徽标、缩略预览和键盘/屏幕阅读器状态；Pro 预览可看，不写入/伪造已解锁状态。
- [ ] renderer 对多媒体量、长中文姓名、空模块、未知模块优雅降级；小屏详情纵向阅读；5:3 封面主信息不截断。
- [ ] 增加 reduced motion / static export 路径；PNG 生成不依赖付费动画或联网资产。
- [ ] 每张背景/插画有来源/许可登记；动漫主题使用原创或用户获授权素材，不复制已知 IP/竞品 artwork。
- [ ] E2E 截图及断言：3 系列各 3 款的 ID、结构、主题切换、展开/返回、360/390/桌面布局、PNG/公开投影一致、未知旧 ID 回退。
- [ ] Run `npm test -- tests/unit/card.test.ts` and `npx playwright test tests/e2e/card-design.spec.ts --config playwright.card-design.config.ts --workers=1`；保留可复查截图。

### Task 4：文件选择、解析和来源定位

**Files:** new `src/modules/content/file-input.ts`, `extract.ts`, `jobs.ts`, new UI `src/modules/content/import-panel.tsx`, `src/modules/activity/service.ts` (reuse/extract PDF utility only when safe), `src/domain/schemas.ts`, new `tests/unit/content-files.test.ts`, new `tests/integration/content-import.test.ts`, new `tests/e2e/content-import.spec.ts`.

- [ ] 定义首批输入允许列表：PDF、DOCX、TXT、JPEG、PNG；单文件 ≤10 MiB、最多 5 个、总量 ≤25 MiB、PDF ≤100 页、提取文本 ≤50,000 字符；同时验证扩展名、MIME 与字节签名。
- [ ] PDF 复用已有 `pdfjs-dist` 客户端抽取并保留页码；DOCX 选择轻量、许可证合规解析器或离线 parser，提交前评估 bundle/安全，避免服务器执行文档内容；TXT 明确 UTF-8/解码失败；JPEG/PNG 作为媒体候选，不承诺首批 OCR。
- [ ] 文件解析状态为 selected/validating/ready/failed/cancelled，释放 object URL 与临时字节；解析失败不保存原件、不损坏当前 profile。
- [ ] 任务开始页显示文件名、范围、解析位置、上传/云端用途和预估额度；超页数可选页范围，超字符数显示截取范围；可取消。
- [ ] 文档提示注入仅作为文本送入内容整理 prompt；不执行宏、脚本、嵌入链接；模型工具 registry 在此技能关闭。
- [ ] 测试畸形、加密、超类型、超大小、双扩展名、嵌入攻击文本与失败清理；引用页码与提取文本一致。
- [ ] Run `npm test -- tests/unit/content-files.test.ts tests/integration/content-import.test.ts` and targeted E2E。

### Task 5：语音捕获与转写适配边界

**Files:** new `src/modules/content/voice.ts`, `src/modules/content/transcription-provider.ts`, `src/modules/content/voice-capture.tsx`, `src/modules/content/consent.ts`, new `tests/unit/transcription.test.ts`, `tests/integration/voice-consent.test.ts`, extend `tests/e2e/content-import.spec.ts`.

- [ ] 实现录音状态机 idle/recording/reviewing/transcribing/ready/failed/cancelled；有清楚开始/停止、试听、重录、取消、设备权限拒绝说明。
- [ ] Transcription port 接收音频 bytes + declared language + abort signal，输出 `{text,segments:[{text,startMs,endMs,confidence?}],provider,language}`；只接 fixtures，不默认新增云供应商。
- [ ] 本地识别能力需先在目标浏览器核准；若真实部署需云端转写，提供独立同意页，说明原始音频或转写文字的接收方、用途和保留期。无 provider/拒绝同意时支持手动录入/文件转写可用替代。
- [ ] 原始录音默认只在任务临时区并在成功/取消/TTL 后清除；不入 console、持久 profile 或分享数据；段级 sourceRef 可回放对应音频片段但不会公开。
- [ ] 对低置信专名、姓名、数字、日期提示人工校对；校对后的文本仍是 content candidate，须二次确认并单独批准云端分析。
- [ ] 测试未同意时 network/provider 调用次数为 0；取消中断；重试幂等；transcript/redaction failure 不保存 raw audio；来源片段边界合法。
- [ ] Run `npm test -- tests/unit/transcription.test.ts tests/integration/voice-consent.test.ts` and voice E2E in mock mode。

### Task 6：模块生成和内容整理助手

**Files:** `src/modules/assistant/provider.tsx`, `prompts.ts`, `src/modules/self/facts.ts`, `src/modules/consent/cloud.ts`, `src/server/providers/llm.ts`, new `src/modules/content/propose-modules.ts`, `src/modules/content/review-panel.tsx`, `tests/unit/assistant-prompts.test.ts`, new tests for module proposals, `tests/integration/cloud-boundary.test.ts`, `tests/e2e/assistant.spec.ts`.

- [ ] 增加结构化 intent: facts, import, create_module, style_pairing, copy_edit, bilingual, person_prep, event_prep, share_check；人员/活动继续转发既有流程，不复制 research service。
- [ ] 新 provider contract `proposeModules(context, confirmedFacts, sources)` 返回 strict `ModuleProposal[]`，proposal 只含 registry module kind、候选字段、source IDs、rationale、missing evidence；不能含任意组件代码。
- [ ] 用户在发送之前看到确切的转写/摘录/已确认事实，选择范围并批准；通过已有 hash-bound cloud approval，输入变更即需新授权。
- [ ] 生成预览与源文 diff；apply 前使用已有 LocalFactsStore/Vault 写入口创建新版本，拒绝不覆盖；reject/dismiss 不写 profile。
- [ ] style pairing 由可测试的确定性 selector 根据用户偏好/模块组成筛选三种 template IDs，模型仅产理由；未知 ID 或付费权益未验证的款不得 apply。
- [ ] 对文档注入、敏感邮箱/电话、虚构 KPI/客户背书、source 不存在、用户编辑后来源丢失写负例。
- [ ] Run targeted unit/integration and assistant E2E; assertions include provider request contains only approved selected context, never raw profile.

### Task 7：Pro 权益与成本计量连接

**Files:** account commercial interfaces specified in `docs/superpowers/specs/2026-10-26-account-and-billing-design.md`; `src/modules/card/template-picker.tsx`, `src/modules/content/jobs.ts`, task API only after COM implementation provides entitlement endpoint; fixture tests.

- [ ] Define typed read-only `EntitlementPort` consumption for `templateId`, content tasks, transcription minutes, and batch person count; no UI-only purchase boolean.
- [ ] Stub/fixture tests for guest/free/Pro, expired plan, delayed payment and missing provider; production without authorized identity/entitlement returns stable unavailable/upgrade prompt.
- [ ] Apply pricing document idempotent reservation/settlement to generated job. A task charges only when schema/evidence-valid retrievable result is persisted; retried same idempotency key returns same task/result; failed/cancelled pre-commit releases reservation.
- [ ] Measure ASR, OCR, file parse and model cost per complete task in non-content diagnostics; do not log transcript, original file, recipient names, profile fields or raw prompts.
- [ ] Do not set member prices/limits or create Checkout until business approves COM plan and providers/regions are configured.
- [ ] Run concurrency and retry tests for last-unit reservation, duplicate job, failure after provider result before settlement, and expired plan.

### Task 8：End-to-end regression, docs, and release criteria

**Files:** targeted tests above; `docs/04_DATA_CONTRACTS.md`, `docs/05_APIS_INTEGRATIONS.md`, `docs/06_DELIVERY_BACKLOG.md`, `docs/07_EVAL_AND_QA.md`, verification report.

- [ ] Test full path: guest drafts card → uploads mock allowed material or consents to voice → reviews facts and source → creates one module → selects a style → saves locally → individually selects share fields → export/publish confirmation.
- [ ] Test refusal/cancel/timeout routes preserve pre-existing profile and old module IDs.
- [ ] Test no AI/provider secrets, sender data, audio, upload body, unselected contacts or source references reach public exports/logs.
- [ ] Test keyboard flow, 360/390/768/1440 widths, reduced motion, large font and display strings in Chinese/English.
- [ ] Run `npm run typecheck`, `npm run lint`, relevant `npm test -- ...`, approved focused Playwright suite, `npm run build` in isolated Next output if existing server/build artifacts conflict, then `git diff --check`.
- [ ] Record fixture versus real ASR/OCR/LLM/provider states separately; no configured provider or real-device test means NOT RUN/BLOCKED, not passed.

## Suggested delivery slices

1. COM prerequisite: account/entitlement implementation is separate; first run creative tasks in fixture/free-only mode.
2. Slice 1: schema, module directory, registry, nine templates and manual editor. This makes a tangible deliverable without AI dependency.
3. Slice 2: allowed PDF/TXT/DOCX parsing, candidates with references, review/apply flow.
4. Slice 3: voice adapter + recording consent, starting with one approved locale/device/browser matrix.
5. Slice 4: module generation, style pairing, copy editing, bilingual assistant skills and integration to existing A/B flows.
6. Slice 5: cost pilot, user research, verify Pro catalogue/limits, connect only when COM account and payment gates pass.

## Plan Self-Review

- **Coverage:** template system and original assets in Task 3; modules/source model in Task 1–2; upload and voice in Task 4–5; AI skills and consent in Task 6; paid entitlements and billing boundary in Task 7; cross-device/export/release gates in Task 8.
- **Dependency order:** stable source/module schema precedes editor and parser; registry precedes picker and selector; parsing/transcription precede AI proposals; entitlement port is independent and can use fixture first.
- **Unresolved external gates:** local ASR feasibility, legal/region-approved ASR and LLM providers, media licenses, true paid catalog and prices, commercial identity/payment COM tasks. No implementation value is fabricated for these.
- **Execution caution:** existing worktree already contains unrelated A/B, visual, and C-phase edits. Execute only after reviewing the staged file list and preserve all pre-existing uncommitted changes.
