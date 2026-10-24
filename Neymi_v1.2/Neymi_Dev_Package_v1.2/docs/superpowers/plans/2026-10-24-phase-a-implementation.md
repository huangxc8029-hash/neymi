# Phase A — Personalized Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-registration card experience followed by evidence-grounded, single-recipient AI personalization with local sensitive data and deliberate sharing.

**Architecture:** 同源 Web/PWA + server API；本地普通数据/加密保险库/授权/投影分层。研究任务与主动发布快照分别存储，通过适配器接入模型与公开搜索；A 不要求活动，不接正式 Bot。

**Tech Stack:** 计划默认 TypeScript strict、Next.js/React、Zod、Dexie/IndexedDB、Web Crypto、Vitest、Playwright；服务端 SQLite 持久卷用于单实例试点，存储接口可替换。A00 核验支持的 Node LTS、依赖兼容与部署约束后锁定版本，不假装已安装。无持久卷的平台必须换受支持数据库并记录 ADR，不用临时文件冒充持久存储。

**Spec:** [产品设计](../specs/2026-10-24-neymi-personalized-card-design.md)、[现行 PRD](../../00_PRODUCT_PRD.md)、[架构](../../03_ARCHITECTURE_PRIVACY.md)、[契约](../../04_DATA_CONTRACTS.md)。

## Global Constraints
- 先 A 单人定制 → B 整场活动准备 → C 正式聊天渠道。
- 免费免注册创建/接收/保存/回赠；首次不强制口令、AI 问卷或付费。
- 云端只接收用户批准的对话/最小摘要；完整 LocalProfile、敏感 vault 值不进 AI。
- Strategy 先于 AI Recipe；ManualCardConfig 不要求 strategyId；Recipient.eventId 可缺省。
- 分析、本地合成、最终分享分别授权。未选字段不得进入导出、网络、OG 或日志。
- 5:3、可变 1–N 模块、float/keys/orbit、360/390/768/1440、键盘、reduced-motion。
- 24h 应用提案；30d 默认发布；10 来源/5分钟研究；每会话每小时 10 次；文本 20,000 字符，抓取 2 MiB，本地图片 5 MiB。
- fixture 明确模拟；无凭证不得伪装真实结果；未运行不得声称通过。不得擅自 push/deploy/pay/send。
- 范围不含 PDF、活动批量排名、Bot、支付、自动外联、隐性追踪、跨设备自动同步或接收人 E2EE。

## Review Focus
1. 本地空间不足、损坏备份、旧版本恢复不得破坏原库 → A02 的 recovery-is-atomic。
2. 用户在确认后改变字段/文案，旧确认不能发布新内容 → A04 digest-invalidated、A10 publish-digest-mismatch。
3. 异步请求在取消/身份切换后返回，不能污染新的接收人方案 → A07 stale-job-result、A09 stale-recipient-proposal。
4. 公开页面的离线缓存不能绕过撤下或在共享设备残留敏感内容 → A11 no-publication-service-worker-cache。
5. 短期任务清理与供应商留存不同；删除失败必须可观测、可重试且不恢复已删数据 → A05 cleanup-retry、A12 retention-evidence。

## 文件结构与执行纪律
以下路径相对包根 Neymi_v1.2/Neymi_Dev_Package_v1.2，**均为计划路径而非当前已有产品代码**。
- src/app：基础编辑、AI、方案库、接收页面；src/app/v1/[...segments]/route.ts 为同源 API 分发，业务留在 modules。
- src/domain：04 契约、schema、引用校验；src/modules/vault、card、sharing、consent、self、research、strategy、prepared、publication 分责。
- src/server：session、quota、短期存储/清理、provider 适配、API 路由；不得 import 本地 vault。
- src/pwa：静态资源/离线策略。tests/unit、tests/integration、tests/e2e、tests/fixtures。
- package.json、tsconfig.json、vitest.config.ts、playwright.config.ts、.env.example、.gitignore；真实密钥不入库。
- docs/verification：真实命令/设备/服务证据；原型和 legacy 不改作产品实现。

