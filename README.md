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

## 后续可扩展方向

- 接入会员申请表单
- 接入登录系统（Clerk / NextAuth / Supabase Auth）
- 接入支付（Stripe / Lemon Squeezy）
- 接入 CMS 或 Notion/MDX 内容系统
- 增加课程详情页、社群介绍页、AI 助手对话页
- 一键部署到 Vercel
