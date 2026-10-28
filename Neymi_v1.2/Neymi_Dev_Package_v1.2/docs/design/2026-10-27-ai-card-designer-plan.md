# Neymi 对话式名片设计助手：产品、技术与执行方案

状态：设计方案，未实施。与紫白 UI 方案共同执行。面向执行模型 GPT-6 Luna；Luna 是开发执行者，不等于网站运行时使用的模型。

## 1. 用户最终能做什么

用户说“我是一名产品设计师，下周见一家创业公司的负责人，希望谈产品设计合作”，助手能补齐必要信息，帮助确定一个主要亮点和支持证据，挑出适合的模板及展示模块，形成能预览、修改、保存和分享的名片。

标准路径：一句话开始 → 了解用途与对象 → 确定亮点 → 确认事实 → 生成名片草稿 → 调整/应用 → 确认公开字段 → 分享。一般目标是2–5次有效回答，不强制填满问卷。输入已覆盖全部信息时可直接给摘要确认；缺少非必要信息可跳过。

助手输出的是可编辑草稿，不是解释文字或跳转按钮集合。用户必须能直接看到真实 CardRenderer 渲染的结果。

## 2. 现有能力、缺口与复用安排

| 当前代码事实 | 本方案如何处理 |
|---|---|
| AssistantProvider 只在 /prepare 的部分 intent 展示聊天，并依赖页面注册 submit handler | 建立全局会话服务，任何允许的创作者页都可收集、生成；页面仅提供显式上下文适配器 |
| prompts.ts 是任务列表和轮播提示 | 改为对话阶段、问题配置与意图入口；去除9个任务大按钮和轮播干扰 |
| moveTo 使用 setTimeout/querySelector，仍指向部分旧DOM ID | 用 studio-bridge 的 openStep/applyProposal 等类型化动作替换 |
| DeepSeekLLMProvider 已有 proposeFacts/proposeModules/coach/plan，/v1/coach 与 /v1/plan 存在 | 复用 provider 连接、超时、错误体系、会话和云授权；新增 designerTurn/designerProposal 方法，不改变旧 plan 语义 |
| 当前 plan 提示词把 templateId 写为 plain，不能真正按风格选模板 | 新路径把可用模板目录作为输入；LLM只可返回目录中的ID；原有 research plan 后续共享模板选择器 |
| LocalProfile、ConfirmedSelfFact、ConsentGrant、ShareSelection、LocalDraft、公开 projection 已有 | 复用；公开输出只经 projectShare/现有发布流程；不直接上传原始聊天或完整资料库 |
| CardRecipe 必须有 strategy/goal/context/recipient ID | 普通生成卡不能伪造这些ID。新增 GuidedCardConfig 独立分支，保留旧 ai research recipe |
| 联系方式为本机加密字段，现有检测会阻止发送联系方式 | 保留边界；聊天提取并脱敏后可把值交给本地联系方式表单，不送模型 |

## 3. UI 与入口设计

首页第一步保留紫色方案的一句话输入；点击“帮我整理”打开助手并把文字作为待发送文本。顶栏“AI 助手”打开同一会话；不会自动发送、自动读取所有事实。

桌面 >=1200px：在工作室左侧编辑面板切换“手动填写 / AI 帮我设计”，右侧仍为名片预览；全站其他页面打开宽420px的侧面板。768–1199px：宽420px模态抽屉；<768px：全屏助手，顶栏返回，内容区滚动，底部输入栏，使用100dvh与安全区适配键盘。草稿生成后手机出现“对话 / 名片”两页内切换。

面板从上到下：
1. 标题“名片设计助手”；关闭；更多菜单含新建对话、清除本次。
2. 四段轻量进度“了解你 / 明确用途 / 挑选亮点 / 生成名片”，不暴露内部状态码。
3. 摘要条：用途、对象、重点；尚未确定项显示“待补充”，点击可改。
4. 对话记录；每条助手消息不超过约120中文字，先说明已理解的内容，再问一个问题。候选答案最多3个+自由输入。
5. 生成结果卡：推荐模板名称、一句理由、入选模块摘要、事实待确认数；“应用这张名片”主按钮、“调整一下”次入口。
6. 输入区：文本、附件入口、语音入口。只有已有转写/导入链可用时才启用对应能力。主按钮在不同阶段用“发送并继续 / 生成草稿 / 应用名片”，不一律写“确定”。