所有后续任务使用 A01 输出的域类型。可复用 fixture 工厂在 tests/fixtures/domain.ts 创建 makeProfile、makeManual、makeRecipe、makeResearch、makeContext、makeGrant、makeSelection、makeDraft、makeSession；每个工厂返回 schema-valid 数据，覆盖值通过 Partial 参数传入，测试不依赖真实网络。
A00 只读，A01 才初始化；A01 定义 npm scripts：typecheck=tsc --noEmit、lint=eslint .、test=vitest run、test:e2e=playwright test、build=next build。默认 test 不联网。每任务先写目标负例并观察预期失败，再实施，再验证；不得把缺依赖/环境错误当作有意义的红测试。每次提交前审查文件清单，不能 git add 整个未跟踪需求包。

---
### Task A00: 实际发现与运行环境锁定
**Files:** Create docs/REPO_DISCOVERY_REPORT.md；仅按证据修订本计划/ADR-011。
**Interfaces:** 为 A01 提供实际包根、已存在文件、可用运行时、兼容依赖版本和安全的安装方案；本任务无产品 API。
- [ ] 运行 Get-Location、git status --short、rg --files，记录现有原型/文档和用户未提交内容。
- [ ] 运行 node --version、npm --version；缺失如实记录，确认可用 runtime 后再计划安装，不把未执行写成成功。
- [ ] 核验所选框架与运行时兼容、sqlite 持久卷及部署约束；锁具体版本并更新 ADR-011，未经核验不凭记忆使用“最新版”。
- [ ] 输出发现报告：实际结构、命令、冲突、缺配置、A01 文件/测试/风险。检查计划所有新路径仍不会覆盖用户代码。
- [ ] 仅提交发现报告及必要计划变更，消息 docs: record phase A discovery。A00 不初始化工程。

### Task A01: 可运行工程与严格契约
**Depends on:** A00。
**Files:** Create/modify package.json、package-lock.json、tsconfig.json、eslint.config.mjs、vitest.config.ts、playwright.config.ts、.gitignore、.env.example、src/app/layout.tsx、src/app/page.tsx、src/domain/types.ts、src/domain/schemas.ts、src/domain/validate.ts、tests/fixtures/domain.ts。Test: tests/unit/domain.test.ts。
**Interfaces:** 输出 04 中所有类型和对应 schema；validateRecipe(value: unknown, strategy: ConnectionStrategy, moduleIds: string[]): CardRecipe；validateResearch(value: unknown): RecipientResearch。所有边界拒绝 unknown keys。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/domain.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
expect(manualCardSchema.safeParse(makeManual()).success).toBe(true);
expect(recipientSchema.safeParse({ id:'r1', displayName:'Guest', identityStatus:'unverified' }).success).toBe(true);
expect(aiRecipeSchema.safeParse({ ...makeRecipe(), strategyId: undefined }).success).toBe(false);
expect(aiRecipeSchema.safeParse({ ...makeRecipe(), phone:'PRIVATE_SENTINEL' }).success).toBe(false);
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/domain.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 创建最小 Next 工程和上述 scripts；落实 04 的 discriminated union、字段/媒体边界、引用/跨人校验。将场景种子转换为有效领域 fixture，增加 20 个负例目录 cases；fixtureOnly 不冒充线上核验。
- [ ] **Step 4: 验证。** npm run typecheck；npm run lint；npm run test -- tests/unit/domain.test.ts；npm run build。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** G-A0 工程部分；合法/非法 fixture 结果和真实版本记录。 更新 docs/verification/a01.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add runnable domain foundation。

