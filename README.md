# Twone Web3.0 Community Homepage Prototype

为 Twone Web3.0 社区搭建的 Next.js 首页 / Landing Page 原型。

## 技术选型

- Next.js 16
- React 19
- TypeScript
- App Router
- 适合后续部署到 Vercel

## 已完成内容

当前原型包含：

- Hero 首屏
- 价值介绍 / 平台定位
- 会员权益区块
- 课程入口模块
- AI 助手入口模块
- CTA 行动区
- Footer 页脚
- 深色、现代、偏 Web3 科技感的视觉风格

## 本地运行

进入项目目录：

```bash
cd /Users/eryi/.openclaw/workspace/twone-web
```

安装依赖（create-next-app 已自动安装，如需重装再执行）：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

然后打开：

```text
http://localhost:3000
```

## 生产构建

```bash
npm run build
npm run start
```

## 关键文件

- `src/app/page.tsx`
  - 首页结构与全部文案
- `src/app/globals.css`
  - 全局样式、深色科技风视觉、响应式布局
- `src/app/layout.tsx`
  - 页面 metadata 与全局布局
- `package.json`
  - 运行脚本与依赖配置

## 首次设置密码流程 v1（网页内）

为减少对邮件链路的依赖，当前增加了一条“管理员生成一次性网页内首次设密链接”的最小可用方案：

- 管理员在 `/admin` 审批后，可为**已存在 Supabase Auth 用户**生成一次性首次设密链接
- 链接形如 `/auth/first-password?token=...&email=...`
- 用户在网页内直接设置密码，不需要再通过邮件 recovery link
- 底层仍复用 Supabase Auth，由服务端通过 `supabase.auth.admin.updateUserById()` 设置密码
- token 只在数据库保存哈希，默认 24 小时有效，且用后即失效；重新生成会撤销旧 token

### 这条方案的边界

这不是“知道邮箱就能改密码”。

必须满足：

1. 用户已经通过审核
2. 管理员显式生成一次性链接
3. 该邮箱已经存在对应的 Supabase Auth user（或管理员手工指定 `user_id`）

### 当前最小可行操作路径

- **最优路径（推荐）**：
  1. 测试员先至少完成一次账号创建/登录，拿到 Supabase Auth user
  2. 管理员在 `/admin` 点击“生成网页内首次设密链接”
  3. 把链接发给测试员
  4. 测试员打开链接，在网页内设置密码
  5. 测试员去 `/assistant?entry=login` 用邮箱 + 密码登录

- **如果当前邮箱还没有对应 Supabase Auth user**：
  目前无法在纯前端、完全无邮件、且不重写认证体系的前提下，直接给“只有邮箱、尚无 auth user”的现有对象安全地网页内设首次密码。
  此时最小替代方案是：
  - 管理员先在 Supabase 后台创建该邮箱账号（可不走用户邮件链路）后，再生成首次设密链接；或
  - 让测试员先至少成功登录一次（哪怕用备用 magic link），生成 auth user 后，再改走网页内设密。

### 数据库变更

执行新增 SQL：

```bash
supabase-first-password-setup-v1.sql
```

它会创建：

- `membership_password_setup_tokens`
  - 保存一次性首次设密 token 的哈希、目标 `user_id`、状态、过期时间、使用时间

## 每日 AI 行情真链路 v1

这版已把“首页只读本地 seed”推进到“优先读取正式数据源”的最小可用链路：

- 新增 Supabase 表：`daily_ai_market_analyses`
- 首页 `src/app/page.tsx`
  - 现在优先读取 Supabase 中最新一条 `published`
  - 若表未建立或暂无已发布数据，自动回退到本地 seed
- API `GET /api/daily-ai-market`
  - 返回 `item + workflow + latestRecord`
- 后台新增页面：`/admin/daily-ai-market`
  - 可手动填写 / 修改每日分析模板字段
  - 保存后直接写入 Supabase
  - `status=published` 时首页立即读取最新发布内容

### 需要先执行的 SQL

在 Supabase SQL Editor 中执行：

```bash
supabase-daily-ai-market-v1.sql
```

它会创建：

- `daily_ai_market_analyses`
  - `analysis_date`：每日唯一日期
  - `publish_at_jst`：计划 / 实际发布时间
  - `status`：`draft | scheduled | published`
  - `source`：`manual-seed | admin | auto`
  - `payload`：完整首页模板 JSON

### 当前 v1 到了哪一步

已经完成：

1. 正式可写入数据源（Supabase 表结构）
2. 网站首页读取最新已发布内容
3. 一个可手动触发的发布入口（后台页面）
4. 保持和首页现有模板字段兼容

v2 在此基础上继续补了“自动生成 + 自动发布”入口：

- 新增服务层：`src/lib/daily-ai-market-auto.ts`
  - 用固定模板自动生成当日 payload
  - 直接 upsert 到 `daily_ai_market_analyses`
  - 默认以 `source=auto`、`status=published` 写入
- 新增触发路由：`POST /api/daily-ai-market/auto-publish`
  - 适合被 Vercel Cron、OpenClaw cron 或任意外部调度器调用
  - 使用 `Authorization: Bearer $DAILY_AI_MARKET_CRON_TOKEN` 鉴权
  - 也支持 `?token=...` 方式，便于先手工测试

### 手工触发 v2 自动发布

先在环境变量中配置：

```bash
DAILY_AI_MARKET_CRON_TOKEN=your-secret-token
```

本地或线上可这样调用：

```bash
curl -X POST http://localhost:3000/api/daily-ai-market/auto-publish \
  -H "Authorization: Bearer $DAILY_AI_MARKET_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

也可指定日期：

```bash
curl -X POST https://your-domain/api/daily-ai-market/auto-publish \
  -H "Authorization: Bearer $DAILY_AI_MARKET_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"analysisDate":"2026-04-05"}'