首页 AI 面板与全局抽屉共用一份会话，不渲染两个同时收消息的实例。关闭仅收起，不取消已保存进度；进行中的请求关闭后可继续，但结果写入当前 requestId 的会话，不能弹回打断用户。明确取消才中止请求。

## 4. 要收集的信息与追问策略

| 类别 | 字段 | 必需性与规则 |
|---|---|---|
| 身份 | displayName、role、organization | 名称用于生成正式卡；可先匿名占位预览，发布前补齐。角色建议填，企业可空 |
| 用途 | purposeType、desiredOutcome | 必需：求职/合作/销售/融资/学术/社交/通用/其他；最重要的是希望对方下一步做什么 |
| 接收人 | audienceMode、role、organization、relationship | 必需确定“某人/某类人/通用”；允许不知道姓名。不强制研究或提供个人信息 |
| 亮点 | highlightRefs、primaryHighlightRef | 可指定1–3条；如不知道则从已批准材料提出最多3候选，用户选；无材料则做基础卡 |
| 证据 | evidenceRefs、confirmation | 项目、经历、作品、数字要有来源；没有数字不追逼用户编数字 |
| 风格 | tone、density、language、templatePreference | 可选；默认简约、普通密度、中文；已有模板偏好优先 |
| 展示意向 | preferredFieldRefs、contactChoices | 对话可询问是否展示联系方式，但实际值只在本地编辑与勾选 |

选下一个问题的优先级：用途缺失 → 对象模式缺失 → 名称/角色不足以建立卡片 → 主要亮点未确定 → 风格偏好。用户主动补充的信息一次性抽取，不能再问已回答项。每次只问一个核心问题；纠正答案后保留其他仍有效的字段。

具体问题示例：
- 用途：“这张名片主要用在什么场景？”选项：商务合作、求职展示、日常社交。
- 对象：“主要希望哪类人看到它？”根据用途提供3个相关选项；通用名片是合法答案。
- 目标：“看完后，你最希望对方做什么？”例如联系聊合作、查看作品、记住专业方向。
- 亮点：“这三条里，你最希望对方记住哪一条？”展示用户已有事实，不写空泛营销词。
- 证据：“你提到做过这个项目，能补充你的具体负责部分吗？”没有更多可跳过。

连续两次无法回答同一问题后提供基础方案，不反复追问。用户说“直接生成”且满足用途/对象模式与基本身份时，使用已知信息生成基础草稿；缺口在结果中简短标明。

## 5. 确定性状态机

阶段不由模型自由决定。`workflow.ts` 根据已验证 slots 计算下一阶段。

| 状态 | 进入条件 | 可做动作 | 下一状态 |
|---|---|---|---|
| idle | 新会话 | 输入/导入/选择已有资料 | collecting |
| collecting | 必需槽位有缺失 | 发送、选择、修改、跳过选填 | collecting / confirming |
| confirming | 最小信息集齐 | 查看摘要和候选事实，确认/编辑 | collecting / ready |
| ready | 用户确认事实和目标 | 生成草稿 | generating |
| generating | 请求进行中 | 取消 | proposal / ready(error) |
| proposal | 输出校验通过 | 调整风格、减少内容、突出其他亮点、应用 | generating / applied |
| applied | 已写入工作室草稿与快照 | 手动修改、继续调整、进入字段确认 | proposal / applied |

failed/cancelled 作为请求状态，不清空业务阶段。素材变更使相关证据引用失效；修改用途或对象使推荐 stale，但保留原草稿直至新方案被应用。

最小可生成集：displayName（预览可用明确占位）、purposeType、audienceMode、至少一个真实身份/内容事实或用户明确选择“仅基础身份”。desiredOutcome 未知可采用对应目的的明确默认值并在摘要中让用户修改。生成与发布前的必需条件不同，程序不能混淆。