### Task A02: 本地敏感保险库与原子恢复
**Depends on:** A01。
**Files:** Create/modify src/modules/vault/storage.ts、src/modules/vault/crypto.ts、src/modules/vault/vault.ts、src/modules/vault/backup.ts、src/modules/vault/unlock-panel.tsx、tests/fixtures/vault.ts。Test: tests/unit/vault.test.ts。
**Interfaces:** VaultStorage.get/set/transaction；createVault(storage: VaultStorage): Vault；Vault.initialize(passphrase: string): Promise<void>（仅首次，不覆盖已有库）、saveProfile(profile: LocalProfile): Promise<void>、unlock(passphrase: string): Promise<void>、lock(): void、readFields(refs: FieldRef[]): Promise<ProfileItem[]>、readIdentity(keys: Array<'name'|'company'|'role'>): Promise<LocalProfile['identity']>、readAssets(ids: string[]): Promise<LocalAsset[]>；exportBackup(vault: Vault, passphrase: string): Promise<Uint8Array>；importBackup(vault: Vault, bytes: Uint8Array, passphrase: string): Promise<void>。含敏感值的 saveProfile 仅在库已初始化且解锁后执行；基础普通字段存储不要求初始化。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/vault.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
await vault.saveProfile(profileWithSensitiveSentinel);
expect(await storage.dumpSerialized()).not.toContain('PRIVATE_SENTINEL');
vault.lock();
await expect(vault.readFields(sensitiveRefs)).rejects.toMatchObject({code:'PERMISSION_DENIED'});
await expect(importBackup(vault, tamperedBackup, 'wrong')).rejects.toThrow();
expect(await storage.dumpSerialized()).toBe(beforeFailedImport);
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/vault.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 普通字段与加密 vault 物理隔离；标准 AES-GCM、每次随机 nonce、口令派生参数写版本头，A02 在手机性能与安全审查基础上冻结参数。密钥仅内存，15 分钟闲置锁定。备份校验后事务替换；添加 recovery-is-atomic、quota-error、reload-lock、legacy-version-reject，不允许 silent data loss。
- [ ] **Step 4: 验证。** npm run test -- tests/unit/vault.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A02/03；记录算法参数、设备耗时、遗忘口令限制，未审计不得写已审计。 更新 docs/verification/a02.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add local vault and encrypted recovery。

### Task A03: 免注册基础编辑与卡片视觉
**Depends on:** A02。
**Files:** Create/modify src/modules/card/editor.tsx、src/modules/card/renderer.tsx、src/modules/card/styles.css、src/app/page.tsx、tests/e2e/card.spec.ts。Test: tests/unit/card.test.tsx。
**Interfaces:** CardEditor({profile,onChange})；CardRenderer({draft: LocalDraft,reducedMotion?: boolean})；createManualDraft(profile: LocalProfile, config: ManualCardConfig): LocalDraft 只使用当前本地用户可见数据，未解锁敏感值不读取。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/card.test.tsx 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
render(<CardEditor profile={emptyProfile} onChange={onChange} />);
expect(screen.queryByText('注册后继续')).toBeNull();
await user.type(screen.getByLabelText('展示名称'),'Lin');
expect(screen.getByRole('button',{name:'预览名片'})).toBeEnabled();
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/card.test.tsx。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 无强制电话/头像/公司、口令或 AI。基础名片先可用，再非阻塞提示 AI。5:3 可变模块与详情焦点返回，float/keys/orbit、reduced-motion；不设六模块上限。增加 360/390/768/1440 无溢出 e2e，低存储保存失败 UI。
- [ ] **Step 4: 验证。** npm run test -- tests/unit/card.test.tsx；npm run test:e2e -- tests/e2e/card.spec.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A01/15；截图仅作视觉证据，不替代功能测试。 更新 docs/verification/a03.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add guest card editor and renderer。

### Task A04: 白名单投影与安全导出
**Depends on:** A03。
**Files:** Create/modify src/modules/sharing/projection.ts、src/modules/sharing/confirmation.ts、src/modules/sharing/media.ts、src/modules/sharing/export.ts、src/modules/sharing/preview.tsx。Test: tests/unit/sharing.test.ts。
**Interfaces:** projectShare(draft: LocalDraft, selection: ShareSelection): ShareProjection；digestProjection(projection: ShareProjection): Promise<string>；serializeNcard(p): Uint8Array、serializeVcard(p): Uint8Array、renderImage(p): Promise<Blob>（p: ShareProjection）；sanitizeImage(file: Blob): Promise<LocalAsset>。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/sharing.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
const p = projectShare(draftWithHiddenPhone, emailOnlySelection);
expect(new TextDecoder().decode(serializeNcard(p))).not.toContain('PRIVATE_PHONE');
expect(new TextDecoder().decode(serializeVcard(p))).not.toContain('PRIVATE_PHONE');
expect(p).not.toHaveProperty('recipientId');
expect(await digestProjection(changedProjection)).not.toBe(oldConfirmation.digest);
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/sharing.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 新建对象而非隐藏字段；所有输出只消费投影。验证 assets、EXIF、SVG 拒绝、5 MiB；文件/vCard 正确转义换行，测试恶意 vCard 行注入。图片验证未选字段不渲染且元数据为空，图片内容与投影一致。共享确认绑定实际内容与动作。
- [ ] **Step 4: 验证。** npm run test -- tests/unit/sharing.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A12；digest-invalidated、vcard-injection、EXIF 与未选资源负例。 更新 docs/verification/a04.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add allowlisted share projection and exports。

