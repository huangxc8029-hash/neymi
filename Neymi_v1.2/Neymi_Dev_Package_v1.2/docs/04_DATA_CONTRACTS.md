# Domain & Data Contracts v1.3
以下为实施目标，A01 应实现 TypeScript strict + Zod 等运行时验证。没有现成 schemas/ 或验证脚本，不能引用它们为已完成证据。

## 1. 通用标识
所有 ID 为不可猜测 opaque string；ISOTime 为 UTC ISO 时间，UI 按用户时区显示。实体/备份/快照有 schemaVersion。枚举和未知字段严格校验，不把模型数据直接 spread 到实体。
沿用 v1.2 研究类型字段，新增项与语义如下；完整实现按此契约，不读取 legacy 作为当前接口。

```ts
type ID = string;
type ISOTime = string;
type KnowledgeKind = 'fact'|'explicit_preference'|'inference'|'unknown';
type ResearchState = 'queued'|'researching'|'needs_confirmation'|'ready'|'partial'|'failed'|'cancelled';
type Motion = 'float'|'keys'|'orbit';
type Layout = 'editorial'|'constellation'|'ribbon';
type FieldRef = { moduleId: ID; itemId: ID };
interface UserGoal { id: ID; goalType: 'fundraise'|'sales'|'partner'|'research'|'social'|'other'; specificAsk: string; }
interface InteractionContext { id: ID; scenario: string; goal: UserGoal; eventId?: ID; }
interface RecipientInput { kind: 'text'|'public_url'; value: string; contextId: ID; }
interface Recipient {
 id: ID; displayName: string; organization?: string; role?: string;
 eventId?: ID; identityStatus: 'verified'|'ambiguous'|'unverified';
}
interface ResearchSource {
 id: ID; url?: string; title: string; origin: 'official'|'primary'|'reputable_news'|'other'|'user_provided';
 accessedAt: ISOTime; publishedAt: ISOTime|null; excerpt: string;
}
interface ResearchClaim {
 id: ID; recipientId: ID; kind: KnowledgeKind; claim: string; sourceIds: ID[];
 confidence: 'high'|'medium'|'low'|'unknown'; checkedAt: ISOTime; conflictWithClaimIds?: ID[];
}
interface RecipientResearch {
 recipient: Recipient; state: ResearchState; sources: ResearchSource[]; claims: ResearchClaim[]; warnings: string[];
}
interface CandidateSelfFact { id: ID; text: string; category: string; origin: 'user_text'|'ai_extracted'; }
interface ConfirmedSelfFact extends CandidateSelfFact { confirmedAt: ISOTime; revision: number; }
interface ProfileItem {
 id: ID; label: string; value: string; valueKind?: 'text'|'phone'|'email'|'address'; sensitivity: 'ordinary'|'sensitive'; confirmedFactId?: ID;
}
interface ProfileModule { id: ID; kind: string; title: string; items: ProfileItem[]; }
interface LocalProfile {
 schemaVersion: 1; id: ID; revision: number;
 identity: { name?: string; company?: string; role?: string };
 modules: ProfileModule[]; facts: ConfirmedSelfFact[]; assets: LocalAsset[];
}
interface LocalAsset { id: ID; mime: 'image/png'|'image/jpeg'|'image/webp'; bytes: Uint8Array; }
interface CloudContextApproval {
 id: ID; contextId: ID; contentDigest: string; purpose: string; approvedAt: ISOTime;
}
interface ApprovedCloudContext {
 approval: CloudContextApproval; text: string; factIds: ID[];
 moduleMetadata: Array<{ id: ID; kind: string; label: string }>;
}
interface RelevanceAssessment {
 id: ID; recipientId: ID; goalId: ID; result: 'qualified'|'uncertain'|'not_recommended';
 evidenceQuality: 'strong'|'mixed'|'insufficient';
 positives: Array<{ reason: string; claimIds: ID[] }>;
 misfits: Array<{ reason: string; claimIds: ID[] }>; openQuestions: string[];
}
interface ConnectionStrategy {
 id: ID; recipientId: ID; goalId: ID; contextId: ID; assessmentId: ID;
 recommendation: 'prepare_introduction'|'verify_first'|'no_outreach_recommended';
 recommendedFocus: string; whyMeet: string; whyTheyMayCare: string; mainPoint: string;
 proofPointIds: ID[]; recipientClaimIds: ID[];
 selectionReasons: Array<{ proofPointId: ID; claimIds: ID[]; reason: string }>;
 openingLine: string; openingQuestions: string[]; suggestedNextStep: string;
 misfitRisks: string[]; uncertainties: string[]; confidence: 'high'|'medium'|'low'; createdAt: ISOTime;
}
interface ModuleRef { localModuleId: ID; kind: string; emphasis: 'high'|'normal'|'low'; }
interface BaseCardConfig {
 schemaVersion: 1; id: ID; label: string; templateId: string; layout: Layout; animation: Motion;
 orderedModules: ModuleRef[]; createdAt: ISOTime; updatedAt: ISOTime;
}
interface ManualCardConfig extends BaseCardConfig { kind: 'manual'; }
interface CardRecipe extends BaseCardConfig {
 kind: 'ai'; strategyId: ID; goalId: ID; contextId: ID; recipientId: ID; eventId?: ID;
 headlineDraft?: string; introDraft?: string; missingProofPointIds: ID[];
 status: 'proposed'|'ready'|'stale'|'archived';
}
type CardConfig = ManualCardConfig | CardRecipe;
interface PrivateCardLabel { cardId: ID; recipientLabel: string; scenario: string; }
interface ConsentGrant {
 grantId: ID; profileId: ID; deviceId: ID; operation: 'compose_local';
 purpose: string; cardIds: ID[]; allowedFields: FieldRef[]; allowedIdentity: Array<'name'|'company'|'role'>;
 allowedAssetIds: ID[]; createdAt: ISOTime; expiresAt: ISOTime; revokedAt?: ISOTime;
}
interface LocalDraft {
 id: ID; profileRevision: number; config: CardConfig;
 identity: LocalProfile['identity']; modules: ProfileModule[]; assets: LocalAsset[];
}
interface ShareSelection {
 identity: Array<'name'|'company'|'role'>; fields: FieldRef[]; assetIds: ID[];
 publicDedication?: string;
}
interface ShareProjection {
 schemaVersion: 1; format: 'ncard-public-share';
 identity: { name?: string; company?: string; role?: string };
 modules: Array<{kind: string; title: string; items: Array<{label: string; value: string}>}>;
 assets: Array<{mime: LocalAsset['mime']; base64: string}>;
 templateId: string; layout: Layout; animation: Motion; publicDedication?: string;
}
interface ShareConfirmation {
 digest: string; action: 'file'|'image'|'vcard'|'publish'; confirmedAt: ISOTime;
}
interface Publication {
 publicId: ID; url: string; createdAt: ISOTime; expiresAt: ISOTime; revokedAt?: ISOTime;
}
interface PublicationReceipt { publication: Publication; revokeToken: string; }
```