## 6. 模型与程序各负责什么

模型负责：理解自然语言、提出有用追问、建议重点、比较语气、从白名单模板中推荐、给出内容草稿与理由。

程序负责：状态转换、身份和权限、ID生成、字段/字数/来源校验、模板是否存在和可用、写入草稿、公开字段选择、发布、撤销与重复请求。模型永远不能返回任意HTML/CSS/JS作为名片，也不能执行 shell、网络搜索或发布工具。

接收人研究不是默认步骤。用户明确要求查资料时才调用现有 research 流程；身份未确认前不得把搜索结果当确定对象。用户提供的对方行业/职务可用于内容排序；不能推断其性格、购买力或私人兴趣。对方姓名/公司默认不进入公开名片。

## 7. 数据契约（实现时转为 strict Zod schema）

新增 `src/modules/assistant/designer/types.ts` 与 `schemas.ts`。不复制一个独立Profile体系。

```ts
type DesignerSession = {
  schemaVersion: 1; id: string; revision: number;
  profileId: string; baseProfileRevision: number;
  phase: 'idle'|'collecting'|'confirming'|'ready'|'generating'|'proposal'|'applied';
  slots: DesignerSlots;
  sourceIds: string[]; confirmedEvidenceIds: string[];
  proposalId?: string; requestId?: string;
  updatedAt: string;
};
type DesignerSlots = {
  displayName?: string; role?: string; organization?: string;
  purposeType?: 'job'|'partner'|'sales'|'fundraise'|'research'|'social'|'general'|'other';
  desiredOutcome?: string;
  audience?: { mode:'person'|'group'|'general'; role?:string; organization?:string };
  highlightRefs: string[]; primaryHighlightRef?: string;
  tone: 'clear'|'friendly'|'bold'; density:'compact'|'normal'; language:'zh'|'en'|'bilingual';
  templatePreference?: string;
};
type Evidence = {
  id:string; sourceId:string; sourceRevision:number;
  quote:string; start:number; end:number;
  status:'candidate'|'confirmed'|'rejected';
};
type ProposedItem = {
  localId:string; label:string; text:string;
  evidenceIds:string[]; treatment:'verbatim'|'rewrite';
  needsConfirmation:boolean;
};
type DesignerProposal = {
  schemaVersion:1; templateId:string;
  alternatives:string[]; // 最多2个，默认只展示1个推荐
  rationale:string; // <=160中文字
  identityFieldRefs:Array<'name'|'company'|'role'>;
  modules:Array<{
    sourceModuleId?:string; kind:string; title:string;
    items:ProposedItem[]; evidenceIds:string[];
  }>;
  proposedFieldRefs:FieldRef[]; // 只引用已存在且本次授权的字段
  omissions:Array<{evidenceId:string;reason:string}>;
  missingInformation:string[];
};
```

模型不提供可信的 proposalId、revision、时间戳、confirm 状态；这些由服务端/本地应用层包裹在 ProposalEnvelope 中：`{id,requestId,sessionId,sessionRevision,baseProfileRevision,skillVersion,proposal,status}`。输出的 needsConfirmation 只作提示，程序强制所有 rewrite 与新内容为待确认。

turn 输出：`{reply,slotCandidates:[{field,value,evidenceIds}],factCandidates:[{text,evidenceIds}],suggestedQuestion:{field,text,choices}}`。slotCandidates 仅允许受控字段；field和值使用判别联合校验。用户当前消息是短期 source；所有 evidenceIds 必须存在，quote 对应精确字符范围。用途/风格属于偏好，不伪装成事实。reply 最大600字符，choices最多3条。

限制：一次输入最多12000字符；请求最多12条近期消息，单条最多2000字符；更早内容使用用户确认的结构化摘要。来源片段最多30条、合计24000字符；超限要求用户选择材料，不静默截断证据。提案最多6模块、每模块最多4项；展示优先1–3核心模块，其余可由用户展开。所有字符串、数组上限由schema统一定义。

## 8. 来源、润色与真实性