### Task A05: 匿名 API、云端上下文与清理
**Depends on:** A01。
**Files:** Create/modify src/server/session.ts、src/server/quota.ts、src/server/store.ts、src/server/cleanup.ts、src/server/router.ts、src/app/v1/[...segments]/route.ts、src/modules/consent/cloud.ts、src/server/providers/llm.ts。Test: tests/integration/cloud-boundary.test.ts。
**Interfaces:** Session={id:string,expiresAt:string}；createSession(): Promise<Session>；authorizeContext(input: ApprovedCloudContext): Promise<void> 校验内容 digest；JobStore.create(ownerId,input)/get(ownerId,jobId)/delete(ownerId,jobId)/purgeExpired(now)；LLMProvider.proposeFacts(context): Promise<unknown>、plan(input: PlanningInput): Promise<unknown>，PlanningInput 在 A08 定义的同名域接口提前声明。

- [ ] **Step 1: 写目标失败测试。** 在 tests/integration/cloud-boundary.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
await expect(store.get(otherSession.id, jobId)).rejects.toMatchObject({code:'PERMISSION_DENIED'});
await expect(authorizeContext(changedContext)).rejects.toMatchObject({code:'PERMISSION_DENIED'});
await store.purgeExpired(nowAfter24Hours);
expect(await store.has(jobId)).toBe(false);
expect(capturedLogs).not.toContain('PRIVATE_SENTINEL');
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/integration/cloud-boundary.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 同源 Secure/HttpOnly/SameSite session、CSRF/Origin、输入限制、配额、稳定错误码；跨 owner API 返回 404。应用提案 24h 清理、主动删除、失败重试（cleanup-retry）不复活任务。SQLite 存储适配独立，日志不记录正文/token。LLM 未配置明确不可用；API 返回 JSON schema 校验。
- [ ] **Step 4: 验证。** npm run test -- tests/integration/cloud-boundary.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A05/16/17；记录清理调度方式，部署未配置则运行测试但不宣称定时清理已在线。 更新 docs/verification/a05.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add anonymous cloud boundary and retention。

### Task A06: 本人对话与事实确认
**Depends on:** A02,A05。
**Files:** Create/modify src/modules/self/context.ts、src/modules/self/facts.ts、src/modules/self/chat.tsx、src/app/prepare/page.tsx。Test: tests/unit/self-facts.test.ts。
**Interfaces:** detectSensitiveText(text: string): Array<{start:number,end:number,kind:string}>；buildCloudContext(text: string, facts: ConfirmedSelfFact[], approval: CloudContextApproval): ApprovedCloudContext；confirmSelfFact(candidate: CandidateSelfFact, editedText: string, now: string): ConfirmedSelfFact；proposeSelfFacts(context: ApprovedCloudContext): Promise<CandidateSelfFact[]>。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/self-facts.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
expect(detectSensitiveText('Contact me: demo@example.org').length).toBeGreaterThan(0);
expect(await factsStore.list()).toHaveLength(0);
await confirmInUI(candidate);
expect((await factsStore.list())[0]).toMatchObject({text:candidate.text,revision:1});
expect(lastRequestBody).not.toHaveProperty('profile');
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/self-facts.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 短对话、实际发送文本预览、疑似敏感替换、用户确认后本地写入。逐次选择最小职业摘要，不自动附全部历史；确认 facts 和 AI 建议分开。敏感表单只调用 vault；拒绝云端许可仍可使用手动名片。
- [ ] **Step 4: 验证。** npm run test -- tests/unit/self-facts.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A04/05；误检允许编辑/替换后继续，不承诺检测所有敏感信息。 更新 docs/verification/a06.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add guided self facts and context approval。

