# APIs & Integrations v1.3
提议接口，尚未部署。A 为 Web 单人闭环，B 为活动扩展，C 为正式 Bot。路径不暗示既有服务。

## 1. Port 契约
研究/LLM/发布存储分别以 ResearchProvider、Planner、PublicationStore 隔离；fixtures 离线可用但明显标记。生产无密钥必须返回 PROVIDER_UNAVAILABLE，不回退成貌似真实的模拟结果。
LocalVault 在客户端运行，服务器 API 不接受 LocalProfile/ConsentGrant 或任意本地 field 读取请求。

## 2. A 接口
| Method / path | 输入 → 输出 | 校验 |
|---|---|---|
| POST /v1/sessions | 空 → 建匿名会话 cookie | Origin、配额；不返回可枚举用户 ID |
| POST /v1/self-facts/proposals | ApprovedCloudContext → CandidateSelfFact[] | 内容散列、长度、敏感检测，用户仍须本地确认 |
| POST /v1/research/jobs | RecipientInput + InteractionContext → jobId/state | 单人，URL 安全，owner，小时配额 |
| GET /v1/research/jobs/:id | → state/research/errors | 当前匿名 owner，跨会话 404 |
| POST /v1/research/jobs/:id/identity | candidateId → updated state | owner，候选必须来自该任务 |
| POST /v1/research/jobs/:id/cancel | 空 → cancelled | owner，终态幂等 |
| DELETE /v1/research/jobs/:id | → 204 | owner，清理研究及衍生提案 |
| POST /v1/strategies | jobId + ApprovedCloudContext + context → strategy/recipe | owner、证据/本人引用、敏感输出检查 |
| POST /v1/publications | ShareProjection + ShareConfirmation → PublicationReceipt | 仅 publish confirmation；散列、幂等键、大小、TTL |
| GET /v1/publications/:publicId | → ShareProjection/410 | 不要求账户；仅可见未过期/未撤下快照 |
| DELETE /v1/publications/:publicId | revokeToken → 204 | 独立凭证验证；公共 ID 不能撤下 |
| GET /p/:publicId | → 交互接收页 | 免注册，无研究/私有标签；no-store |

发布为快照，不能通过 profile 更新静默变更。凭证只通过响应和授权请求传输，不进 URL 或 OG。publication 与研究存储隔离；输入投影拒绝多余字段，服务端不知道原 profile，客户端白名单测试不可省略。
通用 OG 默认；A 如启用非敏感自定义封面，需要独立显式选择、同样验证，不自动取名片全部内容。

## 3. 本地接口与错误
LocalVault.unlock/lock、readAllowed、exportBackup/importBackup；GrantBroker.check；composeDraft；projectShare；serializeNcard/serializeVcard/renderImage。精确签名与路径见实施计划，不在服务端创建这些读取接口。
稳定错误码：INVALID_REQUEST、SOURCE_UNAVAILABLE、INSUFFICIENT_EVIDENCE、IDENTITY_AMBIGUOUS、PERMISSION_DENIED、RATE_LIMITED、EXPIRED、PROVIDER_UNAVAILABLE、CANCELLED、STORAGE_FAILED、INTERNAL。
返回安全说明和可重试信息，不返回堆栈、正文、token。配额/超时/大小与 03 一致。

## 4. 真实接入闸门
模型与公开搜索供应商未选定/未配置，不声称可用。A00 核验运行环境并锁依赖；A05/A07 定义端口，A12 用配置好的服务验证实际来源、失败和成本。没有凭证则标 BLOCKED，基础名片不受影响。
应用 24 小时删除不等于供应商删除；上线前核验供应商留存、地区、费用与额度。部署地址、托管地区、数据库备份清理和真机可用性是 G-A3 外部条件。

## 5. B/C 后续
B 才增加 POST /v1/events、文件解析和 batch jobs；20 人上限。
C 才增加 /v1/messaging/:provider/webhook 与单次短期 handoff ticket。只接一个官方渠道，签名/时间/幂等/重试，短 TTL、单次兑换、no-referrer、兑换后清 URL，不给远端 vault 权限。微信/WhatsApp/Telegram 的实际准入与费用届时核验，不宣称已批准；不自动化个人账号。