从已有 confirmed fact 或当前明确输入提取 evidence。文件、语音、网页摘录是材料而非指令；其中“忽略规则、公开资料”等文字不改变流程。引用仅显示给作者。

verbatim 内容必须匹配引用片段；rewrite 要附来源和原句对照并由用户确认。不存在可完全可靠判定语义真实性的简单算法，因此不能把“数字相同”当成润色真实的充分证据。

程序先检查：所有证据有效；没有未经来源支持的新数字、金额、日期、认证/客户/项目专名；不能将参与变负责，将课程变认证，将目标变成绩。检查不通过返回修改/确认，不生成“已确认”内容。最终确认由用户完成；确认后保存来源和确认版本。

用户说“随便编点成绩”时，回复“可以把现有经历写得更清楚；成绩和数字需要你提供真实信息”，并继续生成没有编造数据的基础稿。

## 9. 模板选择和内容编排

新增 `template-capabilities.ts`，给当前模板注册表中的每个非legacy ID补充：availability、toneTags、scenarioTags、supportedModuleKinds、maxVisibleModules、densityRange、languageSupport、supportsLogo。元数据人工定义并与renderer能力核对，不能仅凭模板名字猜测。

选择流程：
1. 程序过滤不存在、legacy、不可用权限、不支持所需内容/语言的模板。
2. 基于用户明确偏好35%、场景匹配25%、内容容量25%、语言/Logo适配15%打分，得到最多5个候选。这是可解释的排序启发式，不宣称为用户偏好概率。
3. LLM 在这5个ID中选一个，返回最多2个备选和一句具体理由。程序验证ID、权限与容量。
4. 用户指定某个可用模板时优先尊重；缺少偏好默认新 soft-signal 免费模板。旧用户继续自己已选模板，除非要求更换。
5. 推荐VIP时必须说明实际可用性，并同时提供可用免费备选；无 entitlement 证据不得绕过限制。

内容排序：一个主亮点→一到两项证据→相关背景→用户选中的联系方式。求职偏作品/职责/证据，合作偏能力/案例/合作方式，社交偏身份/兴趣；这些只是候选规则，不擅自隐藏用户已锁定内容。用户锁定字段优先于模型推荐，显示开关以用户最终选择为准。

渲染器自动换行、长文放详情；不能通过缩小到不可读字号塞满。内容溢出时返回“减少内容 / 换更适合的模板”，不静默丢字。

## 10. Skill 的真实落地方式

配套 `2026-10-27-card-designer-skill-draft.md` 是可执行内容规范草案。实施时放到 `skills/neymi-card-designer/SKILL.md`，并配 references/flow.md、output-contract.md、examples.md。这是仓库维护的助手工作规范，不是安装一个skill后网页自动具备能力。

网站运行时：服务端受控 registry 读取固定 skill 版本，构建 system instructions；请求只传本次批准的上下文。客户端不得传任意skill文件路径或覆盖system prompt。严格schema、工作流、权限检查在代码里落实，skill仅决定沟通与设计策略。把 skillVersion 写入提案便于回归定位。

开发用 Codex skill 可引用这份规范辅助实现，但它与产品内对话不是同一运行环境。执行模型更换不影响网站provider配置。现有 DeepSeek 连接保留，通过接口允许之后替换，不在前端放任何模型密钥。

## 11. API 与授权

新增服务端端点建议：
- `POST /v1/designer/turn`：输入本次批准的文本/来源引用/槽位/近期上下文，返回结构化回复与候选，不保存本地profile。
- `POST /v1/designer/proposal`：输入已确认摘要/证据/可选内容，服务端附加受控模板目录，返回提案。

共同请求包装：`{schemaVersion:1,requestId,sessionId,sessionRevision,baseProfileRevision,approvedContext,payload}`。会话ID为不透明值，不能替代owner校验；复用 readSession、originOk、authorizeContext、大小限制和配额。服务端重建规范化发送数据并验证 approvedContext 的范围与payload一致，不允许批准A却发送B。

