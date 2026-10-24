# A01 · Runnable domain foundation
执行计划 A01：最小工程、严格 TypeScript/运行时 schema、离线 fixtures 和测试命令。
ManualCardConfig 不要求 strategyId；CardRecipe.kind=ai 则要求；Recipient.eventId 可缺省。
LocalProfile 不为 API 请求类型；ApprovedCloudContext、ConsentGrant、ShareConfirmation 分离；未知字段、非法引用/枚举、敏感 Recipe、引用错人拒绝。
fixtures/single-recipient.json 是场景种子，不代表已通过 schema。构建完整有效/非法 fixture 并运行真实 typecheck/lint/test；不引用不存在的 schemas 或 scripts。