### Task A07: 单人公开研究与消歧
**Depends on:** A05。
**Files:** Create/modify src/modules/research/service.ts、src/modules/research/evidence.ts、src/server/providers/research.ts、src/server/fetch-public.ts、src/modules/research/panel.tsx。Test: tests/integration/research.test.ts。
**Interfaces:** ResearchProvider.search(query: string): Promise<ResearchSource[]>；fetchPublic(url: string): Promise<{text:string,url:string}>；ResearchService.start(ownerId: string,input: RecipientInput,context: InteractionContext): Promise<{jobId:string,state:ResearchState}>；confirmIdentity(ownerId,jobId,candidateId): Promise<void>；cancel(ownerId,jobId): Promise<void>；result(ownerId,jobId): Promise<RecipientResearch>。

- [ ] **Step 1: 写目标失败测试。** 在 tests/integration/research.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
await expect(fetchPublic('https://127.0.0.1/')).rejects.toMatchObject({code:'INVALID_REQUEST'});
expect(await sameNameCase()).toMatchObject({state:'needs_confirmation'});
await service.cancel(ownerId, jobId);
await deliverDelayedProviderResponse(jobId);
expect(await jobState(jobId)).toBe('cancelled');
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/integration/research.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** HTTPS、解析和连接地址验证、私网/重定向/DNS rebinding/超时/2 MiB。10 来源/5分钟预算和取消，来源分类/时间、同名与冲突、用户提供信息未核验标签；网页指令注入不执行。stale-job-result 不覆盖取消/切换状态。A 无 PDF 或活动批处理。
- [ ] **Step 4: 验证。** npm run test -- tests/integration/research.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A06/07；网络安全使用受控 resolver/transport 测试，不能只测试 URL 字符串。 更新 docs/verification/a07.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add single recipient evidence research。

### Task A08: 表达策略与合法 AI Recipe
**Depends on:** A06,A07。
**Files:** Create/modify src/modules/strategy/assess.ts、src/modules/strategy/plan.ts、src/modules/strategy/validate.ts、src/modules/strategy/panel.tsx。Test: tests/unit/strategy.test.ts。
**Interfaces:** PlanningInput={context:InteractionContext,research:RecipientResearch,approvedContext:ApprovedCloudContext}；assessRecipient(input: PlanningInput): RelevanceAssessment；planStrategy(input: PlanningInput,provider: LLMProvider): Promise<{strategy:ConnectionStrategy,recipe:CardRecipe}>；validatePlan(value: unknown,input: PlanningInput): {strategy:ConnectionStrategy,recipe:CardRecipe}。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/strategy.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
expect(firstPlan.strategy.proofPointIds).toContain('fact_robotics');
expect(secondPlan.strategy.proofPointIds).toContain('fact_community');
expect(() => validatePlan(inventedAchievementPlan, input)).toThrow();
expect(() => validatePlan(crossRecipientPlan, input)).toThrow();
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/strategy.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 单人相关性、重点/理由/证据、最多两问、下一步、不匹配与未知。本人事实限已确认/当次批准 ID，Recipe 敏感字段拒绝。已有事实与草稿文案区分；结构检查不能替代语义，真实模型人工抽查留到 A12。没有证据可受限方案/verify_first，不虚构 success probability。
- [ ] **Step 4: 验证。** npm run test -- tests/unit/strategy.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A08/09；两场景 fixture 是确定性基线，不等于真实模型效果证据。 更新 docs/verification/a08.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add grounded expression strategies。

### Task A09: 本地批准、合成与按人保存
**Depends on:** A03,A08。
**Files:** Create/modify src/modules/consent/local.ts、src/modules/consent/panel.tsx、src/modules/card/compose.ts、src/modules/prepared/store.ts、src/modules/prepared/library.tsx、src/app/cards/page.tsx。Test: tests/unit/prepared.test.ts。
**Interfaces:** checkGrant(grant: ConsentGrant,request: {profileId:string,deviceId:string,cardId:string,fields:FieldRef[],identity:Array<'name'|'company'|'role'>,assetIds:string[],purpose:string,operation:'compose_local'},now: string): void；composeDraft(config: CardConfig,grant: ConsentGrant,vault: Vault): Promise<LocalDraft>；PreparedStore.save(config: CardRecipe,label: PrivateCardLabel,revision:number)/find(query:string)/markStale(profileRevision:number)。所有 vault 读取先通过 broker 校验对应字段/identity/assets，而不是直接信任 config。