## 2. 验证不变量
- AI recipe 必须解析到同一接收人的有效 Strategy，引用的模块和事实在已批准上下文中；手动配置不要求 strategyId，也不能伪装 AI 成果。
- Recipient.eventId 可缺省，A 不创建虚假活动；B 才加入活动与排名对象。
- 事实/明确偏好 sourceIds 非空且同任务可解析；公开核验来源须有可访问 URL；用户提供文字可无 URL，必须标 user_provided。不能仅凭 sourceId 存在宣称核验完毕。
- openingQuestions 最多 2；未知枚举、跨人/跨任务引用、未知字段、敏感 recipe 值拒绝。
- confirmedFactIds 必须真实经用户确认；修改生成新 revision。新事实不自动取得云端使用权。
- LocalProfile 是设备上的逻辑对象；持久化普通/敏感分区，不序列化整对象发云端。LocalDraft 只包含当前 grant 允许的值。
- 联系字段默认 sensitive，即使用户修改 label 也不能绕过类型；普通文本中的敏感检测只是补充。
- 投影新建对象，不带 profileId、recipientId、模块内部 ID、私有标签、Strategy、Grant；图片无 EXIF。未选 identity/字段/资源绝不出现。
- 公开发布与导出用相同投影；ShareConfirmation.digest 必须匹配当前实际字节，内容变更需重新确认。
- AI 草稿不当作本人事实；公开寄语用户批准且单独进入投影，不把私有标签直接复制过去。

## 3. 存储与演进
本地 profiles/publicItems、encryptedVault、confirmedFacts、configs、strategies、privateLabels、grants、receivedCards、publicationReceipts。保险库只有解锁时才拼出敏感视图。
研究端 sessions、jobs、sources、claims、assessments、proposals，24 小时过期；发布端 publications 单独保存快照、到期、撤下凭证散列，不联结研究数据画像。
导入/备份实施版本迁移和原子失败；旧版本不明时拒绝而非覆写。v1.2 event-pilot.json 为场景种子而非本契约有效对象；A01 建合法 fixture 与非法样例，禁止将虚构 URL 当实时来源。

## 4. Activity Preparation（B）
活动准备对象在本地使用；每场最多 20 位候选人，嘉宾身份需逐人由用户确认后方可生成方案。活动来源保留 `kind`、标题、可选 HTTPS URL、抓取时间和最多 20,000 字的纯文本摘录。PDF 仅提取最多 60 页、10 MiB 文件中的文本，不运行文档脚本；扫描件/OCR 暂不支持。显式读取网页时使用 A07 的 HTTPS/SSRF 安全抓取，响应不持久化。活动来源中的指令一律作为不可信文本，已识别的提示注入拒绝进入方案。

批量方案按同一 `eventId` 隔离接收人：每人独立调用 Strategy/Recipe 验证，未知阶段维持 `uncertain/verify_first`，不允许以宣传性文案提级；明确不匹配和未知候选不进入优先排名。单人失败返回脱敏错误，不中断其他人；客户端按候选人及已批准输入指纹在本地复用结果。API 每个匿名会话最多处理 20 位/小时，支持请求取消，并在取消后停止后续人员。本人云端上下文按次预览、授权和敏感信息检测；批量 AI 请求可见地包含活动目标、选定本人事实/文本和候选人介绍。活动资料、草案和自愿跟进笔记保存在当前浏览器；不自动外联或发送消息。

## 5. Messaging Handoff（C）

Webhook adapters verify a provider's signature against the exact raw request bytes, enforce a timestamp window, normalize only an opaque event ID and allowlisted event type, and claim each event ID once. Raw webhook bodies and message text are not persisted. The included `fixture-hmac` adapter is test-only and uses `x-neymi-timestamp`, `x-neymi-event-id`, and `x-neymi-signature`; it is not an official messaging provider implementation.

A handoff ticket stores only a hash and a public publication ID. It expires within five minutes, can be consumed once by a same-origin POST, and is placed in a URL fragment so preview fetches do not send or consume it. The ticket opens only a currently active, already-public card; it does not grant access to a private strategy or device vault. The app does not send messages automatically. If the in-app browser lacks the original local vault, private drafts remain available in the browser where they were created; no automatic sync is implied.