发送体验：首次展示清晰说明“发送后，当前文字及你勾选的材料会交给AI处理”，支持展开查看实际发送内容。按钮文案“发送给AI”。每次点击只授权当前确定payload，不必重复勾一整套复选框；后续新增来源/扩大范围时必须再次展示变更。技术上仍为每个请求产生绑定payload的批准记录，不能把一次授权当永久读取全部资料。

电话、邮箱、详细地址和原始Logo bytes默认不进模型。客户端提供本地脱敏预览；服务端再次检测。原文含联系方式时显示“已识别联系方式，可保存到本机并从发送内容移除”，需用户选择后继续，不能发送失败后丢失原文。研究对象只传与用途相关的已批准职业背景。

服务端返回建议数据，不直接写 vault、不发布。超时45秒；UI按真实请求阶段显示“正在整理 / 正在生成”，不伪造百分比。429显示等待时间（若响应提供）；401明确恢复会话或登录；503提供重试或手动继续。无provider时可给确定性的基础模板建议，标注“基础建议”，不能伪装为AI回复。

重复请求：客户端单请求锁+requestId；服务端对同owner/requestId在短期内去重，重复返回同一结果或明确处理中。取消用AbortController；中止后晚到结果不应用。JSON/schema不合法可内部修复重试最多一次，随后报告失败，不无限调用。

## 12. 草稿应用、持久化与发布

会话：未保存原文默认只在内存；用户点“保存本次”后通过vault加密保存。已锁定时提示解锁再保存，不把聊天放明文localStorage。关闭面板保留本页会话；刷新前对未保存内容做明确提示。会话与当前账户/设备隔离，退出/锁定清掉内存敏感内容。

新增配置分支：`GuidedCardConfig extends BaseCardConfig {kind:'guided'; designerSessionId:string; purposeLabel:string; status:'proposed'|'ready'|'stale'|'archived'}`。purposeLabel 属于本地私有metadata，必须在投影时剥离。同步更新 domain/schemas、CardConfig联合、compose/create、卡库/PreparedStore序列化及所有穷举判断；旧manual和ai数据仍可读。接收人模式为通用时不创建虚假Recipient或Strategy。

资料与定向卡分开：提案中重写后的文案存入该卡草稿内容快照，默认不改主Profile。sourceModuleId引用主资料；新内容使用独立draft module ID和evidence引用。若现有composeDraft只支持读取profile字段，则新增受控composeGuidedDraft组合“已授权源字段+已确认草稿内容”，不能把全部profile读出再任意筛选。用户另点“保存为我的资料”才写主资料。

应用流程：校验session/profile revision→展示变更摘要→用户“应用这张名片”→一次性提交config/modules/visibility快照→在工作室显示并提供“撤销本次应用”。备份在内存或加密vault，不放明文敏感存储。应用后如手工修改再撤销，提示恢复范围，不能无声抹掉后续编辑。

分享流程：应用只生成本地草稿；在步骤05检查公开字段，再由用户点三个分享动作之一。复用ShareSelection→projectShare→现有发布/PNG。purpose、recipient、对话、理由、未确认事实、evidence原文绝不混进公开投影。公开对象schema严格白名单；不要靠前端隐藏。

卡库按用途/对象保存多个版本，默认不覆盖之前定向卡；变化产生新草稿版本。主资料更新后相关定向卡标记stale并提示可重新生成，不自动改动已经发布的快照。

## 13. 一段完整对话与预期产物

用户：我是林予安，做产品设计，下周见一家教育科技公司的创始人，希望谈合作。

助手：我会围绕产品设计合作来准备。你最希望对方记住你的哪一项能力？
选项：把复杂流程做清楚 / 从0到1设计产品 / 我自己补充。

用户：我负责过一个课程预约产品的交互设计，没有公开业绩数据。

助手：可以突出课程预约产品的交互设计经历。你希望对方下一步联系你聊需求，还是先看作品？

用户：先看作品，风格干净一点。

助手摘要：用途=合作；对象=教育科技创始人；下一步=看作品；重点=课程预约产品交互设计；风格=简洁。候选事实原文旁可编辑/确认，用户点“确认并生成”。

