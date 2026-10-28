# 账户登录接入与验收

## 当前实现

- 游客继续免注册创建和保存名片；登录只建立 Supabase 身份会话，不迁移/上传本地名片。
- 邮箱使用一次性 6 位验证码；首次验证码验证由 Supabase 创建账户。
- Google、Apple OAuth 只有对应环境开关为 `true` 才显示。
- SSR 会话使用 `@supabase/ssr` Cookie；退出只结束会话，不删除本地卡片。
- 回跳路径只允许同站相对路径，验证码错误统一提示，避免暴露邮箱是否已注册。

## 本地配置

在部署环境或未跟踪的 `.env.local` 设置：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=false
NEXT_PUBLIC_AUTH_APPLE_ENABLED=false
```

禁止把 Supabase `service_role` key 放进 `NEXT_PUBLIC_*` 或浏览器代码。没有有效 URL/key 时，登录页只显示“账户服务尚未配置”，访客制卡仍可用。

Supabase Dashboard > Authentication > URL Configuration：配置站点 URL，并加入本地与正式站的 `/auth/callback` 回跳地址。启用 Email OTP 模板（邮件需显示 `{{ .Token }}`）；为正式使用配置已验证的邮件投递服务。邮件验证码策略与频率限制应按部署地区、投递商和滥用监控调整。

Google：在 Google Cloud 配好 OAuth consent screen 与 Web client，再将 client ID/secret 配到 Supabase Google provider。Apple：在 Apple Developer 配置 Sign in with Apple 的 Service ID、域名/回调和密钥，再配到 Supabase Apple provider。OAuth secret 只保存在 Supabase provider 设置中，绝不放入前端或仓库。完成真实 provider 回调验收后，才将对应 `NEXT_PUBLIC_AUTH_*_ENABLED=true`。

## 验收清单

1. Supabase 环境变量为空或无效时，`/` 仍可免登录使用，`/auth` 不显示可点击的登录方式。
2. 配置 Email 后，可发送验证码、校验登录、刷新页面仍保持会话；错误码与未知邮箱均不会确认账户是否存在。
3. `next=//evil.example`、完整外站 URL 等回跳值均落到 `/`；合法站内路径可保留。
4. 未启用的 Google/Apple 不出现；仅完成 Supabase 控制台设置并打开相应开关后才出现，并能完成真实 OAuth 返回。
5. `/account` 只显示当前用户的邮箱与 provider；未登录访问会回到登录页。
6. 退出后 `/account` 需要再次登录；本机名片仍存在，未发送网络同步请求。
7. 浏览器构建产物不包含 service-role key；OAuth secrets 不进入浏览器 bundle。

## 需要外部配置与发布前事项

本地 `.env.local` 已配置 Supabase URL 与 publishable key。2026-10-28 只读检查 `/auth/v1/settings` 返回 200，邮箱登录已启用且注册未关闭；手机和桌面浏览器均已确认邮箱表单可见。真实邮件投递和验证码核验仍需使用有权接收邮件的测试邮箱完成；Google/Apple OAuth 开关保持关闭。启用公网注册前，产品方还需提供并审核适用的服务条款、隐私说明、账号删除/数据权利流程，以及面向不同目标市场的通知与合规文案；本实现不声称登录账户可同步或删除云端个人资料。

### 验收标准

- TypeScript、lint 与 `tests/unit/auth-availability.test.ts` 通过。
- 缺少第三方服务配置时无伪造成功态。
- 配置完成后逐项按上方真实邮箱、Google、Apple 流程走生产同源回调验收。