- [ ] **Step 1: 写目标失败测试。** 在 tests/unit/prepared.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
expect(() => checkGrant(expiredGrant, request, now)).toThrow();
await expect(composeDraft(recipe, revokedGrant, vault)).rejects.toThrow();
expect(JSON.stringify(projectShare(draft, selection))).not.toContain(privateLabel);
expect((await preparedAfterProfileEdit).status).toBe('stale');
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/unit/prepared.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** Grant 字段/identity/asset/device/用途/时间/卡片范围全校验，默认15分钟；先批准方案才合成。标签默认私有、公开寄语独立选择；资料改动标 stale；stale-recipient-proposal 拒绝身份切换前的异步提案。手动名片直接操作不引入云端或虚假 Strategy。
- [ ] **Step 4: 验证。** npm run test -- tests/unit/prepared.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A10/11；旧发布快照不会被本地更新静默修改。 更新 docs/verification/a09.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add scoped composition and prepared cards。

### Task A10: 公开快照、撤下与到期
**Depends on:** A04,A05,A09。
**Files:** Create/modify src/modules/publication/service.ts、src/modules/publication/store.ts、src/modules/publication/panel.tsx、src/app/p/[publicId]/page.tsx。Test: tests/integration/publication.test.ts。
**Interfaces:** publishCard(projection: ShareProjection,confirmation: ShareConfirmation,idempotencyKey: string): Promise<PublicationReceipt>；readPublication(publicId: string): Promise<ShareProjection>；revokePublication(publicId: string,revokeToken: string): Promise<void>；expirePublications(now: string): Promise<number>。

- [ ] **Step 1: 写目标失败测试。** 在 tests/integration/publication.test.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
const retries = await publishTwiceSameKey();
expect(retries.first.publication.publicId).toBe(retries.second.publication.publicId);
await expect(publishCard(changedProjection, oldConfirmation, 'key')).rejects.toThrow();
await expect(revokePublication(publicId, 'wrong-token')).rejects.toThrow();
await expirePublications(after30Days);
await expect(readPublication(publicId)).rejects.toMatchObject({code:'EXPIRED'});
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test -- tests/integration/publication.test.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 只接受投影与匹配确认；服务端 schema/大小校验；独立撤下 token 散列、随机 publicId。30d 默认到期、主动撤下、幂等键绑定 owner+请求digest，内容冲突不复用错误快照。默认通用 OG，no-store，不提供 recipient-only 标签。发布管理凭证不在 URL、日志、一般资料备份中；丢失明确说明。
- [ ] **Step 4: 验证。** npm run test -- tests/integration/publication.test.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A13/17；publish-digest-mismatch、wrong-owner-idempotency；未经明确部署指令只本地验证。 更新 docs/verification/a10.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add deliberate publication lifecycle。

### Task A11: 接收、回赠与离线降级
**Depends on:** A10。
**Files:** Create/modify src/modules/sharing/receiver.tsx、src/modules/sharing/import.ts、src/modules/sharing/native.ts、src/pwa/service-worker.ts、src/pwa/cache-policy.ts、src/app/manifest.ts。Test: tests/e2e/exchange.spec.ts。
**Interfaces:** importSharedCard(bytes: Uint8Array): Promise<ShareProjection>（schema 校验后存 receivedCards，不覆盖本人）；shareViaOS(projection: ShareProjection): Promise<'shared'|'cancelled'|'fallback'>；cachePreparedCard(draft: LocalDraft): Promise<void> 仅将已授权资源按本地 vault 规则保存。