输出：soft-signal（实施后注册的模板），主身份“林予安｜产品设计师”，主亮点使用已确认的“负责过课程预约产品的交互设计”，模块“项目经历 / 合作方向”；作品链接尚无时提示在本地补充，不虚构链接；无业绩百分比、无“资深/专家”称谓。对象与用途只显示在作者侧摘要。用户可说“更活泼一点”“删掉合作方向”“换免费模板”，系统基于同一证据重新提案。

## 14. Luna 实施任务卡

| ID | 依赖 | 文件/范围 | 交付与验收 |
|---|---|---|---|
| A0 契约 | U0 | designer/types、schemas、workflow；skill草案 | 明确状态、输入输出；最小可生成条件可用纯函数判定 |
| A1 服务接口 | A0 | server/providers/llm.ts、router.ts、新designer-runtime.ts | turn/proposal接口真实调用；schema/ID/权限/来源校验；不改变旧coach/plan接口行为 |
| A2 对话界面 | A0，U2 | provider.tsx、designer-panel、conversation-store、styles | 首页及全局同会话；逐问/跳过/纠正/取消/恢复；无轮播干扰；手机键盘适配 |
| A3 生成策略 | A1 | template-capabilities、proposal-validator、skill registry | 已有回答不重问；只能选合法模板；事实/润色确认区；主推一张+最多两备选 |
| A4 应用桥接 | A2，A3，U3 | studio-bridge、compose-guided、domain schemas、prepared/store | Guided config兼容旧数据；主资料不被定向润色覆盖；revision冲突不会丢用户输入；可撤销 |
| A5 发布闭环 | A4，U5 | quick-share、projection、library | 从对话到卡库到公开/PNG可完成；私有字段不泄漏；分享重复点击不重复发布 |
| A6 回归 | A5，U6 | 有意义的状态机/API/投影测试与浏览器路径 | 下表所有场景有实际验证记录；不得以样例数据证明真实provider可用 |

如果模型服务未配置：完成可验证的离线状态机/契约/假响应测试，界面真实显示不可用；将真实provider冒烟标为未验证，并说明缺少配置，不能声称全闭环已上线。

## 15. 验收用例

1. 用户一条消息包含身份、用途、对象和亮点：不重复四轮问题，进入摘要确认。
2. 用户不知道接收人姓名：允许“某类人”或“通用”，能生成。
3. 用户没有项目成绩：生成基础卡，不出现虚构数据或强迫补充。
4. 用户中途把求职改合作：保留身份，重算重点，旧提案标stale。
5. 模型返回不存在模板、非法kind、越权字段、伪造evidence：拒绝应用，允许重试/手动。
6. 用户上传材料含提示注入：材料不改变system/权限/公开选项。
7. 消息含电话/邮箱：实际网络请求不含原值；可以保存在本地联系方式区。
8. 生成中手动改名：迟到结果不覆盖新姓名；提示重新生成或仅应用不冲突部分。
9. 双击生成、取消后迟到结果、刷新、路由切换：不会重复应用或串会话。
10. 润色引入新数字或夸大责任：不能当已确认事实保存；用户能看到来源并修改。
11. 模型超时/无配置：保留输入，手动制作仍可完成。
12. 导出的JSON/公开页面/PNG只含已选字段；对象备注、用途、聊天和来源不公开。
13. 免费用户不会得到不可使用的唯一VIP方案；历史manual/ai卡仍可打开。
14. 390px手机可发消息、确认事实、看卡、应用、分享；不需要横屏或桌面浏览器。
15. 完成一次定向卡后再开始第二位对象：新卡独立，第一张卡及主Profile不被覆盖。

## 16. 可复制给 Luna 的任务说明

> 先完成A0契约和状态机，再实现真实API与界面；不要只替换prompt。把配套skill作为服务端固定版本规范，所有引用、模板、授权与公开投影在程序中校验。用户会话以最少追问为目标，但确认不能被模型自行代替。每完成一个任务提供实际证据；最后从一句话输入走到真实渲染、保存卡库、公开字段确认和分享。不可伪造研究ID、模型回复、成功状态或公开链接。UI按紫白整站方案，手机与桌面都完成。