```

### 离“每天 21:15 自动跑”还差什么

现在已经具备：

1. 正式数据源（Supabase）
2. 手动后台发布入口
3. 自动生成固定模板 payload
4. 可被外部定时器调用的自动发布 API

还差最后一个调度层：

- **Vercel Cron**：项目里已经补了 `vercel.json`，使用 UTC cron `15 12 * * *`，即 `21:15 JST`
- **或 OpenClaw cron**：更推荐，直接由 OpenClaw 每天 21:15 发起一次 HTTP 调用
- 若后面要从“固定模板”升级成“真数据生成”，再把 `daily-ai-market-auto.ts` 里的 payload 生成逻辑替换成实时数据拼装即可，路由和写库入口不需要重做

也就是说，现在“自动发布入口”已经有了；离真正每天 21:15 自动执行，只差把这个入口挂到一个真正会每天触发的 cron 上。

## 面向 OpenClaw cron 的最小接法（推荐）

### 1) 先确认站点环境变量

线上部署环境里至少要有：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DAILY_AI_MARKET_CRON_TOKEN=一个足够长的随机字符串
```

说明：

- `DAILY_AI_MARKET_CRON_TOKEN` 是 cron 调接口时用的共享密钥
- 不要把它写进前端公开变量
- OpenClaw cron 只需要知道这个 token，不需要 Supabase key

### 2) 触发接口

推荐调用：

```bash
POST /api/daily-ai-market/auto-publish
Authorization: Bearer $DAILY_AI_MARKET_CRON_TOKEN
Content-Type: application/json
```

最小 body：

```json
{}
```

接口特性：

- 支持 `POST` + JSON body
- 也支持 `GET`，适合某些只方便发 URL 的 cron 场景
- 支持 `Authorization: Bearer ...`
- 也支持 `?token=...`，仅建议本地手测或临时排障时使用
- 可选参数：
  - `analysisDate=YYYY-MM-DD`
  - `publishAtJst=2026-04-05T21:15:00+09:00`
  - `status=published|scheduled`
  - `source=auto|admin|manual-seed`

### 3) 先手工验一次

线上建议先跑：

```bash
curl -X POST https://your-domain/api/daily-ai-market/auto-publish \
  -H "Authorization: Bearer $DAILY_AI_MARKET_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

成功时会返回：

```json
{
  "ok": true,
  "trigger": "post",
  "mode": "created",
  "analysisDate": "2026-04-05",
  "status": "published",
  "source": "auto",
  "publishAtJst": "2026-04-05T21:15:00+09:00"
}
```

然后检查两处：

1. `https://your-domain/api/daily-ai-market`
2. 首页是否已切到最新 `published`

### 4) OpenClaw cron 实际接入思路

OpenClaw cron 的核心就一件事：**每天 21:15 JST 发一次上面的 HTTP 请求**。

如果你的 OpenClaw cron 支持直接配置 HTTP 请求：

- schedule：`15 21 * * *`
- timezone：`Asia/Tokyo`
- method：`POST`
- url：`https://your-domain/api/daily-ai-market/auto-publish`
- headers：
  - `Authorization: Bearer <你的 DAILY_AI_MARKET_CRON_TOKEN>`
  - `Content-Type: application/json`
- body：`{}`

如果你的 OpenClaw cron 更适合执行 shell 命令，那就直接用一条 `curl`：

```bash
curl -X POST https://your-domain/api/daily-ai-market/auto-publish \
  -H "Authorization: Bearer $DAILY_AI_MARKET_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5) OpenClaw cron 最小落地步骤

按最少动作来做：

1. 确保线上站点已部署这版代码
2. 确保线上环境变量里已有 `DAILY_AI_MARKET_CRON_TOKEN`
3. 用上面的 `curl` 手工测通一次
4. 在 OpenClaw cron 新增一条每日任务：
   - `15 21 * * *`
   - `Asia/Tokyo`
   - 调 `https://your-domain/api/daily-ai-market/auto-publish`
5. 第二天 21:15 之后检查首页 / API / Supabase 记录是否自动更新

### 6) 现在到底该怎么把“每天 21:15 自动执行”真正接上

**现在最直接的接法就是：**

- 保留当前 `/api/daily-ai-market/auto-publish`
- 在线上配置 `DAILY_AI_MARKET_CRON_TOKEN`
- 在 OpenClaw cron 新增一条 `Asia/Tokyo` 时区、`15 21 * * *` 的任务
- 让这条任务每天执行下面这条请求：

```bash
curl -X POST https://your-domain/api/daily-ai-market/auto-publish \
  -H "Authorization: Bearer <你的 DAILY_AI_MARKET_CRON_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

这样就是真的接上了。

## Vercel Cron 兜底

如果不想依赖 OpenClaw cron，项目当前也已经有一个 Vercel cron 兜底配置：

```json
{
  "crons": [
    {
      "path": "/api/daily-ai-market/auto-publish",
      "schedule": "15 12 * * *"
    }
  ]
}
```

注意：

- `15 12 * * *` 是 **UTC**，对应日本时间 `21:15 JST`
- 若使用 Vercel Cron，通常仍建议让请求携带同一个 `DAILY_AI_MARKET_CRON_TOKEN`
- 如果后续明确只走 OpenClaw cron，`vercel.json` 这条可以保留当兜底，也可以删掉避免双触发

## 后续可扩展方向

- 接入会员申请表单
- 接入登录系统（Clerk / NextAuth / Supabase Auth）
- 接入支付（Stripe / Lemon Squeezy）
- 接入 CMS 或 Notion/MDX 内容系统
- 增加课程详情页、社群介绍页、AI 助手对话页
- 一键部署到 Vercel