- [ ] **Step 1: 写目标失败测试。** 在 tests/e2e/exchange.spec.ts 中用 schema-valid fixture arrange，落实以下断言及本任务明确的负例：
```ts
await page.goto(localRecipientUrl);
await expect(page.getByRole('button',{name:'回赠我的名片'})).toBeVisible();
await page.getByRole('button',{name:'回赠我的名片'}).click();
await expect(page.getByLabel('展示名称')).toBeVisible();
expect(cachePolicy('/p/public-demo')).toBe('network-only');
expect(cachePolicy('/v1/publications/public-demo')).toBe('network-only');
```
- [ ] **Step 2: 验证有意义的失败。** Run: npm run test:e2e -- tests/e2e/exchange.spec.ts。Expected: 对未实现行为失败，而非依赖/语法错误；A01 先建立测试 runner 后观察 schema 行为失败。
- [ ] **Step 3: 实现本任务接口。** 接收者免注册保存/回赠，安全导入不执行 HTML/SVG。PWA 只缓存应用壳和静态模板，公共接收页/API 不缓存；敏感本地准备数据保持加密。离线本地取卡/导出，分享取消不报成功，不支持则下载/复制。错浏览器显示恢复路径，无静默同步。
- [ ] **Step 4: 验证。** npm run test:e2e -- tests/e2e/exchange.spec.ts；npm run typecheck。Expected: 全部 exit 0；相关行为断言通过，不把 mock 当真实联调。
- [ ] **Step 5: 记录与提交。** AC-A14/15；no-publication-service-worker-cache、离线已准备卡片、另一浏览器恢复、取消。 更新 docs/verification/a11.md。只 stage 本任务文件并检查 git diff --cached --check，再 commit: feat: add guest exchange and offline fallback。

### Task A12: 完整验收、真实服务和试点证据
**Depends on:** A00–A11。
**Files:** Create tests/e2e/personalization.spec.ts、tests/live/providers.test.ts、docs/verification/phase-a-report.md、docs/verification/deployment-checklist.md；Modify 发现问题所在模块（不做无关重构）。
**Interfaces:** 消费 A01–A11 的真实 UI/API；live suite 使用环境配置，不将测试密钥写入文件。输出明确的 G-A0–G-A3 判定。
- [ ] 写端到端：基础免注册 → 本人事实确认 → 一个接收人研究 → 策略批准 → 本地字段授权 → 最终分享确认 → 接收/回赠；断言研究/云端请求无敏感哨兵、接收页无未选字段/策略/私有标签。
- [ ] 运行 npm run test:e2e -- tests/e2e/personalization.spec.ts，记录实际失败并按责任层修复；已通过不为形式制造失败。
- [ ] 运行 npm run typecheck、npm run lint、npm run test、npm run test:e2e、npm run build；全部 exit 0 才记录自动化通过。
- [ ] 明确配置授权后运行 opt-in live suite，验证真正的来源/引用/错误/超时/成本；人工抽查本人事实和来源蕴含。无配置标 BLOCKED，不运行会意外计费的默认测试。
- [ ] 完成 retention-evidence：验证应用 24h/30d 清理、删除失败重试、供应商实际政策和托管备份保留；部署清单与日志不含 PII。
- [ ] 真机检查桌面浏览器、手机 Safari/Chrome、目标聊天内置浏览器；无设备标 NOT RUN。测试分享取消、另一存储分区、撤下后打开、reduced-motion。
- [ ] 征得试用者同意后记录首次耗时、表达方案修改理由、接收者是否理解突出特点，不加入追踪代码；未经部署/发送授权不发布或发真实消息。
- [ ] 汇总 AC-A01–18 实际证据、剩余缺陷、外部阻塞、成本与下一步；修复提交只含必要模块，最终 docs: record phase A verification。缺关键证据时 G-A3 仍未完成。

## 自检与交接
覆盖：FR-A01→A03/A11；A02→A02；A03→A06；A04→A05/A06；A05→A07；A06→A08；A07/A08→A09；A09→A04/A10/A11；A10→A03/A11；A11→A05/A10；A12→A12。
五项 Review Focus 均有明确测试归属。计划级代码片段为断言示意，fixture 的 setup 在对应任务补齐，不是当前可执行测试证据。
B/C 另行细化，A 不扩功能。执行方式尚未选择；后续可由本会话逐项实施，或用户选择分任务代理实施。当前请求只更新文档和计划，不启动产品实现。
