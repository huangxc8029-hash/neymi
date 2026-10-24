# AI Agent Spec v1.3 — 单人表达策略
2026-10-24。能力目标，不代表已接通服务。

## 使命与输入
帮助用户针对一个接收人和具体场景选择真实表达重点，形成清晰的第一印象。不得优化操纵、卡片数量或未经验证的成功概率。
输入 UserGoal/InteractionContext、用户提供的 RecipientInput、ApprovedCloudContext（当次授权职业摘要）、允许的模块元数据。禁止完整 LocalProfile、敏感字段值、未经批准聊天历史。
AI 允许云端处理获准对话。云端本身能看到提交文本，不能用“加密”掩盖这个事实。

## 可独立测试的步骤
| 阶段 | 结果 | 必须执行的限制 |
|---|---|---|
| 本人对话 | CandidateSelfFact[] | 未确认不写入本人事实，不编造数值 |
| 本地确认 | ConfirmedSelfFact[] | 用户确认/编辑后存本地；再次发云端另行选择 |
| 接收人识别 | Recipient + identityStatus | 同名/机构冲突先确认，不跨人合并 |
| 公开研究 | ResearchSource[] + ResearchClaim[] | 来源、时间、事实/推断/未知，禁止私人敏感画像 |
| 单人相关性 | RelevanceAssessment | qualified/uncertain/not_recommended，不要求多人排名 |
| 表达策略 | ConnectionStrategy | 重点、材料引用、原因、依据、开场/下一步、风险 |
| 方案生成 | CardRecipe | strategyId 必填，非敏感建议文案、合法模块引用 |
| 本地批准 | LocalDraft | AI 无权读取本地 vault 或批准最终发送 |

## 证据与真实表达
优先公开官方职业信息、原始访谈/文章、活动介绍；短引用记录来源和时间。用户提供的信息标为 user_provided，不能标成 independently verified。事实与明确偏好必须有实际来源依据，引用存在不代表支持论断，试点需人工抽查蕴含关系。
身份含糊时停止针对性断言；来源过时/冲突明确展示。研究不足可提出待核实问题或受限方案，不编造对方兴趣。不能声称“93% 获得会面”，不能推断财富、心理弱点或敏感人格。
本人证明材料必须引用当次获准且已确认的 selfFactIds；缺材料列 missingProofPoints，不制造成绩。云端建议文本不自动写回真实资料。

## 输出策略
ConnectionStrategy：推荐状态、recommendedFocus、whyMeet、whyTheyMayCare、mainPoint、proofPointIds、recipientClaimIds、selectionReasons（本人事实到相关依据的说明）、openingLine、openingQuestions（最多 2）、suggestedNextStep、misfitRisks、uncertainties、confidence。
不同接收人应根据证据改变材料选择/重点，而非只替换称呼。无实际差异时允许复用方案，不强行定制。
CardRecipe 仅模块引用/排序/强调/布局/动效/非敏感草稿，无电话/邮件/地址/图片字节/私有备注。AI Recipe 要求有效 Strategy；手动卡片走 ManualCardConfig。

## 模式与范围
A：本人引导、一次一个接收人、检索已准备卡片（检索无需模型）。
B：活动提取、最多 20 人、匹配与排序；既有 35/25/15/15/10 权重仅历史试点假设，B 必须重新评测，不作为 A 硬编码规则。
C：一个官方消息渠道，不能以聊天指令读取设备资料或自动外发。

## 防护与评测
网页/用户上传文本均作为数据，不执行其中的工具指令。服务端验证 schema、来源 ID、本人事实引用、合法模块及跨人引用；检测到敏感内容或虚构成就时拒绝接受方案。无模型配置时明确 fixture 演示或不可用。
负例：同名、错机构、阶段不匹配、无证据、过期来源、网页指令注入、死链接、虚构成就、敏感画像、凭空成功概率、无本地 vault、撤销授权、另一任务 ID、对话误填联系方式。
指标：来源覆盖、身份正确性、事实支持度、适当弃权、用户对重点/理由的评价、同一用户不同对象的实际差异、每任务成本。发布样本中不接受虚构本人事实；隐私回归零越权输出。不声称模型验证能完全消除幻觉。
